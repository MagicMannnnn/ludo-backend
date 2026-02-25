import type { PlayerRow, PlayerState, GameState } from "../types.js";

/**
 * Implement your Ludo rules here.
 *
 * Suggested responsibilities:
 * - validate whose turn it is
 * - produce a dice roll
 * - compute legal moves
 * - apply a move to state (tokens, captures, home, etc.)
 * - advance turn (and handle extra turn rules for rolling 6, etc.)
 */

export function createInitialState(): GameState {
  // TODO: return your initial state
  return {
    started: false,
    turnSeat: 0,
    lastRoll: null,
    board: {
      mainLoopLength: 52,
      homeColumnLength: 6,
      seatsStartingIndex: [0, 13, 26, 39],
      seatsEndIndex: [50, 11, 24, 37],
    },
    players: [
      {
        name: "Player 1",
        seat: 0,
        is_ai: false,
        tokens: [
          { id: 1, position: -1, madeItHome: false },
          { id: 2, position: -1, madeItHome: false },
          { id: 3, position: -1, madeItHome: false },
          { id: 4, position: -1, madeItHome: false },
        ],
      },
      {
        name: "AI 1",
        seat: 1,
        is_ai: true,
        tokens: [
          { id: 1, position: -1, madeItHome: false },
          { id: 2, position: -1, madeItHome: false },
          { id: 3, position: -1, madeItHome: false },
          { id: 4, position: -1, madeItHome: false },
        ],
      },
      {
        name: "AI 2",
        seat: 2,
        is_ai: true,
        tokens: [
          { id: 1, position: -1, madeItHome: false },
          { id: 2, position: -1, madeItHome: false },
          { id: 3, position: -1, madeItHome: false },
          { id: 4, position: -1, madeItHome: false },
        ],
      },
      {
        name: "AI 3",
        seat: 3,
        is_ai: true,
        tokens: [
          { id: 1, position: -1, madeItHome: false },
          { id: 2, position: -1, madeItHome: false },
          { id: 3, position: -1, madeItHome: false },
          { id: 4, position: -1, madeItHome: false },
        ],
      },
    ],
  };
}






export function applyRoll(state: GameState): { nextState: GameState; roll: number } {
  // TODO: implement roll logic
  throw new Error("applyRoll not implemented");
}

export function applyMove(state: GameState, move: unknown): GameState {
  // TODO: implement move logic using your move payload type
  throw new Error("applyMove not implemented");
}

export function hasAnyLegalMove(state: GameState): boolean {
  // TODO: detect if current player can move after rolling; if not, pass turn
  return true;
}
