import { useMemo, useState } from "react";
import { Link, Redirect } from "wouter";
import { isRestricted, portalFor } from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGlobalSession, getGetGlobalSessionQueryKey, useLogoutGlobalUser,
  useGetGlobalSnapshot, getGetGlobalSnapshotQueryKey, useCreateGlobalBrief,
  useSimulateGlobalRoute, useSubmitGlobalAudit, GlobalTopic,
  useListGlobalBriefs, getListGlobalBriefsQueryKey,
} from "@workspace/api-client-react";
import type { GlobalBrief, GlobalRoute, GlobalUser } from "@workspace/api-client-react";
import { ArrowLeft, FileText, LogOut, Lock, Route as RouteIcon, Send, RefreshCw } from "lucide-react";
import "@/styles/global-command.css";
import { AuthPanel } from "@/components/global/auth-panel";
import { GlobalMap } from "@/components/global/global-map";
import { GovernancePanel, GovernanceView, UsersPanel } from "@/components/global/director-panels";
import { useGlobalSocket } from "@/components/global/use-global-socket";
import { KIND_COLOR, KIND_LABEL, TOPIC_LABEL, errorMessage, errorStatus, fmtTime, safeHttpUrl } from "@/components/global/utils";

const SRC_COLOR: Record<string, string> = {
  live: "hsl(128 50% 62%)", cached: "hsl(41 86% 62%)", unavailable: "hsl(350 78% 66%)", not_configured: "hsl(205 16% 62%)",
};

function Locked({ need }: { need: string }) {
  return (
    <p className="text-[12px] flex items-center gap-2" style={{ color: "hsl(var(--gc-dim))" }} data-testid="text-permission">
      <Lock size={13} /> Requiere rol {need}. Tu rol actual solo permite consulta.
    </p>
  );
}

function Workspace({ user }: { user: GlobalUser }) {
  const qc = useQueryClient();
  const [topic, setTopic] = useState<GlobalTopic>(GlobalTopic.earthquake);
  const [showDemo, setShowDemo] = useState(true);
  const [showGlobal, setShowGlobal] = useState(true);
  const [showIntensity, setShowIntensity] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [route, setRoute] = useState<GlobalRoute | null>(null);
  const [selectedBrief, setBrief] = useState<GlobalBrief | null>(null);
  const [auditAck, setAuditAck] = useState(false);

  const canOperate = user.role === "analista" || user.role === "oficial" || user.role === "director";
  const isDirector = user.role === "director";
  const history = useListGlobalBriefs({ topic }, {
    query: { queryKey: getListGlobalBriefsQueryKey({ topic }), enabled: canOperate, refetchInterval: 60000 },
  });
  const brief = selectedBrief ?? history.data?.[0] ?? null;
  const socket = useGlobalSocket(topic, true);

  const snap = useGetGlobalSnapshot({ topic }, {
    query: { queryKey: getGetGlobalSnapshotQueryKey({ topic }), enabled: !!user, refetchInterval: 60000 },
  });
  const logout = useLogoutGlobalUser({
    mutation: { onSuccess: () => {
      const key = getGetGlobalSessionQueryKey();
      qc.removeQueries({ predicate: query => JSON.stringify(query.queryKey) !== JSON.stringify(key) });
      qc.setQueryData(key, null);
    } },
  });
  const createBrief = useCreateGlobalBrief();
  const simulate = useSimulateGlobalRoute();
  const audit = useSubmitGlobalAudit();

  const events = snap.data?.events ?? [];
  const visible = useMemo(
    () => events.filter((e) => (e.kind === "local_demo" ? showDemo : showGlobal)),
    [events, showDemo, showGlobal],
  );
  const mapped = visible.filter((e) => e.lat !== null && e.lng !== null);
  const unmapped = visible.length - mapped.length;

  const toggleSel = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 8 ? s : [...s, id]));
    setRoute(null);
  };
  const changeTopic = (t: GlobalTopic) => { setTopic(t); setSelected([]); setRoute(null); setBrief(null); audit.reset(); setAuditAck(false); };

  const runRoute = () => {
    const pts = selected.map((id) => events.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e && e.lat !== null && e.lng !== null)
      .map((e) => ({ name: e.title.slice(0, 100) || e.id, lat: e.lat!, lng: e.lng! }));
    if (pts.length < 2) return;
    simulate.mutate({ data: { points: pts } }, { onSuccess: setRoute });
  };

  const runBrief = () => {
    audit.reset(); setAuditAck(false);
    createBrief.mutate({ data: { topic } }, { onSuccess: saved => {
      setBrief(saved);
      void qc.invalidateQueries({ queryKey: getListGlobalBriefsQueryKey({ topic }) });
    } });
  };
  const sendAudit = () => {
    if (!brief) return;
    audit.mutate({ data: { briefId: brief.id, prompt: `Informe SANTI Global — tema: ${topic}`.slice(0, 4000), response: brief.text } }, {
      onSuccess: result => {
        setBrief({ ...brief, auditStatus: result.runId ? `${result.status} · ${result.runId}` : result.status });
        void qc.invalidateQueries({ queryKey: getListGlobalBriefsQueryKey({ topic }) });
      },
    });
  };

  const sockColor = socket.state === "connected" ? "hsl(var(--gc-lime))" : socket.state === "connecting" ? "hsl(var(--gc-amber))" : "hsl(var(--gc-rose))";

  return (
    <div className="gc-root">
      <header className="gc-glass !rounded-none !border-x-0 !border-t-0 px-4 py-3 flex flex-wrap items-center gap-3">
        <Link href="/" className="gc-btn gc-btn-ghost no-underline" data-testid="link-back-nexus">
          <ArrowLeft size={15} /> Nexus
        </Link>
        <h1 className="gc-display text-lg font-bold">SANTI<span style={{ color: "hsl(var(--gc-cyan))" }}>/</span>GLOBAL</h1>
        <nav aria-label="Tema" className="flex flex-wrap gap-1.5 order-last md:order-none w-full md:w-auto">
          {Object.values(GlobalTopic).map((t) => (
            <button key={t} className="gc-chip" aria-pressed={topic === t} disabled={createBrief.isPending || simulate.isPending || audit.isPending} onClick={() => changeTopic(t)} data-testid={`button-topic-${t}`}>
              {TOPIC_LABEL[t]}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3 min-w-0 max-w-full w-full lg:w-auto">
          <span className="gc-mono text-[11px] flex items-center gap-1.5" role="status" data-testid="status-socket">
            <span className="gc-dot" style={{ background: sockColor }} />
            {socket.state === "connected" ? "Canal conectado" : socket.state === "connecting" ? "Conectando…" : "Canal desconectado"}
            {socket.members !== null && socket.state === "connected" && <span style={{ color: "hsl(var(--gc-dim))" }}> · {socket.members} en sala</span>}
          </span>
          <span className="gc-mono text-[12px] min-w-0 [overflow-wrap:anywhere]" data-testid="text-user">{user.username} <span className="gc-badge" style={{ color: "hsl(var(--gc-amber))" }}>{user.role}</span></span>
          <button className="gc-btn gc-btn-ghost" onClick={() => logout.mutate()} disabled={logout.isPending} data-testid="button-logout">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>
      {logout.isError && <p role="alert" className="px-4 py-2 text-sm">No se pudo cerrar la sesión. Reintenta con conexión.</p>}

      <div className="gc-grid">
        <div className="space-y-3 min-w-0">
          <div className="gc-glass p-3 flex flex-wrap items-center gap-2" role="group" aria-label="Capas">
            <span className="gc-label mr-1">Capas</span>
            <button className="gc-chip" aria-pressed={showGlobal} onClick={() => setShowGlobal((v) => !v)} data-testid="toggle-layer-global">Cobertura global</button>
            <button className="gc-chip" aria-pressed={showDemo} onClick={() => setShowDemo((v) => !v)} data-testid="toggle-layer-demo">Demo local Nexus</button>
            <button className="gc-chip" aria-pressed={showIntensity} onClick={() => setShowIntensity((v) => !v)} data-testid="toggle-layer-intensity">Intensidad de menciones</button>
            <span className="gc-mono text-[11px] ml-auto" style={{ color: "hsl(var(--gc-dim))" }}>
              {snap.data ? `${mapped.length} en mapa · ${unmapped} sin coordenadas · ${snap.data.cached ? "caché" : "fresco"} ${fmtTime(snap.data.fetchedAt)}` : ""}
            </span>
          </div>
          {showIntensity && (
            <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-amber))" }}>
              El mapa de intensidad agrega volumen de menciones publicadas, no riesgo ni severidad.
            </p>
          )}
          <div className="relative">
            <GlobalMap events={visible} showIntensity={showIntensity} selected={selected} onToggle={toggleSel} route={route?.points ?? null} />
            {snap.isLoading && <div className="absolute inset-0 gc-skel !rounded-[14px] opacity-70" aria-label="Cargando panorama" />}
          </div>
          {snap.data?.notice && <p className="text-[12px]" style={{ color: "hsl(var(--gc-dim))" }} data-testid="text-notice">{snap.data.notice}</p>}

          <section className="gc-glass p-4" aria-labelledby="ev-h">
            <div className="flex items-center justify-between mb-3">
              <h2 id="ev-h" className="gc-label">Eventos publicados · {TOPIC_LABEL[topic]}</h2>
              <button className="gc-btn gc-btn-ghost !min-h-[32px]" onClick={() => snap.refetch()} disabled={snap.isFetching} data-testid="button-refresh-snapshot">
                <RefreshCw size={13} /> {snap.isFetching ? "Actualizando" : "Actualizar"}
              </button>
            </div>
            {snap.isLoading && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="gc-skel h-12" />)}</div>}
            {snap.isError && (
              <div role="alert" className="space-y-2">
                <p style={{ color: "hsl(var(--gc-rose))" }} className="text-[13px]">No se pudo cargar el panorama: {errorMessage(snap.error)}</p>
                <button className="gc-btn gc-btn-ghost" onClick={() => snap.refetch()} data-testid="button-retry-snapshot">Reintentar</button>
              </div>
            )}
            {snap.data && visible.length === 0 && (
              <div className="py-8 text-center">
                <p className="gc-display text-lg">Sin eventos en las capas activas</p>
                <p className="text-[13px] mt-1" style={{ color: "hsl(var(--gc-dim))" }}>Las fuentes pueden no tener cobertura reciente o estar no disponibles. Revisa el estado de fuentes.</p>
              </div>
            )}
            {visible.length > 0 && (
              <ul className="gc-scroll space-y-1">
                {visible.map((e) => {
                  const url = safeHttpUrl(e.url);
                  const hasGeo = e.lat !== null && e.lng !== null;
                  return (
                    <li key={e.id} className="flex gap-3 items-start py-2 border-b" style={{ borderColor: "hsl(var(--gc-line) / .07)" }} data-testid={`row-event-${e.id}`}>
                      {canOperate && (
                        <input type="checkbox" className="mt-1 w-4 h-4 accent-amber-400" checked={selected.includes(e.id)}
                          disabled={!hasGeo || (!selected.includes(e.id) && selected.length >= 8)}
                          onChange={() => toggleSel(e.id)} aria-label={`Seleccionar ${e.title} para ruta`} data-testid={`checkbox-event-${e.id}`} />
                      )}
                      <span className="gc-dot mt-1.5" style={{ background: KIND_COLOR[e.kind] }} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-snug">{e.title}</p>
                        <p className="gc-mono text-[11px] mt-0.5" style={{ color: "hsl(var(--gc-dim))" }}>
                          {KIND_LABEL[e.kind]} · {e.source} · {fmtTime(e.publishedAt ?? e.observedAt)} · {e.mentions} menciones{!hasGeo && " · sin ubicación"}
                          {url && <> · <a href={url} target="_blank" rel="noopener noreferrer nofollow">fuente</a></>}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3 min-w-0">
          <section className="gc-glass p-4 space-y-2" aria-labelledby="src-h">
            <h2 id="src-h" className="gc-label">Estado de fuentes</h2>
            {snap.isLoading && <div className="gc-skel h-20" />}
            {snap.data && snap.data.sources.length === 0 && <p className="text-[13px]" style={{ color: "hsl(var(--gc-dim))" }}>Ninguna fuente reportada.</p>}
            {snap.data?.sources.map((s) => (
              <div key={s.name} className="flex gap-2 items-start" data-testid={`status-source-${s.name}`}>
                <span className="gc-badge shrink-0" style={{ color: SRC_COLOR[s.status] }}>{s.status.replace("_", " ")}</span>
                <div className="min-w-0"><p className="text-[13px] font-medium">{s.name}</p><p className="text-[12px]" style={{ color: "hsl(var(--gc-dim))" }}>{s.detail}</p></div>
              </div>
            ))}
          </section>

          <section className="gc-glass p-4 space-y-3" aria-labelledby="brief-h">
            <h2 id="brief-h" className="gc-label flex items-center gap-2"><FileText size={13} /> Informe con fuentes</h2>
            {!canOperate ? <Locked need="oficial o director" /> : (
              <>
                <button className="gc-btn w-full" onClick={runBrief} disabled={createBrief.isPending || !snap.data} data-testid="button-create-brief">
                  {createBrief.isPending ? "Generando…" : `Generar informe · ${TOPIC_LABEL[topic]}`}
                </button>
                {createBrief.isPending && <div className="gc-skel h-24" />}
                {createBrief.isError && <p role="alert" className="text-[13px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(createBrief.error)}</p>}
                {brief && (
                  <div className="space-y-2" data-testid="text-brief">
                    {!!history.data?.length && <label className="block text-xs">
                      Informes guardados
                      <select className="gc-input mt-1" value={brief.id} disabled={audit.isPending} onChange={event => {
                        setBrief(history.data?.find(saved => saved.id === Number(event.target.value)) ?? null);
                        audit.reset(); setAuditAck(false);
                      }}>
                        {history.data.map(saved => <option key={saved.id} value={saved.id}>#{saved.id} · {fmtTime(saved.createdAt)}</option>)}
                      </select>
                    </label>}
                    <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>#{brief.id} · {fmtTime(brief.createdAt)} · auditoría: {brief.auditStatus}</p>
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap gc-scroll !max-h-[260px] pr-1">{brief.text}</div>
                    {brief.sourceUrls.length > 0 && (
                      <div><p className="gc-label mb-1">Atribución</p>
                        <ol className="list-decimal pl-5 space-y-0.5 text-[12px]">
                          {brief.sourceUrls.map((u, i) => {
                            const s = safeHttpUrl(u);
                            return <li key={i} className="break-all">{s ? <a href={s} target="_blank" rel="noopener noreferrer nofollow">{new URL(s).hostname}</a> : <span style={{ color: "hsl(var(--gc-dim))" }}>enlace no válido omitido</span>}</li>;
                          })}
                        </ol>
                      </div>
                    )}
                    <div className="pt-2 border-t space-y-2" style={{ borderColor: "hsl(var(--gc-line) / .1)" }}>
                      <p className="text-[12px]" style={{ color: "hsl(var(--gc-dim))" }}>
                        Enviar a IBM comparte el texto de este informe con el monitor configurado. El monitor evalúa respuestas acumuladas; no certifica este informe ni garantiza ausencia de sesgos o alucinaciones.
                      </p>
                      <label className="flex items-center gap-2 text-[12px]">
                        <input type="checkbox" checked={auditAck} onChange={(e) => setAuditAck(e.target.checked)} data-testid="checkbox-audit-consent" />
                        Entiendo que el texto se comparte con IBM
                      </label>
                      <button className="gc-btn gc-btn-amber w-full" onClick={sendAudit} disabled={!auditAck || audit.isPending} data-testid="button-submit-audit">
                        <Send size={14} /> {audit.isPending ? "Enviando…" : "Enviar a IBM para auditoría"}
                      </button>
                      {audit.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(audit.error)}</p>}
                      {audit.data && <GovernanceView g={audit.data} />}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="gc-glass p-4 space-y-3" aria-labelledby="route-h">
            <h2 id="route-h" className="gc-label flex items-center gap-2"><RouteIcon size={13} /> Ruta ilustrativa</h2>
            <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-amber))" }}>Simulación clásica, no QPU. Conexiones en línea recta; no es navegación vial ni optimización de respuesta.</p>
            {!canOperate ? <Locked need="oficial o director" /> : (
              <>
                <p className="text-[12px]" style={{ color: "hsl(var(--gc-dim))" }}>Selecciona 2–8 eventos con ubicación (mapa o lista). Seleccionados: {selected.length}/8</p>
                <div className="flex gap-2">
                  <button className="gc-btn flex-1" onClick={runRoute} disabled={selected.length < 2 || simulate.isPending} data-testid="button-simulate-route">
                    {simulate.isPending ? "Calculando…" : "Simular"}
                  </button>
                  <button className="gc-btn gc-btn-ghost" onClick={() => { setSelected([]); setRoute(null); }} disabled={selected.length === 0} data-testid="button-clear-route">Limpiar</button>
                </div>
                {simulate.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(simulate.error)}</p>}
                {route && (
                  <div className="space-y-1 text-[12px]" data-testid="text-route">
                    <p className="gc-display text-2xl">{route.distanceKm.toFixed(1)} km</p>
                    <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>{route.algorithm}</p>
                    <ol className="list-decimal pl-5">{route.points.map((p, i) => <li key={i}>{p.name}</li>)}</ol>
                    <p style={{ color: "hsl(var(--gc-dim))" }}>{route.disclaimer}</p>
                  </div>
                )}
              </>
            )}
          </section>

          {isDirector ? (<><GovernancePanel /><UsersPanel me={user} /></>) : (
            <section className="gc-glass p-4 space-y-2"><h2 className="gc-label">Gobernanza y roles</h2><Locked need="director" /></section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function GlobalCommand() {
  const session = useGetGlobalSession({ query: { queryKey: getGetGlobalSessionQueryKey(), retry: false, refetchInterval: 60000 } });
  const status = errorStatus(session.error);

  if (session.isLoading) {
    return <div className="gc-root grid place-items-center"><div className="w-64 space-y-3"><div className="gc-skel h-8" /><div className="gc-skel h-4" /><div className="gc-skel h-4 w-2/3" /></div></div>;
  }
  if (session.data?.user && status !== 401 && isRestricted(session.data.user.role)) return <Redirect to={portalFor(session.data.user.role)} />;
  if (session.data?.user && status !== 401) return <Workspace key={session.data.user.id} user={session.data.user} />;
  if (session.isError && status !== 401) {
    return (
      <div className="gc-root grid place-items-center p-4">
        <div className="gc-glass p-6 max-w-md space-y-3" role="alert">
          <h1 className="gc-display text-xl">Servicio global no disponible</h1>
          <p className="text-[14px]" style={{ color: "hsl(var(--gc-dim))" }}>{errorMessage(session.error)}</p>
          <div className="flex gap-2">
            <button className="gc-btn" onClick={() => session.refetch()} data-testid="button-retry-session">Reintentar</button>
            <Link href="/" className="gc-btn gc-btn-ghost no-underline">Volver a Nexus</Link>
          </div>
        </div>
      </div>
    );
  }
  return <div className="gc-root"><AuthPanel /></div>;
}
