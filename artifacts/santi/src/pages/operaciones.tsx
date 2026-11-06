import { useMemo, useState } from "react";
import { useListCitizenCases, getListCitizenCasesQueryKey } from "@workspace/api-client-react";
import type { GlobalUser } from "@workspace/api-client-react";
import { RefreshCw } from "lucide-react";
import { errorMessage } from "@/components/global/utils";
import { PortalGate, PortalShell, allowStaff } from "@/components/portal/portal-shell";
import { CaseDetail } from "@/components/portal/case-detail";
import { EnrollmentReview } from "@/components/portal/enrollment-review";
import { CaseList } from "@/pages/ciudadano";
import { STATUS_LABEL, useDocumentTitle } from "@/lib/session";

const FILTERS = ["all", "registered", "active", "arrived", "completed"] as const;

function Cases() {
  const list = useListCitizenCases({ query: { queryKey: getListCitizenCasesQueryKey(), refetchInterval: 5000 } });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const cases = useMemo(() => (list.data ?? []).filter((c) => filter === "all" || c.status === filter), [list.data, filter]);
  const current = selected ?? cases[0]?.id ?? null;
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="gc-glass p-4 space-y-3 min-w-0">
        <h2 className="gc-label">Casos ciudadanos ({list.data?.length ?? 0})</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
          {FILTERS.map((f) => <button key={f} className="gc-chip !min-h-[30px]" aria-pressed={filter === f} onClick={() => setFilter(f)} data-testid={`filter-${f}`}>{f === "all" ? "Todos" : STATUS_LABEL[f]}</button>)}
        </div>
        {list.isLoading ? <div className="space-y-2"><div className="gc-skel h-14" /><div className="gc-skel h-14" /><div className="gc-skel h-14" /></div>
          : list.isError ? <div role="alert" className="space-y-2"><p className="text-[12.5px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(list.error)}</p>
              <button className="gc-btn gc-btn-ghost" onClick={() => list.refetch()} data-testid="button-retry-cases"><RefreshCw size={14} /> Reintentar</button></div>
          : cases.length === 0 ? <p className="text-[13px]" style={{ color: "hsl(var(--gc-dim))" }}>No hay casos en este filtro.</p>
          : <div className="gc-scroll !max-h-[70dvh] pr-1"><CaseList cases={cases} selected={current} onSelect={setSelected} showOwner /></div>}
      </section>
      <div className="min-w-0">
        {current ? <CaseDetail key={current} caseId={current} mode="staff" roster /> : <div className="gc-glass p-8 text-center" style={{ color: "hsl(var(--gc-dim))" }}>Selecciona un caso.</div>}
      </div>
    </div>
  );
}

function OpsPortal({ user }: { user: GlobalUser }) {
  const isDirector = user.role === "director";
  const [tab, setTab] = useState<"cases" | "enrollment">("cases");
  return (
    <div className="space-y-4">
      {isDirector && (
        <div className="flex gap-2" role="tablist">
          <button role="tab" className="gc-chip" aria-selected={tab === "cases"} aria-pressed={tab === "cases"} onClick={() => setTab("cases")} data-testid="tab-cases">Casos</button>
          <button role="tab" className="gc-chip" aria-selected={tab === "enrollment"} aria-pressed={tab === "enrollment"} onClick={() => setTab("enrollment")} data-testid="tab-enrollment">Solicitudes de alta</button>
        </div>
      )}
      {isDirector && tab === "enrollment" ? <EnrollmentReview /> : <Cases />}
    </div>
  );
}

export default function Operaciones() {
  useDocumentTitle("Operaciones");
  return <PortalGate allow={allowStaff}>{(u) => <PortalShell user={u} title="Operaciones" kicker="Analista · director · casos ciudadanos"><OpsPortal key={u.id} user={u} /></PortalShell>}</PortalGate>;
}
