export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export function errorStatus(err: unknown): number | null {
  const s = (err as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : null;
}

export function errorMessage(err: unknown, fallback = "Error inesperado"): string {
  const e = err as { data?: { error?: unknown; message?: unknown }; message?: unknown } | null;
  const d = e?.data;
  if (d && typeof d.error === "string") return d.error;
  if (d && typeof d.message === "string") return d.message;
  const status = errorStatus(err);
  if (status === 403) return "Tu rol no tiene permiso para esta acción.";
  if (status === 401) return "Sesión expirada. Vuelve a iniciar sesión.";
  if (status === 429) return "Demasiadas solicitudes. Espera un momento.";
  return typeof e?.message === "string" ? e.message : fallback;
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

export const TOPIC_LABEL: Record<string, string> = {
  earthquake: "Sismos",
  flood: "Inundaciones",
  wildfire: "Incendios forestales",
  humanitarian: "Humanitario",
};

export const KIND_COLOR: Record<string, string> = {
  coverage: "hsl(182 72% 56%)",
  earthquake: "hsl(41 86% 62%)",
  local_demo: "hsl(320 70% 66%)",
  social: "hsl(128 50% 62%)",
};

export const KIND_LABEL: Record<string, string> = {
  coverage: "Cobertura publicada",
  earthquake: "Sismo (catálogo)",
  local_demo: "Demo local Nexus",
  social: "Social",
};
