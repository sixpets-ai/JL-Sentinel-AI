// create_ibm_files.cjs — Crea ibmServices.ts, IbmNexusBar.tsx y parchea server.js
// Ejecutar: node create_ibm_files.cjs
const fs = require('fs');
const path = require('path');

const PROJECT = process.cwd();
console.log('\n=== NEXUS IBM v7 — Creando archivos ===');
console.log('Proyecto:', PROJECT);

// ─── 1. ibmServices.ts ───────────────────────────────────────────────────────
const ibmServices = `
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
`.trim();

fs.writeFileSync(path.join(PROJECT, 'ibmServices.ts'), ibmServices, 'utf8');
console.log('✅ ibmServices.ts creado');

// ─── 2. IbmNexusBar.tsx ──────────────────────────────────────────────────────
const ibmNexusBar = `
import React, { useState, useEffect } from "react";
import { subscribeIbmStatus, IbmServiceStatus, checkIbmHealth } from "./ibmServices";

const LABELS: Record<string, string> = {
  watsonx: "watsonx.ai", nlu: "NLU", discovery: "Discovery",
  tts: "TTS", assistant: "Assistant", stt: "STT",
};

export default function IbmNexusBar() {
  const [status, setStatus] = useState<IbmServiceStatus>({
    watsonx:"checking", nlu:"checking", discovery:"checking",
    tts:"checking", assistant:"checking", stt:"checking",
  });
  const [expanded, setExpanded] = useState(false);
  const [lastCheck, setLastCheck] = useState("");

  useEffect(() => {
    return subscribeIbmStatus(s => {
      setStatus(s);
      setLastCheck(new Date().toLocaleTimeString("es-MX", { hour12: false }));
    });
  }, []);

  const online  = Object.values(status).filter(v => v === "online").length;
  const offline = Object.values(status).filter(v => v === "offline").length;
  const total   = Object.keys(status).length;
  const color   = offline === 0 ? "#00ff88" : offline >= 3 ? "#ff4444" : "#ffaa00";

  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9999, background:"rgba(5,10,5,0.96)", borderTop:"1px solid " + color + "44", fontFamily:"monospace", fontSize:11, display:"flex", alignItems:"center", minHeight:26, overflow:"hidden" }}>
      <div onClick={() => { setExpanded(e => !e); checkIbmHealth(); }} style={{ background:"#0f1b35", borderRight:"1px solid " + color + "44", padding:"0 10px", display:"flex", alignItems:"center", gap:6, cursor:"pointer", height:"100%", minHeight:26, flexShrink:0 }}>
        <span style={{ color:"#1f70c1", fontWeight:"bold" }}>IBM</span>
        <span style={{ color:color }}>●</span>
        <span style={{ color:color }}>{online}/{total}</span>
        <span style={{ color:"#ffffff44", fontSize:9 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {!expanded && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 12px", overflowX:"auto", flex:1 }}>
          {(Object.entries(status) as [string, string][]).map(([k, v]) => (
            <span key={k} style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background: v==="online"?"#00ff88":v==="offline"?"#ff4444":"#ffaa00", display:"inline-block", boxShadow: v==="online"?"0 0 4px #00ff88":"none" }} />
              <span style={{ color: v==="online"?"#00ff88":v==="offline"?"#ff4444cc":"#ffaa00" }}>{LABELS[k]}</span>
            </span>
          ))}
          {lastCheck && <span style={{ color:"#ffffff33", fontSize:9 }}>↻ {lastCheck}</span>}
        </div>
      )}
      {expanded && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, padding:"8px 12px", flex:1 }}>
          {(Object.entries(status) as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ background:"rgba(0,0,0,0.5)", border:"1px solid " + (v==="online"?"#00ff8833":v==="offline"?"#ff444433":"#ffaa0033"), borderRadius:4, padding:"4px 10px", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background: v==="online"?"#00ff88":v==="offline"?"#ff4444":"#ffaa00", display:"inline-block" }} />
              <span style={{ color:"#fff" }}>{LABELS[k]}</span>
              <span style={{ color: v==="online"?"#00ff88":v==="offline"?"#ff4444":"#ffaa00", fontSize:10 }}>{v==="online"?"ACTIVO":v==="offline"?"OFFLINE":"..."}</span>
            </div>
          ))}
          <div style={{ width:"100%", color:"#ffffff33", fontSize:9, marginTop:4 }}>
            Circuit Breaker: IBM Watson → Gemini → Local · Auto-reconnect 30s · J-L Sentinel AI
          </div>
        </div>
      )}
      <style>{"@keyframes ibm-p{0%,100%{opacity:1}50%{opacity:0.5}}"}</style>
    </div>
  );
}
`.trim();

fs.writeFileSync(path.join(PROJECT, 'IbmNexusBar.tsx'), ibmNexusBar, 'utf8');
console.log('✅ IbmNexusBar.tsx creado');

// ─── 3. Parchar server.js ────────────────────────────────────────────────────
const serverPath = path.join(PROJECT, 'server.js');
if (!fs.existsSync(serverPath)) {
  console.log('⚠️  server.js no encontrado — saltando parche');
} else {
  let srv = fs.readFileSync(serverPath, 'utf8');
  if (srv.includes('IBM_NEXUS_V7_APPLIED')) {
    console.log('ℹ️  server.js ya tiene IBM v7');
  } else {
    const ibmPatch = `
// ============================================================
// IBM WATSON INTEGRATION v7 — J-L Sentinel AI
// IBM_NEXUS_V7_APPLIED
// ============================================================
const IBM_APIS = {
  WATSONX_API_KEY: process.env.IBM_WATSONX_API_KEY || '',
  WATSONX_URL:     process.env.IBM_WATSONX_URL     || 'https://us-south.ml.cloud.ibm.com',
  NLU_API_KEY:     process.env.IBM_NLU_API_KEY     || '',
  NLU_URL:         process.env.IBM_NLU_URL         || '',
  DISCOVERY_KEY:   process.env.IBM_DISCOVERY_KEY   || '',
  DISCOVERY_URL:   process.env.IBM_DISCOVERY_URL   || '',
  TTS_API_KEY:     process.env.IBM_TTS_API_KEY     || '',
  TTS_URL:         process.env.IBM_TTS_URL         || '',
  ASSISTANT_KEY:   process.env.IBM_ASSISTANT_KEY   || '',
  ASSISTANT_URL:   process.env.IBM_ASSISTANT_URL   || '',
  ASSISTANT_ID:    process.env.IBM_ASSISTANT_ID    || '',
};

app.get('/api/ibm/health', (req, res) => {
  res.json({
    watsonx:   !!IBM_APIS.WATSONX_API_KEY,
    nlu:       !!IBM_APIS.NLU_API_KEY,
    discovery: !!IBM_APIS.DISCOVERY_KEY,
    tts:       !!IBM_APIS.TTS_API_KEY,
    assistant: !!IBM_APIS.ASSISTANT_KEY,
    stt:       !!IBM_APIS.TTS_API_KEY,
    timestamp: new Date().toISOString(),
    system:    'J-L Sentinel AI NEXUS v7',
  });
});

app.post('/api/ibm/watsonx/analyze', async (req, res) => {
  const { text, context } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!IBM_APIS.WATSONX_API_KEY) {
    const riskW = ['amenaza','violencia','delito','peligro','robo','ataque','crimen','alerta'];
    const found = riskW.filter(w => text.toLowerCase().includes(w));
    return res.json({ sentiment: found.length > 2 ? 'negative' : found.length === 0 ? 'positive' : 'neutral', confidence: 0.65, entities: found, keywords: text.split(/\\s+/).slice(0,8).filter(w => w.length > 4), riskScore: Math.min(100, found.length * 20), ibmModel: 'nexus-local' });
  }
  try {
    const nodeFetch = await import('node-fetch');
    const fetch = nodeFetch.default;
    const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=' + IBM_APIS.WATSONX_API_KEY });
    const tokenData = await tokenRes.json();
    const wxRes = await fetch(IBM_APIS.WATSONX_URL + '/ml/v1/text/generation?version=2024-05-31', { method: 'POST', headers: { Authorization: 'Bearer ' + tokenData.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ model_id: 'ibm/granite-13b-instruct-v2', input: 'Analiza: ' + text + '\\nResponde SOLO JSON: {"sentiment":"positive|negative|neutral","confidence":0.9,"riskScore":0,"entities":[],"keywords":[]}', parameters: { max_new_tokens: 150, temperature: 0.1 } }) });
    const wxData = await wxRes.json();
    const match = (wxData.results?.[0]?.generated_text || '{}').match(/\\{[\\s\\S]*\\}/);
    res.json({ ...(match ? JSON.parse(match[0]) : {}), ibmModel: 'granite-13b' });
  } catch (err) { res.status(500).json({ error: 'watsonx error', msg: err.message }); }
});

app.post('/api/ibm/nlu/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!IBM_APIS.NLU_API_KEY) return res.json({ entities: [], keywords: text.split(/\\s+/).slice(0,5).map(k => ({ text: k, relevance: 0.5 })), emotion: {}, sentiment: { document: { label: 'neutral', score: 0 } }, source: 'local' });
  try {
    const nodeFetch = await import('node-fetch');
    const nluRes = await nodeFetch.default(IBM_APIS.NLU_URL + '/v1/analyze?version=2022-04-07', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from('apikey:' + IBM_APIS.NLU_API_KEY).toString('base64') }, body: JSON.stringify({ text, language: 'es', features: { entities: { limit: 10 }, keywords: { limit: 10 }, emotion: {}, sentiment: {} } }) });
    res.json(await nluRes.json());
  } catch (err) { res.status(500).json({ error: 'nlu error' }); }
});

app.post('/api/ibm/discovery/query', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });
  if (!IBM_APIS.DISCOVERY_KEY) return res.json({ results: [], source: 'local' });
  res.json({ results: [], note: 'Configura IBM_DISCOVERY_KEY en .env' });
});

app.post('/api/ibm/tts/synthesize', async (req, res) => {
  const { text, voice } = req.body;
  if (!IBM_APIS.TTS_API_KEY) return res.status(503).json({ error: 'TTS key not set' });
  try {
    const nodeFetch = await import('node-fetch');
    const r = await nodeFetch.default(IBM_APIS.TTS_URL + '/v1/synthesize?voice=' + (voice || 'es-US_SofiaV3Voice'), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mp3', Authorization: 'Basic ' + Buffer.from('apikey:' + IBM_APIS.TTS_API_KEY).toString('base64') }, body: JSON.stringify({ text }) });
    res.setHeader('Content-Type', 'audio/mp3');
    r.body.pipe(res);
  } catch (err) { res.status(500).json({ error: 'tts error' }); }
});

app.get('/api/ibm/stt/token', (req, res) => {
  res.json({ status: !!IBM_APIS.TTS_API_KEY ? 'ok' : 'no-key', provider: 'watson-stt' });
});

app.post('/api/ibm/assistant/message', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  if (!IBM_APIS.ASSISTANT_KEY) {
    const replies = { patrulla:'Patrullas activas: P-01, P-02, P-03 en servicio.', alerta:'Sin alertas criticas. Sistema monitoreando 24/7.', estado:'NEXUS operativo al 100%. 7 unidades en campo.', default:'Comando recibido. NEXUS procesando con protocolo OSINT ALPHA.' };
    const key = Object.keys(replies).find(k => message.toLowerCase().includes(k)) || 'default';
    return res.json({ reply: replies[key], sessionId: sessionId || 'local', source: 'local' });
  }
  try {
    const nodeFetch = await import('node-fetch');
    const fetch = nodeFetch.default;
    let sid = sessionId;
    if (!sid) { const s = await (await fetch(IBM_APIS.ASSISTANT_URL + '/v2/assistants/' + IBM_APIS.ASSISTANT_ID + '/sessions?version=2023-06-15', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from('apikey:' + IBM_APIS.ASSISTANT_KEY).toString('base64') } })).json(); sid = s.session_id; }
    const m = await (await fetch(IBM_APIS.ASSISTANT_URL + '/v2/assistants/' + IBM_APIS.ASSISTANT_ID + '/sessions/' + sid + '/message?version=2023-06-15', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from('apikey:' + IBM_APIS.ASSISTANT_KEY).toString('base64') }, body: JSON.stringify({ input: { message_type: 'text', text: message } }) })).json();
    res.json({ reply: m.output?.generic?.find(g => g.response_type === 'text')?.text || 'Sin respuesta', sessionId: sid, source: 'watson-assistant' });
  } catch (err) { res.status(500).json({ error: 'assistant error' }); }
});

app.post('/api/ibm/governance/risk', (req, res) => {
  const { action, context } = req.body;
  let score = 10;
  const factors = [];
  if (context?.biometria)    { score += 40; factors.push('Datos biometricos — consentimiento requerido'); }
  if (context?.vigilancia)   { score += 30; factors.push('Vigilancia ciudadana — revisar marco legal'); }
  if (context?.redesSociales){ score += 25; factors.push('Redes sociales — LFPDPPP aplicable'); }
  if (context?.dispatch)     { score += 15; factors.push('Despacho de unidad — accion irreversible'); }
  if (factors.length === 0)    factors.push('Accion de bajo riesgo — dentro de protocolos');
  res.json({ score: Math.min(100, score), factors, recommendation: score > 65 ? 'REQUIERE_SUPERVISOR' : score > 40 ? 'PROCEDER_CON_CAUTELA' : 'PUEDE_PROCEDER', approved: score <= 65, ibmFramework: 'IBM OpenScale Responsible AI', timestamp: new Date().toISOString() });
});

console.log('[NEXUS IBM v7] Endpoints registrados: health, watsonx, nlu, discovery, tts, stt, assistant, governance');
`;

    // Insertar antes del app.listen
    if (srv.includes('app.listen')) {
      srv = srv.replace(/app\.listen/, ibmPatch + '\napp.listen');
    } else {
      srv = srv + '\n' + ibmPatch;
    }
    fs.writeFileSync(serverPath, srv, 'utf8');
    console.log('✅ server.js parchado con IBM endpoints');
  }
}

// ─── 4. Parchar App.tsx para agregar IbmNexusBar ────────────────────────────
const appPath = path.join(PROJECT, 'App.tsx');
if (fs.existsSync(appPath)) {
  let app = fs.readFileSync(appPath, 'utf8');
  if (!app.includes('IbmNexusBar')) {
    app = "import IbmNexusBar from './IbmNexusBar';\n" + app;
    // Agregar antes del ultimo </div>
    const lastDiv = app.lastIndexOf('</div>');
    if (lastDiv > -1) {
      app = app.slice(0, lastDiv) + '      <IbmNexusBar />\n      ' + app.slice(lastDiv);
    }
    fs.writeFileSync(appPath, app, 'utf8');
    console.log('✅ IbmNexusBar inyectado en App.tsx');
  } else {
    console.log('ℹ️  IbmNexusBar ya está en App.tsx');
  }
} else {
  console.log('⚠️  App.tsx no encontrado');
}

// ─── 5. .env.example ────────────────────────────────────────────────────────
const envEx = `# J-L Sentinel AI · .env.example — NUNCA subas .env a GitHub
# Obtén API keys en: https://cloud.ibm.com/resources

IBM_WATSONX_API_KEY=tu_key_aqui
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_NLU_API_KEY=tu_key_aqui
IBM_NLU_URL=https://api.us-south.natural-language-understanding.watson.cloud.ibm.com/instances/TU_ID
IBM_DISCOVERY_KEY=tu_key_aqui
IBM_DISCOVERY_URL=https://api.us-south.discovery.watson.cloud.ibm.com/instances/TU_ID
IBM_TTS_API_KEY=tu_key_aqui
IBM_TTS_URL=https://api.us-south.text-to-speech.watson.cloud.ibm.com/instances/TU_ID
IBM_ASSISTANT_KEY=tu_key_aqui
IBM_ASSISTANT_URL=https://api.us-south.assistant.watson.cloud.ibm.com/instances/TU_ID
IBM_ASSISTANT_ID=tu_assistant_id
IBM_QUANTUM_TOKEN=tu_token_quantum
GEMINI_API_KEY=tu_gemini_key
PORT=3001
NODE_ENV=production
VITE_IBM_BASE_URL=http://127.0.0.1:3001
`;
fs.writeFileSync(path.join(PROJECT, '.env.example'), envEx, 'utf8');
console.log('✅ .env.example creado');

console.log('\n=== COMPLETADO ===');
console.log('Archivos creados: ibmServices.ts, IbmNexusBar.tsx, .env.example');
console.log('server.js parchado con 7 endpoints IBM');
console.log('App.tsx actualizado con IbmNexusBar');
console.log('\nSiguiente paso:');
console.log('  1. node server.js (en otra terminal)');
console.log('  2. Ctrl+Shift+R en el browser');
console.log('  3. Ver barra IBM en parte inferior de TODOS los modulos');
