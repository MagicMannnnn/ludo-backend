import { io } from "socket.io-client"

/**
 * Simple CLI dummy client for testing backend routes + sockets.
 *
 * Usage:
 *   npx tsx src/client.ts host George
 *   npx tsx src/client.ts join ABCDE Sam
 *   npx tsx src/client.ts roll
 *   npx tsx src/client.ts move 0
 */

const API = "http://localhost:3000"

type Mode = "host" | "join" | "roll" | "move"

const args = process.argv.slice(2)
const mode = args[0] as Mode

// Stored locally while process is alive
let gameCode: string | null = null
let playerId: string | null = null

//----------------------------------------------------
// Helpers
//----------------------------------------------------

async function post(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Request failed")
  return json
}

function connectSocket(code: string) {
  const socket = io(API)

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id)
    socket.emit("subscribe_game", { code })
  })

  socket.on("game_state", (state) => {
    console.log("\n📡 GAME STATE UPDATE")
    console.dir(state, { depth: null })
  })

  socket.on("error", (e) => {
    console.error("Socket error:", e)
  })

  return socket
}

//----------------------------------------------------
// Commands
//----------------------------------------------------

async function host(name: string) {
  const res = await post("/api/host", { name })

  gameCode = res.code
  playerId = res.playerId

  console.log("🎮 Hosted game")
  console.log("Code:", gameCode)
  console.log("Player ID:", playerId)

  connectSocket(gameCode!)
}

async function join(code: string, name: string) {
  const res = await post("/api/join", { code, name })

  gameCode = res.code
  playerId = res.playerId

  console.log("➡️ Joined game")
  console.log("Code:", gameCode)
  console.log("Player ID:", playerId)

  connectSocket(gameCode!)
}

async function roll() {
  if (!gameCode || !playerId) {
    console.log("No active session. Host or join first.")
    return
  }

  const res = await post("/api/roll", {
    code: gameCode,
    playerId,
  })

  console.log("🎲 Rolled")
  console.dir(res, { depth: null })
}

async function move(tokenIndex: number) {
  if (!gameCode || !playerId) {
    console.log("No active session. Host or join first.")
    return
  }

  const res = await post("/api/move", {
    code: gameCode,
    playerId,
    move: { tokenIndex },
  })

  console.log("➡️ Move token", tokenIndex)
  console.dir(res, { depth: null })
}

//----------------------------------------------------
// Entry
//----------------------------------------------------

async function main() {
  try {
    if (mode === "host") {
      const name = args[1] || "Player"
      await host(name)
    } else if (mode === "join") {
      const code = args[1]
      const name = args[2] || "Player"
      if (!code) throw new Error("Missing game code")
      await join(code, name)
    } else if (mode === "roll") {
      await roll()
    } else if (mode === "move") {
      const idx = Number(args[1])
      if (Number.isNaN(idx)) throw new Error("Provide token index")
      await move(idx)
    } else {
      console.log(`
Usage:
  npx tsx src/client.ts host George
  npx tsx src/client.ts join ABCDE Sam
  npx tsx src/client.ts roll
  npx tsx src/client.ts move 0
`)
    }
  } catch (e: any) {
    console.error("❌", e.message)
  }
}

main()