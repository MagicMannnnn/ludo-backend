import { io } from "socket.io-client"
import fs from "node:fs"
import path from "node:path"

/**
 * Simple CLI dummy client for testing backend routes + sockets.
 *
 * Option B: persists session to a file so you can do:
 *   npx tsx src/client.ts host George
 *   npx tsx src/client.ts roll
 *   npx tsx src/client.ts move 0
 *
 * Usage:
 *   npx tsx src/client.ts host George
 *   npx tsx src/client.ts join ABCDE Sam
 *   npx tsx src/client.ts roll
 *   npx tsx src/client.ts move 0
 *   npx tsx src/client.ts session
 *   npx tsx src/client.ts clear
 */

const API = process.env.API_URL || "http://localhost:3000"
const SESSION_FILE = path.resolve(process.cwd(), ".ludo-session.json")

type Mode = "host" | "join" | "roll" | "move" | "session" | "clear"

const args = process.argv.slice(2)
const mode = args[0] as Mode

type Session = { code: string; playerId: string }

function saveSession(code: string, playerId: string) {
  const s: Session = { code, playerId }
  fs.writeFileSync(SESSION_FILE, JSON.stringify(s, null, 2), "utf8")
}

function loadSession(): Session {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`No session found. Run "host" or "join" first. (${SESSION_FILE})`)
  }
  const raw = fs.readFileSync(SESSION_FILE, "utf8")
  const s = JSON.parse(raw) as Session
  if (!s?.code || !s?.playerId) throw new Error("Invalid session file")
  return s
}

function clearSession() {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE)
}

//----------------------------------------------------
// Helpers
//----------------------------------------------------

async function post(pathname: string, body: any) {
  const res = await fetch(`${API}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as any).error || "Request failed")
  return json
}

function connectSocket(code: string) {
  const socket = io(API, { transports: ["websocket", "polling"] })

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

  const code = String(res.code)
  const pid = String(res.playerId)

  saveSession(code, pid)

  console.log("🎮 Hosted game")
  console.log("Code:", code)
  console.log("Player ID:", pid)
  console.log("Saved session:", SESSION_FILE)

  // Keep process alive to watch realtime updates
  connectSocket(code)
  console.log("Listening for realtime updates... (Ctrl+C to exit)")
}

async function join(code: string, name: string) {
  const res = await post("/api/join", { code, name })

  const c = String(res.code)
  const pid = String(res.playerId)

  saveSession(c, pid)

  console.log("➡️ Joined game")
  console.log("Code:", c)
  console.log("Player ID:", pid)
  console.log("Saved session:", SESSION_FILE)

  // Keep process alive to watch realtime updates
  connectSocket(c)
  console.log("Listening for realtime updates... (Ctrl+C to exit)")
}

async function roll() {
  const s = loadSession()

  const res = await post("/api/roll", {
    code: s.code,
    playerId: s.playerId,
  })

  console.log("🎲 Rolled")
  console.dir(res, { depth: null })
}

async function move(tokenIndex: number) {
  const s = loadSession()

  const res = await post("/api/move", {
    code: s.code,
    playerId: s.playerId,
    move: { tokenIndex },
  })

  console.log("➡️ Move token", tokenIndex)
  console.dir(res, { depth: null })
}

function showSession() {
  const s = loadSession()
  console.log("📄 Current session")
  console.log("Code:", s.code)
  console.log("Player ID:", s.playerId)
  console.log("File:", SESSION_FILE)
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
      const code = (args[1] || "").trim().toUpperCase()
      const name = args[2] || "Player"
      if (!code) throw new Error("Missing game code")
      await join(code, name)
    } else if (mode === "roll") {
      await roll()
    } else if (mode === "move") {
      const idx = Number(args[1])
      if (Number.isNaN(idx)) throw new Error("Provide token index (number)")
      await move(idx)
    } else if (mode === "session") {
      showSession()
    } else if (mode === "clear") {
      clearSession()
      console.log("🧹 Session cleared:", SESSION_FILE)
    } else {
      console.log(`
Usage:
  npx tsx src/client.ts host George
  npx tsx src/client.ts join ABCDE Sam
  npx tsx src/client.ts roll
  npx tsx src/client.ts move 0
  npx tsx src/client.ts session
  npx tsx src/client.ts clear

Optional:
  API_URL=http://localhost:3000 npx tsx src/client.ts host George
`)
    }
  } catch (e: any) {
    console.error("❌", e.message)
    process.exitCode = 1
  }
}

main()