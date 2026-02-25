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
      safeZoneIndex: [0, 8, 13, 21, 26, 34, 39, 47],
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


export function LegalMovesCount(state: GameState): number {
  const seat = state.turnSeat;
  const roll = state.lastRoll;
  if (!roll) return 0;

  return state.players[seat].tokens.filter(t => {
    if (t.madeItHome) return false;
    if (t.position === -1) return roll === 6;
    if (t.position + roll > state.board.mainLoopLength + state.board.homeColumnLength) return false; // cannot move beyond home
    return true; 
  }).length;
}



export function applyRoll(state: GameState): { nextState: GameState; roll: number } {
  
  const roll = Math.floor(Math.random() * 6) + 1;
  state.lastRoll = roll;

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
      if (token.position === state.board.seatsEndIndex[state.turnSeat] + 1) {
        token.position = state.board.mainLoopLength + 1; // move to first cell of home column
      }
    }

    // handle reaching end of home column
    if (token.position === state.board.mainLoopLength + state.board.homeColumnLength) {
      token.madeItHome = true;
    }

    if (token.position > state.board.mainLoopLength + state.board.homeColumnLength) { 
      token.position -= roll;    
      throw new Error("Invalid move, cannot move beyond home");
    }
  }


  state.players[state.turnSeat].waitingForTurn = false; // move applied, no longer waiting for player's move

  //check to see if other players' tokens are captured and not on safe zone (sent back to base)
  let captured = false;
  for (let p of state.players) {
    if (p.seat === state.turnSeat) continue; // skip current player's tokens
    for (let t of p.tokens) {
      if (t.position === token.position && !state.board.safeZoneIndex.includes(t.position)) {
        t.position = -1; // send captured token back to base
        captured = true;
      }
    }
  }

  if (roll !== 6 && !captured) {
    // advance turn to next player
    state.turnSeat = (state.turnSeat + 1) % 4;
    let count = 0;
    while (state.players[state.turnSeat].finishingPosition) {
      state.turnSeat = (state.turnSeat + 1) % 4;
      count++;
      if (count > 3) {
        break; // all players finished, break to avoid infinite loop
      }
    }
  }

  // check if player has finished
  if (state.players[state.turnSeat].tokens.every(t => t.madeItHome)) {
    const finishingPosition = state.players.filter(p => p.finishingPosition).length + 1;
    state.players[state.turnSeat].finishingPosition = finishingPosition;
  }

  return state;
}


export function AIMove(state: GameState): { nextState: GameState; roll: number } {

  //check if game over
  if (state.players.filter(p => p.finishingPosition).length >= 3) {
    state.finished = true;
    return { nextState: state, roll: 0 };
  }

  let { nextState, roll } = applyRoll(state);

  if (nextState.players[nextState.turnSeat].waitingForTurn) {
    for (let token of nextState.players[nextState.turnSeat].tokens) {
      try {
        const newState = applyMove({ ...nextState }, token.id);
        nextState = newState;
        break;
      } catch (e) {
        
      }
    }
    if (nextState.players[nextState.turnSeat].waitingForTurn) {
      nextState.players[nextState.turnSeat].waitingForTurn = false;
      nextState.turnSeat = (nextState.turnSeat + 1) % 4;
    }
  }

  return { nextState, roll };
}