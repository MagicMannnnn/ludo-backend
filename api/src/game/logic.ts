import { randomUUID } from "crypto";
import type { GameState, TokenPos } from "../types.js";

/**
 * This is intentionally lightweight, to act as an "initial setup".
 * - Tokens start in yard (-1).
 * - A roll sets lastRoll (1..6).
 * - A move advances chosen token by lastRoll.
 * - If token in yard, it requires 6 to enter (goes to 0).
 * - Exact finish / captures / safe squares are NOT implemented here.
 */

export function createInitialState(seatToPlayerId: (string | null)[]): GameState {
  const tokens: TokenPos[][] = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => -1));
  return {
    version: 1,
    started: false,
    turnSeat: 0,
    lastRoll: null,
    tokens,
    seatToPlayerId,
    updatedAt: new Date().toISOString(),
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function canMoveToken(pos: TokenPos, roll: number): boolean {
  if (pos === -1) return roll === 6; // need 6 to enter
  if (pos >= 56) return false; // simplistic finished
  return true;
}

export function applyMove(state: GameState, seat: number, tokenIndex: number): GameState {
  if (!state.started) throw new Error("Game not started");
  if (seat !== state.turnSeat) throw new Error("Not your turn");
  if (state.lastRoll == null) throw new Error("Roll first");
  if (tokenIndex < 0 || tokenIndex > 3) throw new Error("Invalid tokenIndex");

  const roll = state.lastRoll;
  const pos = state.tokens[seat][tokenIndex];
  if (!canMoveToken(pos, roll)) throw new Error("No legal move for this token");

  const nextTokens = state.tokens.map((arr) => [...arr]) as TokenPos[][];

  if (pos === -1) {
    nextTokens[seat][tokenIndex] = 0;
  } else {
    nextTokens[seat][tokenIndex] = Math.min(56, pos + roll);
  }

  const nextSeat = (state.turnSeat + 1) % 4;
  return {
    ...state,
    tokens: nextTokens,
    lastRoll: null,
    turnSeat: nextSeat,
    updatedAt: new Date().toISOString(),
  };
}

export function startGame(state: GameState): GameState {
  return {
    ...state,
    started: true,
    turnSeat: 0,
    lastRoll: null,
    updatedAt: new Date().toISOString(),
  };
}

export function pickAiMove(state: GameState): { tokenIndex: number } {
  // pick first legal token, else token 0 (should be handled by caller)
  const roll = state.lastRoll ?? 0;
  const tokens = state.tokens[state.turnSeat];
  for (let i = 0; i < tokens.length; i++) {
    if (canMoveToken(tokens[i], roll)) return { tokenIndex: i };
  }
  return { tokenIndex: 0 };
}
