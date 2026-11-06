import { db, onboardingProfiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CompleteOnboardingBody, GetOnboardingProfileResponse } from "@workspace/api-zod";
import { publicUser, type SessionUser } from "./security";
import { LedgerError } from "./ledger";

export const POLICY_VERSION = "santi-onboarding-2026-11-v1";
export const onboardingPolicy = () => ({
  version: POLICY_VERSION,
  evidenceMode: "private_file" as const,
  storageAvailable: Boolean(process.env.PRIVATE_OBJECT_DIR),
  terms: "Condiciones del MVP. SANTI Nexus es una demostración de inteligencia preliminar; no es un servicio de emergencias, no despacha autoridades y no representa a ninguna agencia. Los recorridos, unidades y oficiales de los ejercicios son ficticios. No introduzcas datos de víctimas, domicilios reales ni información reservada. Solicitar un rol no acredita matrícula, corporación ni funciones públicas. Dirección debe revisar y autorizar los permisos. Conserva tus originales y respeta los derechos de terceros. Esta versión de las condiciones es informativa, no asesoría jurídica ni autorización para una operación federal.",
  privacy: "Datos tratados: usuario, hash salado de contraseña, rol efectivo, rol solicitado, matrícula y corporación declaradas cuando se solicita un rol operativo, fecha y versión del consentimiento; reportes del ejercicio, archivos de evidencia y sus metadatos/SHA-256. No se recaban ni transmiten imágenes faciales: la cámara opcional funciona solo en memoria del navegador. La verificación es simulada y no prueba identidad. Las evidencias se alojan en almacenamiento privado de la infraestructura Replit/Google Cloud; solo el titular y los roles analista/oficial/director autorizados pueden descargarlas. No se envían automáticamente a Gemini ni se usan para entrenamiento. El chat existente puede procesar el texto enviado mediante su proveedor de IA; no envíes datos sensibles. La voz depende del navegador y puede usar servicios del sistema. No se garantiza anonimato ni secreto absoluto. Los expedientes y sus aclaraciones se conservan sin sobrescribir el original; no existe borrado automático de evidencia confirmada en este MVP. Antes de usar datos reales, el operador debe definir responsable y contacto de privacidad, base jurídica, plazos de conservación, atención de derechos y avisos aplicables con asesoría jurídica. Esos datos de la entidad operadora aún no están configurados.",
  legal: "Plataforma de Inteligencia Preliminar. Requiere validación humana y respeto a los Derechos Humanos. RNID e ICCS se usan como referencias estadísticas, no como tipificación penal universal ni certificación ONU/Interpol. El registro no acredita identidad biométrica, pertenencia a una corporación ni valor probatorio certificado. Un SHA-256 detecta cambios en bytes; no acredita la veracidad, autoría ni legalidad de una grabación. No hay reconocimiento facial, rastreo real de terceros ni despacho policial. No uses esta demo ante una emergencia real; contacta los servicios de emergencia de tu localidad. Estas notas requieren revisión jurídica antes de cualquier operación real.",
  biometricNotice: "Tu imagen facial permanece únicamente en memoria de este navegador y no se almacena ni comparte. La verificación de este MVP es simulada: no acredita tu identidad. No afirmamos que exista un registro biométrico cifrado. Puedes continuar sin activar la cámara. El control de acceso busca evitar suplantaciones de cuentas y proteger tus derechos; requiere también revisión humana.",
});

export function validateEnrollment(input: unknown) {
  const parsed = CompleteOnboardingBody.strict().safeParse(input);
  if (!parsed.success || parsed.data.consentAccepted !== true || parsed.data.consentVersion !== POLICY_VERSION) {
    throw new LedgerError(400, "Acepta los avisos vigentes y usa la verificación simulada; no envíes fotografías faciales.");
  }
  const value = parsed.data;
  if (value.requestedRole !== "ciudadano" && (!value.registrationId?.trim() || !value.corporation?.trim())) {
    throw new LedgerError(400, "El rol solicitado requiere matrícula y corporación declaradas; no concede privilegios automáticamente.");
  }
  return { ...value, registrationId: value.requestedRole === "ciudadano" ? "" : value.registrationId!.trim(),
    corporation: value.requestedRole === "ciudadano" ? "" : value.corporation!.trim() };
}

export function enrollmentValues(user: SessionUser, input: ReturnType<typeof validateEnrollment>) {
  const equivalent = user.role === input.requestedRole || (user.role === "oficial" && input.requestedRole === "analista");
  return {
    userId: user.id, requestedRole: input.requestedRole, registrationId: input.registrationId,
    corporation: input.corporation, consentVersion: POLICY_VERSION, consentedAt: new Date(),
    reviewStatus: equivalent ? "approved" as const : "pending" as const, reviewNote: "", reviewedBy: null,
  };
}

export async function enrollmentProfile(user: SessionUser) {
  const [row] = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, user.id));
  return GetOnboardingProfileResponse.parse({
    user: publicUser(user), completed: Boolean(row), requestedRole: row?.requestedRole ?? "ciudadano",
    registrationId: row?.registrationId ?? "", corporation: row?.corporation ?? "",
    consentVersion: row?.consentVersion ?? "", consentedAt: row?.consentedAt.toISOString() ?? null,
    reviewStatus: row?.reviewStatus ?? "incomplete", reviewNote: row?.reviewNote ?? "", biometricMode: "simulated",
  });
}

export async function requireEnrollment(user: SessionUser) {
  const [profile] = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, user.id));
  if (!profile || profile.consentVersion !== POLICY_VERSION) throw new LedgerError(403, "Completa los avisos y el onboarding vigente antes de crear un ejercicio.");
}
