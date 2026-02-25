import type { Server } from "socket.io";
import type { Logger } from "./socket_types.js";
import { tx } from "./db.js";
import * as repo from "./game/repo.js";

/**
 * Socket.IO only does:
 * - allow clients to join a room for a game code
 * - emit the current snapshot upon subscribe (recommended)
 *
 * State updates are broadcast from HTTP routes after they commit.
 */
export function setupSockets(io: Server, log: Logger) {
  io.on("connection", (socket) => {
    log.info(`socket connected ${socket.id}`);

    socket.on("disconnect", (reason) => {
      log.info(`socket disconnected ${socket.id} (${reason})`);
    });

    socket.on("subscribe_game", async (payload: any) => {
      try {
        const code = String(payload?.code || "").trim().toUpperCase();
        if (!code) throw new Error("Missing code");

        await socket.join(`game:${code}`);

        // Emit current snapshot to the subscriber
        const snap = await tx((client) => repo.getSnapshot(client, code));
        socket.emit("game_state", snap);
      } catch (e: any) {
        socket.emit("error", { message: e?.message ?? "Error" });
      }
    });
  });
}
