import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { env } from "./env.js";
import { makeLogger } from "./logger.js";
import { router } from "./routes.js";
import { setupSockets } from "./socket.js";

const log = makeLogger(env.LOG_LEVEL as any);

process.on("unhandledRejection", (err) => {
  // eslint-disable-next-line no-console
  console.error("unhandledRejection", err);
});
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("uncaughtException", err);
});

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use((req, _res, next) => {
    log.info(`${req.method} ${req.url}`);
    next();
  });

  const server = http.createServer(app);

  const io = new Server(server, { cors: { origin: "*" } });
  app.set("io", io); // ✅ allow routes to broadcast after DB commit

  setupSockets(io, log);

  app.use(router);

  server.listen(env.PORT, () => {
    log.info(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
