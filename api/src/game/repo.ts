import type pg from "pg";
import type { GameSnapshot, GameState } from "../types.js";
import { randomBytes } from "crypto";
import { createInitialState as createInitialGameState, applyRoll, applyMove } from "./logic.js";

function generateCode(): string {
  return randomBytes(3).toString("hex").toUpperCase() // e.g. A1B2C3
}

/**
 * Repo/persistence layer.
 *
 * You decide how to store:
 * - games / players rows
 * - current game_state JSONB
 * - joining rules (replace AI slots, etc.)
 *
 * Recommended: keep `game_states.state` as the canonical snapshot you broadcast.
 */

export async function createGame(
  client: pg.PoolClient,
  params: { hostName: string }
): Promise<{ code: string; hostPlayerId: string; hostSeat: number; snapshot: GameSnapshot }> {
  // TODO:
  // - insert games row (unique code)
  // - insert players rows (host + AI placeholders for remaining seats)
  // - insert initial game_states row
  // - return snapshot

  const code = generateCode();
  const gameRes = await client.query(
    `INSERT INTO games (code, status)
     VALUES ($1, 'lobby')
     RETURNING *`,
    [code]
  );
  const game = gameRes.rows[0];

  const hostRes = await client.query(
    `INSERT INTO players (game_id, name, seat, is_ai)
     VALUES ($1, $2, 0, false)
     RETURNING *`,
    [game.id, params.hostName]
  )

  const host = hostRes.rows[0];

  for (let seat = 1; seat < 4; seat++) {
    await client.query(
      `INSERT INTO players (game_id, name, seat, is_ai)
       VALUES ($1, $2, $3, true)`,
      [game.id, `AI ${seat}`, seat]
    )
  }

  const state = createInitialGameState();
  state.players[0].name = params.hostName; // set host name in initial state

  await saveState(client, game.id, state); // save initial state to DB

  const snapshot = await getSnapshot(client, code)

  return {
    code,
    hostPlayerId: host.id,
    hostSeat: 0,
    snapshot,
  }

}

export async function joinGame(
  client: pg.PoolClient,
  params: { code: string; name: string }
): Promise<{ playerId: string; seat: number; snapshot: GameSnapshot }> {


  const gameRes = await client.query(
    `SELECT * FROM games WHERE code = $1`,
    [params.code]
  )

  if (!gameRes.rowCount) {
    throw new Error("Game not found")
  }

  if (gameRes.rows[0].status !== "lobby") {
    throw new Error("Game already started")
  }

  const game = gameRes.rows[0]

  

  const aiRes = await client.query(
    `SELECT * FROM players
     WHERE game_id = $1 AND is_ai = true
     ORDER BY seat
     LIMIT 1`,
    [game.id]
  )

  if (!aiRes.rowCount) {
    throw new Error("Game full")
  }

  const ai = aiRes.rows[0]

  const playerRes = await client.query(
    `UPDATE players
     SET name = $1, is_ai = false
     WHERE id = $2
     RETURNING *`,
    [params.name, ai.id]
  )

  const player = playerRes.rows[0]

  const snapshot = await getSnapshot(client, params.code)

  snapshot.state.players[player.seat].name = params.name; // update player name in snapshot
  snapshot.state.players[player.seat].is_ai = false; // update player AI status in snapshot

  await saveState(client, game.id, snapshot.state); // save updated state to DB

  return {
    playerId: player.id,
    seat: player.seat,
    snapshot,
  }

}


export async function roll(
  client: pg.PoolClient,
  params: { code: string; playerId: string }
): Promise<{ playerId: string; seat: number; snapshot: GameSnapshot }> {  

  const gameRes = await client.query(
    `SELECT * FROM games WHERE code = $1`,
    [params.code]
  )

  if (!gameRes.rowCount) {
    throw new Error("Game not found")
  }

  const snapshot = await getSnapshot(client, params.code)

  if (snapshot.players.find((p) => p.id === params.playerId)?.seat !== snapshot.state.turnSeat) {
    throw new Error("Not your turn")
  }

  //if not started, start now
  if (!snapshot.state.started) {
    snapshot.state.started = true;
    await saveState(client, snapshot.game.id, snapshot.state);
    await client.query(
    `INSERT INTO games (code, status)
     VALUES ($1, 'running')
     ON CONFLICT (code) DO UPDATE SET status = EXCLUDED.status
     RETURNING *`,
    [params.code]   
    );
  } 

  const { nextState, roll } = applyRoll(snapshot.state);
  nextState.lastRoll = roll;

  while (nextState.players[nextState.turnSeat].is_ai) {
    //AITURN SKIP FOR NOW - just pass turn to next player
    nextState.turnSeat = (nextState.turnSeat + 1) % 4;
  }

  await saveState(client, snapshot.game.id, nextState);

  return {
    playerId: params.playerId,
    seat: snapshot.state.turnSeat,
    snapshot: {
      game: snapshot.game,
      players: snapshot.players,
      state: nextState,
    }
  }
}

export async function move(
  client: pg.PoolClient,
  params: { code: string; playerId: string, tokenId: number }
): Promise<{ playerId: string; seat: number; snapshot: GameSnapshot }> {

// implement this so checks the ID, checks if it can move, applies last roll to mveo etc - also automate AI moves to skip turn

  const gameRes = await client.query(
    `SELECT * FROM games WHERE code = $1`,
    [params.code]
  )

  if (!gameRes.rowCount) {
    throw new Error("Game not found")
  }

  const snapshot = await getSnapshot(client, params.code)

  if (snapshot.players.find((p) => p.id === params.playerId)?.seat !== snapshot.state.turnSeat) {
    throw new Error("Not your turn")
  }

  const nextState = applyMove(snapshot.state, params.tokenId);

  while (nextState.players[nextState.turnSeat].is_ai) {
    //AITURN SKIP FOR NOW - just pass turn to next player
    nextState.turnSeat = (nextState.turnSeat + 1) % 4;
  }

  await saveState(client, snapshot.game.id, nextState);

  return {
    playerId: params.playerId,
    seat: nextState.turnSeat,
    snapshot: {
      game: snapshot.game,
      players: snapshot.players,
      state: nextState,
    }
  }

}

export async function getSnapshot(
  client: pg.PoolClient,
  code: string
): Promise<GameSnapshot> {
  const gameRes = await client.query(
    `SELECT * FROM games WHERE code = $1`,
    [code]
  )
  if (!gameRes.rowCount) throw new Error("Game not found")

  const game = gameRes.rows[0]

  const playersRes = await client.query(
    `SELECT * FROM players WHERE game_id = $1 ORDER BY seat`,
    [game.id]
  )

  const stateRes = await client.query(
    `SELECT state FROM game_states WHERE game_id = $1`,
    [game.id]
  )

  return {
    game,
    players: playersRes.rows,
    state: stateRes.rows[0].state,
  }
}

export async function saveState(client: pg.PoolClient, gameId: string, state: GameState): Promise<void> {
  await client.query(
    `INSERT INTO game_states (game_id, state)
     VALUES ($1, $2)
     ON CONFLICT (game_id) DO UPDATE SET state = EXCLUDED.state`,
    [gameId, state]
  );
}
