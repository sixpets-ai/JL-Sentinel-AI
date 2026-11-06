import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useGetGlobalSession, getGetGlobalSessionQueryKey } from "@workspace/api-client-react";
import type { GlobalRole, GlobalSession } from "@workspace/api-client-react";
import { errorStatus } from "@/components/global/utils";
import { stopAgentSpeech } from "./agent-speech";

export const DISCLAIMER = "Plataforma de Inteligencia Preliminar. Requiere validación humana y respeto a los Derechos Humanos.";

/** Never clears the active session query: removes every other user-scoped query, then sets session data. */
export function applySession(qc: QueryClient, session: GlobalSession | null) {
  const key = getGetGlobalSessionQueryKey();
  const k = JSON.stringify(key);
  qc.removeQueries({ predicate: (q) => JSON.stringify(q.queryKey) !== k });
  qc.setQueryData(key, session);
  if (!session) stopAgentSpeech();
}

export function useSessionUser() {
  const session = useGetGlobalSession({ query: { queryKey: getGetGlobalSessionQueryKey(), retry: false, refetchInterval: 60000 } });
  const unauthorized = errorStatus(session.error) === 401;
  const user = unauthorized ? null : session.data?.user ?? null;
  return { session, user, unauthorized };
}

export const isStaff = (r?: GlobalRole | null) => r === "analista" || r === "oficial" || r === "director";
export const isRestricted = (r?: GlobalRole | null) => r === "ciudadano" || r === "patrulla";
export const portalFor = (r: GlobalRole) => (r === "ciudadano" ? "/ciudadano" : r === "patrulla" ? "/patrulla" : "/operaciones");

export const ROLE_LABEL: Record<string, string> = {
  ciudadano: "Ciudadano", patrulla: "Patrulla", analista: "Analista", oficial: "Oficial (analista)", director: "Director",
};

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · SANTI Nexus`;
    return () => { document.title = prev; };
  }, [title]);
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const API_PREFIX = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
export const evidenceContentUrl = (id: string) => `${API_PREFIX}/api/global/citizen/evidence/${encodeURIComponent(id)}/content`;

export const STATUS_LABEL: Record<string, string> = {
  registered: "Registrado", active: "Recorrido simulado", arrived: "Unidad en el punto", completed: "Ejercicio finalizado",
};
export const STATUS_COLOR: Record<string, string> = {
  registered: "hsl(var(--gc-dim))", active: "hsl(var(--gc-amber))", arrived: "hsl(var(--gc-lime))", completed: "hsl(var(--gc-cyan))",
};
export const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
