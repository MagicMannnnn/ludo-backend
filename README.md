# Ludo Online Backend (TypeScript) — Docker + Postgres + WebSockets

This is an initial backend setup for an online Ludo website:
- **Create game** and **join game** (via REST or WebSockets)
- **4 seats per game**
- Empty seats are filled with **AI placeholders** (they can be replaced by humans when they join)
- **Socket.IO** used for realtime game updates
- **Postgres** persists game + player + state

> This is an MVP scaffold. The Ludo rules/move validation are intentionally minimal so you can iterate quickly on the frontend + rules later.

## Quick start (Docker)

```bash
cd ludo-backend
cp .env.example .env
docker compose up --build
```

API will be at: `http://localhost:3000`  
Healthcheck: `GET http://localhost:3000/health`  
Socket.IO: `ws://localhost:3000` (Socket.IO transport)

## REST API

### Create
```bash
curl -X POST http://localhost:3000/api/games   -H "Content-Type: application/json"   -d '{"name":"George"}'
```

### Join
```bash
curl -X POST http://localhost:3000/api/games/join   -H "Content-Type: application/json"   -d '{"code":"ABCDE","name":"Sam"}'
```

### Get game
```bash
curl http://localhost:3000/api/games/ABCDE
```

### Roll dice
```bash
curl -X POST http://localhost:3000/api/games/ABCDE/roll   -H "Content-Type: application/json"   -d '{"playerId":"..."}'
```

### Move a token (very light validation)
```bash
curl -X POST http://localhost:3000/api/games/ABCDE/move   -H "Content-Type: application/json"   -d '{"playerId":"...","tokenIndex":0}'
```

## WebSocket events (Socket.IO)

Connect, then:

- `create_game` payload: `{ name: string }`
- `join_game` payload: `{ code: string, name: string }`
- `subscribe_game` payload: `{ code: string }` (join the game room)

Server emits:
- `game_state` payload: `{ game: ..., players: ..., state: ... }`
- `error` payload: `{ message: string }`

And accepts:
- `roll` payload: `{ code: string, playerId: string }`
- `move` payload: `{ code: string, playerId: string, tokenIndex: number }`

## Notes / next steps

- Replace the placeholder movement logic with full Ludo rules (safe squares, capture, home lanes, exact rolls, etc.).
- Add auth (JWT) and reconnect/resume semantics.
- Add rate limiting + input validation (Zod).
- Add background job for AI turns or run AI on-demand (current implementation runs AI immediately when it's their turn).
