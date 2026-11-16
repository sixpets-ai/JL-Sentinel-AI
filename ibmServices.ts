// ibmServices.ts — Cliente unificado IBM Watson + watsonx
// Circuit Breaker: IBM → Gemini → Local (nunca se apaga)
// J-L Sentinel AI · IBM SkillsBuild 2026

const IBM_BASE = (import.meta as any).env?.VITE_IBM_BASE_URL || 'http://127.0.0.1:3001';

export interface IbmServiceStatus {
  watsonx:    'online' | 'offline' | 'checking';
  nlu:        'online' | 'offline' | 'checking';
  discovery:  'online' | 'offline' | 'checking';
  tts:        'online' | 'offline' | 'checking';
  assistant:  'online' | 'offline' | 'checking';
  stt:        'online' | 'offline' | 'checking';
}

let _status: IbmServiceStatus = {
  watsonx: 'checking', nlu: 'checking', discovery: 'checking',
  tts: 'checking', assistant: 'checking', stt: 'checking',
};
const _listeners: Array<(s: IbmServiceStatus) => void> = [];

export function subscribeIbmStatus(fn: (s: IbmServiceStatus) => void) {
  _listeners.push(fn);
  fn({ ..._status });
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); };
}
function _emit(u: Partial<IbmServiceStatus>) {
  _status = { ..._status, ...u };
  _listeners.forEach(fn => fn({ ..._status }));
}

export async function checkIbmHealth() {
  try {
    const r = await fetch(IBM_BASE + '/api/ibm/health', { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      _emit({
        watsonx:   d.watsonx   ? 'online' : 'offline',
        nlu:       d.nlu       ? 'online' : 'offline',
        discovery: d.discovery ? 'online' : 'offline',
        tts:       d.tts       ? 'online' : 'offline',
        assistant: d.assistant ? 'online' : 'offline',
        stt:       d.stt       ? 'online' : 'offline',
      });
    } else { _emit({ watsonx:'offline', nlu:'offline', discovery:'offline', tts:'offline', assistant:'offline', stt:'offline' }); }
  } catch { _emit({ watsonx:'offline', nlu:'offline', discovery:'offline', tts:'offline', assistant:'offline', stt:'offline' }); }
}

// Auto-check cada 30s — NUNCA se apaga
(function loop() { checkIbmHealth(); setInterval(checkIbmHealth, 30000); })();

export async function watsonxAnalyze(text: string, context = 'general') {
  try {
    const r = await fetch(IBM_BASE + '/api/ibm/watsonx/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }), signal: AbortSignal.timeout(10000),
    });
    if (r.ok) { _emit({ watsonx: 'online' }); return { ...(await r.json()), source: 'watsonx' }; }
  } catch { _emit({ watsonx: 'offline' }); }
  try {
    const r2 = await fetch(IBM_BASE + '/api/analyze/gemini', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }), signal: AbortSignal.timeout(8000),
    });
    if (r2.ok) { const d = await r2.json(); return { sentiment: d.sentiment || 'neutral', confidence: 0.72, entities: d.entities || [], keywords: d.keywords || [], riskScore: d.riskScore || 0, ibmModel: 'gemini-fallback', source: 'gemini' }; }
  } catch { /* fall */ }
  return { sentiment: 'neutral', confidence: 0.5, entities: [], keywords: text.split(' ').slice(0,5), riskScore: 0, ibmModel: 'local', source: 'local' };
}

export async function watsonNlu(text: string) {
  try {
    const r = await fetch(IBM_BASE + '/api/ibm/nlu/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }), signal: AbortSignal.timeout(10000),
    });
    if (r.ok) { _emit({ nlu: 'online' }); return { ...(await r.json()), source: 'watson-nlu' }; }
  } catch { _emit({ nlu: 'offline' }); }
  return { entities: [], keywords: [], emotion: {}, sentiment: { document: { label: 'neutral', score: 0 } }, source: 'local' };
}

export async function watsonDiscovery(query: string, collection = 'default') {
  try {
    const r = await fetch(IBM_BASE + '/api/ibm/discovery/query', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, collection }), signal: AbortSignal.timeout(12000),
    });
    if (r.ok) { _emit({ discovery: 'online' }); return (await r.json()).results || []; }
  } catch { _emit({ discovery: 'offline' }); }
  return [];
}

export async function watsonTts(text: string, voice = 'es-US_SofiaV3Voice') {
  try {
    const r = await fetch(IBM_BASE + '/api/ibm/tts/synthesize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }), signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      _emit({ tts: 'online' });
      const url = URL.createObjectURL(await r.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play(); return;
    }
  } catch { _emit({ tts: 'offline' }); }
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-MX'; u.rate = 0.9; u.pitch = 1.3;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  }
}

export async function watsonAssistant(message: string, sessionId?: string) {
  try {
    const r = await fetch(IBM_BASE + '/api/ibm/assistant/message', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }), signal: AbortSignal.timeout(10000),
    });
    if (r.ok) { _emit({ assistant: 'online' }); return { ...(await r.json()), source: 'watson-assistant' }; }
  } catch { _emit({ assistant: 'offline' }); }
  return { reply: '[NEXUS LOCAL] Procesando: "' + message + '"', sessionId: sessionId || 'local', source: 'local' };
}

export async function getIbmRiskScore(action: string, context: Record<string, unknown>) {
  try {
    const r = await fetch(IBM_BASE + '/api/ibm/governance/risk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, context }), signal: AbortSignal.timeout(6000),
    });
    if (r.ok) return await r.json();
  } catch { /* local */ }
  const score = Math.min(100, Object.keys(context).length * 8 + 20);
  return { score, factors: ['Supervision humana requerida'], recommendation: score > 70 ? 'REQUIERE_APROBACION' : 'PUEDE_PROCEDER', approved: score <= 70 };
}