import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLoginGlobalUser, useRegisterGlobalUser, useGetOnboardingPolicy, getGetOnboardingPolicyQueryKey,
  useGetOnboardingProfile, getGetOnboardingProfileQueryKey, useCompleteOnboarding,
} from "@workspace/api-client-react";
import type { GlobalUser } from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, LockKeyhole, RefreshCw } from "lucide-react";
import "@/styles/global-command.css";
import { errorMessage } from "@/components/global/utils";
import { PortalShell } from "@/components/portal/portal-shell";
import { OnboardingFields, buildEnrollment, emptyOnboarding } from "@/components/portal/onboarding-fields";
import type { OnboardingValue } from "@/components/portal/onboarding-fields";
import { DISCLAIMER, ROLE_LABEL, applySession, portalFor, useDocumentTitle, useSessionUser } from "@/lib/session";

const USER_RE = /^[a-zA-Z0-9_.-]{3,40}$/;
const err = (m: string | null, id: string) => m && <p role="alert" className="text-[13px]" style={{ color: "hsl(var(--gc-rose))" }} data-testid={id}>{m}</p>;

function SignedOut() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ob, setOb] = useState<OnboardingValue>(emptyOnboarding);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const policy = useGetOnboardingPolicy({ query: { queryKey: getGetOnboardingPolicyQueryKey() } });
  const login = useLoginGlobalUser();
  const register = useRegisterGlobalUser();
  const m = mode === "login" ? login : register;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    if (!USER_RE.test(username)) return setLocalErr("Usuario: 3 a 40 caracteres, solo letras, números, _ . -");
    if (password.length < 12 || password.length > 128) return setLocalErr("Contraseña: entre 12 y 128 caracteres.");
    if (mode === "login") {
      login.mutate({ data: { username, password } }, { onSuccess: (s) => { setPassword(""); applySession(qc, s); navigate(portalFor(s.user.role)); } });
      return;
    }
    const onboarding = buildEnrollment(ob, policy.data);
    if (typeof onboarding === "string") return setLocalErr(onboarding);
    register.mutate({ data: { username, password, onboarding } }, {
      onSuccess: (s) => { setPassword(""); applySession(qc, s); navigate(portalFor(s.user.role)); },
    });
  };

  const registerBlocked = mode === "register" && (!ob.consent || !policy.data);
  return (
    <div className="gc-root">
      <main className="min-h-[100dvh] grid place-items-center p-4">
        <div className="w-full max-w-[980px] grid md:grid-cols-[1fr_1.1fr] gap-4 gc-rise">
          <section className="p-6 flex flex-col justify-between gap-6">
            <div>
              <Link href="/" className="gc-label inline-flex items-center gap-2 no-underline" data-testid="link-back-nexus"><ArrowLeft size={14} /> Volver a SANTI Nexus</Link>
              <h1 className="gc-display text-4xl md:text-5xl font-bold mt-8 leading-[1.05]">SANTI<span style={{ color: "hsl(var(--gc-cyan))" }}>/</span>ACCESO</h1>
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "hsl(var(--gc-dim))" }}>
                Sigue tu propio reporte simulado. El personal autorizado ve solo lo que su rol permite. Toda cuenta nueva inicia como ciudadano; los roles operativos requieren revisión de un director.
              </p>
            </div>
            <p className="text-[12px] p-3 rounded-lg" role="note" style={{ border: "1px solid hsl(var(--gc-amber) / .3)", color: "hsl(var(--gc-amber))" }}>{DISCLAIMER}</p>
          </section>
          <form onSubmit={submit} className="gc-glass p-6 space-y-4" noValidate aria-labelledby="acceso-title">
            <div className="flex gap-2" role="tablist">
              {(["login", "register"] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} aria-pressed={mode === k} className="gc-chip"
                  onClick={() => { setMode(k); setLocalErr(null); }} data-testid={`tab-${k}`}>{k === "login" ? "Iniciar sesión" : "Registro"}</button>
              ))}
            </div>
            <h2 id="acceso-title" className="gc-display text-xl font-semibold flex items-center gap-2"><LockKeyhole size={18} /> {mode === "login" ? "Entrar" : "Crear cuenta con consentimiento"}</h2>
            <label className="block space-y-1.5"><span className="gc-label">Usuario</span>
              <input className="gc-input" autoComplete="username" value={username} maxLength={40} onChange={(e) => setUsername(e.target.value)} data-testid="input-username" /></label>
            <label className="block space-y-1.5"><span className="gc-label">Contraseña (mín. 12)</span>
              <input className="gc-input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} maxLength={128} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" /></label>
            {mode === "register" && (policy.isLoading ? <div className="gc-skel h-40" /> : policy.isError ? (
              <div role="alert" className="space-y-2">{err(errorMessage(policy.error, "No se pudieron cargar las políticas."), "text-policy-error")}
                <button type="button" className="gc-btn gc-btn-ghost" onClick={() => policy.refetch()}><RefreshCw size={14} /> Reintentar</button></div>
            ) : <OnboardingFields value={ob} onChange={setOb} policy={policy.data} />)}
            {err(localErr ?? (m.isError ? errorMessage(m.error, "No se pudo autenticar") : null), "text-auth-error")}
            <button className="gc-btn w-full" type="submit" disabled={m.isPending || registerBlocked} data-testid="button-auth-submit">
              {m.isPending ? "Verificando…" : mode === "login" ? "Entrar" : "Aceptar y registrar"}
            </button>
            <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>Sesión por cookie HttpOnly. No se guardan tokens ni imágenes en el navegador.</p>
          </form>
        </div>
      </main>
    </div>
  );
}

function SignedIn({ user }: { user: GlobalUser }) {
  const qc = useQueryClient();
  const profile = useGetOnboardingProfile({ query: { queryKey: getGetOnboardingProfileQueryKey() } });
  const policy = useGetOnboardingPolicy({ query: { queryKey: getGetOnboardingPolicyQueryKey() } });
  const complete = useCompleteOnboarding();
  const [ob, setOb] = useState<OnboardingValue>(emptyOnboarding);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const p = profile.data;

  const submit = (e: FormEvent) => {
    e.preventDefault(); setLocalErr(null);
    const data = buildEnrollment(ob, policy.data);
    if (typeof data === "string") return setLocalErr(data);
    complete.mutate({ data }, { onSuccess: (res) => qc.setQueryData(getGetOnboardingProfileQueryKey(), res) });
  };

  return (
    <PortalShell user={user} title="Mi cuenta" kicker="Acceso · alta y consentimiento">
      <div className="max-w-2xl mx-auto space-y-4">
        {profile.isLoading ? <div className="gc-glass p-5 space-y-3"><div className="gc-skel h-6 w-1/2" /><div className="gc-skel h-24" /></div>
          : profile.isError ? (
            <div className="gc-glass p-5 space-y-2" role="alert">{err(errorMessage(profile.error), "text-profile-error")}
              <button className="gc-btn gc-btn-ghost" onClick={() => profile.refetch()} data-testid="button-retry-profile"><RefreshCw size={14} /> Reintentar</button></div>
          ) : p && p.completed ? (
            <section className="gc-glass p-5 space-y-3 gc-rise" data-testid="panel-profile">
              <p className="gc-label">Estado del alta</p>
              <div className="grid sm:grid-cols-2 gap-3 gc-mono text-[13px]">
                <div><p className="gc-label">Rol actual</p><p>{ROLE_LABEL[user.role]}</p></div>
                <div><p className="gc-label">Rol solicitado</p><p>{ROLE_LABEL[p.requestedRole]}</p></div>
                <div><p className="gc-label">Revisión</p><p data-testid="status-review">{{ incomplete: "Incompleta", pending: "Pendiente de director", approved: "Aprobada", rejected: "Rechazada" }[p.reviewStatus]}</p></div>
                <div><p className="gc-label">Consentimiento</p><p>v{p.consentVersion}</p></div>
              </div>
              {p.reviewNote && <p className="text-[13px]" data-testid="text-review-note"><span className="gc-label">Nota del director: </span>{p.reviewNote}</p>}
              {p.reviewStatus === "pending" && <p className="text-[12.5px]" style={{ color: "hsl(var(--gc-amber))" }}>Mientras tanto usas el portal ciudadano. Si se aprueba, deberás iniciar sesión de nuevo.</p>}
              <p className="text-[12px]" style={{ color: "hsl(var(--gc-dim))" }}>Verificación de identidad: simulada. Ninguna imagen se almacena.</p>
              <Link href={portalFor(user.role)} className="gc-btn no-underline" data-testid="link-my-portal">Ir a mi portal <ArrowRight size={14} /></Link>
            </section>
          ) : (
            <form onSubmit={submit} className="gc-glass p-5 space-y-4 gc-rise" noValidate data-testid="form-complete-onboarding">
              <h2 className="gc-display text-xl font-semibold">Completa tu alta</h2>
              <p className="text-[13px]" style={{ color: "hsl(var(--gc-dim))" }}>Tu cuenta existe desde antes del nuevo aviso. Para continuar, revisa y acepta las políticas vigentes.</p>
              {policy.isLoading ? <div className="gc-skel h-40" /> : policy.isError ? err(errorMessage(policy.error), "text-policy-error") : <OnboardingFields value={ob} onChange={setOb} policy={policy.data} />}
              {err(localErr ?? (complete.isError ? errorMessage(complete.error) : null), "text-onboarding-error")}
              <button className="gc-btn w-full" disabled={complete.isPending || !ob.consent || !policy.data} data-testid="button-complete-onboarding">{complete.isPending ? "Enviando…" : "Aceptar y completar"}</button>
            </form>
          )}
      </div>
    </PortalShell>
  );
}

export default function Acceso() {
  useDocumentTitle("Acceso");
  const { session, user, unauthorized } = useSessionUser();
  if (session.isLoading) return <div className="gc-root grid place-items-center"><div className="w-72 space-y-3"><div className="gc-skel h-8" /><div className="gc-skel h-4" /></div></div>;
  if (session.isError && !unauthorized) {
    return <div className="gc-root grid place-items-center p-4"><div className="gc-glass p-6 space-y-3" role="alert">{err(errorMessage(session.error), "text-session-error")}
      <button className="gc-btn" onClick={() => session.refetch()} data-testid="button-retry-session">Reintentar</button></div></div>;
  }
  return user ? <SignedIn key={user.id} user={user} /> : <SignedOut />;
}
