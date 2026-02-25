import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { env } from "./env.js";
import { makeLogger } from "./logger.js";
import { router } from "./routes.js";
import { pool } from "./db.js";
import { setupSockets } from "./socket.js";

const log = makeLogger(env.LOG_LEVEL as any);

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Basic request logging
  app.use((req, _res, next) => {
    log.info(`${req.method} ${req.url}`);
    next();
  });

  // DB liveness on health (optional lightweight query)
  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch (e: any) {
      log.error("health DB check failed", e?.message ?? e);
      res.status(500).json({ ok: false });
    }
  });

  app.use(router);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  setupSockets(io, log);

  server.listen(env.PORT, () => {
    log.info(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
