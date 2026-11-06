import { useMemo } from "react";
import { useGetPatrolAssignments, getGetPatrolAssignmentsQueryKey } from "@workspace/api-client-react";
import { RefreshCw } from "lucide-react";
import { errorMessage } from "@/components/global/utils";
import { PortalGate, PortalShell, allowPatrol } from "@/components/portal/portal-shell";
import { CaseMap } from "@/components/portal/case-map";
import type { MapPoint } from "@/components/portal/case-map";
import { STATUS_COLOR, STATUS_LABEL, haversineMeters, useDocumentTitle } from "@/lib/session";

function PatrolPortal() {
  const q = useGetPatrolAssignments({ query: { queryKey: getGetPatrolAssignmentsQueryKey(), refetchInterval: 5000 } });
  const alerts = q.data?.alerts ?? [];
  const points = useMemo<MapPoint[]>(() => alerts.flatMap((a) => [
    { id: `r-${a.id}`, kind: "report" as const, lat: a.reportPoint.lat, lng: a.reportPoint.lng, label: `${a.folio} · ${a.categoryLabel}` },
    { id: `u-${a.id}`, kind: "unit" as const, lat: a.unit.position.lat, lng: a.unit.position.lng, label: `${a.unit.label} (simulada)`, linkTo: `r-${a.id}` },
  ]), [alerts]);
  const fitKey = alerts.map((a) => a.id).join(",");

  if (q.isLoading) return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="gc-skel h-[420px]" /><div className="gc-skel h-[200px]" /></div>;
  if (q.isError) return <div className="gc-glass p-4 space-y-2" role="alert"><p style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(q.error)}</p>
    <button className="gc-btn gc-btn-ghost" onClick={() => q.refetch()} data-testid="button-retry-assignments"><RefreshCw size={14} /> Reintentar</button></div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="gc-glass p-3 min-w-0">
        <p className="gc-label mb-2">Unidad asignada · <span data-testid="text-unit-label" style={{ color: "hsl(var(--gc-amber))" }}>{q.data?.unitLabel}</span> · simulación</p>
        <CaseMap points={points} fitKey={fitKey} label="Mapa simulado de alertas asignadas" height={460} />
        <p className="gc-mono text-[10.5px] pt-2" style={{ color: "hsl(var(--gc-dim))" }}>Posiciones simuladas sin GPS real. Solo se muestran alertas asignadas a tu unidad.</p>
      </div>
      <section className="gc-glass p-4 space-y-3">
        <h2 className="gc-label">Alertas asignadas ({alerts.length})</h2>
        {alerts.length === 0 ? <p className="text-[13px]" style={{ color: "hsl(var(--gc-dim))" }}>Sin alertas asignadas. Esta vista se actualiza cada 5 segundos.</p> : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-xl p-3" style={{ border: "1px solid hsl(var(--gc-line) / .14)" }} data-testid={`card-alert-${a.id}`}>
                <div className="flex items-center gap-2"><span className="gc-display font-semibold">{a.folio}</span>
                  <span className="gc-badge ml-auto" style={{ color: STATUS_COLOR[a.status] ?? "hsl(var(--gc-dim))" }}>{STATUS_LABEL[a.status] ?? a.status}</span></div>
                <p className="text-[12.5px] mt-1" style={{ color: "hsl(var(--gc-dim))" }}>{a.categoryLabel}</p>
                <p className="gc-mono text-[12px] mt-1">{a.unit.label} · {Math.round(haversineMeters(a.unit.position, a.reportPoint))} m al punto</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Patrulla() {
  useDocumentTitle("Portal de patrulla");
  return <PortalGate allow={allowPatrol}>{(u) => <PortalShell user={u} title="Mi unidad" kicker="Portal de patrulla · ejercicio simulado"><PatrolPortal key={u.id} /></PortalShell>}</PortalGate>;
}
