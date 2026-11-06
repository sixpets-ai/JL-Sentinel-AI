import cluster from "node:cluster";
import os from "node:os";
import { readFileSync } from "node:fs";
import { logger } from "./lib/logger";

export function allocatedCores() {
  let count = os.availableParallelism();
  try {
    const [quota, period] = readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim().split(/\s+/);
    if (quota !== "max") count = Math.min(count, Math.max(1, Math.ceil(Number(quota) / Number(period))));
  } catch { /* Non-cgroup hosts use OS CPU affinity. */ }
  const override = Number(process.env.CLUSTER_WORKERS ?? count);
  if (!Number.isInteger(override) || override < 1 || override > count) throw new Error("CLUSTER_WORKERS must be within allocated CPU cores.");
  return override;
}
if (cluster.isPrimary) {
  const count = allocatedCores();
  let stopping = false, crashes: number[] = [];
  const fork = () => cluster.fork({
    DB_POOL_MAX: String(Math.max(1, Math.floor(20 / count))),
    // All workers share Redis and PostgreSQL, not in-memory auth/session state.
  });
  logger.info({ workers: count }, "Starting supervised Node cluster on allocated cores");
  for (let i = 0; i < count; i++) fork();
  cluster.on("exit", (worker, code, signal) => {
    if (stopping) return;
    crashes = crashes.filter(time => time > Date.now() - 60000);
    crashes.push(Date.now());
    const delay = Math.min(1000 * 2 ** Math.min(crashes.length - 1, 5), 30000);
    logger.warn({ worker: worker.process.pid, code, signal, restartInMs: delay }, "Worker exited; supervisor will replace it");
    setTimeout(() => { if (!stopping) fork(); }, delay);
  });
  for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    for (const worker of Object.values(cluster.workers ?? {})) worker?.process.kill("SIGTERM");
    const timer = setTimeout(() => process.exit(1), 15000);
    timer.unref();
  });
} else {
  await import("./index");
}
