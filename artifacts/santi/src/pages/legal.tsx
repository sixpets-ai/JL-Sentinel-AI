import { Link, useParams } from "wouter";
import { useGetOnboardingPolicy, getGetOnboardingPolicyQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import "@/styles/global-command.css";
import { errorMessage } from "@/components/global/utils";
import { DISCLAIMER, useDocumentTitle } from "@/lib/session";

const SECTIONS = { terminos: "Términos de uso", privacidad: "Aviso de privacidad", aviso: "Aviso legal" } as const;
type Section = keyof typeof SECTIONS;

export default function Legal() {
  const params = useParams<{ section: string }>();
  const section: Section = (params.section && params.section in SECTIONS ? params.section : "terminos") as Section;
  useDocumentTitle(SECTIONS[section]);
  const policy = useGetOnboardingPolicy({ query: { queryKey: getGetOnboardingPolicyQueryKey() } });
  const text = policy.data ? { terminos: policy.data.terms, privacidad: policy.data.privacy, aviso: policy.data.legal }[section] : "";
  return (
    <div className="gc-root">
      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
        <Link href="/acceso" className="gc-label inline-flex items-center gap-2 no-underline" data-testid="link-back-acceso"><ArrowLeft size={14} /> Volver a acceso</Link>
        <nav className="flex flex-wrap gap-2" aria-label="Documentos legales">
          {(Object.keys(SECTIONS) as Section[]).map((k) => <Link key={k} href={`/legal/${k}`} aria-pressed={k === section} className="gc-chip no-underline" data-testid={`link-legal-${k}`}>{SECTIONS[k]}</Link>)}
        </nav>
        <article className="gc-glass p-6 space-y-4 gc-rise">
          <h1 className="gc-display text-3xl font-bold">{SECTIONS[section]}</h1>
          {policy.isLoading ? <div className="space-y-2"><div className="gc-skel h-4" /><div className="gc-skel h-4" /><div className="gc-skel h-4 w-2/3" /></div>
            : policy.isError ? <div role="alert" className="space-y-2"><p style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(policy.error)}</p>
                <button className="gc-btn gc-btn-ghost" onClick={() => policy.refetch()} data-testid="button-retry-policy"><RefreshCw size={14} /> Reintentar</button></div>
            : <>
                <p className="gc-label">Versión {policy.data!.version}</p>
                <div className="text-[14.5px] leading-relaxed whitespace-pre-wrap" data-testid="text-legal-body">{text}</div>
                {section === "privacidad" && <div className="text-[13.5px] whitespace-pre-wrap" style={{ color: "hsl(var(--gc-dim))" }}>{policy.data!.biometricNotice}</div>}
              </>}
          <p className="text-[12px]" role="note" style={{ color: "hsl(var(--gc-amber))" }}>{DISCLAIMER}</p>
        </article>
      </main>
    </div>
  );
}
