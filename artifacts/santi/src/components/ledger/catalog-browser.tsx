import { useMemo, useState } from "react";
import { useGetCrimeCatalog, getGetCrimeCatalogQueryKey } from "@workspace/api-client-react";
import { BookOpen, RefreshCw } from "lucide-react";
import { errorMessage } from "@/components/global/utils";

export function CatalogBrowser() {
  const cat = useGetCrimeCatalog({ query: { queryKey: getGetCrimeCatalogQueryKey() } });
  const [q, setQ] = useState("");
  const [sys, setSys] = useState<"all" | "RNID" | "ICCS">("all");
  const entries = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (cat.data?.entries ?? []).filter((e) => (sys === "all" || e.system === sys) && (!t || e.code.toLowerCase().includes(t) || e.label.toLowerCase().includes(t)));
  }, [cat.data, q, sys]);

  return (
    <section className="td-glass p-4 space-y-3" aria-labelledby="cat-h" data-testid="panel-catalog">
      <h2 id="cat-h" className="td-label flex items-center gap-2"><BookOpen size={13} /> Catálogo de referencia · público</h2>
      {cat.isLoading && <div className="space-y-2"><div className="td-skel h-10" /><div className="td-skel h-40" /></div>}
      {cat.isError && <div role="alert" className="space-y-2"><p className="text-[12px]" style={{ color: "hsl(var(--td-rose))" }}>{errorMessage(cat.error)}</p>
        <button className="td-btn td-btn-ghost" onClick={() => cat.refetch()} data-testid="button-retry-catalog"><RefreshCw size={13} /> Reintentar</button></div>}
      {cat.data && (
        <>
          <p className="td-mono text-[11px]" data-testid="text-catalog-version">Versión {cat.data.version}</p>
          <p className="text-[12px]" style={{ color: "hsl(var(--td-sodium))" }}>{cat.data.warning}</p>
          <p className="text-[11px]" style={{ color: "hsl(var(--td-dim))" }}>RNID e ICCS se muestran por separado. No existe correspondencia inferida entre sistemas, ni catálogo de Interpol, ni pretensión de exhaustividad legal.</p>
          <details className="lg-disc">
            <summary className="td-label">Fuentes · {cat.data.sources.length}</summary>
            <ul className="space-y-2 mt-2">
              {cat.data.sources.map((s, i) => (
                <li key={i} className="text-[12px] border-l-2 pl-2" style={{ borderColor: "hsl(var(--td-uv) / .5)" }} data-testid={`row-source-${i}`}>
                  <p className="font-medium">{s.system} · {s.version}</p>
                  <p style={{ color: "hsl(var(--td-dim))" }}>{s.scope}</p>
                  {/^https:\/\//.test(s.url) && <a className="lg-hash" style={{ color: "hsl(var(--td-uv))" }} href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.url}</a>}
                  <p className="lg-hash">SHA-256 {s.sha256}</p>
                </li>
              ))}
            </ul>
          </details>
          <div className="flex flex-wrap gap-2">
            <input className="lg-input flex-1 min-w-[160px]" placeholder="Buscar código o categoría" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-catalog-search" />
            {(["all", "RNID", "ICCS"] as const).map((s) => (
              <button key={s} className="td-chip" aria-pressed={sys === s} onClick={() => setSys(s)} data-testid={`button-catalog-${s}`}>{s === "all" ? "Todos" : s}</button>
            ))}
          </div>
          <p className="td-mono text-[10.5px]" style={{ color: "hsl(var(--td-dim))" }}>{entries.length} de {cat.data.entries.length} entradas</p>
          {entries.length === 0 ? <p className="text-[12px] py-4 text-center" style={{ color: "hsl(var(--td-dim))" }}>Sin coincidencias.</p> : (
            <ul className="td-scroll !max-h-[420px] space-y-1">
              {entries.map((e) => (
                <li key={e.code} className="flex gap-2 items-start text-[12.5px] py-1" style={{ paddingLeft: Math.max(0, e.level - 1) * 12 }} data-testid={`row-catalog-${e.code}`}>
                  <span className="td-badge shrink-0" style={{ color: e.system === "RNID" ? "hsl(var(--td-sodium))" : "hsl(var(--td-uv))" }}>{e.system}</span>
                  <span className="min-w-0"><span className="td-mono text-[10.5px] block" style={{ color: "hsl(var(--td-dim))" }}>{e.code}</span>{e.label}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
