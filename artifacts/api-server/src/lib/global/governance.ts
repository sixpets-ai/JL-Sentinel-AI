import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logger } from "../logger";
import { ibmAuthenticatedFetch } from "./ibm-iam";

const VERSION = "2025-09-10";
const REQUIRED = ["IBM_API_KEY", "WATSONX_GOVERNANCE_URL", "WATSONX_SERVICE_INSTANCE_ID", "WATSONX_MONITOR_INSTANCE_ID"] as const;
type GovernanceState = {
  status: "not_configured" | "connected" | "submitted" | "unavailable";
  detail: string; checkedAt: string; missing: string[]; metrics: string; runId?: string | null;
};
let checked: { result: GovernanceState; expires: number } | undefined;
let checkPending: Promise<GovernanceState> | undefined;
const state = (status: GovernanceState["status"], detail: string, extras: Partial<GovernanceState> = {}): GovernanceState =>
  ({ status, detail, checkedAt: new Date().toISOString(), missing: [], metrics: "", ...extras });

function configuration(forSubmission = false): GovernanceState | undefined {
  const keys = forSubmission ? [...REQUIRED, "WATSONX_DATA_SET_ID"] : [...REQUIRED];
  const missing = keys.filter(key => !process.env[key]);
  if (missing.length) return state("not_configured", "Conector real IBM pendiente de configuración; ninguna respuesta ha sido certificada.", { missing });
  try {
    const url = new URL(process.env.WATSONX_GOVERNANCE_URL!);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !/^(?:[a-z0-9-]+\.)*(?:cloud\.ibm\.com|aiopenscale\.cloud\.ibm\.com)$/.test(url.hostname)) {
      return state("not_configured", "La URL debe ser el endpoint HTTPS oficial de IBM Cloud, sin credenciales ni parámetros.");
    }
  } catch { return state("not_configured", "URL base de IBM inválida."); }
  return undefined;
}

async function callIbm(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const base = process.env.WATSONX_GOVERNANCE_URL!.replace(/\/$/, "");
  const url = new URL(`${base}/v2/${path}`);
  url.searchParams.set("version", VERSION);
  if (process.env.WATSONX_PROJECT_ID) url.searchParams.set("project_id", process.env.WATSONX_PROJECT_ID);
  const response = await ibmAuthenticatedFetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json",
      "AIOS-Instance-ID": process.env.WATSONX_SERVICE_INSTANCE_ID! },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`IBM Governance HTTP ${response.status}`);
  // Do not log vendor bodies, which can contain evaluated text or identifiers.
  if (response.status === 204) return {};
  return z.record(z.string(), z.unknown()).parse(await response.json());
}

export async function governanceStatus(): Promise<GovernanceState> {
  const missing = configuration();
  if (missing) return missing;
  if (checked && checked.expires > Date.now()) return checked.result;
  if (checkPending) return checkPending;
  checkPending = (async () => {
    try {
      const monitor = await callIbm(`monitor_instances/${encodeURIComponent(process.env.WATSONX_MONITOR_INSTANCE_ID!)}`);
      const parsed = z.object({ entity: z.object({
        status: z.unknown().optional(), monitor_definition_id: z.string().optional(),
      }) }).parse(monitor);
      const result = state("connected", "Monitor IBM accesible. Conectividad no equivale a una auditoría de este informe ni garantiza ausencia de sesgos.", {
        metrics: JSON.stringify({ monitor: parsed.entity.monitor_definition_id, status: parsed.entity.status ?? "sin estado" }),
      });
      checked = { result, expires: Date.now() + 60000 };
      return result;
    } catch (error) {
      logger.warn({ reason: error instanceof Error ? error.message : "unknown" }, "IBM monitor unavailable");
      const result = state("unavailable", "IBM no confirmó el estado del monitor. Revisa región, permisos IAM y configuración; sin certificación.");
      checked = { result, expires: Date.now() + 30000 };
      return result;
    }
  })().finally(() => { checkPending = undefined; });
  return checkPending;
}

export async function submitAudit(prompt: string, response: string): Promise<GovernanceState> {
  const missing = configuration(true);
  if (missing) return missing;
  const scoringId = randomUUID();
  try {
    // Standard OpenScale scoring payload. Dataset fields must match the monitor's
    // provisioned schema; these are configurable rather than fabricated.
    const logged = await callIbm(`data_sets/${encodeURIComponent(process.env.WATSONX_DATA_SET_ID!)}/records`, [{
      scoring_id: scoringId, response_time: 0,
      request: { fields: [process.env.WATSONX_INPUT_FIELD ?? "input_text"], values: [[prompt]] },
      response: { fields: [process.env.WATSONX_OUTPUT_FIELD ?? "generated_text"], values: [[response]] },
    }]);
    if (logged.errors || logged.error) throw new Error("IBM rechazó el registro.");
    const run = await callIbm(`monitor_instances/${encodeURIComponent(process.env.WATSONX_MONITOR_INSTANCE_ID!)}/runs`, { triggered_by: "user" });
    const parsed = z.object({ metadata: z.object({ id: z.string() }), entity: z.unknown().optional() }).parse(run);
    checked = undefined;
    return state("submitted", "Registro enviado y ejecución IBM solicitada. El monitor evalúa su conjunto de datos; esto no es un resultado individual ni una garantía contra alucinaciones.", {
      runId: parsed.metadata.id, metrics: JSON.stringify({ scoringId, evaluation: "pending" }),
    });
  } catch (error) {
    logger.warn({ reason: error instanceof Error ? error.message : "unknown" }, "IBM evaluation submission failed");
    return state("unavailable", "No se confirmó el envío completo a IBM. Puede haberse registrado el texto sin iniciar evaluación. Revisa el monitor antes de reintentar; no hay auditoría aprobada.", { metrics: JSON.stringify({ scoringId }) });
  }
}
