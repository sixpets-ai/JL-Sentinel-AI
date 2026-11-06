// Uses only the generated fixture; no new user accounts or paid AI requests.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const fixture = JSON.parse(await readFile("/tmp/santi-community-fixture.json", "utf8"));
const owner = fixture.users.citizen;
assert.ok(owner.username.startsWith("qa_enroll_"));
const base = `https://${process.env.REPLIT_DEV_DOMAIN}/api/global`;
const casePath = `${base}/citizen/cases/${fixture.caseId}`;
async function post(path, body) {
  const res = await fetch(path, { method: "POST", headers: { Cookie: owner.cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}
const original = await fetch(casePath, { headers: { Cookie: owner.cookie } }).then(r => r.json());
const badMime = await post(`${casePath}/uploads`, {
  filename: "no-permitido.svg", contentType: "image/svg+xml", size: 10, sha256: "0".repeat(64),
});
assert.equal(badMime.status, 400);
const badBytes = Buffer.from("Texto de QA ficticio; no es una imagen PNG.");
const invalidMeta = { filename: "no-es-imagen.png", contentType: "image/png", size: badBytes.length,
  sha256: createHash("sha256").update(badBytes).digest("hex") };
const invalidTicket = await post(`${casePath}/uploads`, invalidMeta);
assert.equal(invalidTicket.status, 201);
assert.equal((await fetch(invalidTicket.data.uploadURL, { method: "PUT", headers: { "Content-Type": "image/png" }, body: badBytes })).status, 200);
assert.equal((await post(`${casePath}/evidence`, { ...invalidMeta, uploadId: invalidTicket.data.uploadId })).status, 400);
const afterInvalid = await fetch(casePath, { headers: { Cookie: owner.cookie } }).then(r => r.json());
assert.equal(afterInvalid.evidence.length, original.evidence.length, "Rejected content must not produce a receipt");

const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+h8r8AAAAASUVORK5CYII=", "base64");
const meta = { filename: "inmutabilidad-bytes-qa.png", contentType: "image/png", size: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex") };
const ticket = await post(`${casePath}/uploads`, meta);
assert.equal(ticket.status, 201);
assert.equal((await fetch(ticket.data.uploadURL, { method: "PUT", headers: { "Content-Type": "image/png" }, body: bytes })).status, 200);
const receipt = await post(`${casePath}/evidence`, { ...meta, uploadId: ticket.data.uploadId });
assert.equal(receipt.status, 201);
// Reusing the still-valid temporary URL must NEVER overwrite confirmed bytes.
assert.equal((await fetch(ticket.data.uploadURL, { method: "PUT", headers: { "Content-Type": "image/png" }, body: badBytes })).status, 200);
const download = await fetch(`${base}/citizen/evidence/${ticket.data.uploadId}/content`, { headers: { Cookie: owner.cookie } });
assert.equal(download.status, 200);
assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
assert.equal((await post(`${casePath}/evidence`, { ...meta, sha256: "0".repeat(64), uploadId: ticket.data.uploadId })).status, 409);
const final = await fetch(casePath, { headers: { Cookie: owner.cookie } }).then(r => r.json());
assert.equal(final.originalHash, original.originalHash);
assert.equal(final.chainValid, true);
assert.equal(final.evidence.length, original.evidence.length + 1);
console.log("PASS: disallowed MIME, spoofed media rejected, rejected uploads unsealed, replayed PUT cannot replace evidence, hash conflicts denied, original/chain preserved.");
