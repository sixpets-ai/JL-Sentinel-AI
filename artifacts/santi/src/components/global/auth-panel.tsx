import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useLoginGlobalUser } from "@workspace/api-client-react";
import { applySession, isRestricted, portalFor } from "@/lib/session";
import { ArrowLeft, LockKeyhole, UserPlus } from "lucide-react";
import { errorMessage } from "./utils";

const USER_RE = /^[a-zA-Z0-9_.-]{3,40}$/;

export function AuthPanel() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);
  const login = useLoginGlobalUser();
  const m = login;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    if (!USER_RE.test(username)) return setLocalErr("Usuario: 3–40 caracteres, solo letras, números, _ . -");
    if (password.length < 12 || password.length > 128) return setLocalErr("Contraseña: entre 12 y 128 caracteres.");
    m.mutate(
      { data: { username, password } },
      { onSuccess: (session) => {
        setPassword("");
        applySession(qc, session);
        if (isRestricted(session.user.role)) navigate(portalFor(session.user.role));
      } },
    );
  };

  const err = localErr ?? (m.isError ? errorMessage(m.error, "No se pudo autenticar") : null);

  return (
    <main className="min-h-[100dvh] grid place-items-center p-4">
      <div className="w-full max-w-[920px] grid md:grid-cols-[1.1fr_1fr] gap-4 gc-rise">
        <section className="p-7 flex flex-col justify-between gap-8">
          <div>
            <Link href="/" className="gc-label inline-flex items-center gap-2 no-underline" data-testid="link-back-nexus">
              <ArrowLeft size={14} /> Volver a SANTI Nexus
            </Link>
            <h1 className="gc-display text-4xl md:text-5xl font-bold mt-8 leading-[1.05]">
              SANTI<span style={{ color: "hsl(var(--gc-cyan))" }}>/</span>GLOBAL
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "hsl(var(--gc-dim))" }}>
              Mesa de comparación de cobertura publicada sobre desastres. Cada punto cita su fuente, cada fuente declara su estado. No es una herramienta de despacho, vigilancia ni rastreo de personas.
            </p>
          </div>
          <ul className="space-y-2 gc-mono text-[12px]" style={{ color: "hsl(var(--gc-dim))" }}>
            <li>CIUDADANO — portal propio de reportes (/ciudadano)</li>
            <li>PATRULLA — unidad y alertas asignadas (/patrulla)</li>
            <li>ANALISTA — informes, rutas ilustrativas, auditoría, operaciones</li>
            <li>DIRECTOR — además gobernanza IBM y roles</li>
          </ul>
        </section>
        <form onSubmit={submit} className="gc-glass p-7 space-y-5" aria-labelledby="gc-auth-title" noValidate>
          <h2 id="gc-auth-title" className="gc-display text-xl font-semibold flex items-center gap-2">
            <LockKeyhole size={18} /> Iniciar sesión
          </h2>
          <label className="block space-y-2">
            <span className="gc-label">Usuario</span>
            <input className="gc-input" autoComplete="username" value={username} maxLength={40}
              onChange={(e) => setUsername(e.target.value)} data-testid="input-username" />
          </label>
          <label className="block space-y-2">
            <span className="gc-label">Contraseña (mín. 12)</span>
            <input className="gc-input" type="password" autoComplete="current-password"
              value={password} maxLength={128} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" />
          </label>
          {err && <p role="alert" className="text-[13px]" style={{ color: "hsl(var(--gc-rose))" }} data-testid="text-auth-error">{err}</p>}
          <button className="gc-btn w-full" type="submit" disabled={m.isPending} data-testid="button-auth-submit">
            {m.isPending ? "Verificando…" : "Entrar"}
          </button>
          <Link href="/acceso" className="gc-btn gc-btn-ghost w-full no-underline" data-testid="link-acceso-register"><UserPlus size={14} /> Registro con consentimiento en /acceso</Link>
          <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>Sesión por cookie HttpOnly. No se guardan tokens en el navegador.</p>
        </form>
      </div>
    </main>
  );
}
