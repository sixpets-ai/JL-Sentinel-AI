import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetRecordLedger, getGetRecordLedgerQueryKey, getListSealedRecordsQueryKey,
  useCreateAmendmentValidation, useAppendRecordAmendment, useAppendRecordEvidence,
} from "@workspace/api-client-react";
import type { LedgerEntry, RecordLedger } from "@workspace/api-client-react";
import { Check, Copy, FileSignature, HardDrive, RefreshCw, Stamp } from "lucide-react";
import "@/styles/ledger.css";
import { errorMessage, errorStatus } from "@/components/global/utils";
import { SealView } from "./seal-badge";
import { DEVICE_LABEL, EVENT_COLOR, EVENT_LABEL, STATUS_LABEL, fmtDate, obj, pretty, safeParse, str, validEvidenceUrl } from "./utils";

type Kind = "tactical" | "nexus";
const dim = { color: "hsl(var(--td-dim))" };

function CopyHash({ value, testId }: { value: string; testId?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-start gap-2">
      <code className="lg-hash flex-1 min-w-0" data-testid={testId}>{value}</code>
      <button className="td-chip !min-h-[28px] shrink-0" aria-label="Copiar hash" onClick={async () => { try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1400); } catch { setOk(false); } }}>
        {ok ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

function EntrySummary({ e }: { e: LedgerEntry }) {
  const p = safeParse(e.data);
  if (!p.ok) return <p className="text-[12px]" style={dim}>Datos no estructurados (ver texto plano).</p>;
  const d = obj(p.value);
  if (e.eventType === "amendment") return (
    <div className="text-[12.5px] space-y-1">
      <p><span className="td-badge" style={{ color: d.action === "cancellation" ? "hsl(var(--td-rose))" : "hsl(var(--td-sodium))" }}>{d.action === "cancellation" ? "Cancelación anotada" : "Aclaración"}</span></p>
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{str(d.justification)}</p>
      <p className="td-mono text-[10.5px]" style={dim}>Firma simulada · {str(obj(d.signature).mode)} · validada {fmtDate(str(obj(d.signature).validatedAt))}</p>
    </div>
  );
  if (e.eventType === "evidence") return (
    <div className="text-[12.5px] space-y-1">
      <p><span className="td-badge" style={{ color: "hsl(var(--td-rose))" }}>{DEVICE_LABEL[str(d.device)] ?? str(d.device)}</span> {str(d.label)}</p>
      <p className="[overflow-wrap:anywhere]" style={dim}>Ref: {str(d.reference)}</p>
      <p className="td-mono text-[10.5px]" style={{ color: "hsl(var(--td-sodium))" }}>Declarado, no verificado</p>
    </div>
  );
  if (e.eventType === "recorded") return <p className="text-[12.5px]" style={dim}>Registro base inmutable{d.imported ? " · importado de datos previos" : ""}.</p>;
  const snap = obj(d.snapshot);
  return <p className="text-[12.5px]" style={dim}>Instantánea {str(snap.folio)} · informe {str(snap.reportStatus)} · ruta {str(snap.routeStatus)}</p>;
}

function AmendmentForm({ kind, id, onDone }: { kind: Kind; id: string; onDone: (l: RecordLedger) => void }) {
  const [action, setAction] = useState<"clarification" | "cancellation">("clarification");
  const [just, setJust] = useState("");
  const [token, setToken] = useState<{ value: string; expiresAt: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const validate = useCreateAmendmentValidation();
  const seal = useAppendRecordAmendment();
  const len = just.trim().length;
  const okLen = len >= 15 && len <= 2000;
  const clear = () => { setToken(null); validate.reset(); seal.reset(); };

  const runValidate = () => {
    setNote(null);
    validate.mutate({ kind, id, data: { action, justification: just.trim() } }, { onSuccess: (v) => setToken({ value: v.validationToken, expiresAt: v.expiresAt }) });
  };
  const runSeal = () => {
    if (!token) return;
    if (new Date(token.expiresAt).getTime() <= Date.now()) { setToken(null); setNote("La validación simulada expiró. Valida de nuevo."); return; }
    seal.mutate({ kind, id, data: { action, justification: just.trim(), validationToken: token.value } }, {
      onSuccess: (l) => { setToken(null); setJust(""); setNote("Enmienda sellada y anexada a la cadena."); onDone(l); },
      onError: () => setToken(null),
    });
  };

  return (
    <section className="td-glass p-4 space-y-3" aria-labelledby="am-h">
      <h3 id="am-h" className="td-label flex items-center gap-2"><FileSignature size={13} /> Anexar enmienda</h3>
      <p className="text-[11.5px]" style={dim}>El registro original nunca se modifica. Una cancelación es una anotación, no un borrado. La firma es una validación SIMULADA de un solo uso (5 min): no hay biometría ni certificado digital real.</p>
      <label className="block text-[12px]">Tipo
        <select className="td-select mt-1" value={action} onChange={(e) => { setAction(e.target.value as typeof action); clear(); }} data-testid="amendment-action">
          <option value="clarification">Aclaración</option><option value="cancellation">Cancelación (anotación)</option>
        </select>
      </label>
      <label className="block text-[12px]">Justificación
        <textarea className="lg-input mt-1" maxLength={2000} value={just} onChange={(e) => { setJust(e.target.value); clear(); }} data-testid="amendment-justification" />
      </label>
      <p className="td-mono text-[10.5px]" style={{ color: okLen || len === 0 ? "hsl(var(--td-dim))" : "hsl(var(--td-rose))" }}>{len}/2000 · mínimo 15</p>
      <button className="td-btn td-btn-ghost w-full" disabled={!okLen || validate.isPending || !!token} onClick={runValidate} data-testid="validate-signature">
        {validate.isPending ? "Validando…" : token ? "Firma simulada validada" : "Validar firma SIMULADA"}
      </button>
      {token && <p className="td-mono text-[11px]" role="status" style={{ color: "hsl(var(--td-mint))" }}>Validación simulada vigente hasta {fmtDate(token.expiresAt)}. Cambiar el texto o tipo la invalida.</p>}
      <button className="td-btn w-full" disabled={!token || seal.isPending} onClick={runSeal} data-testid="seal-amendment">
        <Stamp size={14} /> {seal.isPending ? "Sellando…" : "Sellar enmienda"}
      </button>
      {validate.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>{errorMessage(validate.error)}</p>}
      {seal.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>{errorMessage(seal.error)} Valida de nuevo para reintentar.</p>}
      {note && <p role="status" className="text-[12px]" style={{ color: "hsl(var(--td-sodium))" }}>{note}</p>}
    </section>
  );
}

function EvidenceForm({ kind, id, onDone }: { kind: Kind; id: string; onDone: (l: RecordLedger) => void }) {
  const [device, setDevice] = useState<keyof typeof DEVICE_LABEL>("cctv");
  const [label, setLabel] = useState("");
  const [reference, setReference] = useState("");
  const [url, setUrl] = useState("");
  const [sha, setSha] = useState("");
  const save = useAppendRecordEvidence();
  const urlErr = validEvidenceUrl(url.trim());
  const shaErr = sha.trim() && !/^[a-fA-F0-9]{64}$/.test(sha.trim()) ? "El hash debe tener 64 caracteres hexadecimales." : null;
  const ok = label.trim().length >= 3 && reference.trim().length >= 3 && !urlErr && !shaErr;

  const submit = () => {
    save.mutate({ kind, id, data: {
      device: device as "cctv", label: label.trim(), reference: reference.trim(),
      ...(url.trim() ? { url: url.trim() } : {}), ...(sha.trim() ? { sha256: sha.trim().toLowerCase() } : {}),
    } }, { onSuccess: (l) => { setLabel(""); setReference(""); setUrl(""); setSha(""); onDone(l); } });
  };

  return (
    <section className="td-glass p-4 space-y-3" aria-labelledby="ev-h">
      <h3 id="ev-h" className="td-label flex items-center gap-2"><HardDrive size={13} /> Referencia de evidencia digital</h3>
      <p className="text-[11.5px]" style={dim}>Solo se registra una referencia. No se suben, descargan ni verifican archivos; el hash es declarado, no comprobado. Para CCTV interno usa una referencia humana (cámara, fecha, folio). Nunca pegues claves ni tokens.</p>
      <select className="td-select" value={device} onChange={(e) => setDevice(e.target.value)} data-testid="evidence-device" aria-label="Dispositivo">
        {Object.entries(DEVICE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input className="lg-input" placeholder="Etiqueta (3–120)" maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} data-testid="evidence-label" />
      <input className="lg-input" placeholder="Referencia humana (3–500)" maxLength={500} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="evidence-reference" />
      <input className="lg-input" placeholder="URL HTTPS opcional" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} data-testid="evidence-url" />
      {urlErr && <p className="text-[11.5px]" style={{ color: "hsl(var(--td-rose))" }}>{urlErr}</p>}
      <input className="lg-input td-mono" placeholder="SHA-256 declarado opcional" value={sha} onChange={(e) => setSha(e.target.value)} data-testid="evidence-sha256" />
      {shaErr && <p className="text-[11.5px]" style={{ color: "hsl(var(--td-rose))" }}>{shaErr}</p>}
      <button className="td-btn w-full" disabled={!ok || save.isPending} onClick={submit} data-testid="evidence-save">{save.isPending ? "Registrando…" : "Registrar referencia"}</button>
      {save.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>{errorMessage(save.error)}</p>}
    </section>
  );
}

export function LedgerPanel({ kind, id, compact = false }: { kind: Kind; id: string; compact?: boolean }) {
  const qc = useQueryClient();
  const q = useGetRecordLedger(kind, id, { query: { queryKey: getGetRecordLedgerQueryKey(kind, id), enabled: !!id, retry: false } });
  const onDone = (l: RecordLedger) => {
    qc.setQueryData(getGetRecordLedgerQueryKey(kind, id), l);
    void qc.invalidateQueries({ queryKey: getGetRecordLedgerQueryKey(kind, id) });
    void qc.invalidateQueries({ queryKey: getListSealedRecordsQueryKey() });
  };

  if (q.isLoading) return <div className="space-y-2" aria-label="Cargando expediente"><div className="td-skel h-16" /><div className="td-skel h-40" /></div>;
  if (q.isError || !q.data) {
    const st = errorStatus(q.error);
    return (
      <div role="alert" className="td-glass p-4 space-y-2">
        <p className="text-[13px]" style={{ color: "hsl(var(--td-rose))" }}>
          {st === 401 ? "Inicia sesión con rol oficial o director para ver el expediente." : st === 403 ? "Tu rol no permite consultar este expediente." : st === 404 ? "No existe un expediente sellado con ese identificador." : errorMessage(q.error)}
        </p>
        <button className="td-btn td-btn-ghost" onClick={() => q.refetch()} data-testid="button-retry-ledger"><RefreshCw size={13} /> Reintentar</button>
      </div>
    );
  }
  const l = q.data;
  const evidence = l.entries.filter((e) => e.eventType === "evidence");
  const entries = [...l.entries].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-3" data-testid="panel-ledger">
      <section className="td-glass p-4 space-y-3 td-rise">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="td-display text-xl [overflow-wrap:anywhere] min-w-0" data-testid="text-ledger-folio">{l.record.folio}</h2>
          <SealView integrity={l.integrity} detail={l.integrityDetail} />
          <span className="td-badge" style={{ color: l.record.status === "cancellation_recorded" ? "hsl(var(--td-rose))" : "hsl(var(--td-sodium))" }} data-testid="status-record">{STATUS_LABEL[l.record.status]}</span>
        </div>
        {!l.integrity && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>Advertencia de integridad: {l.integrityDetail}</p>}
        {l.integrity && <p className="text-[11.5px]" style={dim}>{l.integrityDetail} El sello indica que la cadena de hashes es consistente; no certifica que los hechos sean verdaderos. Requiere revisión humana.</p>}
        <p className="td-mono text-[11px]" style={dim}>{kind === "tactical" ? "Táctico" : "Nexus"} · {fmtDate(l.record.createdAt)} · {l.record.entryCount} entradas</p>
        <div><p className="td-label mb-1">Hash del original</p><CopyHash value={l.record.originalHash} testId="ledger-original-hash" /></div>
        <details className="lg-disc">
          <summary className="td-label" style={{ color: "hsl(var(--td-uv))" }}>Registro original legible</summary>
          <pre className="lg-pre mt-2" data-testid="text-ledger-original">{pretty(l.original)}</pre>
          <p className="td-label mt-2 mb-1">Forma canónica</p>
          <pre className="lg-pre">{l.originalCanonical}</pre>
        </details>
      </section>

      <section className="td-glass p-4 space-y-3" aria-labelledby="tl-h">
        <h3 id="tl-h" className="td-label">Línea de tiempo de la cadena · {entries.length}</h3>
        {entries.length === 0 ? <p className="text-[12px]" style={dim}>Sin entradas.</p> : (
          <ol className="lg-timeline space-y-3" data-testid="ledger-timeline">
            {entries.map((e) => (
              <li key={e.id} className="lg-node" style={{ ["--lg-c" as string]: EVENT_COLOR[e.eventType] }} data-testid={`row-ledger-entry-${e.sequence}`}>
                <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--td-line) / .04)", border: "1px solid hsl(var(--td-line) / .1)" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="td-mono text-[11px]" style={{ color: `hsl(${EVENT_COLOR[e.eventType]})` }}>#{e.sequence}</span>
                    <span className="text-[13px] font-medium">{EVENT_LABEL[e.eventType]}</span>
                    <span className="td-mono text-[10.5px] ml-auto [overflow-wrap:anywhere]" style={dim}>{e.actor} · {fmtDate(e.createdAt)}</span>
                  </div>
                  <EntrySummary e={e} />
                  <details className="lg-disc">
                    <summary className="td-mono text-[10.5px]" style={{ color: "hsl(var(--td-uv))" }}>Hashes y datos</summary>
                    <div className="space-y-1 mt-2">
                      <p className="td-label">Hash</p><CopyHash value={e.hash} />
                      <p className="td-label">Hash previo</p><code className="lg-hash block">{e.previousHash}</code>
                      <p className="td-label">Hash de carga</p><code className="lg-hash block">{e.payloadHash}</code>
                      <pre className="lg-pre">{pretty(e.data)}</pre>
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="td-glass p-4 space-y-2" aria-labelledby="cu-h">
        <h3 id="cu-h" className="td-label">Cadena de custodia digital · {evidence.length}</h3>
        {evidence.length === 0 ? <p className="text-[12px]" style={dim}>Aún no hay referencias de evidencia.</p> : (
          <ul className="space-y-2" data-testid="list-custody">
            {evidence.map((e) => {
              const d = obj(safeParse(e.data).ok ? (safeParse(e.data) as { value: unknown }).value : {});
              const u = str(d.url);
              return (
                <li key={e.id} className="text-[12px] border-l-2 pl-2" style={{ borderColor: "hsl(var(--td-rose) / .5)" }} data-testid={`row-custody-${e.id}`}>
                  <p className="font-medium">{DEVICE_LABEL[str(d.device)] ?? str(d.device)} · {str(d.label)}</p>
                  <p className="[overflow-wrap:anywhere]" style={dim}>{str(d.reference)}</p>
                  {/^https:\/\//.test(u) && <a className="lg-hash" style={{ color: "hsl(var(--td-uv))" }} href={u} target="_blank" rel="noopener noreferrer nofollow">{u}</a>}
                  {str(d.sha256) && <p className="lg-hash">SHA-256 declarado {str(d.sha256)}</p>}
                  <p className="td-mono text-[10.5px]" style={dim}>#{e.sequence} · {e.actor} · {fmtDate(e.createdAt)} · contenido no verificado</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {l.record.canWrite ? (
        <div className={compact ? "space-y-3" : "grid gap-3 md:grid-cols-2"}>
          <AmendmentForm key={`am-${kind}-${id}`} kind={kind} id={id} onDone={onDone} />
          <EvidenceForm key={`ev-${kind}-${id}`} kind={kind} id={id} onDone={onDone} />
        </div>
      ) : <p className="text-[12px] px-1" style={dim}>Solo lectura: tu rol no puede anexar a este expediente (director para Nexus, oficial para sus registros tácticos).</p>}
    </div>
  );
}
