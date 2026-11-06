import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTacticalScenario, getGetTacticalScenarioQueryKey,
  useListTacticalAlerts, getListTacticalAlertsQueryKey,
  useCreateTacticalAlert, useRetryTacticalReport,
  useGetGlobalSession, getGetGlobalSessionQueryKey,
} from "@workspace/api-client-react";
import type { TacticalAlert } from "@workspace/api-client-react";
import { ArrowLeft, Copy, Download, Lock, LogIn, RefreshCw, Siren, Share2, Route as RouteIcon } from "lucide-react";
import "@/styles/tactical.css";
import { TacticalHeatMap } from "@/components/tactical/heat-map";
import { IMPACT_COLOR } from "@/components/tactical/constants";
import { SourceGraph } from "@/components/tactical/source-graph";
import { errorMessage, errorStatus } from "@/components/global/utils";

const DISCLAIMER = "Plataforma de Inteligencia Preliminar. Requiere validación humana y respeto a los Derechos Humanos.";
const fmt = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }); };
const byNewest = (a: TacticalAlert, b: TacticalAlert) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

const REPORT_LABEL: Record<string, string> = { pending: "Informe pendiente", ready: "Informe listo", failed: "Informe fallido" };
const ROUTE_LABEL: Record<string, string> = { not_required: "Sin ruta automática", ready: "Ruta simulada", failed: "Ruta fallida" };

export default function TacticalDemo() {
  const qc = useQueryClient();
  useEffect(() => {
    const prev = document.title;
    const description = document.querySelector('meta[name="description"]');
    const prevDescription = description?.getAttribute("content") ?? "";
    document.title = "SANTI · Demo táctica simulada";
    description?.setAttribute("content", "Centro de mando SANTI: mapa de calor, correlaciones e informes preliminares de un ejercicio completamente simulado.");
    return () => { document.title = prev; description?.setAttribute("content", prevDescription); };
  }, []);

  const session = useGetGlobalSession({ query: { queryKey: getGetGlobalSessionQueryKey(), retry: false } });
  const user = errorStatus(session.error) === 401 ? null : session.data?.user ?? null;
  const canOperate = user?.role === "oficial" || user?.role === "director";

  const scenario = useGetTacticalScenario({ query: { queryKey: getGetTacticalScenarioQueryKey() } });
  const alertsQ = useListTacticalAlerts({ query: { queryKey: getListTacticalAlertsQueryKey(), enabled: canOperate, refetchInterval: 15000 } });
  const create = useCreateTacticalAlert();
  const retry = useRetryTacticalReport();

  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [showHeat, setShowHeat] = useState(true);
  const [copied, setCopied] = useState(false);

  const data = scenario.data;
  const incidents = useMemo(() => data?.incidents ?? [], [data]);
  const nodes = useMemo(() => data?.nodes ?? [], [data]);
  const edges = useMemo(() => data?.edges ?? [], [data]);
  const alerts = useMemo(() => [...(canOperate ? alertsQ.data ?? [] : [])].sort(byNewest), [alertsQ.data, canOperate]);

  const incident = incidents.find((i) => i.id === incidentId) ?? null;
  const nodeForIncident = (id: string) => nodes.find((n) => n.kind === "incident" && (n.id === id || n.id.endsWith(id)))?.id ?? null;
  const incidentForNode = (nid: string) => incidents.find((i) => i.id === nid || nid.endsWith(i.id))?.id ?? null;

  // visible alert: explicit selection, else newest for selected incident, else newest overall
  const alert = alerts.find((a) => a.id === alertId)
    ?? (incidentId ? alerts.find((a) => a.incident.id === incidentId) : alerts[0]) ?? null;

  useEffect(() => {
    if (!incidentId && alerts[0]) {
      setIncidentId(alerts[0].incident.id);
      setNodeId(nodes.find(node => node.id === alerts[0].incident.id)?.id ?? null);
      setAlertId(alerts[0].id);
    }
  }, [alerts, incidentId, nodes]);

  const selectIncident = (id: string) => {
    setIncidentId(id); setNodeId(nodeForIncident(id));
    setAlertId(alerts.find((a) => a.incident.id === id)?.id ?? null);
    if (!create.isPending) create.reset();
  };
  const selectNode = (nid: string | null) => {
    setNodeId(nid);
    const inc = nid ? incidentForNode(nid) : null;
    if (inc) { setIncidentId(inc); setAlertId(alerts.find((a) => a.incident.id === inc)?.id ?? null); }
  };
  const selectAlert = (id: string) => {
    const a = alerts.find((x) => x.id === id);
    setAlertId(id);
    if (a) { setIncidentId(a.incident.id); setNodeId(nodeForIncident(a.incident.id)); }
  };

  const upsert = (a: TacticalAlert) => {
    qc.setQueryData<TacticalAlert[]>(getListTacticalAlertsQueryKey(), (old) => [a, ...(old ?? []).filter((x) => x.id !== a.id)]);
    void qc.invalidateQueries({ queryKey: getListTacticalAlertsQueryKey() });
  };
  const runCreate = () => {
    if (!incident) return;
    create.mutate({ data: { incidentId: incident.id } }, { onSuccess: (a) => {
      upsert(a); setAlertId(a.id); setIncidentId(a.incident.id); setNodeId(nodeForIncident(a.incident.id));
    } });
  };
  const runRetry = () => {
    if (!alert) return;
    retry.mutate({ id: alert.id }, { onSuccess: (a) => upsert(a) });
  };

  const copyReport = async () => {
    if (!alert) return;
    try { await navigator.clipboard.writeText(alert.report); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  };
  const downloadReport = () => {
    if (!alert) return;
    const body = `${alert.folio} · SIMULACIÓN\n${alert.incident.title}\n${fmt(alert.createdAt)}\n\n${alert.report}\n\n${DISCLAIMER}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${alert.folio}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const connections = useMemo(() => {
    if (!nodeId) return [];
    const lbl = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
    return edges.filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => ({ id: e.id, label: e.label, other: lbl(e.source === nodeId ? e.target : e.source) }));
  }, [nodeId, nodes, edges]);
  const focusNode = nodes.find((n) => n.id === nodeId) ?? null;

  const route = alert && alert.incident.id === incidentId && alert.routeStatus === "ready" ? alert.route : null;
  const sorted = [...incidents].sort((a, b) => ["alto", "medio", "bajo"].indexOf(a.impact) - ["alto", "medio", "bajo"].indexOf(b.impact));

  return (
    <div className="td-root">
      <header className="td-glass !rounded-none !border-x-0 !border-t-0 px-4 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-[1000]">
        <Link href="/global" className="td-btn td-btn-ghost !min-h-[38px]" data-testid="link-back-global"><ArrowLeft size={15} /> Global</Link>
        <div className="min-w-0">
          <h1 className="td-display text-lg font-bold leading-none">SANTI<span style={{ color: "hsl(var(--td-uv))" }}>::</span>TÁCTICO</h1>
          <p className="td-label mt-1">Escenario sintético · CDMX · solo demostración</p>
        </div>
        <span className="td-badge" style={{ color: "hsl(var(--td-sodium))" }} data-testid="status-simulation">Simulación</span>
        <div className="ml-auto flex flex-wrap min-w-0 max-w-full items-center gap-2 td-mono text-[12px] [overflow-wrap:anywhere]">
          {session.isLoading ? <span className="td-skel h-6 w-28" /> : user ? (
            <span data-testid="text-user">{user.username} <span className="td-badge" style={{ color: "hsl(var(--td-uv))" }}>{user.role}</span></span>
          ) : (
            <Link href="/global" className="td-btn td-btn-ghost !min-h-[38px]" data-testid="link-login"><LogIn size={14} /> Iniciar sesión</Link>
          )}
        </div>
      </header>

      <div className="px-4 pt-3">
        <p className="td-banner" role="note" data-testid="text-disclaimer"><strong>{DISCLAIMER}</strong> Incidentes, unidades, calor y correlaciones son ficticios; no representan personas ni inferencias criminales reales. No se despacha nada.</p>
      </div>

      {scenario.isError ? (
        <div className="p-4"><div className="td-glass p-6 max-w-lg space-y-3" role="alert">
          <h2 className="td-display text-xl">Escenario no disponible</h2>
          <p className="text-sm" style={{ color: "hsl(var(--td-dim))" }}>{errorMessage(scenario.error)}</p>
          <button className="td-btn" onClick={() => scenario.refetch()} data-testid="button-retry-scenario"><RefreshCw size={14} /> Reintentar</button>
        </div></div>
      ) : (
      <div className="td-grid">
        {/* incidents */}
        <section className="td-glass p-3 min-w-0 td-rise order-2 lg:order-none" aria-labelledby="inc-h">
          <h2 id="inc-h" className="td-label px-1 mb-2">Incidentes ficticios · {incidents.length}</h2>
          {scenario.isLoading && <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="td-skel h-14" />)}</div>}
          {data && incidents.length === 0 && <p className="text-sm p-3" style={{ color: "hsl(var(--td-dim))" }}>El escenario no contiene incidentes.</p>}
          <ul className="space-y-1">
            {sorted.map((inc) => (
              <li key={inc.id}>
                <button className="td-inc" aria-pressed={inc.id === incidentId} onClick={() => selectIncident(inc.id)} data-testid={`button-incident-${inc.id}`}>
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: IMPACT_COLOR[inc.impact] }} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] leading-snug font-medium">{inc.title}</span>
                    <span className="block td-mono text-[10.5px] mt-0.5" style={{ color: "hsl(var(--td-dim))" }}>
                      {inc.category} · impacto <span style={{ color: IMPACT_COLOR[inc.impact] }}>{inc.impact}</span> · {inc.mentions} menciones
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* map + graph */}
        <div className="space-y-3 min-w-0 order-1 lg:order-none">
          <div className="td-glass p-2 td-rise">
            <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
              <span className="td-label">Capas</span>
              <button className="td-chip" aria-pressed={showHeat} onClick={() => setShowHeat((v) => !v)} data-testid="toggle-heat">Calor sintético</button>
              <span className="ml-auto flex items-center gap-1.5 td-mono text-[10px]" style={{ color: "hsl(var(--td-dim))" }} aria-hidden>
                baja <span className="inline-block h-2 w-20 rounded" style={{ background: "linear-gradient(90deg, rgb(110,60,230), rgb(220,60,170), rgb(255,150,50), rgb(255,240,200))" }} /> alta
              </span>
            </div>
            <div className="relative">
              <TacticalHeatMap incidents={incidents} heat={data?.heatpoints ?? []} showHeat={showHeat} selectedId={incidentId} onSelect={selectIncident} route={route} />
              {scenario.isLoading && <div className="absolute inset-0 td-skel !rounded-2xl z-[500]" aria-label="Cargando mapa" />}
            </div>
            <p className="td-mono text-[10.5px] px-1 pt-2" style={{ color: "hsl(var(--td-dim))" }}>La intensidad agrega pesos sintéticos de demostración; no mide delito, riesgo ni personas.</p>
          </div>

          <section className="td-glass p-3 td-rise" aria-labelledby="graph-h">
            <div className="flex items-center gap-2 mb-2">
              <Share2 size={14} style={{ color: "hsl(var(--td-uv))" }} />
              <h2 id="graph-h" className="td-label">Grafo de líneas de indagación</h2>
            </div>
            <p className="text-[12px] mb-2" style={{ color: "hsl(var(--td-sodium))" }}>Las correlaciones son líneas de indagación ficticias, no evidencia.</p>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              {scenario.isLoading ? <div className="td-skel h-[340px]" /> : nodes.length === 0 ? (
                <div className="h-[200px] grid place-items-center text-sm" style={{ color: "hsl(var(--td-dim))" }}>Sin nodos en el escenario.</div>
              ) : <SourceGraph nodes={nodes} edges={edges} selectedNodeId={nodeId} onSelectNode={selectNode} />}
              <div className="min-w-0" data-testid="panel-connections">
                <p className="td-label mb-2">Inspección</p>
                {!focusNode ? <p className="text-[12px]" style={{ color: "hsl(var(--td-dim))" }}>Toca un nodo para ver sus conexiones.</p> : (
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium">{focusNode.label} <span className="td-mono text-[10px]" style={{ color: "hsl(var(--td-dim))" }}>· {focusNode.kind}</span></p>
                    {connections.length === 0 ? <p className="text-[12px]" style={{ color: "hsl(var(--td-dim))" }}>Sin conexiones.</p> : (
                      <ul className="space-y-1.5 td-scroll !max-h-[260px]">
                        {connections.map((c) => (
                          <li key={c.id} className="text-[12px] border-l-2 pl-2" style={{ borderColor: "hsl(var(--td-sodium) / .6)" }} data-testid={`row-connection-${c.id}`}>
                            <span className="td-mono text-[10px] block" style={{ color: "hsl(var(--td-dim))" }}>{c.label}</span>{c.other}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* operations */}
        <aside className="space-y-3 min-w-0 order-3 lg:order-none">
          <section className="td-glass p-4 space-y-3 td-rise" aria-labelledby="op-h">
            <h2 id="op-h" className="td-label flex items-center gap-2"><Siren size={13} /> Alerta simulada</h2>
            {incident ? (
              <div>
                <p className="td-display text-lg leading-tight">{incident.title}</p>
                <p className="td-mono text-[11px] mt-1" style={{ color: "hsl(var(--td-dim))" }}>Unidad ficticia {incident.unit} · {incident.lat.toFixed(3)}, {incident.lng.toFixed(3)}</p>
                <p className="text-[12px] mt-1" style={{ color: "hsl(var(--td-dim))" }}>
                  {incident.impact === "alto" ? "Impacto alto: incluirá ruta simulada automática e informe preliminar." : "Impacto medio/bajo: solo informe preliminar, sin ruta automática."}
                </p>
              </div>
            ) : <p className="text-[13px]" style={{ color: "hsl(var(--td-dim))" }}>Selecciona un incidente en la lista, el mapa o el grafo.</p>}
            {session.isLoading ? <div className="td-skel h-10" /> : !canOperate ? (
              <p className="text-[12px] flex items-start gap-2" style={{ color: "hsl(var(--td-dim))" }} data-testid="text-locked">
                <Lock size={13} className="mt-0.5 shrink-0" />
                {user ? "Tu rol (ciudadano) permite solo consulta. Generar alertas requiere rol oficial o director." : <span>Modo lectura anónimo. <Link href="/global" style={{ color: "hsl(var(--td-uv))" }}>Inicia sesión</Link> con rol oficial o director para generar alertas.</span>}
              </p>
            ) : (
              <>
                <button className="td-btn w-full" onClick={runCreate} disabled={!incident || create.isPending} data-testid="button-create-alert">
                  <Siren size={15} /> {create.isPending ? "Procesando simulación…" : "Generar alerta simulada"}
                </button>
                {create.isPending && <p className="td-mono text-[11px] td-pulse" role="status" style={{ color: "hsl(var(--td-sodium))" }}>Generando informe y ruta; puede tardar hasta 35 s.</p>}
                {create.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>No se pudo crear la alerta: {errorMessage(create.error)}</p>}
              </>
            )}
            <p className="td-mono text-[10px]" style={{ color: "hsl(var(--td-dim))" }}>Sin despacho real, SMS ni contacto con unidades.</p>
          </section>

          {canOperate && (
            <section className="td-glass p-4 space-y-3 td-rise" aria-labelledby="rep-h" data-testid="panel-report">
              <h2 id="rep-h" className="td-label">Informe ejecutivo preliminar</h2>
              {alertsQ.isLoading && <div className="td-skel h-28" />}
              {alertsQ.isError && (
                <div role="alert" className="space-y-2">
                  <p className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>No se pudo cargar el historial: {errorMessage(alertsQ.error)}</p>
                  <button className="td-btn td-btn-ghost" onClick={() => alertsQ.refetch()} data-testid="button-retry-alerts">Reintentar</button>
                </div>
              )}
              {!alertsQ.isLoading && !alert && <p className="text-[12px]" style={{ color: "hsl(var(--td-dim))" }}>{incident ? "Este incidente aún no tiene alertas tuyas." : "Aún no has generado alertas."}</p>}
              {alert && (
                <div className="space-y-2" key={alert.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="td-mono text-[12px] font-medium" data-testid="text-alert-folio">{alert.folio}</span>
                    <span className="td-badge" style={{ color: alert.reportStatus === "ready" ? "hsl(var(--td-mint))" : alert.reportStatus === "failed" ? "hsl(var(--td-rose))" : "hsl(var(--td-sodium))" }} data-testid="status-report">{REPORT_LABEL[alert.reportStatus]}</span>
                    <span className="td-badge" style={{ color: alert.routeStatus === "failed" ? "hsl(var(--td-rose))" : "hsl(var(--td-uv))" }} data-testid="status-route">{ROUTE_LABEL[alert.routeStatus]}</span>
                  </div>
                  <p className="td-mono text-[11px]" style={{ color: "hsl(var(--td-dim))" }}>{alert.incident.title} · {alert.unit} · {fmt(alert.createdAt)}</p>
                  {alert.reportStatus === "pending" && <div className="td-skel h-20" aria-label="Informe pendiente" />}
                  {alert.reportStatus === "failed" && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>La generación del informe falló.</p>}
                  {alert.report && <div className="td-report" data-testid="text-report">{alert.report}</div>}
                  <div className="flex flex-wrap gap-2">
                    {alert.reportStatus !== "ready" && (
                      <button className="td-btn td-btn-ghost !min-h-[36px]" onClick={runRetry} disabled={retry.isPending} data-testid="button-retry-report">
                        <RefreshCw size={13} /> {retry.isPending ? "Reintentando…" : "Reintentar informe"}
                      </button>
                    )}
                    <button className="td-btn td-btn-ghost !min-h-[36px]" onClick={copyReport} disabled={!alert.report} data-testid="button-copy-report"><Copy size={13} /> {copied ? "Copiado" : "Copiar"}</button>
                    <button className="td-btn td-btn-ghost !min-h-[36px]" onClick={downloadReport} disabled={!alert.report} data-testid="button-download-report"><Download size={13} /> .txt</button>
                  </div>
                  {retry.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>{errorMessage(retry.error)}</p>}
                  {alert.route && (
                    <div className="pt-2 border-t space-y-1" style={{ borderColor: "hsl(var(--td-line) / .12)" }} data-testid="text-route">
                      <p className="td-label flex items-center gap-2"><RouteIcon size={12} /> Ruta simulada</p>
                      <p className="td-display text-3xl" style={{ color: "hsl(var(--td-uv))" }}>{alert.route.distanceKm.toFixed(2)} km</p>
                      <p className="td-mono text-[11px]" style={{ color: "hsl(var(--td-dim))" }}>{alert.route.algorithm} · simulación clásica inspirada en cuántica, sin QPU</p>
                      <ol className="list-decimal pl-5 text-[12px]">{alert.route.points.map((p, i) => <li key={i}>{p.name}</li>)}</ol>
                      <p className="text-[11px]" style={{ color: "hsl(var(--td-dim))" }}>{alert.route.disclaimer}</p>
                      {alert.incident.id !== incidentId && <button className="td-chip" onClick={() => selectAlert(alert.id)} data-testid="button-show-route">Mostrar en mapa</button>}
                    </div>
                  )}
                  {alert.routeStatus === "failed" && <p className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>La simulación de ruta falló para esta alerta.</p>}
                  <p className="text-[11px]" style={{ color: "hsl(var(--td-dim))" }}>{alert.disclaimer}</p>
                </div>
              )}
            </section>
          )}

          {canOperate && (
            <section className="td-glass p-4 space-y-2" aria-labelledby="hist-h" data-testid="panel-history">
              <h2 id="hist-h" className="td-label">Historial propio · {alerts.length}</h2>
              {alerts.length === 0 ? <p className="text-[12px]" style={{ color: "hsl(var(--td-dim))" }}>Sin alertas persistidas.</p> : (
                <ul className="td-scroll space-y-1">
                  {alerts.map((a) => (
                    <li key={a.id}>
                      <button className="td-inc !py-2" aria-pressed={alert?.id === a.id} onClick={() => selectAlert(a.id)} data-testid={`button-history-${a.id}`}>
                        <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: IMPACT_COLOR[a.incident.impact] }} aria-hidden />
                        <span className="min-w-0">
                          <span className="block td-mono text-[11.5px]">{a.folio} · {REPORT_LABEL[a.reportStatus]}</span>
                          <span className="block text-[11px] truncate" style={{ color: "hsl(var(--td-dim))" }}>{a.incident.title} · {fmt(a.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {data?.disclaimer && <p className="text-[11px] px-1" style={{ color: "hsl(var(--td-dim))" }}>{data.disclaimer}</p>}
        </aside>
      </div>
      )}
    </div>
  );
}
