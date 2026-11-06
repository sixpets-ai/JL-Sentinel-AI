import { db, agentPatternCounts } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

// Updates occur ONLY alongside a new server-owned synthetic scenario alert.
// No chat text, person, device identifier or unverified report trains this model.
export async function patternContext(): Promise<string> {
  const rows = await db.select().from(agentPatternCounts).orderBy(desc(agentPatternCounts.observations));
  const total = rows.reduce((sum, row) => sum + row.observations, 0);
  if (!total) return "Aprendizaje incremental: sin observaciones sintéticas persistidas. No inventes patrones.";
  const k = rows.length;
  return `Aprendizaje incremental lógico versión conteos-Dirichlet-1. Solo ${total} observaciones FICTICIAS de escenarios de demostración, no población real. Frecuencias con suavizado Laplace: ${
    rows.slice(0, 3).map(row => `${row.label}: n=${row.observations}, frecuencia simulada=${((row.observations + 1) / (total + k)).toFixed(3)}`).join("; ")
  }. Sesgo de selección por uso de la demo; no es entrenamiento del LLM, pronóstico de delitos, correlación causal ni evidencia.`;
}
export async function learnSyntheticPattern(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  incident: { id: string; catalogCode?: string; category: string },
) {
  if (!/^demo-0[1-6]$/.test(incident.id) || !/^RNID2026-\d{3}$/.test(incident.catalogCode ?? "")) {
    throw new Error("Only catalogued server-owned synthetic events may update pattern counts.");
  }
  await tx.insert(agentPatternCounts).values({
    code: incident.catalogCode!, label: incident.category, observations: 1,
  }).onConflictDoUpdate({ target: agentPatternCounts.code, set: {
    observations: sql`${agentPatternCounts.observations} + 1`, updatedAt: new Date(),
  } });
}
