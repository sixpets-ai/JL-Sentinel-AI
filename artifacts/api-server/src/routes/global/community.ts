import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, citizenCases, citizenEvents, globalUsers, onboardingProfiles } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import {
  ReviewEnrollmentBody, CreateCitizenCaseBody, StartCitizenDispatchBody, AppendCitizenEvidenceBody,
  RequestCitizenUploadBody, GetCitizenCaseParams, ReviewEnrollmentParams, DownloadCitizenEvidenceParams,
} from "@workspace/api-zod";
import { requireRole, disconnectUser, type SessionUser } from "../../lib/global/security";
import { enrollmentProfile, enrollmentValues, requireEnrollment, validateEnrollment } from "../../lib/global/onboarding";
import { isAnalyst, accessCitizenCase, citizenCaseView, citizenEventsFor, latestDispatch,
  lockCitizenCase, appendCitizenEvent, ensureCitizenGuards, projectCitizenCase, ZONES } from "../../lib/global/citizen";
import { requestPrivateUpload, finalizePrivateUpload, servePrivateEvidence } from "../../lib/global/citizen-storage";
import { LedgerError } from "../../lib/global/ledger";
import { getCrimeCatalog } from "../../lib/global/catalog";
import { rateStore } from "../../lib/infrastructure/redis";
import { rejectIncidentMutation } from "../../lib/global/mutation-audit";

const router = Router();
const userOf = (res: { locals: Record<string, unknown> }) => res.locals.user as SessionUser;
const writes = rateLimit({ store: rateStore("community-writes"), windowMs: 3600000, limit: 100,
  keyGenerator: (_req, res) => String(userOf(res).id), standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Límite de operaciones del ejercicio alcanzado; espera antes de continuar." } });
router.use((req, res, next) => ["GET", "HEAD"].includes(req.method) ? next() : writes(req, res, next));

router.get("/onboarding/profile", async (_req, res) => { res.json(await enrollmentProfile(userOf(res))); });
router.post("/onboarding/profile", async (req, res) => {
  const user = userOf(res), input = validateEnrollment(req.body);
  const values = enrollmentValues(user, input);
  await db.insert(onboardingProfiles).values(values).onConflictDoUpdate({ target: onboardingProfiles.userId, set: values });
  res.json(await enrollmentProfile(user));
});
router.get("/onboarding/requests", requireRole("director"), async (_req, res) => {
  const rows = await db.select({ user: globalUsers }).from(onboardingProfiles)
    .innerJoin(globalUsers, eq(onboardingProfiles.userId, globalUsers.id))
    .where(sql`${onboardingProfiles.requestedRole} <> 'ciudadano'`)
    .orderBy(desc(onboardingProfiles.consentedAt)).limit(100);
  res.json(await Promise.all(rows.map(row => enrollmentProfile(row.user))));
});
router.post("/onboarding/requests/:userId/decision", requireRole("director"), async (req, res) => {
  const params = ReviewEnrollmentParams.safeParse(req.params), body = ReviewEnrollmentBody.strict().safeParse(req.body);
  if (!params.success || !body.success || body.data.note.trim().length < 5) throw new LedgerError(400, "Solicitud o motivo de revisión inválido.");
  const director = userOf(res), target = params.data.userId;
  if (target === director.id) throw new LedgerError(400, "No puedes aprobar tu propio rol.");
  const user = await db.transaction(async tx => {
    const [profile] = await tx.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, target)).for("update");
    if (!profile || profile.requestedRole === "ciudadano" || profile.reviewStatus !== "pending") {
      throw new LedgerError(409, "La solicitud ya no está pendiente.");
    }
    const [current] = await tx.select().from(globalUsers).where(eq(globalUsers.id, target)).for("update");
    if (!current) throw new LedgerError(404, "Cuenta no disponible.");
    const [updated] = await tx.update(globalUsers).set({
      role: body.data.approve ? profile.requestedRole : current.role,
      sessionVersion: sql`${globalUsers.sessionVersion}+1`,
    }).where(eq(globalUsers.id, target)).returning();
    await tx.update(onboardingProfiles).set({
      reviewStatus: body.data.approve ? "approved" : "rejected",
      reviewNote: body.data.note.trim(), reviewedBy: director.id,
    }).where(eq(onboardingProfiles.userId, target));
    return updated;
  });
  disconnectUser(target);
  res.json(await enrollmentProfile(user));
});

router.use("/citizen", requireRole("ciudadano", "analista", "oficial", "director"));
router.get("/citizen/roster", requireRole("analista", "oficial", "director"), async (_req, res) => {
  const users = await db.select({ id: globalUsers.id }).from(globalUsers).where(eq(globalUsers.role, "patrulla")).limit(100);
  res.json(users.map(u => ({ userId: u.id, unitLabel: `Unidad ficticia DEMO-P${u.id}` })));
});
router.get("/citizen/cases", async (_req, res) => {
  const user = userOf(res);
  const rows = await db.select().from(citizenCases).where(isAnalyst(user) ? undefined : eq(citizenCases.ownerId, user.id))
    .orderBy(desc(citizenCases.createdAt)).limit(50);
  res.json(await Promise.all(rows.map(citizenCaseView)));
});
router.post("/citizen/cases", async (req, res) => {
  const user = userOf(res);
  await requireEnrollment(user);
  await ensureCitizenGuards();
  const parsed = CreateCitizenCaseBody.strict().safeParse(req.body);
  if (!parsed.success || parsed.data.description.trim().length < 15) throw new LedgerError(400, "Selecciona categoría, zona del ejercicio y una descripción de 15–3000 caracteres.");
  const catalog = await getCrimeCatalog();
  const category = catalog.entries.find(c => c.system === "RNID" && c.code === parsed.data.categoryCode);
  if (!category) throw new LedgerError(400, "Categoría RNID no válida.");
  const id = randomUUID();
  const original = { folio: `SANTI-CIU-${id.slice(0, 8).toUpperCase()}`,
    categoryCode: category.code, categoryLabel: category.label, description: parsed.data.description.trim(),
    zone: parsed.data.zone, point: ZONES[parsed.data.zone], ownerUsername: user.username, createdAt: new Date().toISOString() };
  const [row] = await db.transaction(tx => tx.insert(citizenCases).values({
    id, ownerId: user.id, original, originalHash: "", originalCanonical: "",
  }).returning());
  res.status(201).json(await citizenCaseView(row));
});
router.get("/citizen/cases/:id", async (req, res) => {
  const parsed = GetCitizenCaseParams.safeParse(req.params);
  if (!parsed.success) throw new LedgerError(400, "Identificador inválido.");
  res.json(await citizenCaseView(await accessCitizenCase(parsed.data.id, userOf(res))));
});
for (const method of ["patch", "put", "delete"] as const) {
  router[method]("/citizen/cases/:id", rejectIncidentMutation("citizen"));
}
router.post("/citizen/cases/:id/dispatch", async (req, res) => {
  const params = GetCitizenCaseParams.safeParse(req.params), body = StartCitizenDispatchBody.strict().safeParse(req.body);
  if (!params.success || !body.success) throw new LedgerError(400, "Recorrido inválido.");
  const user = userOf(res), row = await accessCitizenCase(params.data.id, user);
  await ensureCitizenGuards();
  if (!isAnalyst(user) && body.data.patrolUserId !== undefined) throw new LedgerError(403, "Solo un analista o director puede seleccionar una patrulla.");
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('citizen-dispatch',0))`);
    await lockCitizenCase(tx, row.id);
    const events = await citizenEventsFor(row.id, tx);
    if (events.some(e => e.kind === "completed")) throw new LedgerError(409, "El ejercicio está finalizado; el historial no se reinicia.");
    if (latestDispatch(events)) return; // Start is idempotent and never erases a journey.
    let patrolId = body.data.patrolUserId ?? null;
    if (patrolId !== null) {
      const [patrol] = await tx.select().from(globalUsers).where(and(eq(globalUsers.id, patrolId), eq(globalUsers.role, "patrulla")));
      if (!patrol) throw new LedgerError(400, "La cuenta seleccionada no tiene rol patrulla autorizado.");
      const busy = await tx.execute(sql`SELECT 1 FROM citizen_case_events e WHERE e.kind='dispatch'
        AND e.payload->>'patrolUserId'=${String(patrolId)}
        AND NOT EXISTS (SELECT 1 FROM citizen_case_events done WHERE done.case_id=e.case_id AND done.kind='completed') LIMIT 1`);
      if (busy.rows.length) throw new LedgerError(409, "La unidad ficticia ya tiene un ejercicio activo; finalízalo antes de reasignarla.");
    }
    const unitId = patrolId ? `DEMO-P${patrolId}` : `DEMO-V${row.id.slice(0, 6).toUpperCase()}`;
    await appendCitizenEvent(tx, row.id, user, "dispatch", {
      dispatchId: randomUUID(), startedAt: new Date().toISOString(), patrolUserId: patrolId,
      unitId, unitLabel: `Patrulla simulada ${unitId}`, officerName: "Oficial de demostración",
    });
  });
  res.json(await citizenCaseView(row));
});
router.post("/citizen/cases/:id/close", async (req, res) => {
  const params = GetCitizenCaseParams.safeParse(req.params);
  if (!params.success) throw new LedgerError(400, "Identificador inválido.");
  const user = userOf(res), row = await accessCitizenCase(params.data.id, user);
  await ensureCitizenGuards();
  await db.transaction(async tx => {
    await lockCitizenCase(tx, row.id);
    if ((await citizenEventsFor(row.id, tx)).some(e => e.kind === "completed")) return;
    await appendCitizenEvent(tx, row.id, user, "completed", { reason: "Finalización del ejercicio por usuario autorizado; sin alterar hechos originales." });
  });
  res.json(await citizenCaseView(row));
});
router.post("/citizen/cases/:id/uploads", async (req, res) => {
  const params = GetCitizenCaseParams.safeParse(req.params), body = RequestCitizenUploadBody.strict().safeParse(req.body);
  if (!params.success || !body.success) throw new LedgerError(400, "Metadatos inválidos; solo fotos, audio y video permitidos, hasta 20 MB.");
  await requireEnrollment(userOf(res));
  res.status(201).json(await requestPrivateUpload(params.data.id, userOf(res), body.data));
});
router.post("/citizen/cases/:id/evidence", async (req, res) => {
  const params = GetCitizenCaseParams.safeParse(req.params), body = AppendCitizenEvidenceBody.strict().safeParse(req.body);
  if (!params.success || !body.success) throw new LedgerError(400, "Referencia de evidencia inválida.");
  await requireEnrollment(userOf(res));
  await finalizePrivateUpload(params.data.id, userOf(res), body.data);
  res.status(201).json(await citizenCaseView(await accessCitizenCase(params.data.id, userOf(res))));
});
router.get("/citizen/evidence/:id/content", async (req, res) => {
  const params = DownloadCitizenEvidenceParams.safeParse(req.params);
  if (!params.success) throw new LedgerError(400, "Identificador inválido.");
  const [event] = await db.select().from(citizenEvents).where(and(eq(citizenEvents.kind, "evidence"),
    sql`${citizenEvents.payload}->>'id'=${params.data.id}`)).limit(1);
  if (!event) throw new LedgerError(404, "Evidencia no disponible.");
  await accessCitizenCase(event.caseId, userOf(res));
  await servePrivateEvidence(event.payload, res);
});
router.get("/patrol/assignments", requireRole("patrulla"), async (_req, res) => {
  const user = userOf(res);
  const rows = await db.select().from(citizenCases).where(sql`(
    SELECT e.payload->>'patrolUserId' FROM citizen_case_events e
    WHERE e.case_id=${citizenCases.id} AND e.kind='dispatch' ORDER BY e.id DESC LIMIT 1
  )=${String(user.id)}`).orderBy(desc(citizenCases.createdAt)).limit(30);
  const alerts = (await Promise.all(rows.map(async row => {
    const events = await citizenEventsFor(row.id), latest = latestDispatch(events);
    if (latest?.patrolUserId !== user.id) return null;
    const item = projectCitizenCase(row, events);
    if (!item.unit || item.status === "completed" || item.unit.distanceMeters > 5000) return null;
    return { id: item.id, folio: item.folio, categoryLabel: item.categoryLabel,
      status: item.status, reportPoint: item.reportPoint, unit: item.unit };
  }))).filter(Boolean);
  // Explicit allow-list, never spread a full citizen case into patrol output.
  res.json({ unitLabel: `Unidad ficticia DEMO-P${user.id}`, simulation: true, alerts });
});
export default router;
