import { Router, type IRouter } from "express";
import { HealthCheckResponse, GetProcessLivenessResponse, GetServiceReadinessResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { redis } from "../lib/infrastructure/redis";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
router.get("/health/live", (_req, res) => {
  res.json(GetProcessLivenessResponse.parse({ status: "alive", worker: process.pid }));
});
router.get("/health/ready", async (_req, res): Promise<void> => {
  const check = async (fn: () => Promise<unknown>) => { try { await fn(); return true; } catch { return false; } };
  const compute = async (url: string) => {
    const response = await fetch(new URL("/health", url), { signal: AbortSignal.timeout(1000), redirect: "error" });
    await response.body?.cancel();
    if (!response.ok) throw new Error();
  };
  const [database, shared, heatmap, quantum] = await Promise.all([
    check(() => db.execute(sql`SELECT 1`)), check(() => redis.ping()),
    check(() => compute(process.env.HEATMAP_SERVICE_URL ?? "http://127.0.0.1:8008")),
    check(() => compute(process.env.QUANTUM_SERVICE_URL ?? "http://127.0.0.1:8099")),
  ]);
  res.status(database && shared ? 200 : 503).json(GetServiceReadinessResponse.parse({
    status: !database || !shared ? "unavailable" : !heatmap || !quantum ? "degraded" : "ready",
    worker: process.pid, database, redis: shared, heatmap, quantum,
  }));
});

export default router;
