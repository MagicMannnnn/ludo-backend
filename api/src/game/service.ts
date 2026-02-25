import { randomUUID } from "crypto";
import type pg from "pg";
import { tx } from "../db.js";
import type { GameBundle, } from "./repo.js";
import { getBundleByCode, saveState } from "./repo.js";
import type { GameRow, GameState, PlayerRow } from "../types.js";
import { createInitialState, rollDice, applyMove, startGame, pickAiMove } from "./logic.js";

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function insertGameAndPlayers(client: pg.PoolClient, name: string): Promise<{ game: GameRow; player: PlayerRow; state: GameState }> {
  // generate unique code (retry a few times)
  let code = genCode();
  for (let i = 0; i < 6; i++) {
    const exists = await client.query("SELECT 1 FROM games WHERE code=$1", [code]);
    if (exists.rowCount === 0) break;
    code = genCode();
  }

  const g = await client.query<GameRow>("INSERT INTO games(code, status) VALUES ($1,'lobby') RETURNING *", [code]);
  const game = g.rows[0] as any as GameRow;

  const creator = await client.query<PlayerRow>(
    "INSERT INTO players(game_id, name, seat, is_ai) VALUES ($1,$2,0,false) RETURNING *",
    [game.id, name]
  );
  const creatorPlayer = creator.rows[0] as any as PlayerRow;

  // Fill remaining seats with AI placeholders (replaceable by humans on join)
  const aiNames = ["AI Red", "AI Blue", "AI Green"];
  for (let seat = 1; seat < 4; seat++) {
    await client.query(
      "INSERT INTO players(game_id, name, seat, is_ai) VALUES ($1,$2,$3,true)",
      [game.id, aiNames[seat - 1], seat]
    );
  }

  const players = await client.query<PlayerRow>("SELECT * FROM players WHERE game_id=$1 ORDER BY seat ASC", [game.id]);
  const seatToPlayerId = Array.from({ length: 4 }, (_, i) => players.rows.find((p) => p.seat === i)?.id ?? null);

  const state = createInitialState(seatToPlayerId);
  await client.query("INSERT INTO game_states(game_id, state) VALUES ($1, $2::jsonb)", [game.id, JSON.stringify(state)]);

  return { game, player: creatorPlayer, state };
}

export async function createGame(name: string): Promise<{ code: string; playerId: string }> {
  return tx(async (client) => {
    const { game, player } = await insertGameAndPlayers(client, name);
    return { code: game.code, playerId: player.id };
  });
}

export async function joinGame(code: string, name: string): Promise<{ code: string; playerId: string; seat: number }> {
  return tx(async (client) => {
    const g = await client.query<GameRow>("SELECT * FROM games WHERE code=$1", [code]);
    const game = g.rows[0] as any as GameRow | undefined;
    if (!game) throw new Error("Game not found");

    const players = await client.query<PlayerRow>("SELECT * FROM players WHERE game_id=$1 ORDER BY seat ASC", [game.id]);
    // Replace an AI if present; otherwise reject if full with humans (unlikely with placeholders)
    const ai = players.rows.find((p) => p.is_ai);
    if (!ai) throw new Error("Game full");

    const upd = await client.query<PlayerRow>(
      "UPDATE players SET name=$1, is_ai=false WHERE id=$2 RETURNING *",
      [name, ai.id]
    );
    const joined = upd.rows[0] as any as PlayerRow;

    // Update seatToPlayerId mapping in state (id stays same, so mapping doesn't change).
    const s = await client.query<{ state: GameState }>("SELECT state FROM game_states WHERE game_id=$1", [game.id]);
    const state = s.rows[0]?.state as unknown as GameState;
    if (!state) throw new Error("State missing");

    // nothing needed since player id same; but bump updatedAt for clients
    const nextState = { ...state, updatedAt: new Date().toISOString() };
    await saveState(game.id, nextState, client);

    return { code: game.code, playerId: joined.id, seat: joined.seat };
  });
}

export async function getGame(code: string): Promise<GameBundle> {
  const bundle = await getBundleByCode(code);
  if (!bundle) throw new Error("Game not found");
  return bundle;
}

function seatForPlayer(state: GameState, playerId: string): number {
  const seat = state.seatToPlayerId.findIndex((id) => id === playerId);
  if (seat < 0) throw new Error("Player not in game");
  return seat;
}

export async function startIfNeeded(code: string): Promise<GameBundle> {
  return tx(async (client) => {
    const bundle = await getBundleByCode(code);
    if (!bundle) throw new Error("Game not found");

    if (!bundle.state.started) {
      const next = startGame(bundle.state);
      await saveState(bundle.game.id, next, client);
      bundle.state = next;
    }
    return bundle;
  });
}

export async function roll(code: string, playerId: string): Promise<GameBundle> {
  return tx(async (client) => {
    const bundle = await getBundleByCode(code);
    if (!bundle) throw new Error("Game not found");

    if (!bundle.state.started) {
      bundle.state = startGame(bundle.state);
    }

    const seat = seatForPlayer(bundle.state, playerId);
    if (seat !== bundle.state.turnSeat) throw new Error("Not your turn");
    if (bundle.state.lastRoll != null) throw new Error("Already rolled");

    const next = { ...bundle.state, lastRoll: rollDice(), updatedAt: new Date().toISOString() };
    await saveState(bundle.game.id, next, client);
    bundle.state = next;

    // If it's an AI seat, auto-play until a human seat is reached (simple loop guard)
    await maybeRunAiTurns(client, bundle);
    return bundle;
  });
}

export async function move(code: string, playerId: string, tokenIndex: number): Promise<GameBundle> {
  return tx(async (client) => {
    const bundle = await getBundleByCode(code);
    if (!bundle) throw new Error("Game not found");
    if (!bundle.state.started) throw new Error("Game not started");

    const seat = seatForPlayer(bundle.state, playerId);
    const next = applyMove(bundle.state, seat, tokenIndex);
    await saveState(bundle.game.id, next, client);
    bundle.state = next;

    await maybeRunAiTurns(client, bundle);
    return bundle;
  });
}

async function maybeRunAiTurns(client: pg.PoolClient, bundle: GameBundle): Promise<void> {
  // Keep taking AI turns until we reach a human player or we hit a safety cap.
  const cap = 12;
  for (let i = 0; i < cap; i++) {
    const seat = bundle.state.turnSeat;
    const p = bundle.players.find((pp) => pp.seat === seat);
    if (!p) return;
    if (!p.is_ai) return;

    // AI roll
    if (bundle.state.lastRoll == null) {
      bundle.state = { ...bundle.state, lastRoll: rollDice(), updatedAt: new Date().toISOString() };
      await saveState(bundle.game.id, bundle.state, client);
    }

    // AI move
    const { tokenIndex } = pickAiMove(bundle.state);
    try {
      bundle.state = applyMove(bundle.state, seat, tokenIndex);
      await saveState(bundle.game.id, bundle.state, client);
    } catch {
      // If no legal move, just pass turn
      bundle.state = { ...bundle.state, lastRoll: null, turnSeat: (seat + 1) % 4, updatedAt: new Date().toISOString() };
      await saveState(bundle.game.id, bundle.state, client);
    }

    // refresh players (in case someone joined and replaced AI)
    const ps = await client.query<PlayerRow>("SELECT * FROM players WHERE game_id=$1 ORDER BY seat ASC", [bundle.game.id]);
    bundle.players = ps.rows as any;
  }
}
