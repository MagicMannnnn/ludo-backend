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
    // TODO:
    // 1) const snap = await repo.getSnapshot(client, code)
    // 2) validate playerId is in this game + it is their turn
    // 3) const { nextState, roll } = logic.applyRoll(snap.state)
    // 4) if !logic.hasAnyLegalMove(nextState) => pass turn (your rule)
    // 5) await repo.saveState(client, snap.game.id, nextState)
    // 6) return await repo.getSnapshot(client, code)
    throw new Error("service.roll not implemented");
  });
}

export async function move(code: string, playerId: string, movePayload: unknown): Promise<GameSnapshot> {
  return tx(async (client) => {
    // TODO:
    // 1) const snap = await repo.getSnapshot(client, code)
    // 2) validate playerId is in this game + it is their turn
    // 3) const nextState = logic.applyMove(snap.state, movePayload)
    // 4) await repo.saveState(client, snap.game.id, nextState)
    // 5) return await repo.getSnapshot(client, code)
    throw new Error("service.move not implemented");
  });
}
