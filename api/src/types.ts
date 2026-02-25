export type GameStatus = "lobby" | "active" | "finished";

export type GameRow = {
  id: string;
  code: string;
  status: GameStatus;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: string;
  game_id: string;
  name: string;
  seat: number; // 0..3
  is_ai: boolean;
  created_at: string;
};

export type GameState = {
  started: boolean;
  finished?: boolean;
  turnSeat: number; // whose turn is it? 0..3
  lastRoll: number | null;
  board: BoardState;
  players: [PlayerState, PlayerState, PlayerState, PlayerState];
  };

export type PlayerState = {
  name: string;
  seat: number;
  is_ai: boolean;
  tokens: [Token, Token, Token, Token]; 
  waitingForTurn: boolean; // if true, this player has rolled and is waiting to make a move. if false, this player can roll (if it's their turn) or is waiting for their turn.
  finishingPosition?: number; // finishing position if player has finished (1 for first place, 2 for second, etc.)
};

export type Token = {
  id: number;
  position: number; // -1 not out, 0..mainLoopLength-1 on main loop, mainLoopLength..mainLoopLength+homeColumnLength-1 in home column
  madeItHome: boolean; // reached home column end
};

export type BoardState = {
  mainLoopLength: number;
  homeColumnLength: number;
  seatsStartingIndex: [number, number, number, number]; //main loop index for each seat's starting cell where token will spawn after rolling a 6
  seatsEndIndex: [number, number, number, number]; //main loop index for last cell before home column
  safeZoneIndex: number[]; // main loop indices of safe zones where tokens cannot be captured
};


export type GameSnapshot = {
  game: GameRow;
  players: PlayerRow[];
  state: GameState;
};

export type HostResponse = {
  code: string;
  playerId: string;
  seat: number; // 0..3
} & GameSnapshot;

export type JoinResponse = {
  code: string;
  playerId: string;
  seat: number; // 0..3
} & GameSnapshot;
