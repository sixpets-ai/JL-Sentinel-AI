import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGlobalGovernance, getGetGlobalGovernanceQueryKey,
  useListGlobalUsers, getListGlobalUsersQueryKey, useUpdateGlobalRole, GlobalRole,
} from "@workspace/api-client-react";
import type { GlobalGovernance, GlobalUser } from "@workspace/api-client-react";
import { RefreshCw } from "lucide-react";
import { errorMessage, fmtTime } from "./utils";

const GOV_COLOR: Record<string, string> = {
  connected: "hsl(128 50% 62%)", submitted: "hsl(182 72% 56%)", not_configured: "hsl(205 16% 62%)", unavailable: "hsl(350 78% 66%)",
};

export function GovernanceView({ g }: { g: GlobalGovernance }) {
  return (
    <div className="space-y-2 text-[13px]" data-testid="status-governance">
      <span className="gc-badge" style={{ color: GOV_COLOR[g.status] }}>{g.status.replace("_", " ")}</span>
      <p>{g.detail}</p>
      {g.missing.length > 0 && <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>Falta configurar: {g.missing.join(", ")}</p>}
      {g.metrics && <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>Métricas: {g.metrics}</p>}
      {g.runId && <p className="gc-mono text-[11px]">Run: {g.runId}</p>}
      <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>Verificado {fmtTime(g.checkedAt)}</p>
    </div>
  );
}

export function GovernancePanel() {
  const q = useGetGlobalGovernance({ query: { queryKey: getGetGlobalGovernanceQueryKey(), retry: false } });
  return (
    <section className="gc-glass p-4 space-y-3" aria-labelledby="gov-h">
      <div className="flex items-center justify-between">
        <h3 id="gov-h" className="gc-label">Gobernanza IBM watsonx</h3>
        <button className="gc-btn gc-btn-ghost !min-h-[32px] !px-2" onClick={() => q.refetch()} aria-label="Reverificar estado IBM" data-testid="button-refresh-governance">
          <RefreshCw size={14} />
        </button>
      </div>
      {q.isLoading && <div className="gc-skel h-16" />}
      {q.isError && <p role="alert" className="text-[13px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(q.error)}</p>}
      {q.data && <GovernanceView g={q.data} />}
    </section>
  );
}

export function UsersPanel({ me }: { me: GlobalUser }) {
  const qc = useQueryClient();
  const q = useListGlobalUsers({ query: { queryKey: getListGlobalUsersQueryKey() } });
  const upd = useUpdateGlobalRole({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListGlobalUsersQueryKey() }) },
  });
  return (
    <section className="gc-glass p-4 space-y-3" aria-labelledby="users-h">
      <h3 id="users-h" className="gc-label">Gestión de roles</h3>
      {q.isLoading && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="gc-skel h-9" />)}</div>}
      {q.isError && (
        <div role="alert" className="text-[13px] space-y-2" style={{ color: "hsl(var(--gc-rose))" }}>
          <p>{errorMessage(q.error)}</p>
          <button className="gc-btn gc-btn-ghost" onClick={() => q.refetch()}>Reintentar</button>
        </div>
      )}
      {q.data && q.data.length === 0 && <p className="text-[13px]" style={{ color: "hsl(var(--gc-dim))" }}>Sin usuarios registrados.</p>}
      {q.data && q.data.length > 0 && (
        <ul className="gc-scroll !max-h-[260px] space-y-1.5">
          {q.data.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 py-1.5 border-b" style={{ borderColor: "hsl(var(--gc-line) / .08)" }} data-testid={`row-user-${u.id}`}>
              <span className="gc-mono text-[13px] truncate">{u.username}{u.id === me.id && " (tú)"}</span>
              <select
                className="gc-input !w-auto !min-h-[34px] !text-[12px]"
                value={u.role}
                disabled={u.id === me.id || upd.isPending}
                aria-label={`Rol de ${u.username}`}
                title={u.id === me.id ? "No puedes cambiar tu propio rol" : undefined}
                onChange={(e) => upd.mutate({ id: u.id, data: { role: e.target.value as GlobalRole } })}
                data-testid={`select-role-${u.id}`}
              >
                {Object.values(GlobalRole).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
      {upd.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(upd.error)}</p>}
    </section>
  );
}
