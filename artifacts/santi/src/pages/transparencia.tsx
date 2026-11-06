import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  useGetGlobalSession, getGetGlobalSessionQueryKey, useListSealedRecords, getListSealedRecordsQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, Lock, LogIn, RefreshCw } from "lucide-react";
import "@/styles/tactical.css";
import "@/styles/ledger.css";
import { errorMessage, errorStatus } from "@/components/global/utils";
import { CatalogBrowser } from "@/components/ledger/catalog-browser";
import { LedgerPanel } from "@/components/ledger/ledger-panel";
import { STATUS_LABEL, fmtDate } from "@/components/ledger/utils";

const DISCLAIMER = "Plataforma de Inteligencia Preliminar. Requiere validación humana y respeto a los Derechos Humanos.";
const dim = { color: "hsl(var(--td-dim))" };

export default function Transparencia() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const rawKind = params.get("kind");
  const kind = rawKind === "tactical" || rawKind === "nexus" ? rawKind : null;
  const id = params.get("id") ?? "";
  const [filter, setFilter] = useState("");

  useEffect(() => { const p = document.title; document.title = "SANTI · Transparencia"; return () => { document.title = p; }; }, []);

  const session = useGetGlobalSession({ query: { queryKey: getGetGlobalSessionQueryKey(), retry: false, refetchInterval: 60000 } });
  const user = errorStatus(session.error) === 401 ? null : session.data?.user ?? null;
  const allowed = user?.role === "analista" || user?.role === "oficial" || user?.role === "director";
  const list = useListSealedRecords({ query: { queryKey: getListSealedRecordsQueryKey(), enabled: allowed, refetchInterval: 15000 } });
  const records = useMemo(() => {
    const t = filter.trim().toLowerCase();
    return [...(list.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((r) => !t || r.folio.toLowerCase().includes(t) || r.id.toLowerCase().includes(t));
  }, [list.data, filter]);

  const select = (k: string, i: string) => setLocation(`/transparencia?kind=${encodeURIComponent(k)}&id=${encodeURIComponent(i)}`);

  const locked = (
    <div className="td-glass p-5 space-y-2" data-testid="text-ledger-locked">
      <p className="text-[13px] flex items-start gap-2"><Lock size={14} className="mt-0.5 shrink-0" />
        {user ? "Tu rol (ciudadano) no permite consultar expedientes sellados. El catálogo público sigue disponible." : <span>Los expedientes requieren rol oficial o director. <Link href="/global" style={{ color: "hsl(var(--td-uv))" }} data-testid="link-ledger-login">Inicia sesión en Global</Link>.</span>}
      </p>
    </div>
  );

  return (
    <div className="td-root">
      <header className="td-glass !rounded-none !border-x-0 !border-t-0 px-4 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-[1000]">
        <Link href="/global" className="td-btn td-btn-ghost !min-h-[38px]" data-testid="link-back-global"><ArrowLeft size={15} /> Global</Link>
        <Link href="/demo" className="td-btn td-btn-ghost !min-h-[38px]" data-testid="link-demo">Demo</Link>
        <div className="min-w-0">
          <h1 className="td-display text-lg font-bold leading-none">SANTI<span style={{ color: "hsl(var(--td-mint))" }}>::</span>TRANSPARENCIA</h1>
          <p className="td-label mt-1">Registros originales y anotaciones posteriores</p>
        </div>
        <div className="ml-auto td-mono text-[12px] min-w-0 [overflow-wrap:anywhere]">
          {session.isLoading ? <span className="td-skel h-6 w-28 inline-block" /> : user ? <span data-testid="text-user">{user.username} <span className="td-badge" style={{ color: "hsl(var(--td-uv))" }}>{user.role}</span></span>
            : <Link href="/global" className="td-btn td-btn-ghost !min-h-[38px]" data-testid="link-login"><LogIn size={14} /> Iniciar sesión</Link>}
        </div>
      </header>
      <div className="px-4 pt-3">
        <p className="td-banner" role="note" data-testid="text-disclaimer"><strong>{DISCLAIMER}</strong> Ningún software certifica la verdad de un registro: el sello solo muestra que la cadena de hashes no fue alterada. Todo es ficticio.</p>
      </div>

      <div className="lg-grid">
        <aside className="space-y-3">
          <section className="td-glass p-3 space-y-2" aria-labelledby="rec-h">
            <h2 id="rec-h" className="td-label px-1">Expedientes sellados{allowed && list.data ? ` · ${list.data.length}` : ""}</h2>
            {session.isLoading ? <div className="td-skel h-24" /> : !allowed ? <p className="text-[12px] px-1" style={dim}>Bloqueado para tu sesión.</p> : (
              <>
                <input className="lg-input" placeholder="Filtrar por folio" value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="input-ledger-filter" />
                {list.isLoading && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="td-skel h-12" />)}</div>}
                {list.isError && <div role="alert" className="space-y-2"><p className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>{errorMessage(list.error)}</p>
                  <button className="td-btn td-btn-ghost" onClick={() => list.refetch()} data-testid="button-retry-records"><RefreshCw size={13} /> Reintentar</button></div>}
                {list.data && records.length === 0 && <p className="text-[12px] p-2" style={dim}>Sin expedientes sellados todavía.</p>}
                <ul className="td-scroll !max-h-[60vh] space-y-1" data-testid="ledger-list">
                  {records.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button className="td-inc !py-2" aria-pressed={kind === r.kind && id === r.id} onClick={() => select(r.kind, r.id)} data-testid={`button-record-${r.kind}-${r.id}`}>
                        <span className="mt-1.5 h-2 w-2 rotate-45 shrink-0" style={{ background: r.status === "cancellation_recorded" ? "hsl(var(--td-rose))" : r.status === "amended" ? "hsl(var(--td-sodium))" : "hsl(var(--td-mint))" }} aria-hidden />
                        <span className="min-w-0">
                          <span className="block td-mono text-[11.5px] [overflow-wrap:anywhere]">{r.folio}</span>
                          <span className="block text-[11px]" style={dim}>{r.kind === "tactical" ? "Táctico" : "Nexus"} · {STATUS_LABEL[r.status]} · {r.entryCount} entradas · {fmtDate(r.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </aside>

        <main className="space-y-3 min-w-0">
          {session.isLoading ? <div className="td-skel h-60" /> : !allowed ? locked : kind && id ? (
            <LedgerPanel key={`${kind}-${id}`} kind={kind} id={id} />
          ) : (
            <div className="td-glass p-8 text-center space-y-2">
              <p className="td-display text-xl">Selecciona un expediente</p>
              <p className="text-[13px]" style={dim}>{rawKind && !kind ? "Tipo de expediente no válido en el enlace." : "Verás el original inmutable, su sello y cada anotación posterior en orden."}</p>
            </div>
          )}
        </main>

        <aside><CatalogBrowser /></aside>
      </div>
    </div>
  );
}
