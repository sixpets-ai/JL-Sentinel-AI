import { db, globalUsers, pool } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./lib/logger";

const [username, role] = process.argv.slice(2).filter(arg => arg !== "--");
if (!username || !["ciudadano", "oficial", "director"].includes(role)) {
  logger.error("Uso: pnpm --filter @workspace/api-server run grant-role -- <usuario> <ciudadano|oficial|director>");
  process.exitCode = 1;
} else {
  const [user] = await db.update(globalUsers).set({
    role: role as "ciudadano" | "oficial" | "director",
    sessionVersion: sql`${globalUsers.sessionVersion} + 1`,
  }).where(eq(globalUsers.username, username.toLowerCase())).returning({ id: globalUsers.id, role: globalUsers.role });
  if (!user) { logger.error("Usuario no encontrado. Primero regístrate desde /global."); process.exitCode = 1; }
  else { logger.info({ id: user.id, role: user.role }, "Rol asignado por el propietario del entorno. Vuelve a iniciar sesión."); }
}
await pool.end();
