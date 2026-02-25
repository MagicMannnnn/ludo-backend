import type pg from "pg";
import { tx } from "../db.js";
import type { GameRow, GameState, PlayerRow } from "../types.js";

export type GameBundle = {
  game: GameRow;
  players: PlayerRow[];
  state: GameState;
};

export async function getGameByCode(code: string): Promise<GameRow | null> {
  const { rows } = await tx(async (c) => {
    const r = await c.query<GameRow>("SELECT * FROM games WHERE code = $1", [code]);
    return { rows: r.rows as any };
  });
  return rows[0] ?? null;
}

export async function getBundleByCode(code: string): Promise<GameBundle | null> {
  return tx(async (c) => {
    const g = await c.query<GameRow>("SELECT * FROM games WHERE code=$1", [code]);
    const game = g.rows[0];
    if (!game) return null;

    const p = await c.query<PlayerRow>("SELECT * FROM players WHERE game_id=$1 ORDER BY seat ASC", [game.id]);

    const s = await c.query<{ state: GameState }>("SELECT state FROM game_states WHERE game_id=$1", [game.id]);
    const state = s.rows[0]?.state as unknown as GameState;

    return {
      game,
      players: p.rows as any,
      state,
    };
  });
}

export async function saveState(gameId: string, state: GameState, client?: pg.PoolClient): Promise<void> {
  const runner = async (c: pg.PoolClient) => {
    await c.query(
      `INSERT INTO game_states(game_id, state, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (game_id) DO UPDATE SET state=$2::jsonb, updated_at=now()`,
      [gameId, JSON.stringify(state)]
    );
    await c.query("UPDATE games SET updated_at=now() WHERE id=$1", [gameId]);
  };

  if (client) return runner(client);
  await tx(async (c) => {
    await runner(c);
    return null;
  });
}
