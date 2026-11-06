import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const dbRequire = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const { Pool } = dbRequire("pg");
const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:80";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

test("JWT access, roles, revocation, route simulation and original API remain functional", async () => {
  const username = `qa_${randomBytes(6).toString("hex")}`;
  const password = randomBytes(24).toString("hex");
  let userId;
  let cookie;
  const request = (path, method = "GET", body, session = cookie, extraHeaders = {}) => fetch(`${base}/api${path}`, {
    method,
    headers: { ...(session ? { Cookie: session } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  try {
    assert.equal((await request("/global/auth/me", "GET", undefined, "")).status, 401);
    const demo = await request("/global/tactical", "GET", undefined, "");
    assert.equal(demo.status, 200);
    const scenario = await demo.json();
    assert.equal(scenario.simulation, true);
    assert.equal(scenario.incidents.length, 6);
    assert.ok(scenario.heatpoints.every(point => point.weight > 0 && point.weight <= 1));
    const nodeIds = new Set(scenario.nodes.map(node => node.id));
    assert.ok(scenario.edges.every(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)));
    assert.equal((await request("/global/tactical/alerts", "GET", undefined, "")).status, 401);
    assert.equal((await request("/global/tactical/alerts", "POST", { incidentId: "demo-01" }, "")).status, 401);
    assert.equal((await request("/global/routes", "POST", { points: [] }, "")).status, 401);
    const created = await request("/global/auth/register", "POST", { username, password, role: "director" }, "");
    assert.equal(created.status, 201);
    const session = await created.json();
    userId = session.user.id;
    assert.equal(session.user.role, "ciudadano", "request-supplied role must never grant privileges");
    assert.equal("passwordHash" in session.user, false);
    const rawCookie = created.headers.get("set-cookie");
    assert.ok(/HttpOnly/i.test(rawCookie), "Session cookie must be HttpOnly");
    // Replit's iframe proxy can rewrite Strict to None + Secure. Origin checks
    // are tested independently below; never print a JWT in assertion output.
    assert.ok(/SameSite=(Strict|None)/i.test(rawCookie), "Expected a SameSite cookie attribute");
    if (/SameSite=None/i.test(rawCookie)) assert.ok(/Secure/i.test(rawCookie), "SameSite=None requires Secure");
    cookie = rawCookie.split(";")[0];
    assert.equal((await request("/global/auth/me")).status, 200);
    assert.equal((await request("/global/users")).status, 403);
    assert.equal((await request("/global/governance")).status, 403);
    assert.equal((await request("/global/tactical/alerts", "POST", { incidentId: "demo-01" })).status, 403);
    assert.equal((await request("/global/report", "POST", { topic: "earthquake" })).status, 403);
    assert.equal((await request("/global/auth/logout", "POST", undefined, cookie, { Origin: "https://attacker.invalid" })).status, 403);
    assert.equal((await request("/global/snapshot?topic=private_person")).status, 400);

    // Test-only promotion is restricted to this newly created fixture.
    await pool.query("UPDATE global_command_users SET role='oficial' WHERE id=$1", [userId]);
    assert.equal((await request("/global/tactical/alerts", "GET")).status, 200);
    assert.equal((await request("/global/tactical/alerts", "POST", { incidentId: "private-person" })).status, 400);
    assert.equal((await request("/global/tactical/alerts/not-a-uuid/report", "POST")).status, 400);
    assert.equal((await request("/global/tactical/alerts/00000000-0000-4000-8000-000000000000/report", "POST")).status, 404);
    const route = await request("/global/routes", "POST", { points: [
      { name: "A", lat: 0, lng: 0 }, { name: "B", lat: 0, lng: 1 },
    ] });
    assert.equal(route.status, 200);
    const result = await route.json();
    assert.equal(result.points.length, 2);
    assert.ok(result.distanceKm > 111 && result.distanceKm < 112);
    assert.match(result.algorithm, /no QPU/);
    assert.equal((await request("/global/routes", "POST", { points: [{ name: "X", lat: 300, lng: 0 }] })).status, 400);
    assert.equal((await request("/global/users")).status, 403);
    assert.equal((await request("/global/auth/logout", "POST")).status, 204);
    assert.equal((await request("/global/auth/me")).status, 401, "old JWT must be revoked server-side");
    assert.equal((await request("/global/auth/logout", "POST")).status, 204, "logout must also succeed for an already revoked session");
    assert.equal((await request("/santi/stats", "GET", undefined, "")).status, 200, "original route must stay available");
    const relogin = await request("/global/auth/login", "POST", { username, password }, "");
    assert.equal(relogin.status, 200);
    assert.equal((await relogin.json()).user.role, "oficial");
  } finally {
    if (userId) {
      await pool.query("DELETE FROM tactical_demo_alerts WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM global_command_briefs WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM global_command_users WHERE id=$1", [userId]);
    }
    await pool.end();
  }
});
