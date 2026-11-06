import { Lock, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { useGetRecordLedger, getGetRecordLedgerQueryKey } from "@workspace/api-client-react";

export function SealView({ integrity, detail }: { integrity: boolean; detail?: string }) {
  return integrity ? (
    <span className="lg-seal" data-testid="ledger-integrity" title="La cadena de hashes coincide con el registro original. No certifica la veracidad del contenido.">
      <span className="lg-seal-icon"><Lock size={11} /></span> Sellado · cadena íntegra
    </span>
  ) : (
    <span className="lg-seal lg-warn" data-testid="ledger-integrity" role="alert" title={detail}>
      <span className="lg-seal-icon"><ShieldAlert size={11} /></span> Integridad no verificada
    </span>
  );
}

export function SealBadge({ kind, id, enabled = true }: { kind: "tactical" | "nexus"; id: string; enabled?: boolean }) {
  const q = useGetRecordLedger(kind, id, { query: { queryKey: getGetRecordLedgerQueryKey(kind, id), enabled: enabled && !!id, retry: false } });
  if (!enabled) return <span className="lg-seal lg-pending">Consulta de sello con sesión oficial</span>;
  if (q.isLoading) return <span className="lg-seal lg-pending">Verificando sello…</span>;
  if (!q.data) return <span className="lg-seal lg-pending">Sello no disponible</span>;
  return <SealView integrity={q.data.integrity} detail={q.data.integrityDetail} />;
}

/** Nexus persisted report seal. Only pass a real DB id; canView comes from one root session query. */
export function NexusSeal({ dbId, canView }: { dbId: number; canView: boolean }) {
  const id = String(dbId);
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
      <SealBadge kind="nexus" id={id} enabled={canView} />
      <Link href={`/transparencia?kind=nexus&id=${encodeURIComponent(id)}`} data-testid={`link-nexus-ledger-${id}`}
        style={{ font: "600 9px 'IBM Plex Mono', monospace", letterSpacing: ".12em", textTransform: "uppercase", color: "#7ee8c8", textDecoration: "underline" }}>
        Historial
      </Link>
    </span>
  );
}
