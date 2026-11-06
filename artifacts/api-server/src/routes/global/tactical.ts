import { Router } from "express";
import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { db, tacticalAlerts } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateTacticalAlertBody, CreateTacticalAlertResponse, ListTacticalAlertsResponse,
  RetryTacticalReportParams,
} from "@workspace/api-zod";
import { requireSession, requireRole, type SessionUser } from "../../lib/global/security";
import { generateExecutiveReport, getTacticalScenario, type TacticalAlert } from "../../lib/global/tactical";
import { simulateRoute } from "../../lib/global/routes";

const router = Router();
router.get("/", async (_req, res): Promise<void> => { res.json(await getTacticalScenario()); });
router.use(requireSession, requireRole("oficial", "director"));
router.get("/alerts", async (_req, res): Promise<void> => {
  const records = await db.select().from(tacticalAlerts)
    .where(eq(tacticalAlerts.userId, (res.locals.user as SessionUser).id))
    .orderBy(desc(tacticalAlerts.createdAt)).limit(30);
  res.json(ListTacticalAlertsResponse.parse(records.map(record => record.payload)));
});
router.use(rateLimit({
  windowMs: 60000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: (_req, res) => String((res.locals.user as SessionUser).id),
  message: { error: "Espera un minuto antes de generar más alertas o informes." },
}));
let inFlight = 0;
const activeReports = new Set<string>();
async function save(alert: TacticalAlert, userId: number) {
  await db.update(tacticalAlerts).set({ payload: { ...alert } })
    .where(and(eq(tacticalAlerts.id, alert.id), eq(tacticalAlerts.userId, userId)));
}
async function finishReport(alert: TacticalAlert, userId: number): Promise<TacticalAlert> {
  try {
    alert.report = await generateExecutiveReport(alert);
    alert.reportStatus = "ready";
  } catch {
    alert.reportStatus = "failed";
    alert.report = "Gemini no confirmó la generación del informe. La alerta está guardada; puedes reintentar. No se muestra un informe ficticio como generado por IA.";
  }
  await save(alert, userId);
  return CreateTacticalAlertResponse.parse(alert);
}
router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateTacticalAlertBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Selecciona un incidente del ejercicio." }); return; }
  const scenario = await getTacticalScenario();
  const incident = scenario.incidents.find(event => event.id === parsed.data.incidentId);
  if (!incident) { res.status(400).json({ error: "El incidente no pertenece al escenario simulado." }); return; }
  if (inFlight >= 2) { res.status(503).json({ error: "Generador ocupado. Intenta después." }); return; }
  inFlight++;
  const userId = (res.locals.user as SessionUser).id;
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
    await db.insert(tacticalAlerts).values({ id, userId, payload: { ...alert } });
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
      await save(alert, userId);
    }
    const finished = await finishReport(alert, userId);
    res.status(201).json(finished);
  } finally {
    activeReports.delete(id);
    inFlight--;
  }
});
router.post("/alerts/:id/report", async (req, res): Promise<void> => {
  const params = RetryTacticalReportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Identificador de alerta inválido." }); return; }
  const userId = (res.locals.user as SessionUser).id;
  const [record] = await db.select().from(tacticalAlerts).where(and(
    eq(tacticalAlerts.id, params.data.id), eq(tacticalAlerts.userId, userId),
  )).limit(1);
  if (!record) { res.status(404).json({ error: "Alerta no encontrada en tu cuenta." }); return; }
  if (activeReports.has(record.id) || inFlight >= 2) {
    res.status(409).json({ error: "El informe todavía se está generando. Espera y actualiza el historial." }); return;
  }
  const alert = CreateTacticalAlertResponse.parse(record.payload);
  if (alert.reportStatus === "ready") { res.json(alert); return; }
  inFlight++;
  activeReports.add(record.id);
  try {
    alert.reportStatus = "pending";
    alert.report = "";
    await save(alert, userId);
    res.json(await finishReport(alert, userId));
  } finally {
    inFlight--;
    activeReports.delete(record.id);
  }
});
export default router;
