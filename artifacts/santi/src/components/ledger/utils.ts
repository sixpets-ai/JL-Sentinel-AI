export type Parsed = { ok: true; value: unknown } | { ok: false; text: string };

export function safeParse(raw: string): Parsed {
  try { return { ok: true, value: JSON.parse(raw) }; } catch { return { ok: false, text: raw }; }
}
export function pretty(raw: string): string {
  const p = safeParse(raw);
  return p.ok ? JSON.stringify(p.value, null, 2) : p.text;
}
export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
export function str(v: unknown): string { return typeof v === "string" ? v : v == null ? "" : String(v); }
export const fmtDate = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "medium" }); };

export const EVENT_LABEL: Record<string, string> = {
  recorded: "Registro original", route: "Ruta simulada", report: "Informe preliminar", amendment: "Enmienda", evidence: "Referencia de evidencia",
};
export const EVENT_COLOR: Record<string, string> = {
  recorded: "var(--td-mint)", route: "var(--td-uv)", report: "var(--td-uv)", amendment: "var(--td-sodium)", evidence: "var(--td-rose)",
};
export const STATUS_LABEL: Record<string, string> = {
  registered: "Registrado", amended: "Con enmiendas", cancellation_recorded: "Cancelación anotada",
};
export const DEVICE_LABEL: Record<string, string> = {
  cctv: "CCTV", android: "Android", ios: "iOS", tablet: "Tableta", laptop: "Laptop", other: "Otro",
};

export function validEvidenceUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return "Solo se aceptan URL HTTPS.";
    if (u.username || u.password) return "La URL no debe incluir usuario ni contraseña.";
    if (u.search || u.hash) return "La URL no debe incluir parámetros ni fragmentos (sin claves ni tokens).";
    return null;
  } catch { return "URL no válida."; }
}
