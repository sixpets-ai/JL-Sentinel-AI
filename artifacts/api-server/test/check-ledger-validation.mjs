// Optional negative API check against an explicitly supplied, owned QA specimen:
// node test/check-ledger-validation.mjs <synthetic-tactical-alert-uuid>
// No incident or ledger entry is created/modified/deleted by a passing check.
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
const requireDb = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const { Pool } = requireDb("pg");
const id = process.argv[2];
assert.match(id ?? "", /^[0-9a-f-]{36}$/);
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let userId, cookie = "";
const hash = token => createHash("sha256").update(token).digest("hex");
const request = async (path, body) => {
  const response = await fetch(`${origin}/api/global${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
  return { status: response.status, body: await response.json() };
};
try {
  const auth = await request("/auth/register", {
    username: `qa_val_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
    password: randomBytes(24).toString("base64url"),
  });
  assert.equal(auth.status, 201);
  userId = auth.body.user.id;
  await pool.query("UPDATE global_command_users SET role='director' WHERE id=$1", [userId]);
  const path = `/ledger/tactical/${id}`;
  const before = await request(path);
  assert.equal(before.status, 200);
  assert.equal(before.body.integrity, true);
  const intent = { action: "clarification", justification: "PRUEBA QA NEGATIVA: no debe registrar esta enmienda." };
  const consumed = await request(`${path}/validation`, intent);
  assert.equal(consumed.status, 201);
  await pool.query("UPDATE amendment_validations SET consumed_at=now() WHERE token_hash=$1 AND user_id=$2",
    [hash(consumed.body.validationToken), userId]);
  assert.equal((await request(`${path}/amendments`, { ...intent, validationToken: consumed.body.validationToken })).status, 409);
  const fresh = await request(`${path}/validation`, intent);
  assert.equal(fresh.status, 201);
  assert.equal((await request(`${path}/amendments`, {
    ...intent, justification: intent.justification + " Intención alterada.",
    validationToken: fresh.body.validationToken,
  })).status, 409);
  await pool.query("UPDATE amendment_validations SET expires_at=now()-interval '1 second' WHERE token_hash=$1 AND user_id=$2",
    [hash(fresh.body.validationToken), userId]);
  assert.equal((await request(`${path}/amendments`, { ...intent, validationToken: fresh.body.validationToken })).status, 409);
  const after = await request(path);
  assert.equal(after.body.record.entryCount, before.body.record.entryCount);
  assert.equal(after.body.record.originalHash, before.body.record.originalHash);
  assert.equal(after.body.original, before.body.original);
  console.log("Passed: consumed, altered-intent and expired validations rejected; no new ledger entry.");
} finally {
  if (userId) {
    const entries = await pool.query("SELECT count(*)::int n FROM incident_ledger WHERE actor_id=$1", [userId]);
    if (entries.rows[0].n) {
      // A failed test must not delete the evidence of that failure.
      await pool.query("UPDATE global_command_users SET role='ciudadano',session_version=session_version+1 WHERE id=$1", [userId]);
    } else {
      await pool.query("DELETE FROM amendment_validations WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM global_command_users WHERE id=$1", [userId]);
    }
  }
  await pool.end();
}
