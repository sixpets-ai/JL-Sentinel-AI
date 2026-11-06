// Development-only integration test. Retains committed synthetic case originals
// and evidence. --keep-fixtures leaves ONLY generated QA roles active for a
// subsequent browser pass; revoke them immediately after that pass.
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { distanceMeters, simulatedUnit } from "../../../shared/citizen-geo.mjs";

const base = process.env.COMMUNITY_TEST_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`;
assert.ok(base.includes(".replit.dev"), "Only use the development preview, never production");
const prefix = `qa_enroll_${randomUUID().slice(0,8)}`;
const { Pool } = createRequire(new URL("../../../lib/db/package.json", import.meta.url))("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const fixture = { users: {}, caseId: "", evidenceId: "" };
const ids = [];
let successful = false;
async function api(path, { cookie, method = "GET", body } = {}) {
  const response = await fetch(`${base}/api/global${path}`, { method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : null;
  const raw = response.headers.getSetCookie().find(c => c.startsWith("santi_global_session=") && !c.startsWith("santi_global_session=;"));
  return { response, status: response.status, data, cookie: raw?.split(";")[0] };
}
try {
  assert.equal(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
  assert.ok(Math.abs(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: .001 }) - 111.195) < .01);
  const dispatch = { unitId: "TEST", unitLabel: "Ficticia", officerName: "Demo",
    dispatchId: "test", patrolUserId: null, startedAt: "2026-01-01T00:00:00.000Z" };
  const point = { lat: 19.4326, lng: -99.1332 };
  assert.ok(simulatedUnit(point, dispatch, Date.parse(dispatch.startedAt)).distanceMeters > 500);
  assert.ok(simulatedUnit(point, dispatch, Date.parse(dispatch.startedAt) + 40000).distanceMeters < 100);
  assert.equal(simulatedUnit(point, dispatch, Date.parse(dispatch.startedAt) + 45000).distanceMeters, 0);

  const policy = await api("/onboarding/policy");
  assert.equal(policy.status, 200);
  assert.equal(policy.data.storageAvailable, true, "Private App Storage must actually be configured");
  const enrollment = role => ({ requestedRole: role, consentAccepted: true, consentVersion: policy.data.version,
    biometricMode: "simulated", ...(role === "ciudadano" ? {} : { registrationId: "QA-FICTICIA", corporation: "Corporación ficticia de pruebas" }) });
  async function register(name, role) {
    const username = `${prefix}_${name}`, password = `QA-${randomBytes(24).toString("hex")}`;
    const result = await api("/auth/register", { method: "POST", body: { username, password, onboarding: enrollment(role), role: "director" } });
    assert.equal(result.status, 201);
    assert.equal(result.data.user.role, "ciudadano", "Role injection/request must never grant privileges");
    ids.push(result.data.user.id);
    fixture.users[name] = { username, password, id: result.data.user.id, cookie: result.cookie };
    return fixture.users[name];
  }
  const citizen = await register("citizen", "ciudadano");
  const other = await register("other", "ciudadano");
  const analyst = await register("analyst", "analista");
  const patrol = await register("patrol", "patrulla");
  const director = await register("director", "director");
  assert.equal((await api("/onboarding/profile", { cookie: patrol.cookie })).data.reviewStatus, "pending");
  assert.equal((await api("/patrol/assignments", { cookie: patrol.cookie })).status, 403);
  assert.equal((await api("/onboarding/profile", { method: "POST", cookie: citizen.cookie,
    body: { ...enrollment("ciudadano"), facialImage: "must-not-be-accepted" } })).status, 400);
  assert.equal((await api("/onboarding/profile", { method: "POST", cookie: citizen.cookie,
    body: { ...enrollment("ciudadano"), consentVersion: "stale" } })).status, 400);
  // Bootstrap only this generated QA account; do not touch pre-existing users.
  await pool.query("UPDATE global_command_users SET role='director', session_version=session_version+1 WHERE id=$1 AND username=$2", [director.id, director.username]);
  async function login(account) {
    const result = await api("/auth/login", { method: "POST", body: { username: account.username, password: account.password } });
    assert.equal(result.status, 200);
    account.cookie = result.cookie;
    return result.data.user;
  }
  assert.equal((await login(director)).role, "director");
  for (const [account, role] of [[analyst, "analista"], [patrol, "patrulla"]]) {
    const oldCookie = account.cookie;
    const approval = await api(`/onboarding/requests/${account.id}/decision`, { method: "POST", cookie: director.cookie,
      body: { approve: true, note: "Aprobación de QA ficticia, no acreditación institucional." } });
    assert.equal(approval.status, 200);
    assert.equal((await api("/auth/me", { cookie: oldCookie })).status, 401);
    assert.equal((await login(account)).role, role);
  }
  const created = await api("/citizen/cases", { method: "POST", cookie: citizen.cookie, body: {
    categoryCode: "RNID2026-004", zone: "centro", description: `Ejercicio ficticio QA ${prefix}; sin personas ni domicilios reales.`,
  } });
  assert.equal(created.status, 201);
  fixture.caseId = created.data.id;
  const originalHash = created.data.originalHash;
  assert.equal(created.data.chainValid, true);
  assert.equal((await api(`/citizen/cases/${fixture.caseId}`, { cookie: other.cookie })).status, 404);
  assert.equal((await api("/citizen/cases", { cookie: other.cookie })).data.some(c => c.id === fixture.caseId), false);
  assert.equal((await api("/citizen/cases", { cookie: patrol.cookie })).status, 403);
  assert.equal((await api(`/citizen/cases/${fixture.caseId}`, { cookie: patrol.cookie })).status, 403);
  assert.equal((await api("/tactical", { cookie: patrol.cookie })).data.nodes.length, 0);
  assert.ok((await api("/tactical", { cookie: analyst.cookie })).data.nodes.length > 0);

  const file = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+h8r8AAAAASUVORK5CYII=", "base64");
  const meta = { filename: "evidencia-ficticia-qa.png", contentType: "image/png", size: file.length,
    sha256: createHash("sha256").update(file).digest("hex") };
  const ticket = await api(`/citizen/cases/${fixture.caseId}/uploads`, { method: "POST", cookie: citizen.cookie, body: meta });
  assert.equal(ticket.status, 201, "Presigned upload authorization");
  const uploaded = await fetch(ticket.data.uploadURL, { method: "PUT", headers: { "Content-Type": meta.contentType }, body: file });
  assert.equal(uploaded.status, 200, "Cloud Storage really received the file");
  const receipt = await api(`/citizen/cases/${fixture.caseId}/evidence`, { method: "POST", cookie: citizen.cookie,
    body: { ...meta, uploadId: ticket.data.uploadId } });
  assert.equal(receipt.status, 201, "Server verified actual private bytes");
  assert.equal(receipt.data.originalHash, originalHash);
  assert.equal(receipt.data.chainValid, true);
  assert.equal(receipt.data.evidence[0].verification, "server_sha256");
  fixture.evidenceId = receipt.data.evidence[0].id;
  const downloadPath = `/citizen/evidence/${fixture.evidenceId}/content`;
  const download = await fetch(`${base}/api/global${downloadPath}`, { headers: { Cookie: citizen.cookie } });
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), file);
  assert.equal((await api(downloadPath)).status, 401);
  assert.equal((await api(downloadPath, { cookie: other.cookie })).status, 404);
  assert.equal((await api(downloadPath, { cookie: patrol.cookie })).status, 403);
  assert.equal((await api(`/citizen/cases/${fixture.caseId}/evidence`, { method: "POST", cookie: citizen.cookie,
    body: { ...meta, uploadId: ticket.data.uploadId } })).data.evidence.length, 1, "Finalization is idempotent");
  const denied = await api(`/citizen/cases/${fixture.caseId}`, { method: "PATCH", cookie: citizen.cookie, body: { folio: "ALTERADO" } });
  assert.equal(denied.status, 409);
  assert.equal(denied.data.recorded, true);
  assert.equal((await api(`/citizen/cases/${fixture.caseId}`, { cookie: analyst.cookie })).data.originalHash, originalHash);
  assert.equal((await api(`/citizen/cases/${fixture.caseId}/dispatch`, { method: "POST", cookie: citizen.cookie,
    body: { patrolUserId: patrol.id } })).status, 403);
  assert.equal((await api(`/citizen/cases/${fixture.caseId}/dispatch`, { method: "POST", cookie: analyst.cookie,
    body: { patrolUserId: patrol.id } })).status, 200);
  const assignments = await api("/patrol/assignments", { cookie: patrol.cookie });
  assert.equal(assignments.status, 200);
  const assigned = assignments.data.alerts.find(a => a.id === fixture.caseId);
  assert.ok(assigned);
  for (const forbidden of ["description", "ownerUsername", "evidence", "timeline", "registrationId"]) assert.equal(forbidden in assigned, false);
  const audit = await api("/mutation-attempts", { cookie: director.cookie });
  assert.ok(audit.data.some(a => a.stream === `citizen:${fixture.caseId}`));
  // Never print cookies, passwords or signed URLs.
  await writeFile("/tmp/santi-community-fixture.json", JSON.stringify(fixture), { mode: 0o600 });
  successful = true;
  console.log("PASS: Haversine, consent, role approval/revocation, owner isolation, private byte upload/hash/download, patrol filtering, immutable audit.");
  console.log("Browser fixture prepared at /tmp/santi-community-fixture.json. Committed synthetic originals/evidence retained.");
} finally {
  if ((!successful || !process.argv.includes("--keep-fixtures")) && ids.length) {
    await pool.query("UPDATE global_command_users SET role='ciudadano',session_version=session_version+1 WHERE id=ANY($1::int[]) AND username LIKE $2", [ids, `${prefix}%`]);
  }
  await pool.end();
}
