import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { authenticateCookie, trackSocket } from "./security";
import { getSnapshot, TOPICS, type Topic } from "./osint";
import { logger } from "../logger";

export function attachGlobalRealtime(server: HttpServer): Server {
  const io = new Server(server, {
    path: "/api/global/socket.io", transports: ["websocket"], maxHttpBufferSize: 4096,
    allowRequest: (req, done) => {
      let allowed = false;
      try {
        const origin = req.headers.origin;
        const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ?? req.headers.host;
        allowed = !!origin && new URL(origin).host === host;
      } catch { /* Invalid Origin is denied. */ }
      done(null, allowed);
    },
  });
  io.use(async (socket, next) => {
    try { socket.data.user = await authenticateCookie(socket.request.headers.cookie); next(); }
    catch { next(new Error("Sesión requerida.")); }
  });
  const publishPresence = () => io.emit("presence", { members: io.engine.clientsCount });
  io.on("connection", socket => {
    trackSocket(socket.data.user.id, socket);
    const expiry = setTimeout(() => socket.disconnect(true), 60 * 60 * 1000);
    expiry.unref();
    const sessionCheck = setInterval(() => {
      void authenticateCookie(socket.request.headers.cookie)
        .then(user => { socket.data.user = user; })
        .catch(() => socket.disconnect(true));
    }, 60000);
    sessionCheck.unref();
    let changedAt = 0;
    socket.on("topic:watch", (value: unknown) => {
      if (typeof value !== "string" || !TOPICS.includes(value as Topic) || Date.now() - changedAt < 1000) return;
      changedAt = Date.now();
      for (const room of socket.rooms) if (room.startsWith("topic:")) void socket.leave(room);
      void socket.join(`topic:${value}`);
    });
    socket.once("disconnect", () => { clearTimeout(expiry); clearInterval(sessionCheck); publishPresence(); });
    publishPresence();
  });
  const lastPublished = new Map<Topic, string>();
  const timer = setInterval(async () => {
    for (const topic of TOPICS) {
      if (!io.sockets.adapter.rooms.get(`topic:${topic}`)?.size) continue;
      try {
        const snapshot = await getSnapshot(topic);
        if (lastPublished.get(topic) !== snapshot.fetchedAt) {
          lastPublished.set(topic, snapshot.fetchedAt);
          io.to(`topic:${topic}`).emit("snapshot:updated", { topic, fetchedAt: snapshot.fetchedAt });
        }
      } catch { logger.warn({ topic }, "Public-source refresh failed"); }
    }
  }, 60000);
  timer.unref();
  io.on("close", () => clearInterval(timer));
  return io;
}
