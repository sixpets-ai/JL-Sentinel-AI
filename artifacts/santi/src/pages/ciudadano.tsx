import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCitizenCases, getListCitizenCasesQueryKey, useCreateCitizenCase,
  useGetCrimeCatalog, getGetCrimeCatalogQueryKey,
} from "@workspace/api-client-react";
import type { CitizenCase, CitizenCaseInputZone } from "@workspace/api-client-react";
import { BellRing, Plus, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { Link } from "wouter";
import { errorMessage, errorStatus, fmtTime } from "@/components/global/utils";
import { PortalGate, PortalShell, allowCitizen } from "@/components/portal/portal-shell";
import { CaseDetail } from "@/components/portal/case-detail";
import { STATUS_COLOR, STATUS_LABEL, haversineMeters, useDocumentTitle } from "@/lib/session";
import { speakAsAgent, stopAgentSpeech } from "@/lib/agent-speech";

function useProximityAlert(cases: CitizenCase[] | undefined, voice: boolean) {
  const announced = useRef(new Set<string>());
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const [alert, setAlert] = useState<{ folio: string; text: string } | null>(null);
  useEffect(() => {
    for (const c of cases ?? []) {
      if (!c.unit || (c.status !== "active" && c.status !== "arrived")) continue;
      if (announced.current.has(c.unit.dispatchId)) continue;
      if (haversineMeters(c.unit.position, c.reportPoint) >= 100) continue;
      announced.current.add(c.unit.dispatchId);
      const text = `Simulación: Su unidad está a menos de 100 metros. El elemento a cargo es ${c.unit.officerName}. Por favor, manténgase en un lugar seguro.`;
      setAlert({ folio: c.folio, text });
      if (voiceRef.current) speakAsAgent(text, "lorena", () => undefined);
    }
  }, [cases]);
  return { alert, dismiss: () => setAlert(null) };
}

function NewCaseForm({ onCreated }: { onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const catalog = useGetCrimeCatalog({ query: { queryKey: getGetCrimeCatalogQueryKey() } });
  const rnid = useMemo(() => (catalog.data?.entries ?? []).filter((e) => e.system === "RNID"), [catalog.data]);
  const create = useCreateCitizenCase();
  const [categoryCode, setCat] = useState("");
  const [zone, setZone] = useState<CitizenCaseInputZone>("centro");
  const [description, setDesc] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault(); setLocalErr(null);
    if (!categoryCode) return setLocalErr("Elige una categoría.");
    const d = description.trim();
    if (d.length < 15 || d.length > 3000) return setLocalErr("La descripción debe tener entre 15 y 3000 caracteres.");
    create.mutate({ data: { categoryCode, description: d, zone } }, { onSuccess: (c) => {
      setDesc(""); setCat("");
      qc.invalidateQueries({ queryKey: getListCitizenCasesQueryKey() });
      onCreated(c.id);
    } });
  };
  return (
    <form onSubmit={submit} className="gc-glass p-4 space-y-3" noValidate data-testid="form-new-case">
      <h2 className="gc-display text-lg font-semibold flex items-center gap-2"><Plus size={16} /> Nuevo reporte simulado</h2>
      <label className="block space-y-1.5"><span className="gc-label">Categoría (RNID)</span>
        {catalog.isLoading ? <div className="gc-skel h-11" /> : (
          <select className="gc-input" value={categoryCode} onChange={(e) => setCat(e.target.value)} data-testid="select-category">
            <option value="">Selecciona…</option>
            {rnid.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>)}
      </label>
      {catalog.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(catalog.error)}</p>}
      <label className="block space-y-1.5"><span className="gc-label">Zona</span>
        <select className="gc-input" value={zone} onChange={(e) => setZone(e.target.value as CitizenCaseInputZone)} data-testid="select-zone">
          <option value="centro">Centro</option><option value="norte">Norte</option><option value="sur">Sur</option>
        </select></label>
      <label className="block space-y-1.5"><span className="gc-label">Qué ocurrió ({description.trim().length}/3000)</span>
        <textarea className="gc-input py-2 min-h-[110px]" maxLength={3000} value={description} onChange={(e) => setDesc(e.target.value)} data-testid="input-description" /></label>
      {(localErr || create.isError) && <p role="alert" className="text-[12.5px]" style={{ color: "hsl(var(--gc-rose))" }}>{localErr ?? errorMessage(create.error)}{create.isError && (errorStatus(create.error) === 403 || errorStatus(create.error) === 409) && <> <Link href="/acceso" data-testid="link-complete-onboarding">Completa o actualiza tu alta y consentimiento.</Link></>}</p>}
      <button className="gc-btn w-full" disabled={create.isPending} data-testid="button-create-case">{create.isPending ? "Registrando…" : "Registrar reporte"}</button>
      <p className="text-[11.5px]" style={{ color: "hsl(var(--gc-dim))" }}>No sustituye una denuncia ni una llamada de emergencia. En peligro real, llama al 911.</p>
    </form>
  );
}

export function CaseList({ cases, selected, onSelect, showOwner }: { cases: CitizenCase[]; selected: string | null; onSelect: (id: string) => void; showOwner?: boolean }) {
  return (
    <ul className="space-y-2">
      {cases.map((c) => (
        <li key={c.id}>
          <button onClick={() => onSelect(c.id)} aria-pressed={selected === c.id} className="w-full text-left rounded-xl p-3 transition-colors" data-testid={`card-case-${c.id}`}
            style={{ border: `1px solid hsl(var(--gc-${selected === c.id ? "cyan" : "line"}) / ${selected === c.id ? ".6" : ".14"})`, background: selected === c.id ? "hsl(var(--gc-cyan) / .08)" : "hsl(var(--gc-line) / .03)", color: "hsl(var(--gc-ink))" }}>
            <span className="flex items-center gap-2"><span className="gc-display font-semibold">{c.folio}</span>
              <span className="gc-badge ml-auto" style={{ color: STATUS_COLOR[c.status] }}>{STATUS_LABEL[c.status]}</span></span>
            <span className="block text-[12px] mt-1" style={{ color: "hsl(var(--gc-dim))" }}>{c.categoryLabel} · {fmtTime(c.createdAt)}{showOwner ? ` · ${c.ownerUsername}` : ""}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CitizenPortal() {
  const list = useListCitizenCases({ query: { queryKey: getListCitizenCasesQueryKey(), refetchInterval: 5000 } });
  const [selected, setSelected] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const { alert, dismiss } = useProximityAlert(list.data, voice);
  useEffect(() => () => stopAgentSpeech(), []);
  const current = selected ?? list.data?.[0]?.id ?? null;
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4 min-w-0">
        <button className="gc-btn gc-btn-ghost w-full" aria-pressed={voice} onClick={() => { if (voice) stopAgentSpeech(); setVoice(!voice); }} data-testid="button-toggle-voice">
          {voice ? <Volume2 size={14} /> : <VolumeX size={14} />} Aviso por voz: {voice ? "activado" : "desactivado"}
        </button>
        {alert && (
          <div role="alert" className="rounded-xl p-3 text-[13.5px] gc-rise" data-testid="alert-proximity" style={{ background: "hsl(var(--gc-lime) / .1)", border: "1px solid hsl(var(--gc-lime) / .5)" }}>
            <p className="flex items-center gap-2 gc-label" style={{ color: "hsl(var(--gc-lime))" }}><BellRing size={13} /> {alert.folio}</p>
            <p className="mt-1">{alert.text}</p>
            <button className="gc-btn gc-btn-ghost !min-h-[30px] mt-2" onClick={dismiss} data-testid="button-dismiss-alert">Entendido</button>
          </div>
        )}
        <NewCaseForm onCreated={setSelected} />
        <section className="gc-glass p-4 space-y-3">
          <h2 className="gc-label">Mis reportes</h2>
          {list.isLoading ? <div className="space-y-2"><div className="gc-skel h-14" /><div className="gc-skel h-14" /></div>
            : list.isError ? <div role="alert" className="space-y-2"><p className="text-[12.5px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(list.error)}</p>
                <button className="gc-btn gc-btn-ghost" onClick={() => list.refetch()} data-testid="button-retry-cases"><RefreshCw size={14} /> Reintentar</button></div>
            : (list.data ?? []).length === 0 ? <p className="text-[13px]" style={{ color: "hsl(var(--gc-dim))" }}>Aún no registras reportes. Usa el formulario para crear el primero; solo tú y personal autorizado lo verán.</p>
            : <CaseList cases={list.data!} selected={current} onSelect={setSelected} />}
        </section>
      </div>
      <div className="min-w-0">
        {current ? <CaseDetail key={current} caseId={current} mode="citizen" /> : (
          <div className="gc-glass p-8 text-center text-[14px]" style={{ color: "hsl(var(--gc-dim))" }}>Selecciona o crea un reporte para ver su seguimiento simulado.</div>
        )}
      </div>
    </div>
  );
}

export default function Ciudadano() {
  useDocumentTitle("Portal ciudadano");
  return <PortalGate allow={allowCitizen}>{(u) => <PortalShell user={u} title="Mis reportes" kicker="Portal ciudadano · seguimiento simulado"><CitizenPortal key={u.id} /></PortalShell>}</PortalGate>;
}
