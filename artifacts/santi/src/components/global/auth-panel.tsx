import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useLoginGlobalUser, useRegisterGlobalUser, getGetGlobalSessionQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { errorMessage } from "./utils";

const USER_RE = /^[a-zA-Z0-9_.-]{3,40}$/;

export function AuthPanel() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);
  const login = useLoginGlobalUser();
  const register = useRegisterGlobalUser();
  const m = mode === "login" ? login : register;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    if (!USER_RE.test(username)) return setLocalErr("Usuario: 3–40 caracteres, solo letras, números, _ . -");
    if (password.length < 12 || password.length > 128) return setLocalErr("Contraseña: entre 12 y 128 caracteres.");
    m.mutate(
      { data: { username, password } },
      { onSuccess: (session) => {
        setPassword("");
        const key = getGetGlobalSessionQueryKey();
        qc.removeQueries({ predicate: query => JSON.stringify(query.queryKey) !== JSON.stringify(key) });
        qc.setQueryData(key, session);
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
            <li>CIUDADANO — consulta del panorama público</li>
            <li>OFICIAL — informes, rutas ilustrativas, auditoría</li>
            <li>DIRECTOR — además gobernanza IBM y roles</li>
          </ul>
        </section>
        <form onSubmit={submit} className="gc-glass p-7 space-y-5" aria-labelledby="gc-auth-title" noValidate>
          <div className="flex gap-2" role="tablist">
            {(["login", "register"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} aria-pressed={mode === k} className="gc-chip"
                onClick={() => { setMode(k); setLocalErr(null); }} data-testid={`tab-${k}`}>
                {k === "login" ? "Acceso" : "Registro"}
              </button>
            ))}
          </div>
          <h2 id="gc-auth-title" className="gc-display text-xl font-semibold flex items-center gap-2">
            <LockKeyhole size={18} /> {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <label className="block space-y-2">
            <span className="gc-label">Usuario</span>
            <input className="gc-input" autoComplete="username" value={username} maxLength={40}
              onChange={(e) => setUsername(e.target.value)} data-testid="input-username" />
          </label>
          <label className="block space-y-2">
            <span className="gc-label">Contraseña (mín. 12)</span>
            <input className="gc-input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} maxLength={128} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" />
          </label>
          {mode === "register" && (
            <p className="text-[12px] flex gap-2" style={{ color: "hsl(var(--gc-dim))" }}>
              <ShieldCheck size={14} className="shrink-0 mt-0.5" /> Toda cuenta nueva inicia como ciudadano. Un director puede ampliar el rol.
            </p>
          )}
          {err && <p role="alert" className="text-[13px]" style={{ color: "hsl(var(--gc-rose))" }} data-testid="text-auth-error">{err}</p>}
          <button className="gc-btn w-full" type="submit" disabled={m.isPending} data-testid="button-auth-submit">
            {m.isPending ? "Verificando…" : mode === "login" ? "Entrar" : "Registrar"}
          </button>
          <p className="gc-mono text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>Sesión por cookie HttpOnly. No se guardan tokens en el navegador.</p>
        </form>
      </div>
    </main>
  );
}
