import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";

const requireDb = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const { Pool } = requireDb("pg");
const digest = value => createHash("sha256").update(value, "utf8").digest("hex");

test("DB enforces immutable originals, hashed append sequence, immutable identity and transaction rollback", async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const folio = `QA-ROLLBACK-${randomUUID()}`;
  const expectBlocked = async (query, args, expected = /SANTI_APPEND_ONLY/) => {
    await client.query("SAVEPOINT blocked_attempt");
    try { await assert.rejects(client.query(query, args), expected); }
    finally { await client.query("ROLLBACK TO SAVEPOINT blocked_attempt"); }
  };
  try {
    await client.query("BEGIN");
    const result = await client.query("INSERT INTO incident_reports(folio,tipo,agente) VALUES($1,'Prueba transaccional','QA') RETURNING id", [folio]);
    const id = result.rows[0].id;
    await expectBlocked("UPDATE incident_reports SET folio='mutated' WHERE id=$1", [id]);
    await expectBlocked("DELETE FROM incident_reports WHERE id=$1", [id]);
    await expectBlocked("TRUNCATE incident_reports", []);
    const stream = `nexus:${id}`;
    const first = (await client.query("SELECT * FROM incident_ledger WHERE stream=$1", [stream])).rows[0];
    assert.equal(first.sequence, 1);
    assert.equal(first.hash, digest(first.canonical));
    assert.equal(first.payload_hash, digest(first.data_canonical));
    assert.equal(first.data.original.folio, folio);
    await client.query("INSERT INTO incident_ledger(stream,event_type,data,actor) VALUES($1,'evidence',$2::jsonb,'QA')",
      [stream, JSON.stringify({ device: "cctv", reference: "QA solo transacción", contentVerification: "declared_not_verified" })]);
    const entries = (await client.query("SELECT * FROM incident_ledger WHERE stream=$1 ORDER BY sequence", [stream])).rows;
    assert.equal(entries[1].sequence, 2);
    assert.equal(entries[1].previous_hash, first.hash);
    assert.equal(entries[1].hash, digest(entries[1].canonical));
    await expectBlocked("UPDATE incident_ledger SET actor='spoof' WHERE id=$1", [first.id]);
    await expectBlocked("DELETE FROM incident_ledger WHERE id=$1", [first.id]);
    await expectBlocked("TRUNCATE incident_ledger", []);

    const user = await client.query("INSERT INTO global_command_users(username,password_hash,role) VALUES($1,'transaction-only','oficial') RETURNING id",
      [`qa_tx_${randomUUID().replaceAll("-", "")}`]);
    const alertId = randomUUID();
    const payload = { id: alertId, folio, simulation: true, report: "", reportStatus: "pending", route: null, routeStatus: "not_required" };
    await client.query("INSERT INTO tactical_demo_alerts(id,user_id,payload) VALUES($1,$2,$3)", [alertId, user.rows[0].id, payload]);
    await expectBlocked("UPDATE tactical_demo_alerts SET payload='{}' WHERE id=$1", [alertId]);
    await expectBlocked("DELETE FROM tactical_demo_alerts WHERE id=$1", [alertId]);
    await expectBlocked("TRUNCATE tactical_demo_alerts", []);
    await client.query("INSERT INTO incident_ledger(stream,event_type,data,actor) VALUES($1,'report',$2,'QA')",
      [`tactical:${alertId}`, { snapshot: { ...payload, report: "Versión añadida", reportStatus: "ready" } }]);
    await expectBlocked("INSERT INTO incident_ledger(stream,event_type,data,actor) VALUES($1,'report',$2,'QA')",
      [`tactical:${alertId}`, { snapshot: { ...payload, folio: "FALSE-FOLIO" } }], /SANTI_IMMUTABLE_IDENTITY/);
    await expectBlocked("INSERT INTO incident_ledger(stream,event_type,data,actor) VALUES($1,'recorded',$2,'QA')",
      [stream, { original: {} }], /original already sealed/);

    // Rolled-back actions leave neither an amendment nor a consumed token.
    const tokenHash = randomUUID();
    await client.query("SAVEPOINT failed_seal");
    await client.query("INSERT INTO amendment_validations(token_hash,stream,user_id,original_hash,intent_hash,expires_at) VALUES($1,$2,$3,'hash','intent',now()+interval '5 minutes')",
      [tokenHash, stream, user.rows[0].id]);
    await client.query("UPDATE amendment_validations SET consumed_at=now() WHERE token_hash=$1", [tokenHash]);
    await client.query("ROLLBACK TO SAVEPOINT failed_seal");
    assert.equal((await client.query("SELECT count(*)::int n FROM amendment_validations WHERE token_hash=$1", [tokenHash])).rows[0].n, 0);
  } finally {
    await client.query("ROLLBACK");
    assert.equal((await client.query("SELECT count(*)::int n FROM incident_reports WHERE folio=$1", [folio])).rows[0].n, 0);
    client.release();
    await pool.end();
  }
});
