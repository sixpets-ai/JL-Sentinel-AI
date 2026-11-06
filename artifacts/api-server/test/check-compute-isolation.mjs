import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const requireDb = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const { Pool } = requireDb("pg");
const { createClient } = createRequire(new URL("../package.json", import.meta.url))("redis");
const kind = process.argv[2];
assert.ok(["quantum", "heatmap"].includes(kind));
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let cookie = "", userId;
async function request(path, body) {
  const response = await fetch(`${origin}/api${path}`, {
    method: body ? "POST" : "GET", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
  return { status: response.status, data: await response.json() };
}
try {
  const readiness = await request("/health/ready");
  assert.equal(readiness.status, 200, "Optional compute failure must not drain the core API.");
  assert.equal(readiness.data.status, "degraded");
  assert.equal(readiness.data[kind], false);
  assert.equal((await request("/santi/stats")).status, 200);
  assert.equal((await request("/global/catalog")).status, 200);
  if (kind === "quantum") {
    const auth = await request("/global/auth/register", {
      username: `qa_outage_${randomUUID().slice(0, 8)}`, password: randomBytes(24).toString("base64url"),
    });
    assert.equal(auth.status, 201);
    userId = auth.data.user.id;
    await pool.query("UPDATE global_command_users SET role='oficial' WHERE id=$1", [userId]);
    const calculation = await request("/global/routes", { points: [
      { name: "QA A", lat: 19.4, lng: -99.1 }, { name: "QA B", lat: 19.42, lng: -99.12 },
    ] });
    assert.equal(calculation.status, 503, "No fake successful route when its service is down.");
  } else {
    const redis = createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379" });
    redis.on("error", () => {});
    await redis.connect();
    await redis.del("santi:cache:scenario:rnid2026-iccs:v2");
    await redis.quit();
    assert.equal((await request("/global/tactical")).status, 503);
  }
  console.log(`${kind}: isolated 503; readiness degraded, core API and catalog still 200.`);
} finally {
  if (userId) await pool.query("DELETE FROM global_command_users WHERE id=$1", [userId]);
  await pool.end();
}
