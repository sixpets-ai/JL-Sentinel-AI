import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { attachGlobalRealtime } from "./lib/global/realtime";
import { connectRedis, redis } from "./lib/infrastructure/redis";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
await connectRedis();
const io = await attachGlobalRealtime(server);
server.listen(port, () => {
  logger.info({ port, pid: process.pid }, "Server listening");
});
server.on("error", err => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  server.close();
  io.local.disconnectSockets(true);
  io.close(() => {
    void Promise.allSettled([redis.quit(), pool.end()]).then(() => process.exit(0));
  });
});
