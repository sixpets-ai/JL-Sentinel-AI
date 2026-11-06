import type { CSSProperties, ReactNode } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useLogoutGlobalUser } from "@workspace/api-client-react";
import type { GlobalRole, GlobalUser } from "@workspace/api-client-react";
import { LogOut } from "lucide-react";
import "@/styles/global-command.css";
import { errorMessage } from "@/components/global/utils";
import { DISCLAIMER, ROLE_LABEL, applySession, isStaff, portalFor, useSessionUser } from "@/lib/session";

function navFor(role: GlobalRole): { href: string; label: string }[] {
  const base = [{ href: "/", label: "Nexus" }];
  if (role === "ciudadano") return [...base, { href: "/ciudadano", label: "Mis reportes" }, { href: "/acceso", label: "Mi cuenta" }];
  if (role === "patrulla") return [...base, { href: "/patrulla", label: "Mi unidad" }, { href: "/acceso", label: "Mi cuenta" }];
  return [...base, { href: "/operaciones", label: "Operaciones" }, { href: "/global", label: "Global" }, { href: "/demo", label: "Demo" }, { href: "/transparencia", label: "Transparencia" }, { href: "/acceso", label: "Mi cuenta" }];
}

export function PortalShell({ user, title, kicker, children }: { user: GlobalUser; title: string; kicker: string; children: ReactNode }) {
  const qc = useQueryClient();
  const [location, navigate] = useLocation();
  const logout = useLogoutGlobalUser({ mutation: { onSuccess: () => { applySession(qc, null); navigate("/acceso"); } } });
  return (
    <div className="gc-root">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(var(--gc-line) / .12)" }}>
        <div className="min-w-0">
          <p className="gc-label">{kicker}</p>
          <h1 className="gc-display text-xl font-bold leading-tight">{title}</h1>
        </div>
        <nav className="flex flex-wrap gap-1.5 md:ml-6" aria-label="Navegación por rol">
          {navFor(user.role).map((n) => (
            <Link key={n.href} href={n.href} className="gc-chip no-underline" aria-pressed={location === n.href} data-testid={`link-nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 gc-mono text-[12px] min-w-0">
          <span className="[overflow-wrap:anywhere]" data-testid="text-user">{user.username} <span className="gc-badge" style={{ color: "hsl(var(--gc-amber))" }}>{ROLE_LABEL[user.role] ?? user.role}</span></span>
          <button className="gc-btn gc-btn-ghost" onClick={() => logout.mutate()} disabled={logout.isPending} data-testid="button-logout"><LogOut size={14} /> Salir</button>
        </div>
      </header>
      {logout.isError && <p role="alert" className="px-4 py-2 text-[13px]" style={{ color: "hsl(var(--gc-rose))" }}>{errorMessage(logout.error, "No se pudo cerrar la sesión.")}</p>}
      <p className="mx-4 mt-3 px-3 py-2 rounded-lg text-[12.5px]" role="note" data-testid="text-disclaimer"
        style={{ background: "hsl(var(--gc-amber) / .08)", border: "1px solid hsl(var(--gc-amber) / .3)", color: "hsl(var(--gc-amber))" }}>
        <strong>{DISCLAIMER}</strong> Ejercicio simulado: unidades, posiciones y elementos son ficticios. No se despacha policía real.
      </p>
      <main className="p-4">{children}</main>
    </div>
  );
}

export function PortalGate({ allow, children }: { allow: (r: GlobalRole) => boolean; children: (u: GlobalUser) => ReactNode }) {
  const { session, user, unauthorized } = useSessionUser();
  if (session.isLoading) {
    return <div className="gc-root grid place-items-center"><div className="w-72 space-y-3" aria-label="Cargando"><div className="gc-skel h-8" /><div className="gc-skel h-4" /><div className="gc-skel h-4 w-2/3" /></div></div>;
  }
  if (session.isError && !unauthorized) {
    return (
      <div className="gc-root grid place-items-center p-4">
        <div className="gc-glass p-6 max-w-md space-y-3" role="alert">
          <h1 className="gc-display text-xl">Servicio no disponible</h1>
          <p className="text-[14px]" style={{ color: "hsl(var(--gc-dim))" }}>{errorMessage(session.error)}</p>
          <button className="gc-btn" onClick={() => session.refetch()} data-testid="button-retry-session">Reintentar</button>
        </div>
      </div>
    );
  }
  if (!user) return <Redirect to="/acceso" />;
  if (!allow(user.role)) return <Redirect to={portalFor(user.role)} />;
  return <>{children(user)}</>;
}

export const allowCitizen = (r: GlobalRole) => r === "ciudadano";
export const allowPatrol = (r: GlobalRole) => r === "patrulla";
export const allowStaff = (r: GlobalRole) => isStaff(r);

/** Floating entry to the role portal (or /acceso when signed out). */
export function PortalEntryLink({ style }: { style?: CSSProperties }) {
  const { user } = useSessionUser();
  return (
    <Link href={user ? portalFor(user.role) : "/acceso"} data-testid="link-portal-entry" style={style}>
      {user ? "Mi portal" : "Acceso"}
    </Link>
  );
}
