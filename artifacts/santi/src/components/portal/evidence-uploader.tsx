import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useRequestCitizenUpload, useAppendCitizenEvidence, useGetOnboardingPolicy, getGetOnboardingPolicyQueryKey,
  getGetCitizenCaseQueryKey, getListCitizenCasesQueryKey,
} from "@workspace/api-client-react";
import type { CitizenEvidenceInputContentType, CitizenUploadTicket } from "@workspace/api-client-react";
import { FileUp, RefreshCw, X } from "lucide-react";
import { errorMessage } from "@/components/global/utils";
import { fmtBytes } from "@/lib/session";

const ALLOWED = new Set<string>([
  "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4",
]);
const MAX = 20_000_000;

type Phase = "idle" | "hashing" | "ticket" | "uploading" | "finalizing" | "done" | "error";
const PHASE_LABEL: Record<Phase, string> = {
  idle: "Listo para enviar", hashing: "Calculando SHA-256 local…", ticket: "Solicitando espacio privado…",
  uploading: "Subiendo archivo privado…", finalizing: "Verificando en servidor…", done: "Evidencia registrada y verificada por el servidor", error: "Error",
};

async function sha256Hex(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function EvidenceUploader({ caseId, disabled }: { caseId: string; disabled?: boolean }) {
  const qc = useQueryClient();
  const policy = useGetOnboardingPolicy({ query: { queryKey: getGetOnboardingPolicyQueryKey() } });
  const requestUpload = useRequestCitizenUpload();
  const append = useAppendCitizenEvidence();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState<string | null>(null);
  const progress = useRef<{ sha: string | null; ticket: CitizenUploadTicket | null; uploaded: boolean }>({ sha: null, ticket: null, uploaded: false });
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = phase === "hashing" || phase === "ticket" || phase === "uploading" || phase === "finalizing";

  const pick = (f: File | null) => {
    setErr(null); setPhase("idle");
    progress.current = { sha: null, ticket: null, uploaded: false };
    if (!f) return setFile(null);
    if (!ALLOWED.has(f.type)) { setFile(null); return setErr("Formato no permitido. Usa JPEG, PNG, WebP, MP4, WebM o audio MP3/WAV/Ogg/WebM/MP4."); }
    if (f.size < 1 || f.size > MAX) { setFile(null); return setErr("El archivo debe pesar menos de 20 MB."); }
    if (f.name.length > 180) { setFile(null); return setErr("El nombre del archivo supera 180 caracteres."); }
    setFile(f);
  };

  const run = async () => {
    if (!file) return;
    setErr(null);
    const p = progress.current;
    const meta = () => ({ filename: file.name, contentType: file.type as CitizenEvidenceInputContentType, size: file.size, sha256: p.sha! });
    try {
      if (!p.sha) { setPhase("hashing"); p.sha = await sha256Hex(file); }
      if (!p.uploaded) {
        if (!p.ticket || new Date(p.ticket.expiresAt).getTime() < Date.now() + 5000) {
          setPhase("ticket");
          p.ticket = await requestUpload.mutateAsync({ id: caseId, data: meta() });
        }
        setPhase("uploading");
        const res = await fetch(p.ticket.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type }, credentials: "omit" });
        if (!res.ok) { p.ticket = null; throw new Error(`El almacenamiento rechazó la subida (${res.status}).`); }
        p.uploaded = true;
      }
      setPhase("finalizing");
      await append.mutateAsync({ id: caseId, data: { ...meta(), uploadId: p.ticket!.uploadId } });
      setPhase("done");
      qc.invalidateQueries({ queryKey: getGetCitizenCaseQueryKey(caseId) });
      qc.invalidateQueries({ queryKey: getListCitizenCasesQueryKey() });
      setFile(null);
      progress.current = { sha: null, ticket: null, uploaded: false };
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setPhase("error");
      setErr(errorMessage(e, "No se pudo completar la subida."));
    }
  };

  if (policy.isLoading) return <div className="gc-skel h-20" />;
  const unavailable = policy.isError || !policy.data?.storageAvailable || policy.data.evidenceMode !== "private_file";

  return (
    <div className="space-y-2" data-testid="panel-evidence-upload">
      <p className="gc-label">Agregar evidencia privada</p>
      {unavailable ? (
        <p role="status" className="text-[12.5px]" style={{ color: "hsl(var(--gc-amber))" }} data-testid="text-storage-unavailable">
          El almacenamiento privado no está disponible en este momento. No se aceptan archivos hasta que se restablezca; nada se guarda de forma simulada.
        </p>
      ) : (
        <>
          <input ref={inputRef} type="file" className="gc-input pt-2.5" disabled={disabled || busy}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4"
            onChange={(e) => pick(e.target.files?.[0] ?? null)} data-testid="input-evidence-file" />
          <p className="text-[11.5px]" style={{ color: "hsl(var(--gc-dim))" }}>Máx. 20 MB. Solo tú y personal autorizado pueden descargarla. El servidor recalcula el SHA-256 y verifica el tipo real.</p>
          {file && (
            <div className="flex flex-wrap items-center gap-2 gc-mono text-[12px]">
              <span className="[overflow-wrap:anywhere]" data-testid="text-evidence-selected">{file.name} · {fmtBytes(file.size)}</span>
              <span role="status" style={{ color: "hsl(var(--gc-cyan))" }} data-testid="status-evidence-phase">{PHASE_LABEL[phase]}</span>
            </div>
          )}
          {phase === "done" && <p role="status" className="text-[12.5px]" style={{ color: "hsl(var(--gc-lime))" }}>{PHASE_LABEL.done}.</p>}
          {err && <p role="alert" className="text-[12.5px]" style={{ color: "hsl(var(--gc-rose))" }} data-testid="text-evidence-error">{err}</p>}
          {file && (
            <div className="flex gap-2">
              <button className="gc-btn" onClick={run} disabled={busy || disabled} data-testid="button-evidence-upload">
                {phase === "error" ? <><RefreshCw size={14} /> Reintentar</> : <><FileUp size={14} /> {busy ? "Procesando…" : "Enviar evidencia"}</>}
              </button>
              <button className="gc-btn gc-btn-ghost" onClick={() => { pick(null); if (inputRef.current) inputRef.current.value = ""; }} disabled={busy} data-testid="button-evidence-discard"><X size={14} /> Descartar</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
