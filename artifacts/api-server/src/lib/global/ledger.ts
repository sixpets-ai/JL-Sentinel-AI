import { createHash } from "node:crypto";
import { db, incidentLedger } from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { GetRecordLedgerResponse, ListSealedRecordsResponse } from "@workspace/api-zod";
import type { SessionUser } from "./security";

export type RecordKind = "tactical" | "nexus";
export class LedgerError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
export function canonicalJson(value: unknown): string {
  const sort = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(sort);
    if (item && typeof item === "object") return Object.fromEntries(
      Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, val]) => [key, sort(val)]),
    );
    return item;
  };
  return JSON.stringify(sort(value));
}
export function recordStream(kind: string, id: string): string {
  if ((kind === "tactical" && /^[0-9a-f-]{36}$/i.test(id)) ||
      (kind === "nexus" && /^[1-9]\d{0,9}$/.test(id))) return `${kind}:${id}`;
  throw new LedgerError(400, "Folio o tipo de registro inválido.");
}
let readyUntil = 0;
export async function ensureLedgerReady() {
  if (readyUntil > Date.now()) return;
  const result = await db.execute(sql`
    SELECT count(*)::int AS n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    WHERE NOT t.tgisinternal AND t.tgenabled='O'
    AND c.relname IN ('incident_reports','tactical_demo_alerts','incident_ledger','incident_mutation_attempts')
    AND t.tgname IN ('santi_no_mutation','santi_no_truncate','santi_original_seal','santi_ledger_prepare')`);
  if (Number(result.rows[0]?.n) !== 11) {
    throw new LedgerError(503, "Falta instalar o habilitar el sellado de base de datos. No se aceptan incidentes sin protección.");
  }
  readyUntil = Date.now() + 5000;
}
export async function accessRecord(kind: RecordKind, id: string, user: SessionUser, write = false) {
  const stream = recordStream(kind, id);
  await ensureLedgerReady();
  const result = kind === "tactical"
    ? await db.execute(sql`SELECT to_jsonb(r) AS original FROM tactical_demo_alerts r WHERE id=${id}`)
    : await db.execute(sql`SELECT to_jsonb(r) AS original FROM incident_reports r WHERE id=${Number(id)}`);
  const original = result.rows[0]?.original as Record<string, unknown> | undefined;
  if (!original || (kind === "tactical" && original.user_id !== user.id && user.role !== "director")) {
    throw new LedgerError(404, "Registro no encontrado en tu ámbito autorizado.");
  }
  const canWrite = kind === "tactical" ? original.user_id === user.id || user.role === "director" : user.role === "director";
  if (write && !canWrite) throw new LedgerError(403, "Solo dirección puede anotar registros históricos sin titular de cuenta verificable.");
  return { stream, original, canWrite };
}
export async function recordLedger(kind: RecordKind, id: string, user: SessionUser) {
  const access = await accessRecord(kind, id, user);
  const entries = await db.select().from(incidentLedger).where(eq(incidentLedger.stream, access.stream))
    .orderBy(asc(incidentLedger.sequence));
  if (!entries.length || entries[0].eventType !== "recorded") throw new LedgerError(503, "El original no está sellado.");
  const original = entries[0].data.original;
  const originalCanonical = canonicalJson(original);
  const originalHash = sha256(originalCanonical);
  let previousHash = "0".repeat(64);
  let integrity = canonicalJson(original) === canonicalJson(access.original);
  for (const [i, entry] of entries.entries()) {
    try {
      const envelope = JSON.parse(entry.canonical);
      integrity &&= entry.sequence === i + 1 && entry.previousHash === previousHash &&
        entry.hash === sha256(entry.canonical) && entry.payloadHash === sha256(entry.dataCanonical) &&
        canonicalJson(JSON.parse(entry.dataCanonical)) === canonicalJson(entry.data) &&
        canonicalJson(envelope) === canonicalJson({
          version: 1, stream: entry.stream, sequence: entry.sequence, eventType: entry.eventType,
          data: entry.data, actorId: entry.actorId, actor: entry.actor,
          createdAt: entry.createdAt.toISOString(), previousHash: entry.previousHash, payloadHash: entry.payloadHash,
        });
    } catch { integrity = false; }
    previousHash = entry.hash;
  }
  const amendments = entries.filter(entry => entry.eventType === "amendment");
  const status = amendments.some(entry => entry.data.action === "cancellation")
    ? "cancellation_recorded" : amendments.length ? "amended" : "registered";
  const base = access.original;
  const payload = base.payload as { folio?: string; createdAt?: string } | undefined;
  return GetRecordLedgerResponse.parse({
    record: {
      kind, id, folio: payload?.folio ?? base.folio, createdAt: payload?.createdAt ?? base.created_at,
      originalHash, status, entryCount: entries.length, canWrite: access.canWrite && integrity,
    },
    original: JSON.stringify(original, null, 2), originalCanonical,
    entries: entries.map(entry => ({
      id: entry.id, sequence: entry.sequence, eventType: entry.eventType,
      data: JSON.stringify(entry.data, null, 2), actor: entry.actor, createdAt: entry.createdAt.toISOString(),
      hash: entry.hash, previousHash: entry.previousHash, payloadHash: entry.payloadHash, canonical: entry.canonical,
    })),
    integrity,
    integrityDetail: integrity
      ? "SHA-256, secuencia, contenido, vínculo de hashes y original actual coinciden. No acredita veracidad, custodia física ni resistencia a un administrador de base de datos."
      : "La verificación no coincide. No se permite anexar sobre esta cadena hasta investigar la discrepancia.",
  });
}
export async function listSealedRecords(user: SessionUser) {
  await ensureLedgerReady();
  const result = await db.execute(sql`
    SELECT 'tactical' AS kind, id, payload->>'folio' AS folio, created_at AS created
    FROM tactical_demo_alerts WHERE user_id=${user.id} OR ${user.role === "director"}
    UNION ALL
    SELECT 'nexus' AS kind, id::text, folio, created_at AS created FROM incident_reports
    ORDER BY created DESC LIMIT 50`);
  // At most 50 records. Summaries are verified, not trusted from a cached badge.
  const summaries = [];
  for (const row of result.rows) {
    const ledger = await recordLedger(row.kind as RecordKind, String(row.id), user);
    summaries.push(ledger.record);
  }
  return ListSealedRecordsResponse.parse(summaries);
}
export async function latestTacticalPayload(id: string, original: Record<string, unknown>) {
  const snapshots = await db.select({ data: incidentLedger.data }).from(incidentLedger)
    .where(and(eq(incidentLedger.stream, `tactical:${id}`), sql`${incidentLedger.eventType} IN ('route', 'report')`))
    .orderBy(sql`${incidentLedger.sequence} DESC`).limit(1);
  return snapshots[0]?.data.snapshot ?? original;
}
