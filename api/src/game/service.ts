import { tx } from "../db.js";
import type { GameSnapshot, HostResponse, JoinResponse } from "../types.js";
import * as repo from "./repo.js";
import * as logic from "./logic.js";

/**
 * Service/orchestration layer.
 * Pattern:
 * - load snapshot
 * - check player permission / turn
 * - apply logic (roll/move)
 * - persist state
 * - return the new snapshot
 */

export async function host(name: string): Promise<HostResponse> {
  return tx(async (client) => {
    const out = await repo.createGame(client, { hostName: name });
    return { code: out.code, playerId: out.hostPlayerId, seat: out.hostSeat, ...out.snapshot };
  });
}

export async function join(code: string, name: string): Promise<JoinResponse> {
  return tx(async (client) => {
    const out = await repo.joinGame(client, { code, name });
    return { code, playerId: out.playerId, seat: out.seat, ...out.snapshot };
  });
}

export async function roll(code: string, playerId: string): Promise<GameSnapshot> {
    return tx(async (client) => {
    const out = await repo.roll(client, { code, playerId });
    return { code, playerId: out.playerId, seat: out.seat, ...out.snapshot };
  });
}

export async function move(code: string, playerId: string, tokenId: number): Promise<GameSnapshot> {
  return tx(async (client) => {
    const out = await repo.move(client, { code, playerId, tokenId });
    return { code, playerId: out.playerId, seat: out.seat, ...out.snapshot };
  });
}

export async function AIturn(code: string): Promise<GameSnapshot> {
  return tx(async (client) => {
    const out = await repo.AIturn(client, code);
    return { code, playerId: out.playerId, seat: out.seat, ...out.snapshot };
  });
}

export async function leave(code: string, playerId: string): Promise<GameSnapshot> {
  return tx(async (client) => {
    const out = await repo.leave(client, { code, playerId });
    return { code, playerId: out.playerId, seat: out.seat, ...out.snapshot };
  });
}
