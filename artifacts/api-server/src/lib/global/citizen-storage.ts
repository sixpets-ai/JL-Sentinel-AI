import { Storage } from "@google-cloud/storage";
import { createHash, randomUUID } from "node:crypto";
import { db, citizenUploads } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { Response } from "express";
import { LedgerError } from "./ledger";
import { acquireLease } from "../infrastructure/redis";
import { accessCitizenCase, appendCitizenEvent, citizenEventsFor, ensureCitizenGuards, lockCitizenCase } from "./citizen";
import type { SessionUser } from "./security";

// Replit sidecar authentication, unchanged from the provided App Storage client.
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit", subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`, type: "external_account",
    credential_source: { url: `${REPLIT_SIDECAR_ENDPOINT}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  }, projectId: "",
});
type Metadata = { filename: string; contentType: string; size: number; sha256: string; uploadId?: string };
const MAX_BYTES = 20000000;
function privateFile(path: string) {
  const root = process.env.PRIVATE_OBJECT_DIR?.replace(/\/+$/, "");
  if (!root || !path.startsWith(`${root}/`)) throw new LedgerError(503, "Almacenamiento privado no disponible; ningún archivo se ha confirmado.");
  const [, bucketName, ...parts] = path.split("/");
  if (!bucketName || !parts.length) throw new LedgerError(503, "Configuración de almacenamiento privado inválida.");
  return storage.bucket(bucketName).file(parts.join("/"));
}
export function validEvidenceMetadata(meta: Metadata) {
  if (/[\u0000-\u001f\u007f/\\]/u.test(meta.filename) || meta.size > MAX_BYTES || meta.size < 1) {
    throw new LedgerError(400, "Nombre o tamaño de archivo inválido; máximo 20 MB.");
  }
}
export function mediaMatches(bytes: Buffer, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (mime === "audio/wav") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE";
  if (mime === "audio/mpeg") return bytes.toString("ascii", 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  if (mime === "audio/ogg") return bytes.toString("ascii", 0, 4) === "OggS";
  if (mime === "video/mp4" || mime === "audio/mp4") return bytes.toString("ascii", 4, 8) === "ftyp";
  if (mime === "video/webm" || mime === "audio/webm") return bytes.subarray(0, 4).equals(Buffer.from([26,69,223,163]));
  return false;
}
export async function requestPrivateUpload(caseId: string, user: SessionUser, meta: Metadata) {
  await accessCitizenCase(caseId, user);
  await ensureCitizenGuards();
  validEvidenceMetadata(meta);
  const root = process.env.PRIVATE_OBJECT_DIR?.replace(/\/+$/, "");
  if (!root) throw new LedgerError(503, "Almacenamiento privado no configurado; el archivo no se ha subido.");
  const uploadId = randomUUID();
  const path = `${root}/citizen-pending/${uploadId}`;
  const file = privateFile(path);
  const expiresAt = new Date(Date.now() + 300000);
  // Only authorize bounded pending tickets per authenticated uploader.
  const count = await db.execute(sql`SELECT count(*)::int AS count FROM citizen_uploads
    WHERE owner_id=${user.id} AND finalized_at IS NULL AND expires_at > now()`);
  if (Number(count.rows[0]?.count) >= 4) throw new LedgerError(429, "Ya tienes cuatro cargas pendientes; espera a que expiren o finaliza una.");
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ bucket_name: file.bucket.name, object_name: file.name, method: "PUT", expires_at: expiresAt.toISOString() }),
  });
  if (!response.ok) throw new LedgerError(503, "No fue posible autorizar una carga privada; no se guardó evidencia.");
  const signed = await response.json() as { signed_url?: unknown };
  const uploadURL = signed.signed_url;
  if (typeof uploadURL !== "string" || !uploadURL.startsWith("https://")) throw new LedgerError(503, "El almacenamiento no proporcionó una URL válida.");
  await db.insert(citizenUploads).values({ id: uploadId, caseId, ownerId: user.id,
    filename: meta.filename, contentType: meta.contentType, size: meta.size, sha256: meta.sha256,
    temporaryPath: path, expiresAt });
  return { uploadId, uploadURL, expiresAt: expiresAt.toISOString() };
}

export async function finalizePrivateUpload(caseId: string, user: SessionUser, meta: Metadata) {
  await accessCitizenCase(caseId, user);
  await ensureCitizenGuards();
  if (!meta.uploadId) throw new LedgerError(400, "Primero solicita la URL privada y sube el archivo; los metadatos por sí solos no son una evidencia recibida.");
  const release = await acquireLease(`citizen-upload:${meta.uploadId}`, 60);
  if (!release) throw new LedgerError(409, "La evidencia se está verificando; reintenta sin volver a subir.");
  try {
    const [ticket] = await db.select().from(citizenUploads).where(eq(citizenUploads.id, meta.uploadId)).limit(1);
    if (!ticket || ticket.caseId !== caseId || ticket.ownerId !== user.id) throw new LedgerError(404, "Carga no disponible para esta cuenta y expediente.");
    if (["filename", "contentType", "size", "sha256"].some(key => ticket[key as keyof typeof ticket] !== meta[key as keyof Metadata])) {
      throw new LedgerError(409, "Los metadatos no coinciden con la carga autorizada.");
    }
    if (ticket.finalizedAt) return; // Idempotent receipt already exists.
    if (ticket.expiresAt.getTime() < Date.now()) throw new LedgerError(410, "La autorización de carga expiró; solicita una nueva.");
    const temporary = privateFile(ticket.temporaryPath);
    let metadata;
    try { [metadata] = await temporary.getMetadata(); }
    catch { throw new LedgerError(409, "El almacenamiento aún no recibió el archivo. Completa la carga antes de confirmar."); }
    if (Number(metadata.size) !== ticket.size || Number(metadata.size) > MAX_BYTES || !metadata.generation) {
      throw new LedgerError(400, "El tamaño recibido no coincide o supera 20 MB; no se vinculó el archivo.");
    }
    // Copy a pinned source generation to an unguessable destination NEVER signed
    // for client writes. Reusing the temporary PUT URL cannot replace evidence.
    const finalPath = `${process.env.PRIVATE_OBJECT_DIR!.replace(/\/+$/, "")}/citizen-evidence/${ticket.id}/${randomUUID()}`;
    const destination = privateFile(finalPath);
    const pinnedSource = temporary.bucket.file(temporary.name, { generation: metadata.generation });
    await pinnedSource.copy(destination, { preconditionOpts: { ifGenerationMatch: 0 } });
    const [finalMetadata] = await destination.getMetadata();
    if (Number(finalMetadata.size) !== ticket.size) throw new LedgerError(409, "El archivo cambió durante la verificación.");
    const hash = createHash("sha256");
    const header: Buffer[] = [];
    let size = 0;
    const stream = destination.createReadStream();
    for await (const chunk of stream) {
      const bytes = Buffer.from(chunk);
      if (size < 32) header.push(bytes.subarray(0, 32 - size));
      size += bytes.length;
      if (size > MAX_BYTES) { stream.destroy(); throw new LedgerError(400, "Archivo demasiado grande."); }
      hash.update(bytes);
    }
    if (size !== ticket.size || hash.digest("hex") !== ticket.sha256 ||
      !mediaMatches(Buffer.concat(header), ticket.contentType)) {
      // The unconfirmed object is never presented as valid evidence.
      await destination.delete({ ignoreNotFound: true }).catch(() => {});
      throw new LedgerError(400, "El contenido, tipo o SHA-256 no coincide; no se confirmó evidencia.");
    }
    const generation = String(finalMetadata.generation);
    await db.transaction(async tx => {
      await lockCitizenCase(tx, caseId);
      const events = await citizenEventsFor(caseId, tx);
      if (events.some(e => e.kind === "evidence" && e.payload.id === ticket.id)) return;
      if (events.filter(e => e.kind === "evidence").length >= 20) throw new LedgerError(409, "Máximo 20 archivos por ejercicio.");
      await appendCitizenEvent(tx, caseId, user, "evidence", {
        id: ticket.id, filename: ticket.filename, contentType: ticket.contentType,
        size: ticket.size, sha256: ticket.sha256, objectPath: finalPath, generation,
      });
      await tx.update(citizenUploads).set({ finalPath, generation, finalizedAt: new Date() }).where(eq(citizenUploads.id, ticket.id));
    });
    // Never delete confirmed bytes. Pending source removal is safe: the immutable
    // receipt points at the distinct, server-only destination.
    await temporary.delete({ ignoreNotFound: true }).catch(() => {});
  } finally { await release(); }
}

export async function servePrivateEvidence(payload: Record<string, unknown>, res: Response) {
  const file = privateFile(String(payload.objectPath));
  let metadata;
  try { [metadata] = await file.getMetadata(); }
  catch { throw new LedgerError(404, "El archivo privado no está disponible; el recibo original se conserva."); }
  if (String(metadata.generation) !== payload.generation || Number(metadata.size) !== payload.size) {
    throw new LedgerError(409, "La generación del objeto cambió; descarga bloqueada para conservar la integridad.");
  }
  res.set({
    "Content-Type": String(payload.contentType), "Content-Length": String(payload.size),
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(String(payload.filename))}`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  });
  await new Promise<void>((resolve, reject) => {
    const stream = file.bucket.file(file.name, { generation: String(payload.generation) }).createReadStream();
    stream.once("error", reject);
    res.once("close", () => { stream.destroy(); resolve(); });
    res.once("finish", resolve);
    stream.pipe(res);
  });
}
