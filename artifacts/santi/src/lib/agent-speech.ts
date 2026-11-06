export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type AgentVoiceProfile = {
  /** Preference hint only. Browsers do not expose voice gender reliably. */
  gender: "feminine" | "masculine";
  rate: number;
  pitch: number;
};

/**
 * Six agent profiles. Each tries to get a different installed voice for the
 * locale (with a name-based gender hint when the browser exposes one). When the
 * device has fewer voices, profiles share a voice but keep distinct pitch/rate.
 * Nothing here guarantees six distinct voices or any particular gender.
 */
const PROFILE_ORDER = ["santi", "katering", "emiliano", "lorena", "maxi", "santiago"] as const;

const voiceProfiles: Record<string, AgentVoiceProfile> = {
  santi: { gender: "masculine", rate: 0.94, pitch: 0.9 },
  katering: { gender: "feminine", rate: 0.93, pitch: 1.2 },
  emiliano: { gender: "masculine", rate: 0.86, pitch: 0.78 },
  lorena: { gender: "feminine", rate: 0.98, pitch: 1.06 },
  maxi: { gender: "masculine", rate: 0.92, pitch: 0.98 },
  santiago: { gender: "masculine", rate: 1.02, pitch: 1.1 },
};

const feminineVoiceNames = /female|woman|femenin|mujer|paulina|m[oó]nica|sabina|helena|luc[ií]a|laura|elvira|dalia|marisol|camila|francisca|paloma|conchita|penélope|lupe|mia|salome|renata/i;
const masculineVoiceNames = /\bmale\b|\bman\b|masculin|hombre|jorge|diego|carlos|antonio|juan|pablo|ra[uú]l|enrique|jorge|gerardo|alvaro|álvaro|tom[aá]s|andr[eé]s|miguel|federico|liam/i;

function localeCandidates(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice[] {
  const normalized = locale.toLowerCase();
  const language = normalized.split("-")[0];
  const list = voices.filter((v) => {
    const l = v.lang.toLowerCase().replace("_", "-");
    return l === normalized || l.split("-")[0] === language;
  });
  // exact locale first, stable otherwise
  return list.sort((a, b) => Number(b.lang.toLowerCase() === normalized) - Number(a.lang.toLowerCase() === normalized));
}

function rankFor(candidates: SpeechSynthesisVoice[], gender: AgentVoiceProfile["gender"]): SpeechSynthesisVoice[] {
  const same = gender === "feminine" ? feminineVoiceNames : masculineVoiceNames;
  const other = gender === "feminine" ? masculineVoiceNames : feminineVoiceNames;
  const score = (v: SpeechSynthesisVoice) => (same.test(v.name) ? 0 : other.test(v.name) ? 2 : 1);
  return [...candidates].sort((a, b) => score(a) - score(b));
}

/** Deterministically assigns voices so profiles prefer not to share one. */
function chooseVoice(voices: SpeechSynthesisVoice[], locale: string, agentId: string): SpeechSynthesisVoice | undefined {
  const candidates = localeCandidates(voices, locale);
  if (candidates.length === 0) return undefined;
  const taken = new Set<string>();
  const order: string[] = [...PROFILE_ORDER];
  if (!order.includes(agentId)) order.push(agentId);
  for (const id of order) {
    const profile = voiceProfiles[id] ?? voiceProfiles.santi;
    const ranked = rankFor(candidates, profile.gender);
    const pick = ranked.find((v) => !taken.has(v.voiceURI)) ?? ranked[order.indexOf(id) % ranked.length];
    if (id === agentId) return pick;
    taken.add(pick.voiceURI);
  }
  return candidates[0];
}

let speechToken = 0;
let pendingCleanup: (() => void) | null = null;

function clearPending() {
  if (pendingCleanup) { pendingCleanup(); pendingCleanup = null; }
}

export function speakAsAgent(
  text: string,
  agentId: string,
  onEnd: () => void,
  locale = "es-MX",
): boolean {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) return false;

  const synth = window.speechSynthesis;
  const token = ++speechToken;
  clearPending();
  synth.cancel();

  const profile = voiceProfiles[agentId] ?? voiceProfiles.santi;
  const run = () => {
    if (token !== speechToken) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    const voice = chooseVoice(synth.getVoices(), locale, agentId);
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang || locale; }
    let done = false;
    const finish = () => { if (done) return; done = true; onEnd(); };
    utterance.onend = finish;
    utterance.onerror = finish;
    synth.speak(utterance);
  };

  if (synth.getVoices().length > 0) {
    run();
    return true;
  }

  // Voices load lazily in several browsers: wait for voiceschanged, with timeout fallback.
  let timer: ReturnType<typeof setTimeout> | null = null;
  const handler = () => { clearPending(); run(); };
  synth.addEventListener("voiceschanged", handler);
  timer = setTimeout(handler, 1200);
  pendingCleanup = () => {
    synth.removeEventListener("voiceschanged", handler);
    if (timer) clearTimeout(timer);
  };
  return true;
}

export function stopAgentSpeech(): void {
  speechToken++;
  clearPending();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function createSpeechRecognizer(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as SpeechWindow;
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

export function getSpeechTranscript(event: Event): string {
  const speechEvent = event as Event & {
    results: ArrayLike<{ 0?: { transcript?: string } }>;
  };

  return Array.from({ length: speechEvent.results.length }, (_, index) =>
    speechEvent.results[index]?.[0]?.transcript?.trim() ?? "",
  )
    .filter(Boolean)
    .join(" ");
}

export function getSpeechRecognitionError(event: Event): string {
  return (event as Event & { error?: string }).error ?? "unknown";
}
