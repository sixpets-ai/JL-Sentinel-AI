import { Link } from "wouter";
import type { EnrollmentInput, OnboardingPolicy, RequestedRole } from "@workspace/api-client-react";
import { ShieldAlert } from "lucide-react";
import { CameraCapture } from "./camera-capture";

export type OnboardingValue = { requestedRole: RequestedRole; registrationId: string; corporation: string; consent: boolean; cameraDone: boolean };
export const emptyOnboarding: OnboardingValue = { requestedRole: "ciudadano", registrationId: "", corporation: "", consent: false, cameraDone: false };

const ROLES: { v: RequestedRole; label: string; hint: string }[] = [
  { v: "ciudadano", label: "Ciudadano", hint: "Seguir tus propios reportes simulados" },
  { v: "patrulla", label: "Patrulla", hint: "Ver solo tu unidad y alertas asignadas" },
  { v: "analista", label: "Analista", hint: "Casos, trazas y evidencia" },
  { v: "director", label: "Director", hint: "Además revisa solicitudes de alta" },
];

export function buildEnrollment(v: OnboardingValue, policy: OnboardingPolicy | undefined): EnrollmentInput | string {
  if (!policy) return "Las políticas aún no se cargan. Reintenta.";
  if (!v.consent) return "Debes aceptar los términos, el aviso de privacidad y el aviso legal.";
  const staff = v.requestedRole !== "ciudadano";
  if (staff && (!v.registrationId.trim() || !v.corporation.trim())) return "Matrícula y corporación son obligatorias para roles operativos.";
  return {
    requestedRole: v.requestedRole,
    ...(staff ? { registrationId: v.registrationId.trim().slice(0, 80), corporation: v.corporation.trim().slice(0, 120) } : {}),
    consentAccepted: true,
    consentVersion: policy.version,
    biometricMode: "simulated",
  };
}

export function OnboardingFields({ value, onChange, policy }: { value: OnboardingValue; onChange: (v: OnboardingValue) => void; policy?: OnboardingPolicy }) {
  const set = (p: Partial<OnboardingValue>) => onChange({ ...value, ...p });
  const staff = value.requestedRole !== "ciudadano";
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="gc-label mb-2">Rol solicitado</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <button type="button" key={r.v} aria-pressed={value.requestedRole === r.v} onClick={() => set({ requestedRole: r.v })}
              className="text-left rounded-xl p-2.5 transition-colors" data-testid={`button-role-${r.v}`}
              style={{ border: `1px solid hsl(var(--gc-${value.requestedRole === r.v ? "cyan" : "line"}) / ${value.requestedRole === r.v ? ".7" : ".18"})`, background: value.requestedRole === r.v ? "hsl(var(--gc-cyan) / .1)" : "transparent", color: "hsl(var(--gc-ink))" }}>
              <span className="gc-display text-[14px] font-semibold block">{r.label}</span>
              <span className="text-[11px]" style={{ color: "hsl(var(--gc-dim))" }}>{r.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {staff && (
        <div className="space-y-3">
          <p className="text-[12px] flex gap-2" style={{ color: "hsl(var(--gc-amber))" }}><ShieldAlert size={14} className="shrink-0 mt-0.5" />
            La cuenta inicia como ciudadano. Un director revisará la solicitud; la matrícula declarada no es prueba de identidad.</p>
          <label className="block space-y-1.5"><span className="gc-label">Matrícula / número de registro</span>
            <input className="gc-input" maxLength={80} value={value.registrationId} onChange={(e) => set({ registrationId: e.target.value })} data-testid="input-registration-id" /></label>
          <label className="block space-y-1.5"><span className="gc-label">Corporación</span>
            <input className="gc-input" maxLength={120} value={value.corporation} onChange={(e) => set({ corporation: e.target.value })} data-testid="input-corporation" /></label>
        </div>
      )}
      {policy?.biometricNotice && <p className="text-[12px] whitespace-pre-wrap" style={{ color: "hsl(var(--gc-dim))" }} data-testid="text-biometric-notice">{policy.biometricNotice}</p>}
      {!value.cameraDone ? <CameraCapture enabled={value.consent} onDone={() => set({ cameraDone: true })} /> : (
        <p className="text-[12px]" role="status" style={{ color: "hsl(var(--gc-cyan))" }}>Verificación simulada concluida. Ninguna imagen fue enviada ni guardada.</p>
      )}
      <label className="flex gap-2.5 items-start text-[13px] leading-relaxed cursor-pointer">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={value.consent} onChange={(e) => set({ consent: e.target.checked })} required data-testid="checkbox-consent" />
        <span>Acepto los <Link href="/legal/terminos" target="_blank">Términos</Link>, el <Link href="/legal/privacidad" target="_blank">Aviso de privacidad</Link> y el <Link href="/legal/aviso" target="_blank">Aviso legal</Link>{policy ? ` (versión ${policy.version})` : ""}. Entiendo que es una demostración simulada.</span>
      </label>
    </div>
  );
}
