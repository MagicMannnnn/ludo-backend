import express from "express";
import type { Server as IOServer } from "socket.io";
import * as service from "./game/service.js";

export const router = express.Router();

/**
 * IMPORTANT:
 * These are the ONLY game routes.
 * Each route should:
 * - validate input
 * - call service
 * - return JSON (see README suggested shapes)
 * - broadcast latest snapshot to ALL clients in the game room:
 *     io.to(`game:${code}`).emit('game_state', snapshot)
 */

router.post("/api/host", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim() || "Player";

    const out = await service.host(name);

    // Broadcast full snapshot to this game room
    const io = req.app.get("io") as IOServer;
    io.to(`game:${out.code}`).emit("game_state", { game: out.game, players: out.players, state: out.state });

    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});

router.post("/api/join", async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const name = String(req.body?.name || "").trim() || "Player";
    if (!code) throw new Error("Missing code");

    const out = await service.join(code, name);

    const io = req.app.get("io") as IOServer;
    io.to(`game:${code}`).emit("game_state", { game: out.game, players: out.players, state: out.state });

    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});

router.post("/api/roll", async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const playerId = String(req.body?.playerId || "").trim();
    if (!code) throw new Error("Missing code");
    if (!playerId) throw new Error("Missing playerId");

    let snap = await service.roll(code, playerId);

    let io = req.app.get("io") as IOServer;
    io.to(`game:${code}`).emit("game_state", snap);

    while (snap.state.players[snap.state.turnSeat].is_ai) {
      snap = await service.AIturn(code);
      io.to(`game:${code}`).emit("game_state", snap);
    }



    res.json(snap);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});

router.post("/api/move", async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const playerId = String(req.body?.playerId || "").trim();
    const tokenId = Number(req.body?.tokenId);
    if (!code) throw new Error("Missing code");
    if (!playerId) throw new Error("Missing playerId");
    if (isNaN(tokenId)) throw new Error("Missing tokenId");

    let snap = await service.move(code, playerId, tokenId);

    const io = req.app.get("io") as IOServer;
    console.log(io);
    io.to(`game:${code}`).emit("game_state", snap);

    while (snap.state.players[snap.state.turnSeat].is_ai) {
      snap = await service.AIturn(code);
      io.to(`game:${code}`).emit("game_state", snap);
    }

    res.json(snap);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});

router.post("/api/leave", async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const playerId = String(req.body?.playerId || "").trim();
    if (!code) throw new Error("Missing code");
    if (!playerId) throw new Error("Missing playerId");

    let snap = await service.leave(code, playerId);

    const io = req.app.get("io") as IOServer;
    console.log(io);
    io.to(`game:${code}`).emit("game_state", snap);

    while (snap.state.players[snap.state.turnSeat].is_ai) {
      snap = await service.AIturn(code);
      io.to(`game:${code}`).emit("game_state", snap);
    }

    res.json(snap);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});
