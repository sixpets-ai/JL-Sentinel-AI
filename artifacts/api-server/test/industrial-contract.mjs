// One synthetic report, bounded infrastructure checks. Never delete audit data.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { AGENCY_PROFILES, agencyMethodPrompt } from "../../../shared/agency-profiles.mjs";
const requireDb = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const requireUi = createRequire(new URL("../../santi/package.json", import.meta.url));
const { Pool } = requireDb("pg");
const { createClient } = createRequire(new URL("../package.json", import.meta.url))("redis");
const { io } = requireUi("socket.io-client");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const redis = createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379" });
redis.on("error", () => {});
let cookie = "", userId, alertId, retained = false;
const sockets = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(path, method = "GET", body) {
  const response = await fetch(`${origin}/api${path}`, {
    method, headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json", Connection: "close" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}
try {
  await redis.connect();
  assert.equal(Object.keys(AGENCY_PROFILES).length, 6);
  for (const id of Object.keys(AGENCY_PROFILES)) assert.match(agencyMethodPrompt(id), /NO representas/);
  const ready = await request("/health/ready");
  assert.equal(ready.status, 200);
  assert.equal(ready.data.status, "ready");
  const sampled = new Set((await Promise.all(Array.from({ length: 16 }, () => request("/health/live")))).map(r => r.data.worker));
  assert.ok(sampled.size > 1, "HTTP must be distributed across workers.");
  const primary = (await readFile(`/proc/${[...sampled][0]}/status`, "utf8")).match(/^PPid:\s+(\d+)/m)[1];
  const workers = new Set(execFileSync("ps", ["-o", "pid=", "--ppid", primary], { encoding: "utf8" }).trim().split(/\s+/).map(Number));
  assert.equal(workers.size, 4, "This development container has four allocated cores; proxy sampling need not hit every worker.");

  const registered = await request("/global/auth/register", "POST", {
    username: `qa_cluster_${randomUUID().slice(0, 8)}`, password: randomBytes(24).toString("base64url"),
  });
  assert.equal(registered.status, 201);
  userId = registered.data.user.id;
  await pool.query("UPDATE global_command_users SET role='director' WHERE id=$1", [userId]);
  const scenario = await request("/global/tactical");
  assert.equal(scenario.status, 200);
  const incident = scenario.data.incidents.find(item => item.id === "demo-01");
  const initial = await pool.query("SELECT observations FROM agent_pattern_counts WHERE code=$1", [incident.catalogCode]);
  const initialCount = initial.rows[0]?.observations ?? 0;
  // Pass an existing QA-owned specimen to recheck infrastructure without another
  // paid Gemini request. Never reuse an actual user's record.
  const reuse = process.argv[2];
  let created;
  if (reuse) {
    const specimen = await pool.query(
      "SELECT a.payload FROM tactical_demo_alerts a JOIN global_command_users u ON u.id=a.user_id WHERE a.id=$1 AND u.username LIKE 'qa_cluster_%'", [reuse]);
    assert.equal(specimen.rows.length, 1);
    const versions = await pool.query("SELECT data->'snapshot' snapshot FROM incident_ledger WHERE stream=$1 AND event_type IN ('route','report') ORDER BY sequence DESC LIMIT 1", [`tactical:${reuse}`]);
    created = { status: 201, data: versions.rows[0]?.snapshot ?? specimen.rows[0].payload };
    const points = [{ name: "Base QA ficticia", lat: 19.4, lng: -99.1 }, { name: "Destino QA ficticio", lat: 19.42, lng: -99.12 }];
    assert.equal((await request("/global/routes", "POST", { points })).status, 200);
    const quantum = await fetch("http://127.0.0.1:8099/optimize", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points, mode: "quantum_demo" }),
    });
    assert.equal(quantum.status, 200);
    assert.match((await quantum.json()).algorithm, /Grover.*no QPU/);
  } else {
    // Exactly one Gemini invocation, local quantum simulation, no actual IBM QPU.
    created = await request("/global/tactical/alerts", "POST", { incidentId: incident.id });
  }
  assert.equal(created.status, 201);
  alertId = created.data.id;
  retained = true;
  if (!reuse) assert.equal(created.data.routeStatus, "ready");
  assert.ok(["ready", "failed"].includes(created.data.reportStatus));
  const learned = await pool.query("SELECT observations FROM agent_pattern_counts WHERE code=$1", [incident.catalogCode]);
  assert.equal(learned.rows[0].observations, reuse ? initialCount : initialCount + 1);
  assert.ok(learned.rows[0].observations >= 1);
  const path = `/global/ledger/tactical/${alertId}`;
  const before = (await request(path)).data;
  assert.equal(before.integrity, true);
  const attempted = [];
  for (const method of ["PATCH", "DELETE"]) {
    const rejected = await request(path, method, { folio: "QA_FORBIDDEN_REPLACEMENT" });
    assert.equal(rejected.status, 409);
    assert.equal(rejected.data.recorded, true);
    attempted.push(rejected.data.requestId);
  }
  const audit = await request("/global/mutation-attempts");
  assert.equal(audit.status, 200);
  assert.equal(audit.data.filter(item => attempted.includes(item.requestId) && item.outcome === "database_rejected").length, 2);
  const after = (await request(path)).data;
  assert.equal(after.record.originalHash, before.record.originalHash);
  assert.equal(after.original, before.original);
  assert.equal(after.entries.length, before.entries.length);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assert.rejects(client.query("UPDATE incident_mutation_attempts SET outcome='tampered' WHERE request_id=$1", [attempted[0]]), /SANTI_APPEND_ONLY/);
  } finally { await client.query("ROLLBACK"); client.release(); }

  await Promise.all(Array.from({ length: 12 }, () => new Promise((resolve, reject) => {
    const socket = io(origin, {
      path: "/api/global/socket.io", transports: ["websocket"], forceNew: true, reconnection: false,
      extraHeaders: { Origin: origin, Cookie: cookie }, timeout: 7000,
    });
    sockets.push(socket);
    socket.once("connect", resolve); socket.once("connect_error", reject);
  })));
  await pause(200);
  const records = await Promise.all(sockets.map(socket => redis.get(`santi:ws:session:${socket.id}`)));
  assert.equal(records.filter(Boolean).length, 12);
  const socketWorkers = new Set(records.map(value => JSON.parse(value).worker));
  assert.ok(socketWorkers.size > 1, "WebSockets must span multiple workers.");
  const disconnected = sockets.map(socket => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Cross-worker revocation timed out")), 4000);
    socket.once("disconnect", () => { clearTimeout(timeout); resolve(); });
  }));
  // Save the JWT only in memory; request() replaces cookies with the clearing cookie.
  assert.equal((await request("/global/auth/logout", "POST")).status, 204);
  await Promise.all(disconnected);

  const victim = [...workers][0];
  assert.match(await readFile(`/proc/${victim}/cmdline`, "utf8"), /dist\/cluster.mjs/);
  process.kill(victim, "SIGKILL");
  let replacement = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    const samples = await Promise.all(Array.from({ length: 8 }, () => request("/health/live")));
    assert.ok(samples.every(sample => sample.status === 200));
    // Proxy keep-alive may keep all probes on surviving workers. Verify the
    // replacement process independently instead of assuming random sampling.
    const live = execFileSync("ps", ["-o", "pid=", "--ppid", primary], { encoding: "utf8" }).trim().split(/\s+/).map(Number);
    if (live.length === workers.size && live.some(pid => !workers.has(pid))) { replacement = true; break; }
    await pause(1000);
  }
  assert.equal(replacement, true, "Primary must replace a killed worker.");
  console.log(JSON.stringify({
    passed: true, workers: workers.size, socketWorkers: socketWorkers.size,
    socketsRevokedAcrossWorkers: sockets.length, workerReplaced: true,
    auditAttemptsPreserved: attempted.length, originalUnchanged: true,
    incrementalSyntheticObservation: reuse ? "existing_sample_verified" : 1,
    reportStatus: created.data.reportStatus, retainedSyntheticAlert: alertId,
  }));
} finally {
  for (const socket of sockets) socket.disconnect();
  if (userId) {
    if (retained) await pool.query("UPDATE global_command_users SET role='ciudadano',session_version=session_version+1 WHERE id=$1", [userId]);
    else await pool.query("DELETE FROM global_command_users WHERE id=$1", [userId]);
  }
  await redis.quit(); await pool.end();
}
