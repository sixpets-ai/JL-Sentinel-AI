import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

try {
  const migrations = await Promise.all(["incident-ledger.sql", "industrial-hardening.sql", "citizen-onboarding.sql"].map(
    file => readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), file), "utf8"),
  ));
  await db.transaction(async tx => {
    for (const migration of migrations) await tx.execute(sql.raw(migration));
  });
  logger.info("Append-only triggers installed; existing records incorporated without rewriting them");
} catch {
  logger.error("Ledger installation failed; transaction rolled back. Review schema prerequisites.");
  process.exitCode = 1;
} finally { await pool.end(); }
