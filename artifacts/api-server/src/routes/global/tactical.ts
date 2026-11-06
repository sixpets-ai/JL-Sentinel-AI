import { Router } from "express";
import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { db, tacticalAlerts, incidentLedger } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateTacticalAlertBody, CreateTacticalAlertResponse, ListTacticalAlertsResponse,
  RetryTacticalReportParams,
} from "@workspace/api-zod";
import { requireSession, requireRole, authenticateCookie, type SessionUser } from "../../lib/global/security";
import { generateExecutiveReport, getTacticalScenario, type TacticalAlert } from "../../lib/global/tactical";
import { simulateRoute } from "../../lib/global/routes";
import { ensureLedgerReady, latestTacticalPayload } from "../../lib/global/ledger";
import { rateStore, acquireLease } from "../../lib/infrastructure/redis";
import { learnSyntheticPattern } from "../../lib/global/patterns";
import { rejectIncidentMutation } from "../../lib/global/mutation-audit";
import type { Request, Response } from "express";

const router = Router();
router.get("/", async (req, res): Promise<void> => {
  const scenario = await getTacticalScenario();
  let networkAllowed = false;
  try {
    const user = await authenticateCookie(req.headers.cookie);
    networkAllowed = ["analista", "oficial", "director"].includes(user.role);
  } catch { /* Public synthetic map is safe; graph access remains closed. */ }
  res.json(networkAllowed ? scenario : { ...scenario, nodes: [], edges: [] });
});
router.use(requireSession, requireRole("oficial", "director"));
router.get("/alerts", async (_req, res): Promise<void> => {
  const records = await db.select().from(tacticalAlerts)
    .where(eq(tacticalAlerts.userId, (res.locals.user as SessionUser).id))
    .orderBy(desc(tacticalAlerts.createdAt)).limit(30);
  res.json(ListTacticalAlertsResponse.parse(await Promise.all(
    records.map(record => latestTacticalPayload(record.id, record.payload)),
  )));
});
router.use(rateLimit({
  store: rateStore("tactical"),
  windowMs: 60000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: (_req, res) => String((res.locals.user as SessionUser).id),
  message: { error: "Espera un minuto antes de generar más alertas o informes." },
}));
for (const method of ["patch", "put", "delete"] as const) router[method]("/alerts/:id", rejectIncidentMutation("tactical"));
function sharedCapacity(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    const release = await acquireLease("ai-slot:0", 120) ?? await acquireLease("ai-slot:1", 120);
    if (!release) { res.status(429).json({ error: "Capacidad compartida ocupada. Espera a que termine otro informe." }); return; }
    try { await handler(req, res); } finally { await release(); }
  };
}
let inFlight = 0;
const activeReports = new Set<string>();
async function save(alert: TacticalAlert, user: SessionUser, eventType: "route" | "report" = "report") {
  await db.transaction(async tx => {
    await tx.insert(incidentLedger).values({
      stream: `tactical:${alert.id}`, eventType, data: { snapshot: { ...alert } },
      actorId: user.id, actor: `${user.username} · ${user.role}`,
    });
  });
}
async function finishReport(alert: TacticalAlert, user: SessionUser): Promise<TacticalAlert> {
  try {
    alert.report = await generateExecutiveReport(alert);
    alert.reportStatus = "ready";
  } catch {
    alert.reportStatus = "failed";
    alert.report = "Gemini no confirmó la generación del informe. La alerta está guardada; puedes reintentar. No se muestra un informe ficticio como generado por IA.";
  }
  await save(alert, user);
  return CreateTacticalAlertResponse.parse(alert);
}
router.post("/alerts", sharedCapacity(async (req, res): Promise<void> => {
  const parsed = CreateTacticalAlertBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Selecciona un incidente del ejercicio." }); return; }
  const scenario = await getTacticalScenario();
  const incident = scenario.incidents.find(event => event.id === parsed.data.incidentId);
  if (!incident) { res.status(400).json({ error: "El incidente no pertenece al escenario simulado." }); return; }
  await ensureLedgerReady();
  if (inFlight >= 2) { res.status(503).json({ error: "Generador ocupado. Intenta después." }); return; }
  inFlight++;
  const user = res.locals.user as SessionUser;
  const userId = user.id;
  const id = randomUUID();
  activeReports.add(id);
  try {
    const alert: TacticalAlert = {
      id, folio: `SANTI-DEMO-${id.toUpperCase()}`,
      simulation: true, createdAt: new Date().toISOString(), incident, unit: incident.unit,
      reportStatus: "pending", report: "", route: null,
      routeStatus: incident.impact === "alto" ? "failed" : "not_required",
      disclaimer: scenario.disclaimer,
    };
    await db.transaction(async tx => {
      await tx.insert(tacticalAlerts).values({ id, userId, payload: { ...alert } });
      await learnSyntheticPattern(tx, incident);
    });
    if (incident.impact === "alto") {
      try {
        alert.route = await simulateRoute([
          { name: "Base ficticia DEMO", lat: 19.425, lng: -99.15 },
          { name: incident.title, lat: incident.lat, lng: incident.lng },
          { name: "Punto de apoyo ficticio", lat: 19.44, lng: -99.135 },
          { name: "Punto de reunión ficticio", lat: 19.43, lng: -99.12 },
        ], true);
        alert.routeStatus = "ready";
      } catch {
        req.log.warn("Demo route calculation unavailable");
        alert.routeStatus = "failed";
      }
      await save(alert, user, "route");
    }
    const finished = await finishReport(alert, user);
    res.status(201).json(finished);
  } finally {
    activeReports.delete(id);
    inFlight--;
  }
}));
router.post("/alerts/:id/report", sharedCapacity(async (req, res): Promise<void> => {
  const params = RetryTacticalReportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Identificador de alerta inválido." }); return; }
  await ensureLedgerReady();
  const user = res.locals.user as SessionUser;
  const userId = user.id;
  const [record] = await db.select().from(tacticalAlerts).where(and(
    eq(tacticalAlerts.id, params.data.id), eq(tacticalAlerts.userId, userId),
  )).limit(1);
  if (!record) { res.status(404).json({ error: "Alerta no encontrada en tu cuenta." }); return; }
  if (activeReports.has(record.id) || inFlight >= 2) {
    res.status(409).json({ error: "El informe todavía se está generando. Espera y actualiza el historial." }); return;
  }
  const alert = CreateTacticalAlertResponse.parse(await latestTacticalPayload(record.id, record.payload));
  if (alert.reportStatus === "ready") { res.json(alert); return; }
  const releaseReport = await acquireLease(`report:${record.id}`, 120);
  if (!releaseReport) { res.status(409).json({ error: "El informe está en proceso en otro trabajador." }); return; }
  inFlight++;
  activeReports.add(record.id);
  try {
    const current = CreateTacticalAlertResponse.parse(await latestTacticalPayload(record.id, record.payload));
    if (current.reportStatus === "ready") { res.json(current); return; }
    alert.reportStatus = "pending";
    alert.report = "";
    await save(alert, user);
    res.json(await finishReport(alert, user));
  } finally {
    inFlight--;
    activeReports.delete(record.id);
    await releaseReport();
  }
}));
export default router;
