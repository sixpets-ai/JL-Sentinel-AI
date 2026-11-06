import { createClient } from "redis";
import { randomUUID } from "node:crypto";
import { RedisStore } from "rate-limit-redis";
import { logger } from "../logger";

const url = process.env.REDIS_URL ?? (process.env.NODE_ENV === "production" ? undefined : "redis://127.0.0.1:6379");
if (!url) throw new Error("REDIS_URL is required in production; use a private authenticated HA Redis service.");
export const redis = createClient({
  url, disableOfflineQueue: true,
  socket: { connectTimeout: 1500, reconnectStrategy: retries => Math.min(100 + retries * 200, 3000) },
});
redis.on("error", () => logger.warn("Redis unavailable; shared operations fail closed without exposing connection credentials"));
let connecting: Promise<unknown> | undefined;
export async function connectRedis() {
  if (redis.isReady) return;
  if (!redis.isOpen) connecting ??= redis.connect().finally(() => { connecting = undefined; });
  if (connecting) await connecting;
  if (!redis.isReady) throw new Error("Shared coordination unavailable.");
}
export function rateStore(name: string) {
  return new RedisStore({
    prefix: `santi:rate:${name}:`,
    sendCommand: async (...args: string[]) => {
      await connectRedis();
      return await redis.sendCommand(args) as never;
    },
  });
}
export async function cachedJson<T>(key: string, seconds: number, load: () => Promise<T>): Promise<T> {
  await connectRedis();
  const cacheKey = `santi:cache:${key}`, lock = `${cacheKey}:lock`, owner = randomUUID();
  const existing = await redis.get(cacheKey);
  if (existing !== null) return JSON.parse(existing) as T;
  if (!await redis.set(lock, owner, { NX: true, EX: 30 })) {
    for (let attempt = 0; attempt < 100; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const value = await redis.get(cacheKey);
      if (value !== null) return JSON.parse(value) as T;
      if (!await redis.exists(lock)) break;
    }
    throw new Error("Shared refresh in progress or failed; retry shortly.");
  }
  try {
    const value = await load();
    await redis.set(cacheKey, JSON.stringify(value), { EX: seconds });
    return value;
  } finally {
    await redis.eval("if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      { keys: [lock], arguments: [owner] }).catch(() => undefined);
  }
}
export async function acquireLease(key: string, seconds: number) {
  await connectRedis();
  const owner = randomUUID(), name = `santi:lease:${key}`;
  if (!await redis.set(name, owner, { NX: true, EX: seconds })) return null;
  return async () => {
    await redis.eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",
      { keys: [name], arguments: [owner] }).catch(() => undefined);
  };
}
