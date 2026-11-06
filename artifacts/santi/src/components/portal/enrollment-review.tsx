import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListEnrollmentRequests, getListEnrollmentRequestsQueryKey, useReviewEnrollment } from "@workspace/api-client-react";
import type { EnrollmentProfile } from "@workspace/api-client-react";
import { Check, RefreshCw, X } from "lucide-react";
import { errorMessage, fmtTime } from "@/components/global/utils";
import { ROLE_LABEL } from "@/lib/session";

const REVIEW: Record<string, string> = { incomplete: "Incompleta", pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" };

function RequestCard({ p }: { p: EnrollmentProfile }) {
  const qc = useQueryClient();
  const review = useReviewEnrollment();
  const [note, setNote] = useState("");
  const ok = note.trim().length >= 5;
  const decide = (approve: boolean) => review.mutate({ userId: p.user.id, data: { approve, note: note.trim() } }, {
    onSuccess: () => { setNote(""); qc.invalidateQueries({ queryKey: getListEnrollmentRequestsQueryKey() }); },
  });
  return (
    <li className="rounded-xl p-3 space-y-2" style={{ border: "1px solid hsl(var(--gc-line) / .14)" }} data-testid={`card-enrollment-${p.user.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="gc-display font-semibold">{p.user.username}</span>
        <span className="gc-badge" style={{ color: "hsl(var(--gc-amber))" }}>solicita {ROLE_LABEL[p.requestedRole]}</span>
        <span className="gc-badge ml-auto" style={{ color: p.reviewStatus === "pending" ? "hsl(var(--gc-amber))" : "hsl(var(--gc-dim))" }}>{REVIEW[p.reviewStatus]}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 gc-mono text-[12px]">
        <p>Matrícula declarada: {p.registrationId || "—"}</p>
        <p>Corporación: {p.corporation || "—"}</p>
        <p>Rol actual: {ROLE_LABEL[p.user.role]}</p>
        <p>Consentimiento v{p.consentVersion} · {fmtTime(p.consentedAt)}</p>
      </div>
      {p.reviewNote && <p className="text-[12px]" style={{ color: "hsl(var(--gc-dim))" }}>Nota previa: {p.reviewNote}</p>}
      {p.reviewStatus === "pending" && (
        <>
          <textarea className="gc-input py-2 min-h-[64px]" maxLength={600} placeholder="Motivo de la decisión (mín. 5 caracteres)" value={note} onChange={(e) => setNote(e.target.value)} data-testid={`input-review-note-${p.user.id}`} />
          <div className="flex flex-wrap gap-2">
            <button className="gc-btn" disabled={!ok || review.isPending} onClick={() => decide(true)} data-testid={`button-approve-${p.user.id}`}><Check size={14} /> Aprobar</button>
            <button className="gc-btn gc-btn-ghost" disabled={!ok || review.isPending} onClick={() => decide(false)} data-testid={`button-reject-${p.user.id}`}><X size={14} /> Rechazar</button>
          </div>
          {review.isError && <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(review.error)}</p>}
        </>
      )}
    </li>
  );
}

export function EnrollmentReview() {
  const q = useListEnrollmentRequests({ query: { queryKey: getListEnrollmentRequestsQueryKey(), refetchInterval: 15000 } });
  const items = [...(q.data ?? [])].sort((a, b) => Number(b.reviewStatus === "pending") - Number(a.reviewStatus === "pending"));
  return (
    <section className="gc-glass p-4 space-y-3 max-w-3xl" data-testid="panel-enrollment-review">
      <h2 className="gc-display text-lg font-semibold">Solicitudes de alta</h2>
      <p className="text-[12.5px]" style={{ color: "hsl(var(--gc-dim))" }}>La matrícula declarada no prueba identidad; verifica por canales oficiales. Aprobar invalida las sesiones activas del usuario: deberá iniciar sesión de nuevo.</p>
      {q.isLoading ? <div className="space-y-2"><div className="gc-skel h-24" /><div className="gc-skel h-24" /></div>
        : q.isError ? <div role="alert" className="space-y-2"><p style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(q.error)}</p>
            <button className="gc-btn gc-btn-ghost" onClick={() => q.refetch()} data-testid="button-retry-enrollments"><RefreshCw size={14} /> Reintentar</button></div>
        : items.length === 0 ? <p className="text-[13px]" style={{ color: "hsl(var(--gc-dim))" }}>No hay solicitudes por revisar.</p>
        : <ul className="space-y-2">{items.map((p) => <RequestCard key={p.user.id} p={p} />)}</ul>}
    </section>
  );
}
