import { db, citizenCases, citizenEvents } from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { GetCitizenCaseResponse } from "@workspace/api-zod";
import { canonicalJson, LedgerError, sha256 } from "./ledger";
import type { SessionUser } from "./security";
import { simulatedUnit, type Dispatch } from "../../../../../shared/citizen-geo.mjs";

export const isAnalyst = (user: SessionUser) => ["analista", "oficial", "director"].includes(user.role);
export type CaseRow = typeof citizenCases.$inferSelect;
export type EventRow = typeof citizenEvents.$inferSelect;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const ZONES = {
  centro: { lat: 19.4326, lng: -99.1332 }, norte: { lat: 19.4588, lng: -99.1507 }, sur: { lat: 19.4023, lng: -99.1552 },
};

let guardsUntil = 0;
export async function ensureCitizenGuards() {
  if (guardsUntil > Date.now()) return;
  const found = await db.execute(sql`SELECT count(*)::int AS count FROM pg_trigger t
    JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=current_schema() AND c.relname IN ('citizen_cases','citizen_case_events')
    AND t.tgname IN ('santi_no_mutation','santi_no_truncate','santi_citizen_prepare')
    AND NOT t.tgisinternal AND t.tgenabled IN ('O','A')`);
  if (Number(found.rows[0]?.count) !== 6) throw new LedgerError(503, "Protecciones ciudadanas pendientes de instalar; no se guardó ningún expediente.");
  guardsUntil = Date.now() + 5000;
}

export async function accessCitizenCase(id: string, user: SessionUser) {
  if (user.role === "patrulla") throw new LedgerError(403, "Patrulla solo accede a su unidad y alertas asignadas, no a expedientes ni evidencias.");
  const [row] = await db.select().from(citizenCases).where(and(eq(citizenCases.id, id),
    ...(isAnalyst(user) ? [] : [eq(citizenCases.ownerId, user.id)]))).limit(1);
  if (!row) throw new LedgerError(404, "Expediente no disponible.");
  return row;
}

export async function citizenEventsFor(id: string, tx: Transaction | typeof db = db) {
  return tx.select().from(citizenEvents).where(eq(citizenEvents.caseId, id)).orderBy(asc(citizenEvents.id));
}
export async function lockCitizenCase(tx: Transaction, id: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"citizen:" + id},0))`);
}
export async function appendCitizenEvent(tx: Transaction, id: string, user: SessionUser,
  kind: EventRow["kind"], payload: Record<string, unknown>) {
  return tx.insert(citizenEvents).values({ caseId: id, actorId: user.id, kind, payload,
    previousHash: "", hash: "", canonical: "" }).returning();
}
export function latestDispatch(events: EventRow[]) {
  return events.filter(e => e.kind === "dispatch").at(-1)?.payload as Dispatch | undefined;
}
export function projectCitizenCase(row: CaseRow, events: EventRow[]) {
  let expected = row.originalHash;
  let chainValid = sha256(row.originalCanonical) === expected &&
    canonicalJson(JSON.parse(row.originalCanonical)) === canonicalJson(row.original);
  for (const event of events) {
    const parsed = JSON.parse(event.canonical);
    chainValid &&= event.previousHash === expected && sha256(event.canonical) === event.hash &&
      canonicalJson(parsed.payload) === canonicalJson(event.payload) && parsed.kind === event.kind &&
      parsed.actorId === event.actorId && parsed.id === event.id && parsed.caseId === row.id &&
      parsed.previousHash === expected && parsed.createdAt === event.createdAt.toISOString();
    expected = event.hash;
  }
  const dispatch = latestDispatch(events);
  const completed = events.some(e => e.kind === "completed");
  const unit = dispatch ? simulatedUnit(row.original.point, dispatch) : null;
  const evidence = events.filter(e => e.kind === "evidence").map(e => ({
    id: String(e.payload.id), filename: String(e.payload.filename), contentType: String(e.payload.contentType),
    size: Number(e.payload.size), sha256: String(e.payload.sha256), createdAt: e.createdAt.toISOString(),
    mode: "private_file" as const, verification: "server_sha256" as const,
  }));
  return GetCitizenCaseResponse.parse({
    id: row.id, ...row.original, reportPoint: row.original.point, simulation: true,
    originalHash: row.originalHash, chainValid,
    status: completed ? "completed" : unit ? unit.distanceMeters < 1 ? "arrived" : "active" : "registered",
    unit, evidence, timeline: events.map(e => ({
      id: e.id, kind: e.kind, createdAt: e.createdAt.toISOString(), hash: e.hash, previousHash: e.previousHash,
      summary: e.kind === "dispatch" ? "Recorrido ficticio iniciado; no se despachó una unidad real."
        : e.kind === "completed" ? "Ejercicio finalizado; original conservado."
        : "Archivo privado verificado con SHA-256 y vinculado sin alterar el original.",
    })),
  });
}
export async function citizenCaseView(row: CaseRow) {
  return projectCitizenCase(row, await citizenEventsFor(row.id));
}
