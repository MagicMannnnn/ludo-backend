import express from "express";
import { createGame, getGame, joinGame, move, roll, startIfNeeded } from "./game/service.js";

export const router = express.Router();

router.get("/health", async (_req, res) => {
  res.json({ ok: true });
});

router.post("/api/games", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim() || "Player";
    const out = await createGame(name);
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});

router.post("/api/games/join", async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const name = String(req.body?.name || "").trim() || "Player";
    const out = await joinGame(code, name);
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});

router.get("/api/games/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    const bundle = await getGame(code);
    res.json(bundle);
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? "Not found" });
  }
});

router.post("/api/games/:code/start", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    const bundle = await startIfNeeded(code);
    res.json(bundle);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});

router.post("/api/games/:code/roll", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    const playerId = String(req.body?.playerId || "").trim();
    const bundle = await roll(code, playerId);
    res.json(bundle);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});

router.post("/api/games/:code/move", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    const playerId = String(req.body?.playerId || "").trim();
    const tokenIndex = Number(req.body?.tokenIndex);
    const bundle = await move(code, playerId, tokenIndex);
    res.json(bundle);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Error" });
  }
});
