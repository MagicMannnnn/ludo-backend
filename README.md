# Ludo Backend Skeleton (TypeScript) — Docker + Postgres + WebSockets (Socket.IO)

This is a **drop-in backend skeleton** for an online Ludo game.

✅ Only game routes included:
- `POST /api/host`
- `POST /api/join`
- `POST /api/roll`
- `POST /api/move`

✅ Realtime sync:
- Clients connect via Socket.IO and **subscribe** to a game room.
- Any successful route call broadcasts an updated **game snapshot** to **all** clients in that game room.
- No refresh required.

⚠️ This repo intentionally **does NOT implement Ludo logic**.
You will fill in the real game rules in `src/game/logic.ts` and persistence in `src/game/repo.ts`.

---

## Run (Docker)

```bash
cp .env.example .env
docker compose up --build
```

API: `http://localhost:3000`  
Socket.IO: `ws://localhost:3000`

---

## WebSocket usage (client)
- Connect to Socket.IO server.
- Subscribe to game updates:

Event: `subscribe_game`
Payload: `{ code: string }`

Server emits:
- `game_state` payload: `{ game: ..., players: ..., state: ... }`
- `error` payload: `{ message: string }`

---

## Routes

### 1) Host (create game)
`POST /api/host`

Request body:
```json
{ "name": "George" }
```

Response (suggested):
```json
{
  "code": "ABCDE",
  "playerId": "uuid",
  "seat": 0,
  "game": { ... },
  "players": [ ... ],
  "state": { ... }
}
```

Also broadcasts `game_state` to `game:ABCDE`.

### 2) Join (join existing)
`POST /api/join`

Request body:
```json
{ "code": "ABCDE", "name": "Sam" }
```

Response (suggested):
```json
{
  "code": "ABCDE",
  "playerId": "uuid",
  "seat": 2,
  "game": { ... },
  "players": [ ... ],
  "state": { ... }
}
```

Also broadcasts `game_state` to `game:ABCDE`.

### 3) Roll
`POST /api/roll`

Request body:
```json
{ "code": "ABCDE", "playerId": "uuid" }
```

Response (suggested):
```json
{ "game": { ... }, "players": [ ... ], "state": { ... } }
```

Also broadcasts `game_state` to `game:ABCDE`.

### 4) Move
`POST /api/move`

Request body:
```json
{ "code": "ABCDE", "playerId": "uuid", "move": { /* your move payload */ } }
```

Response (suggested):
```json
{ "game": { ... }, "players": [ ... ], "state": { ... } }
```

Also broadcasts `game_state` to `game:ABCDE`.

---

## Where to implement your game
- `src/game/logic.ts`  → implement Ludo rules (roll/move/turn validation)
- `src/game/repo.ts`   → implement DB reads/writes for games + state
- `src/game/service.ts`→ orchestrates: route request → load → validate → update → persist → return snapshot

---

## DB schema
See `db/init.sql`. Uses JSONB `game_states.state` for fast iteration.
