import { Router } from "express";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, citizenCases } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { GetPatternAnalysisQueryParams, GetPatternAnalysisResponse } from "@workspace/api-zod";
import { requireRole } from "../../lib/global/security";
import { computeRequest } from "../../lib/global/python-json";
import { cachedJson } from "../../lib/infrastructure/redis";
import { LedgerError } from "../../lib/global/ledger";

type Event = { id: string; label: string; zone: string; categoryCode: string; description: string; timestamp: string; lat: number; lng: number };
const router = Router();
router.get("/patterns", requireRole("oficial", "director"), async (req, res) => {
  const parsed = GetPatternAnalysisQueryParams.strict().safeParse(req.query);
  if (!parsed.success) throw new LedgerError(400, "Fuente, zona, ventana o umbral inválido.");
  const { source = "demo", zone = "all", windowDays = 90, threshold = .8 } = parsed.data;
  const result = await cachedJson(`patterns:v1:${source}:${zone}:${windowDays}:${threshold}`, 30, async () => {
    let events: Event[], total: number;
    if (source === "demo") {
      const file = [
        path.resolve("data/pattern-incidents.json"), path.resolve("../../data/pattern-incidents.json"),
        path.join(path.dirname(fileURLToPath(import.meta.url)), "pattern-incidents.json"),
      ].find(existsSync);
      if (!file) throw new LedgerError(503, "La fuente ficticia no está instalada.");
      const all: Event[] = JSON.parse(await readFile(file, "utf8"));
      total = all.length;
      events = all.slice(0, 60);
    } else {
      const [count, rows] = await Promise.all([
        db.execute(sql`SELECT count(*)::int AS count FROM citizen_cases`),
        db.select().from(citizenCases).orderBy(desc(citizenCases.createdAt)).limit(60),
      ]);
      total = Number(count.rows[0]?.count ?? 0);
      events = rows.map(row => ({
        id: row.id, label: row.original.folio, zone: row.original.zone,
        categoryCode: row.original.categoryCode, description: row.original.description.slice(0, 160),
        timestamp: row.createdAt.toISOString(), lat: row.original.point.lat, lng: row.original.point.lng,
      }));
    }
    return GetPatternAnalysisResponse.parse(await computeRequest("heatmap", "/patterns", {
      events, source, zone, window_days: windowDays, threshold,
      as_of: new Date().toISOString(), total_available: total,
    }));
  });
  res.json(result);
});
export default router;
