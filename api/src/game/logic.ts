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
        waitingForTurn: false,
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
        waitingForTurn: false,
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
        waitingForTurn: false,
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
        waitingForTurn: false,
      },
    ],
  };
}




export function applyRoll(state: GameState): { nextState: GameState; roll: number } {

  if (state.players[state.turnSeat].is_ai) {
    state.turnSeat = (state.turnSeat + 1) % 4; // skip AI turn for now
    return { nextState: state, roll: 0 };
  }
  
  const roll = Math.floor(Math.random() * 6) + 1;

  let canGo = false;
  if (roll !== 6) {
    for (let token of state.players[state.turnSeat].tokens) {
      if (token.position !== -1) {
        canGo = true;
        break;
      }
    }
  }else {
    canGo = true; // if roll is 6, player can always move (either move a token out of base or move an existing token)
  }

  if (!canGo) {
    // pass turn to next player
    state.turnSeat = (state.turnSeat + 1) % 4;
  } else {
    state.players[state.turnSeat].waitingForTurn = true; // player must now choose a move
  }

  return { nextState: state, roll };
}

export function applyMove(state: GameState, tokenId: number): GameState {
  

  const token = state.players[state.turnSeat].tokens.find(t => t.id === tokenId);
  if (!token) {
    throw new Error("Invalid tokenId");
  }

  if (token.madeItHome) {
    throw new Error("Token already home");
  }

  const roll = state.lastRoll;
  if (!roll) {
    throw new Error("No roll to apply");
  }

  if (token.position === -1) {
    if (roll !== 6) {
      throw new Error("Must roll a 6 to move token out of base");
    }
    token.position = state.board.seatsStartingIndex[state.turnSeat];
  } else {
    for (let i = 0; i < roll; i++) {
      token.position += 1;

      // handle looping around main board
      if (token.position === state.board.mainLoopLength) {
        token.position = 0;
      }

      // handle entering home column
      if (token.position === state.board.seatsEndIndex[state.turnSeat]) {
        token.position = state.board.mainLoopLength + 1; // move to first cell of home column
        break;
      }
    }

    // handle reaching end of home column
    if (token.position === state.board.mainLoopLength + state.board.homeColumnLength) {
      token.madeItHome = true;
    }
  }


  state.players[state.turnSeat].waitingForTurn = false; // move applied, no longer waiting for player's move

  if (roll !== 6) {
    // advance turn to next player
    state.turnSeat = (state.turnSeat + 1) % 4;
  }

  return state;
}
