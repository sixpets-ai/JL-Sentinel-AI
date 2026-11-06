import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { db, incidentMutationAttempts } from "@workspace/db";
import { sql } from "drizzle-orm";
import { accessRecord, LedgerError, type RecordKind } from "./ledger";
import type { SessionUser } from "./security";
import { accessCitizenCase } from "./citizen";

function sqlState(error: unknown): string | undefined {
  let current = error as { code?: string; cause?: unknown } | undefined;
  for (let i = 0; i < 4 && current; i++) {
    if (current.code) return current.code;
    current = current.cause as typeof current;
  }
  return undefined;
}
export function rejectIncidentMutation(fixedKind?: RecordKind | "citizen") {
  return async (req: Request, res: Response): Promise<void> => {
    const kind = fixedKind ?? req.params.kind;
    const id = req.params.id;
    if ((kind !== "nexus" && kind !== "tactical" && kind !== "citizen") || typeof id !== "string") throw new LedgerError(400, "Referencia inválida.");
    if (kind === "citizen" && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new LedgerError(400, "Referencia inválida.");
    const user = res.locals.user as SessionUser;
    const access = kind === "citizen"
      ? (await accessCitizenCase(id, user), { stream: `citizen:${id}` })
      : await accessRecord(kind, id, user);
    const requestId = randomUUID();
    let outcome = "application_forced_rollback";
    try {
      await db.transaction(async tx => {
        await tx.execute(sql`SELECT set_config('santi.request_id',${requestId},true),set_config('santi.actor_id',${String(user.id)},true)`);
        if (kind === "citizen") {
          if (req.method === "DELETE") await tx.execute(sql`DELETE FROM citizen_cases WHERE id=${id}::uuid`);
          else await tx.execute(sql`UPDATE citizen_cases SET original=original WHERE id=${id}::uuid`);
        } else if (kind === "nexus") {
          if (req.method === "DELETE") await tx.execute(sql`DELETE FROM incident_reports WHERE id=${Number(id)}`);
          else await tx.execute(sql`UPDATE incident_reports SET folio=folio WHERE id=${Number(id)}`);
        } else {
          if (req.method === "DELETE") await tx.execute(sql`DELETE FROM tactical_demo_alerts WHERE id=${id}`);
          else await tx.execute(sql`UPDATE tactical_demo_alerts SET payload=payload WHERE id=${id}`);
        }
        // Defense in depth: even if a DBA removed a trigger, never commit.
        tx.rollback();
      });
    } catch (error) {
      if (sqlState(error) === "55000") outcome = "database_rejected";
    }
    // This is a NEW transaction AFTER the rejected transaction rolled back.
    // Putting this INSERT in the failed transaction would erase the audit.
    try {
      await db.transaction(async tx => {
        await tx.insert(incidentMutationAttempts).values({
          requestId, stream: access.stream, operation: req.method,
          actorId: user.id, actor: `${user.username} · ${user.role}`, outcome,
        });
      });
    } catch {
      req.log.error({ requestId, stream: access.stream, actorId: user.id, operation: req.method, outcome },
        "Mutation rejected but audit database write failed; incident untouched; investigate server log");
      res.status(503).json({ error: "Cambio rechazado. No se confirmó el registro de auditoría; requiere revisión.", requestId, recorded: false });
      return;
    }
    res.status(409).json({ error: "Original inmutable. Intento de modificación rechazado y registrado; utiliza una enmienda.", requestId, recorded: true });
  };
}
