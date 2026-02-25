-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'lobby', -- lobby | active | finished
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  seat        INT NOT NULL CHECK (seat >= 0 AND seat < 4),
  is_ai       BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, seat)
);

-- Stores the full game state as JSON to keep the scaffold simple.
CREATE TABLE IF NOT EXISTS game_states (
  game_id     UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  state       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id);
