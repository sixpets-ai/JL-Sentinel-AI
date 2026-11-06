import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCitizenCase, getGetCitizenCaseQueryKey, getListCitizenCasesQueryKey,
  useStartCitizenDispatch, useCloseCitizenCase, useListPatrolRoster, getListPatrolRosterQueryKey,
} from "@workspace/api-client-react";
import { Download, Flag, Navigation, RefreshCw, ShieldCheck, ShieldX } from "lucide-react";
import { errorMessage, errorStatus, fmtTime } from "@/components/global/utils";
import { STATUS_COLOR, STATUS_LABEL, evidenceContentUrl, fmtBytes, haversineMeters } from "@/lib/session";
import { CaseMap } from "./case-map";
import type { MapPoint } from "./case-map";
import { EvidenceUploader } from "./evidence-uploader";

export function CaseDetail({ caseId, mode, roster }: { caseId: string; mode: "citizen" | "staff"; roster?: boolean }) {
  const qc = useQueryClient();
  const q = useGetCitizenCase(caseId, { query: { queryKey: getGetCitizenCaseQueryKey(caseId), refetchInterval: 5000 } });
  const rosterQ = useListPatrolRoster({ query: { queryKey: getListPatrolRosterQueryKey(), enabled: !!roster } });
  const dispatch = useStartCitizenDispatch();
  const close = useCloseCitizenCase();
  const [patrolId, setPatrolId] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const c = q.data;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getGetCitizenCaseQueryKey(caseId) });
    qc.invalidateQueries({ queryKey: getListCitizenCasesQueryKey() });
  };

  const points = useMemo<MapPoint[]>(() => {
    if (!c) return [];
    const p: MapPoint[] = [{ id: "r", kind: "report", lat: c.reportPoint.lat, lng: c.reportPoint.lng, label: `${c.folio} · punto del reporte` }];
    if (c.unit) p.push({ id: "u", kind: "unit", lat: c.unit.position.lat, lng: c.unit.position.lng, label: `${c.unit.label} (simulada)`, linkTo: "r" });
    return p;
  }, [c]);

  if (q.isLoading) return <div className="gc-glass p-4 space-y-3"><div className="gc-skel h-6 w-1/2" /><div className="gc-skel h-[300px]" /><div className="gc-skel h-4" /></div>;
  if (q.isError || !c) {
    return (
      <div className="gc-glass p-4 space-y-2" role="alert">
        <p className="text-[13px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorStatus(q.error) === 404 ? "Caso no encontrado o sin acceso." : errorMessage(q.error)}</p>
        <button className="gc-btn gc-btn-ghost" onClick={() => q.refetch()} data-testid="button-retry-case"><RefreshCw size={14} /> Reintentar</button>
      </div>
    );
  }

  const dist = c.unit ? Math.round(haversineMeters(c.unit.position, c.reportPoint)) : null;
  const canStart = c.status === "registered";
  const canClose = c.status !== "completed";

  return (
    <article className="gc-glass p-4 space-y-4 gc-rise" data-testid={`detail-case-${c.id}`}>
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0">
          <p className="gc-label">Folio · {c.simulation ? "simulación" : "registro"}</p>
          <h2 className="gc-display text-2xl font-bold" data-testid="text-case-folio">{c.folio}</h2>
          <p className="text-[13px]" style={{ color: "hsl(var(--gc-dim))" }}>{c.categoryLabel} · zona {c.zone} · {fmtTime(c.createdAt)}{mode === "staff" ? ` · ${c.ownerUsername}` : ""}</p>
        </div>
        <span className="gc-badge ml-auto" style={{ color: STATUS_COLOR[c.status] }} data-testid="status-case">{STATUS_LABEL[c.status] ?? c.status}</span>
      </header>
      <p className="text-[14px] whitespace-pre-wrap [overflow-wrap:anywhere]" data-testid="text-case-description">{c.description}</p>

      <CaseMap points={points} fitKey={`${c.id}-${c.unit?.dispatchId ?? "none"}`} label={`Mapa simulado del caso ${c.folio}`} height={300} />

      {c.unit ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 gc-mono text-[12px]" data-testid="panel-unit">
          <div><p className="gc-label">Unidad ficticia</p><p>{c.unit.label}</p></div>
          <div><p className="gc-label">Elemento ficticio</p><p>{c.unit.officerName}</p></div>
          <div><p className="gc-label">Distancia</p><p data-testid="text-unit-distance" style={{ color: dist !== null && dist < 100 ? "hsl(var(--gc-lime))" : undefined }}>{dist} m</p></div>
          <div><p className="gc-label">Posición</p><p>Simulada, sin GPS</p></div>
        </div>
      ) : <p className="text-[12.5px]" style={{ color: "hsl(var(--gc-dim))" }}>Sin unidad simulada asignada.</p>}

      <div className="flex flex-wrap items-end gap-2">
        {canStart && roster && (
          <label className="space-y-1 min-w-[200px]"><span className="gc-label">Patrulla asignada</span>
            <select className="gc-input" value={patrolId} onChange={(e) => setPatrolId(e.target.value)} data-testid="select-patrol">
              <option value="">Asignación del servidor</option>
              {(rosterQ.data ?? []).map((p) => <option key={p.userId} value={p.userId}>{p.unitLabel}</option>)}
            </select>
          </label>
        )}
        {canStart && (
          <button className="gc-btn gc-btn-amber" disabled={dispatch.isPending} data-testid="button-start-dispatch"
            onClick={() => dispatch.mutate({ id: c.id, data: patrolId ? { patrolUserId: Number(patrolId) } : {} }, { onSuccess: refresh })}>
            <Navigation size={14} /> {dispatch.isPending ? "Iniciando…" : "Iniciar recorrido simulado"}
          </button>
        )}
        {canClose && (confirmClose ? (
          <>
            <button className="gc-btn" disabled={close.isPending} data-testid="button-confirm-close"
              onClick={() => close.mutate({ id: c.id }, { onSuccess: () => { setConfirmClose(false); refresh(); } })}>
              <Flag size={14} /> {close.isPending ? "Finalizando…" : "Confirmar: finalizar ejercicio"}</button>
            <button className="gc-btn gc-btn-ghost" onClick={() => setConfirmClose(false)} data-testid="button-cancel-close">Cancelar</button>
          </>
        ) : (
          <button className="gc-btn gc-btn-ghost" onClick={() => setConfirmClose(true)} data-testid="button-close-case"><Flag size={14} /> Finalizar ejercicio</button>
        ))}
      </div>
      <p className="text-[11.5px]" style={{ color: "hsl(var(--gc-dim))" }}>El recorrido simulado dura unos 45 segundos desde ~550 m. Finalizar conserva el historial original.</p>
      {dispatch.isError && <p role="alert" className="text-[12.5px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(dispatch.error)}</p>}
      {close.isError && <p role="alert" className="text-[12.5px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(close.error)}</p>}

      <section className="space-y-2">
        <h3 className="gc-label">Evidencia privada ({c.evidence.length})</h3>
        {c.evidence.length === 0 ? <p className="text-[12.5px]" style={{ color: "hsl(var(--gc-dim))" }}>Sin evidencia adjunta.</p> : (
          <ul className="space-y-1.5">
            {c.evidence.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 gc-mono text-[12px] rounded-lg p-2" style={{ background: "hsl(var(--gc-line) / .05)" }} data-testid={`row-evidence-${e.id}`}>
                <span className="w-full min-w-0 [overflow-wrap:anywhere] sm:w-auto sm:flex-1">{e.filename} · {fmtBytes(e.size)} · {fmtTime(e.createdAt)}</span>
                <span className="gc-badge" style={{ color: e.verification === "server_sha256" ? "hsl(var(--gc-lime))" : "hsl(var(--gc-amber))" }}>{e.verification === "server_sha256" ? "SHA-256 verificado" : "Solo declarado"}</span>
                <a href={evidenceContentUrl(e.id)} download={e.filename} className="gc-btn gc-btn-ghost !min-h-[32px] no-underline" data-testid={`link-evidence-download-${e.id}`}><Download size={13} /> Descargar</a>
                <span className="w-full text-[10.5px] break-all" style={{ color: "hsl(var(--gc-dim))" }}>{e.sha256}</span>
              </li>
            ))}
          </ul>
        )}
        {mode === "citizen" && <EvidenceUploader caseId={c.id} disabled={c.status === "completed"} />}
      </section>

      <section className="space-y-2">
        <h3 className="gc-label flex items-center gap-2">Traza encadenada
          {c.chainValid ? <span className="gc-badge" style={{ color: "hsl(var(--gc-lime))" }}><ShieldCheck size={11} /> íntegra</span>
            : <span className="gc-badge" role="alert" style={{ color: "hsl(var(--gc-rose))" }}><ShieldX size={11} /> alterada</span>}
        </h3>
        <ol className="space-y-1.5 border-l pl-3" style={{ borderColor: "hsl(var(--gc-line) / .2)" }}>
          {c.timeline.map((t) => (
            <li key={t.id} className="text-[12.5px]" data-testid={`row-timeline-${t.id}`}>
              <span className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>{fmtTime(t.createdAt)} · {t.kind}</span>
              <p>{t.summary}</p>
              {mode === "staff" && <p className="gc-mono text-[10px] break-all" style={{ color: "hsl(var(--gc-dim))" }}>{t.hash}</p>}
            </li>
          ))}
        </ol>
        <p className="gc-mono text-[10px] break-all" style={{ color: "hsl(var(--gc-dim))" }}>Hash original: {c.originalHash}</p>
      </section>
    </article>
  );
}
