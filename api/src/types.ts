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

export type TokenPos = number; // -1 = in yard, 0..56 path index (placeholder scale)

export type GameState = {
  version: 1;
  started: boolean;
  turnSeat: number; // whose turn (0..3)
  lastRoll: number | null; // 1..6
  // Each seat has 4 tokens
  tokens: TokenPos[][];
  // For quick client rendering
  seatToPlayerId: (string | null)[];
  updatedAt: string;
};
