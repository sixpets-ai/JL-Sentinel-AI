import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { authenticateCookie, trackSocket, setDistributedDisconnect } from "./security";
import { getSnapshot, TOPICS, type Topic } from "./osint";
import { logger } from "../logger";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis, acquireLease } from "../infrastructure/redis";

export async function attachGlobalRealtime(server: HttpServer): Promise<Server> {
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
  const publisher = redis.duplicate(), subscriber = redis.duplicate();
  const unavailable = () => {
    logger.warn("Realtime coordination unavailable; disconnecting local authenticated sockets");
    io.local.disconnectSockets(true);
  };
  publisher.on("error", unavailable); subscriber.on("error", unavailable);
  redis.on("reconnecting", unavailable);
  await Promise.all([publisher.connect(), subscriber.connect()]);
  io.adapter(createAdapter(publisher, subscriber));
  setDistributedDisconnect(userId => io.in(`user:${userId}`).disconnectSockets(true));
  io.use(async (socket, next) => {
    try {
      if (!redis.isReady || !publisher.isReady || !subscriber.isReady) throw new Error();
      socket.data.user = await authenticateCookie(socket.request.headers.cookie); next();
    }
    catch { next(new Error("Sesión requerida.")); }
  });
  const publishPresence = async () => {
    await redis.zRemRangeByScore("santi:ws:presence", "-inf", Date.now());
    io.emit("presence", { members: await redis.zCard("santi:ws:presence") });
  };
  io.on("connection", socket => {
    void socket.join(`user:${socket.data.user.id}`);
    trackSocket(socket.data.user.id, socket);
    const renewPresence = async () => {
      await redis.set(`santi:ws:session:${socket.id}`, JSON.stringify({
        userId: socket.data.user.id, sessionVersion: socket.data.user.sessionVersion, worker: process.pid,
      }), { EX: 90 });
      await redis.zAdd("santi:ws:presence", { score: Date.now() + 90000, value: socket.id });
    };
    void renewPresence().then(publishPresence).catch(() => socket.disconnect(true));
    const expiry = setTimeout(() => socket.disconnect(true), 60 * 60 * 1000);
    expiry.unref();
    const sessionCheck = setInterval(() => {
      void authenticateCookie(socket.request.headers.cookie)
        .then(async user => { socket.data.user = user; await renewPresence(); })
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
    socket.once("disconnect", () => {
      clearTimeout(expiry); clearInterval(sessionCheck);
      void Promise.all([redis.del(`santi:ws:session:${socket.id}`), redis.zRem("santi:ws:presence", socket.id)])
        .then(publishPresence).catch(() => undefined);
    });
  });
  const lastPublished = new Map<Topic, string>();
  const timer = setInterval(async () => {
    for (const topic of TOPICS) {
      if (!io.sockets.adapter.rooms.get(`topic:${topic}`)?.size) continue;
      let release: (() => Promise<void>) | null = null;
      try {
        release = await acquireLease(`publish:${topic}`, 55);
        if (!release) continue;
        const snapshot = await getSnapshot(topic);
        if (lastPublished.get(topic) !== snapshot.fetchedAt) {
          lastPublished.set(topic, snapshot.fetchedAt);
          io.to(`topic:${topic}`).emit("snapshot:updated", { topic, fetchedAt: snapshot.fetchedAt });
        }
      } catch { logger.warn({ topic }, "Public-source refresh failed"); }
      finally { await release?.(); }
    }
  }, 60000);
  timer.unref();
  server.once("close", () => {
    clearInterval(timer); redis.off("reconnecting", unavailable);
    void Promise.allSettled([publisher.quit(), subscriber.quit()]);
  });
  return io;
}
