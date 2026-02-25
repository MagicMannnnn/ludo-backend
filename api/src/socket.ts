import type { Server } from "socket.io";
import { createGame, joinGame, getGame, roll, move, startIfNeeded } from "./game/service.js";
import type { Logger } from "./socket_types.js";

export function setupSockets(io: Server, log: Logger) {
  io.on("connection", (socket) => {
    log.info(`socket connected ${socket.id}`);

    socket.on("disconnect", (reason) => {
      log.info(`socket disconnected ${socket.id} (${reason})`);
    });

    socket.on("subscribe_game", async (payload: any) => {
      try {
        const code = String(payload?.code || "").trim().toUpperCase();
        await socket.join(`game:${code}`);
        const bundle = await getGame(code);
        io.to(`game:${code}`).emit("game_state", bundle);
      } catch (e: any) {
        socket.emit("error", { message: e?.message ?? "Error" });
      }
    });

    socket.on("create_game", async (payload: any) => {
      try {
        const name = String(payload?.name || "").trim() || "Player";
        const out = await createGame(name);
        const bundle = await getGame(out.code);
        await socket.join(`game:${out.code}`);
        io.to(`game:${out.code}`).emit("game_state", bundle);
        socket.emit("created", out);
      } catch (e: any) {
        socket.emit("error", { message: e?.message ?? "Error" });
      }
    });

    socket.on("join_game", async (payload: any) => {
      try {
        const code = String(payload?.code || "").trim().toUpperCase();
        const name = String(payload?.name || "").trim() || "Player";
        const out = await joinGame(code, name);
        const bundle = await getGame(code);
        await socket.join(`game:${code}`);
        io.to(`game:${code}`).emit("game_state", bundle);
        socket.emit("joined", out);
      } catch (e: any) {
        socket.emit("error", { message: e?.message ?? "Error" });
      }
    });

    socket.on("start", async (payload: any) => {
      try {
        const code = String(payload?.code || "").trim().toUpperCase();
        const bundle = await startIfNeeded(code);
        io.to(`game:${code}`).emit("game_state", bundle);
      } catch (e: any) {
        socket.emit("error", { message: e?.message ?? "Error" });
      }
    });

    socket.on("roll", async (payload: any) => {
      try {
        const code = String(payload?.code || "").trim().toUpperCase();
        const playerId = String(payload?.playerId || "").trim();
        const bundle = await roll(code, playerId);
        io.to(`game:${code}`).emit("game_state", bundle);
      } catch (e: any) {
        socket.emit("error", { message: e?.message ?? "Error" });
      }
    });

    socket.on("move", async (payload: any) => {
      try {
        const code = String(payload?.code || "").trim().toUpperCase();
        const playerId = String(payload?.playerId || "").trim();
        const tokenIndex = Number(payload?.tokenIndex);
        const bundle = await move(code, playerId, tokenIndex);
        io.to(`game:${code}`).emit("game_state", bundle);
      } catch (e: any) {
        socket.emit("error", { message: e?.message ?? "Error" });
      }
    });
  });
}
