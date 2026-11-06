import { Router, type ErrorRequestHandler } from "express";
import { randomBytes } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { db, incidentLedger, amendmentValidations } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  GetRecordLedgerParams, CreateAmendmentValidationBody, CreateAmendmentValidationResponse,
  AppendRecordAmendmentBody, AppendRecordEvidenceBody,
} from "@workspace/api-zod";
import { requireSession, requireRole, type SessionUser } from "../../lib/global/security";
import {
  accessRecord, canonicalJson, LedgerError, listSealedRecords, recordLedger, sha256, type RecordKind,
} from "../../lib/global/ledger";
import { rejectIncidentMutation } from "../../lib/global/mutation-audit";
import { rateStore } from "../../lib/infrastructure/redis";

const router = Router();
router.use(requireSession, requireRole("oficial", "director"));
router.get("/", async (_req, res): Promise<void> => {
  res.json(await listSealedRecords(res.locals.user as SessionUser));
});
router.get("/:kind/:id", async (req, res): Promise<void> => {
  const params = GetRecordLedgerParams.safeParse(req.params);
  if (!params.success) throw new LedgerError(400, "Referencia de expediente inválida.");
  res.json(await recordLedger(params.data.kind, params.data.id, res.locals.user as SessionUser));
});
router.use(rateLimit({
  store: rateStore("ledger"),
  windowMs: 60000, limit: 15, standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: (_req, res) => String((res.locals.user as SessionUser).id),
  message: { error: "Espera un minuto antes de registrar más validaciones o anexos." },
}));
for (const method of ["patch", "put", "delete"] as const) router[method]("/:kind/:id", rejectIncidentMutation());
const intentDigest = (action: string, justification: string) => sha256(canonicalJson({ action, justification }));

async function writable(kind: RecordKind, id: string, user: SessionUser) {
  const access = await accessRecord(kind, id, user, true);
  const ledger = await recordLedger(kind, id, user);
  if (!ledger.integrity) throw new LedgerError(409, "Cadena inconsistente. No se permite anexar.");
  return { access, ledger };
}
router.post("/:kind/:id/validation", async (req, res): Promise<void> => {
  const params = GetRecordLedgerParams.safeParse(req.params);
  const body = CreateAmendmentValidationBody.safeParse(req.body);
  if (!params.success || !body.success || body.data.justification.trim().length < 15) {
    throw new LedgerError(400, "Selecciona la acción e incluye una justificación de 15–2000 caracteres.");
  }
  const user = res.locals.user as SessionUser;
  const { access, ledger } = await writable(params.data.kind, params.data.id, user);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 5 * 60000);
  await db.transaction(async tx => {
    await tx.insert(amendmentValidations).values({
      tokenHash: sha256(token), stream: access.stream, userId: user.id,
      originalHash: ledger.record.originalHash,
      intentHash: intentDigest(body.data.action, body.data.justification.trim()), expiresAt,
    });
  });
  res.status(201).json(CreateAmendmentValidationResponse.parse({
    validationToken: token, expiresAt: expiresAt.toISOString(), originalHash: ledger.record.originalHash, simulated: true,
  }));
});
router.post("/:kind/:id/amendments", async (req, res): Promise<void> => {
  const params = GetRecordLedgerParams.safeParse(req.params);
  const body = AppendRecordAmendmentBody.safeParse(req.body);
  if (!params.success || !body.success || body.data.justification.trim().length < 15) {
    throw new LedgerError(400, "Enmienda o validación inválida.");
  }
  const user = res.locals.user as SessionUser;
  const { access, ledger } = await writable(params.data.kind, params.data.id, user);
  const tokenHash = sha256(body.data.validationToken);
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${access.stream}, 0))`);
    const [challenge] = await tx.select().from(amendmentValidations).where(and(
      eq(amendmentValidations.tokenHash, tokenHash), eq(amendmentValidations.stream, access.stream),
      eq(amendmentValidations.userId, user.id),
    )).for("update");
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now() ||
        challenge.originalHash !== ledger.record.originalHash ||
        challenge.intentHash !== intentDigest(body.data.action, body.data.justification.trim())) {
      throw new LedgerError(409, "Validación expirada, usada o ajena a este folio, acción o justificación. Vuelve a validar.");
    }
    await tx.update(amendmentValidations).set({ consumedAt: new Date() })
      .where(eq(amendmentValidations.tokenHash, tokenHash));
    await tx.insert(incidentLedger).values({
      stream: access.stream, eventType: "amendment", actorId: user.id, actor: `${user.username} · ${user.role}`,
      data: {
        action: body.data.action, justification: body.data.justification.trim(),
        originalHash: ledger.record.originalHash,
        signature: { mode: "simulated_token", validatedAt: new Date().toISOString(), tokenDigest: tokenHash },
      },
    });
  });
  res.status(201).json(await recordLedger(params.data.kind, params.data.id, user));
});
router.post("/:kind/:id/evidence", async (req, res): Promise<void> => {
  const params = GetRecordLedgerParams.safeParse(req.params);
  const body = AppendRecordEvidenceBody.safeParse(req.body);
  if (!params.success || !body.success || body.data.label.trim().length < 3 || body.data.reference.trim().length < 3) {
    throw new LedgerError(400, "Completa dispositivo, descripción y referencia de evidencia.");
  }
  if (body.data.url) {
    try {
      const url = new URL(body.data.url);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error();
    } catch {
      throw new LedgerError(400, "Usa HTTPS sin credenciales, parámetros ni fragmentos. Para CCTV interno utiliza una referencia, no claves ni enlaces firmados.");
    }
  }
  const user = res.locals.user as SessionUser;
  const { access, ledger } = await writable(params.data.kind, params.data.id, user);
  await db.transaction(async tx => {
    await tx.insert(incidentLedger).values({
      stream: access.stream, eventType: "evidence", actorId: user.id, actor: `${user.username} · ${user.role}`,
      data: { ...body.data, originalHash: ledger.record.originalHash, contentVerification: "declared_not_verified" },
    });
  });
  res.status(201).json(await recordLedger(params.data.kind, params.data.id, user));
});
const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof LedgerError) { res.status(error.status).json({ error: error.message }); return; }
  req.log.error({ kind: error instanceof Error ? error.name : "unknown" }, "Append-only ledger operation failed");
  res.status(500).json({ error: "No se confirmó el registro. El original no se sobrescribe; revisa el historial antes de reintentar." });
};
router.use(errorHandler);
export default router;
