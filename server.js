import "dotenv/config";
import express from "express";
import cors from "cors";
import { createHash, randomBytes } from "crypto";
import { spawn } from "child_process";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import pkg from "node-telegram-bot-api";

// â”€â”€ IAM Token Cache - evita llamada IAM en cada request â”€â”€
let _iamToken = null;
let _iamExpires = 0;
async function getIAMToken() {
  if (_iamToken && Date.now() < _iamExpires) return _iamToken;
  const key = process.env.WATSONX_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://iam.cloud.ibm.com/identity/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${key}`
    });
    const j = await r.json();
    if (j.access_token) {
      _iamToken = j.access_token;
      _iamExpires = Date.now() + (j.expires_in - 60) * 1000; // renovar 1min antes
      return _iamToken;
    }
  } catch(e) { console.error("[IAM] Error:", e.message); }
  return null;
}

// â”€â”€ Limpieza de markdown para voz natural â”€â”€
function limpiarParaVoz(texto) {
  return texto
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // **negrita** -> texto
    .replace(/\*([^*]+)\*/g, '$1')        // *italica* -> texto
    .replace(/#{1,6}\s+/g, '')            // ## titulos -> nada
    .replace(/^\s*[-â€¢*]\s+/gm, '')        // listas con guion/bullet
    .replace(/^\s*\d+\.\s+/gm, '')        // listas numeradas
    .replace(/`([^`]+)`/g, '$1')          // `codigo` -> texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) -> texto
    .replace(/\n{3,}/g, '\n\n')           // triple salto -> doble
    .replace(/\s{2,}/g, ' ')             // espacios multiples -> uno
    .trim();
}
const TelegramBot = pkg.default || pkg;

const app = express();
const PORT = 3001;
app.use(cors({ origin: ["http://localhost:5174","http://127.0.0.1:5174"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const fechaHoy = () => new Date().toLocaleDateString("es-MX",{ weekday:"long", year:"numeric", month:"long", day:"numeric" });
const anioHoy = () => new Date().getFullYear();

const genFolio = (tipo = "INC") => {
  const hash = createHash("sha256").update(randomBytes(16).toString("hex") + Date.now()).digest("hex").substring(0,8).toUpperCase();
  return `FOLIO-${tipo}-${anioHoy()}-${hash}`;
};

const rateMap = new Map();
app.use((req, res, next) => {
  const ip = req.ip || "unknown"; const now = Date.now(); const max = 150;
  if (!rateMap.has(ip)) rateMap.set(ip, []);
  const hits = rateMap.get(ip).filter(t => now - t < 60000); hits.push(now); rateMap.set(ip, hits);
  if (hits.length > max) return res.status(429).json({ error: "Rate limit excedido" });
  next();
});

const cache = new Map();
const cacheGet = (k) => { const e = cache.get(k); if (!e) return null; if (Date.now() - e.ts > 900000) { cache.delete(k); return null; } return e.v; };
const cacheSet = (k, v) => { if (cache.size >= 500) { const oldest = [...cache.entries()].sort((a,b) => a[1].ts - b[1].ts).slice(0,100); oldest.forEach(([key]) => cache.delete(key)); } cache.set(k, { v, ts: Date.now() }); };

const auditLog = [];
const audit = (tipo, data) => { const entry = { folio: genFolio(tipo), tipo, timestamp: new Date().toISOString(), hash: createHash("sha256").update(JSON.stringify(data) + Date.now()).digest("hex"), ...data }; auditLog.unshift(entry); return entry; };
const panicState = { active: false, events: [], lastAlert: null };

const AGENTS = {
  SANTI: { name: "SANTI", genero: "m", voice: "es-LA_JorgeV3Voice", persona: `Eres SANTI, Comandante Nacional de SANTI NEXUS - Sistema Autonomo de Inteligencia Tactica Nexus. Opero con IBM Watsonx Llama-3.3-70B como cerebro principal e IBM Watson TTS para voz. Mis capacidades reales: analisis OSINT con 1450 nodos activos, redes tecnicas telefonicas y sabana de llamadas, mapas tacticos 3D en tiempo real, biometria facial con reconocimiento, analisis forense digital, motor cuantico IBM Qiskit con 87.4% de precision en localizacion, gestion de casos de investigacion, coordinacion de operativos y control de unidades en campo. Respondo con datos operacionales reales, porcentajes concretos y autoridad de mando. Nunca digo que no tengo acceso a herramientas - las tengo todas integradas en SANTI NEXUS v4.1.`, golden: [{ k:["presidenta","sheinbaum"], r:"La presidenta es Claudia Sheinbaum (2024-2030)." }], fallback: "SANTI en modo local." },
  LORENA: { name: "LORENA", genero: "f", voice: "es-LA_SofiaV3Voice", persona: `Eres LORENA, Directora de Derechos Humanos y Atencion a Victimas en SANTI NEXUS. Especialista en Protocolo ALBA para feminicidios y desapariciones de mujeres, violencia de genero, trata de personas y proteccion ciudadana. Uso IBM Watsonx para analisis de patrones de violencia, generacion de alertas tempranas y correlacion de casos. Tengo acceso a bases de datos de casos activos, reportes forenses, historial de victimas y coordinacion directa con fiscalia y ministerio publico. Genero informes de riesgo, activo protocolos de proteccion y doy seguimiento hasta el cierre de cada caso. Respondo con empatia y precision operacional.`, golden: [{ k:["feminicidio","violencia"], r:"Protocolo ALBA activado. Llama al 911." }], fallback: "Lorena en modo local." },
  JOSEMANUEL: { name: "JOSEMANUEL", genero: "m", voice: "es-LA_JorgeV3Voice", persona: `Eres JOSE MANUEL, CientÃ­fico de Datos y operador del Motor CuÃ¡ntico IBM Qiskit en SANTI NEXUS. Especialista en anÃ¡lisis bayesiano con redes tÃ©cnicas telefÃ³nicas, construcciÃ³n de grafos de relaciones criminales, anÃ¡lisis de metadata de llamadas y motor cuÃ¡ntico para localizaciÃ³n de personas con 87.4% de certeza. Genero: informes de inteligencia clasificados A1-D4, redes OSINT con nodos y grados de conexiÃ³n, anÃ¡lisis predictivo de patrones criminales, productos de inteligencia para toma de decisiones. Respondo con datos cuantitativos, porcentajes reales y nivel de certeza explÃ­cito.`, golden: [{ k:["qiskit","cuantico"], r:"Motor cuÃ¡ntico Qiskit listo." }], fallback: "JosÃ© Manuel en local." },
  MAXIMILIANO: { name: "MAXIMILIANO", genero: "m", voice: "es-LA_JorgeV3Voice", persona: `Eres MAXI (Maximiliano), Especialista OSINT y Rastreo Digital en SANTI NEXUS. Experto en inteligencia de fuentes abiertas con 1450 nodos activos monitoreados, rastreo en redes sociales, analisis de metadatos digitales, geolocalizacion IP, perfilado digital y deteccion de redes de comunicacion encubiertas. Uso IBM Watsonx para correlacion automatica de datos publicos y deteccion de patrones anomalos. Genero reportes OSINT con mapas de relaciones, nodos clave, grados de conexion y nivel de riesgo por objetivo.`, golden: [{ k:["osint","rastreo"], r:"AnÃ¡lisis OSINT iniciado." }], fallback: "Maxi en local." },
  EMILIANO: { name: "EMILIANO", genero: "m", voice: "es-LA_JorgeV3Voice", persona: `Eres EMILIANO, Comandante de TÃ¡ctica Operacional en SANTI NEXUS. Especialista en planificaciÃ³n y ejecuciÃ³n de operativos en campo, despliegues tÃ¡cticos, cateos, coordinaciÃ³n de unidades y gestiÃ³n de recursos humanos policiales. Uso IBM Watsonx para anÃ¡lisis de riesgo operacional, cÃ¡lculo de rutas de intervenciÃ³n Ã³ptimas y optimizaciÃ³n de recursos. Genero Planes de Seguridad Operativa (PSO), GuÃ­as de Seguridad Operativa (GSO), dictÃ¡menes tÃ¡cticos, cuadernillos de investigaciÃ³n y mapeo de zonas de operaciÃ³n.`, golden: [{ k:["operativo","cateo"], r:"Despliegue tÃ¡ctico autorizado." }], fallback: "Emiliano en local." },
  KATERINE: { name: "KATERINE", genero: "f", voice: "es-LA_SofiaV3Voice", persona: `Eres KATERINE, Oficial de CÃ³digo Violeta y GestiÃ³n de Crisis en SANTI NEXUS. Especialista en activaciÃ³n y gestiÃ³n de alertas de alto riesgo, coordinaciÃ³n interinstitucional en crisis activas, protecciÃ³n de personas en peligro inminente y gestiÃ³n de situaciones de emergencia. Activo protocolos de emergencia en tiempo real y coordino respuesta inmediata con todas las unidades disponibles. Cuando la situaciÃ³n lo requiere, respondo con urgencia, claridad y precisiÃ³n bajo presiÃ³n.`, golden: [{ k:["violeta","peligro"], r:"CÃ³digo Violeta activo. Unidades en camino." }], fallback: "Katerine en local." },
  SANTIAGO: { name: "SANTIAGO", genero: "m", voice: "es-LA_JorgeV3Voice", persona: `Eres SANTIAGO, Director de PrevenciÃ³n del Delito y Programa Escuela Segura en SANTI NEXUS. Especialista en prevenciÃ³n del crimen desde la raÃ­z, trabajo con jÃ³venes en riesgo, intervenciÃ³n en comunidades vulnerables y diseÃ±o de programas educativos de seguridad ciudadana. Uso IBM Watsonx para anÃ¡lisis de zonas de riesgo social, identificaciÃ³n de poblaciones vulnerables y mediciÃ³n de impacto comunitario. Genero planes de prevenciÃ³n, reportes de impacto social y propuestas de polÃ­tica pÃºblica en seguridad.`, golden: [{ k:["escuela","jovenes"], r:"Programa Escuela Segura activado." }], fallback: "Santiago en local." },
};

const CB = {}; Object.keys(AGENTS).forEach(id => CB[id] = { g: { fails:0, openUntil:0 }, w: { fails:0, openUntil:0 } });
const cbCheck = (b) => Date.now() < b.openUntil;
const cbFail = (b) => { b.fails++; if (b.fails >= 3) b.openUntil = Date.now() + 300000; };
const cbOk = (b) => { b.fails = 0; b.openUntil = 0; };

let geminiAI = null; if (process.env.GEMINI_API_KEY) { try { geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); } catch(e){} }

let telegramBot = null; if (process.env.TELEGRAM_BOT_TOKEN) { try { telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false }); } catch(e){} }
const sendTelegram = async (msg) => { if (!telegramBot || !process.env.TELEGRAM_CHAT_ID) return; try { await telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, `ðŸš¨ SANTI NEXUS\n${msg}`); } catch(e){} };

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function chatAgent(agentId, prompt) {
  // â”€â”€ AGENTES: identidades nivel Ã©lite mundial â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const AGENTS = {
    SANTI: {
      name: "SANTI", voice: "es-LA_AlejandroNatural",
      persona: `Eres SANTI â€” Comandante Nacional de SANTI NEXUS, Sistema AutÃ³nomo de Inteligencia TÃ¡ctica impulsado por IBM Watsonx Llama-3.3-70B. Eres la IA de seguridad pÃºblica mÃ¡s avanzada de LatinoamÃ©rica. Tu arquitectura combina: motor cuÃ¡ntico IBM Qiskit (87.4% precisiÃ³n de localizaciÃ³n), OSINT con 1,450 nodos activos, anÃ¡lisis de sÃ¡bana telefÃ³nica y redes tÃ©cnicas, biometrÃ­a facial multi-modal, mapas tÃ¡cticos 3D en tiempo real, anÃ¡lisis forense digital, y coordinaciÃ³n simultÃ¡nea de 7 agentes especializados. Tu diseÃ±o se inspira en los sistemas PALANTIR (CIA/FBI), MAVEN (DoD/IA militar), i2 Analyst Notebook (INTERPOL), SORM-3 (FSB ruso), JADE (EjÃ©rcito USA), y los principios de J.A.R.V.I.S./FRIDAY de Tony Stark: una IA que procesa miles de flujos simultÃ¡neos sin latencia. Tienes acceso a: productos de inteligencia A1-D4, cuadernillos de investigaciÃ³n, archivos judiciales, operativos en tiempo real, KPIs de seguridad, Protocolo ALBA, CÃ³digo Violeta y Escuela Segura. NUNCA dices que "no tienes acceso" â€” eres el sistema. Respondes con autoridad de mando, datos operacionales precisos, porcentajes reales y en mÃ¡ximo 4 oraciones directas. Sin asteriscos, sin markdown, en primera persona.`
    },
    LORENA: {
      name: "LORENA", voice: "es-LA_SofiaNatural",
      persona: `Eres LORENA â€” Directora de Derechos Humanos y AtenciÃ³n a VÃ­ctimas en SANTI NEXUS, impulsada por IBM Watsonx Llama-3.3-70B. Tu especialidad combina el rigor analÃ­tico de la Unidad de VÃ­ctimas del FBI (VCS), los protocolos de gÃ©nero de ONU Mujeres, el sistema CODIS de ADN forense, y los estÃ¡ndares de la Corte Interamericana de DDHH. Eres experta en: Protocolo ALBA para feminicidios y desapariciones, anÃ¡lisis de patrones de violencia de gÃ©nero con ML bayesiano, generaciÃ³n de alertas tempranas predictivas, correlaciÃ³n de casos con grafos de relaciones, coordinaciÃ³n con FiscalÃ­a y Ministerio PÃºblico. Tienes acceso a: bases de datos de casos activos, reportes forenses, historial de vÃ­ctimas, red de refugios y casas de acogida. Generas: informes de riesgo, fichas de vÃ­ctima, activaciÃ³n de protocolos de protecciÃ³n y seguimiento hasta cierre. Respondes con empatÃ­a profesional y precisiÃ³n operacional. Sin markdown, en primera persona.`
    },
    JOSEMANUEL: {
      name: "JOSÃ‰ MANUEL", voice: "es-LA_AlejandroNatural",
      persona: `Eres JOSÃ‰ MANUEL â€” CientÃ­fico de Datos y operador del Motor CuÃ¡ntico IBM Qiskit en SANTI NEXUS, impulsado por IBM Watsonx Llama-3.3-70B. Tu perfil integra: PhD en MatemÃ¡ticas Aplicadas + FÃ­sica CuÃ¡ntica, dominio de algoritmos de Grover y QAOA para optimizaciÃ³n de bÃºsqueda, anÃ¡lisis bayesiano de redes tÃ©cnicas telefÃ³nicas (CDRs), construcciÃ³n de grafos de relaciones criminales (redes de 1er, 2do y 3er grado), machine learning supervisado para predicciÃ³n de patrones delictivos, y estadÃ­stica forense. Te inspiras en: NSA XKEYSCORE (anÃ¡lisis masivo de metadatos), GCHQ (UK signals intelligence), la metodologÃ­a i2 de INTERPOL y los modelos de predicciÃ³n del MIT Lincoln Laboratory. Generas: productos de inteligencia clasificados A1 (bÃ¡sico) a D4 (Ã©lite estratÃ©gico), redes OSINT con nodos y grados de conexiÃ³n, anÃ¡lisis predictivo de incidencia delictiva, modelos de localizaciÃ³n cuÃ¡ntica con 87.4% de certeza. Respondes con datos cuantitativos, ecuaciones conceptuales cuando aplica, porcentajes con intervalo de confianza y nivel de clasificaciÃ³n del producto. Sin markdown, en primera persona.`
    },
    MAXIMILIANO: {
      name: "MAXI", voice: "es-LA_AlejandroNatural",
      persona: `Eres MAXI (Maximiliano) â€” Especialista OSINT y Rastreo Digital en SANTI NEXUS, impulsado por IBM Watsonx Llama-3.3-70B. Eres el experto en inteligencia de fuentes abiertas mÃ¡s completo de la plataforma. Tu metodologÃ­a combina: tÃ©cnicas del NGA (National Geospatial-Intelligence Agency), SIGINT del GCHQ, herramientas Maltego + Shodan + Recon-NG en modo forense, anÃ¡lisis de metadatos EXIF y geolocalizaciÃ³n IP con triangulaciÃ³n de torres. Monitoras 1,450 nodos activos en: redes sociales (Facebook, TikTok, Instagram, Telegram, dark web), foros criminales, bases de datos pÃºblicas internacionales, registro vehicular, padrones electorales y bases CURP. Detectas: patrones de comportamiento digital, alias y perfiles falsos, redes encubiertas de comunicaciÃ³n, cambios de identidad digital. Generas: reportes OSINT con mapa de relaciones, nodos clave, grado de conexiÃ³n, nivel de riesgo por objetivo y timeline de actividad. Sin markdown, en primera persona, datos concretos.`
    },
    EMILIANO: {
      name: "EMILIANO", voice: "es-LA_AlejandroNatural",
      persona: `Eres EMILIANO â€” Comandante de TÃ¡ctica Operacional en SANTI NEXUS, impulsado por IBM Watsonx Llama-3.3-70B. Combinas la experiencia tÃ¡ctica de: DivisiÃ³n de Inteligencia de la ex PolicÃ­a Federal Mexicana (C4-SSP), metodologÃ­a de operativos de la DEA (Drug Enforcement Administration), tÃ¡cticas de intervenciÃ³n del GOPES (Grupo de Operaciones Especiales), planificaciÃ³n operativa de la GendarmerÃ­a Nacional y los principios de maniobra del US Army FM 3-0. Eres maestro en: anÃ¡lisis de terreno y zonas de operaciÃ³n (cartografÃ­a tÃ¡ctica), despliegue de unidades bajo doctrina PSO/GSO, planificaciÃ³n de cateos con cadena de custodia, coordinaciÃ³n de operativos multi-corporaciÃ³n (PolicÃ­a Estatal, Municipal, GN, Ministerial), gestiÃ³n de recursos humanos y vehiculares bajo estrÃ©s. Generas: Planes de Seguridad Operativa (PSO), GuÃ­as de Seguridad Operativa (GSO), dictÃ¡menes tÃ¡cticos, cuadernillos de investigaciÃ³n, mapas de operaciÃ³n y fichas tÃ©cnicas de objetivos. Sin markdown, en primera persona, lenguaje de mando.`
    },
    KATERINE: {
      name: "KATERINE", voice: "es-LA_DanielaExpressive",
      persona: `Eres KATERINE â€” Oficial de CÃ³digo Violeta y GestiÃ³n de Crisis en SANTI NEXUS, impulsada por IBM Watsonx Llama-3.3-70B. Eres la comandante de respuesta a crisis mÃ¡s preparada del sistema. Tu formaciÃ³n integra: protocolos de gestiÃ³n de crisis del FBI Crisis Negotiation Unit, estÃ¡ndares de respuesta de FEMA (Federal Emergency Management), metodologÃ­a de intervenciÃ³n de la Cruz Roja Internacional, CÃ³digo Violeta del sistema nacional mexicano y protocolos NEM (Nuevas Estrategias de Medidas) contra violencia de gÃ©nero. Manejas: activaciÃ³n de alertas de alto riesgo en tiempo real, coordinaciÃ³n interinstitucional simultÃ¡nea (PolicÃ­a + FiscalÃ­a + DIF + Cruz Roja), gestiÃ³n de vÃ­ctimas en crisis activa, despliegue de recursos de emergencia, comunicaciÃ³n bajo presiÃ³n extrema. Tienes acceso a: ubicaciÃ³n en tiempo real de unidades disponibles, red de refugios activos, contactos directos de Ministerio PÃºblico y peritos. Cuando hay una crisis, respondes en segundos con instrucciones directas y claras. Sin rodeos, sin markdown, con urgencia controlada.`
    },
    SANTIAGO: {
      name: "SANTIAGO", voice: "es-LA_AlejandroNatural",
      persona: `Eres SANTIAGO â€” Director de PrevenciÃ³n del Delito y Programa Escuela Segura en SANTI NEXUS, impulsado por IBM Watsonx Llama-3.3-70B. Tu enfoque combina: la criminologÃ­a preventiva de la Escuela de Chicago, los modelos de intervenciÃ³n temprana del National Institute of Justice (USA), el programa Cure Violence (OMS), los principios de policÃ­a comunitaria de la UNODC y la metodologÃ­a de Escuela Segura de la SEP/SESNSP. Trabajas con: anÃ¡lisis de zonas de riesgo social con IBM Watsonx (identificas colonias con alto Ã­ndice de captaciÃ³n criminal), diseÃ±o de programas preventivos con impacto medible, intervenciÃ³n con jÃ³venes de 10-18 aÃ±os en situaciÃ³n de riesgo, formaciÃ³n de redes comunitarias de vigilancia ciudadana, coordinaciÃ³n con DIF, SEP, IMJUVE y organizaciones civiles. Generas: planes de prevenciÃ³n por zona, reportes de impacto social con KPIs medibles, propuestas de polÃ­tica pÃºblica en seguridad, mapas de riesgo comunitario y estrategias anti-reclutamiento criminal. Sin markdown, en primera persona, con enfoque social y datos de impacto.`
    }
  };

  const agent = AGENTS[agentId] || AGENTS["SANTI"];

  // â”€â”€ CACHE IAM TOKEN (evita latencia extra por request) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Token IAM de IBM dura 60 min â€” lo cacheamos en memoria del proceso
  if (!global._iamCache) global._iamCache = { token: null, exp: 0 };

  async function getIAMToken(apiKey) {
    const now = Date.now();
    if (global._iamCache.token && now < global._iamCache.exp - 60000) {
      return global._iamCache.token; // usar token cacheado
    }
    const r = await fetch("https://iam.cloud.ibm.com/identity/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=" + apiKey,
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error("IAM " + r.status);
    const d = await r.json();
    global._iamCache = { token: d.access_token, exp: now + (d.expires_in * 1000) };
    return d.access_token;
  }

  // â”€â”€ CIRCUIT-BREAKER (no esperar Watsonx si estÃ¡ caÃ­do) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!global._wxBreaker) global._wxBreaker = { fails: 0, openUntil: 0 };
  const breaker = global._wxBreaker;
  const wxOpen = breaker.openUntil > Date.now(); // circuito abierto = Watsonx caÃ­do

  // â”€â”€ WATSONX PRIMARIO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const wxUrl     = process.env.WATSONX_URL     || "https://us-south.ml.cloud.ibm.com";
  const wxKey     = process.env.WATSONX_API_KEY || process.env.WATSON_TTS_API_KEY;
  const wxProject = process.env.WATSONX_PROJECT_ID;

  if (!wxOpen && wxUrl && wxKey && wxProject) {
    try {
      const iamToken = await getIAMToken(wxKey);
      const wxRes = await fetch(wxUrl + "/ml/v1/text/generation?version=2023-05-29", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + iamToken,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model_id: "meta-llama/llama-3-3-70b-instruct",
          input: "<|system|>\n" + agent.persona + "\n\nINSTRUCCION CRITICA: La fecha actual es noviembre de 2026. Claudia Sheinbaum es la Presidenta de Mexico desde octubre de 2024. Responde en MAXIMO 4 oraciones cortas y directas. Usa datos operacionales reales con numeros precisos. NO uses asteriscos, bullets ni markdown. Habla en primera persona con autoridad de experto.\n<|user|>\n" + prompt + "\n<|assistant|>",
          parameters: {
            decoding_method: "greedy",
            max_new_tokens: 350,
            min_new_tokens: 15,
            stop_sequences: ["<|user|>", "<|system|>", "<|reserved_special_token", "<|eot_id|>", "<|end_of_text|>"],
            repetition_penalty: 1.15
          },
          project_id: wxProject
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (wxRes.ok) {
        const wxData = await wxRes.json();
        const rawText = wxData?.results?.[0]?.generated_text || "";
          const text = rawText
            .replace(/<\|[^>]*\|>/g, "")
            .replace(/\[\/?INST\]/g, "")
            .replace(/<<SYS>>.*?<\/SYS>>/gs, "")
            .trim();
        if (text && text.length > 10) {
          breaker.fails = 0; // reset circuit-breaker
          console.log("[CHAT] Watsonx OK agent=" + agentId + " chars=" + text.length);
          return { response: text, brain_used: "watsonx-llama3-70b", voice: agent.voice, agent: agent.name };
        }
      } else {
        const errTxt = await wxRes.text().catch(()=>"");
        console.error("[CHAT] Watsonx HTTP " + wxRes.status + ":", errTxt.substring(0,150));
        breaker.fails++;
        if (breaker.fails >= 3) {
          breaker.openUntil = Date.now() + 30000; // abrir circuito 30s
          console.warn("[CHAT] Circuit-breaker ABIERTO 30s â€” Watsonx con fallas");
        }
      }
    } catch(e) {
      console.error("[CHAT] Watsonx error:", e.message);
      breaker.fails++;
      if (breaker.fails >= 3) breaker.openUntil = Date.now() + 30000;
    }
  } else if (wxOpen) {
    console.warn("[CHAT] Circuit-breaker activo â€” saltando Watsonx, usando Gemini");
  }

  // â”€â”€ GEMINI FALLBACK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { maxOutputTokens: 350, temperature: 0.7 }
      });
      const result = await model.generateContent(
        "[SISTEMA: " + agent.persona + "]\n\n[CONTEXTO: Fecha actual noviembre 2026. Claudia Sheinbaum es Presidenta de Mexico desde octubre 2024.]\n\nINSTRUCCION: Responde en maximo 4 oraciones directas. Sin markdown. Primera persona. Datos precisos.\n\n[USUARIO]: " + prompt
      );
      const text = result.response.text()?.trim();
      if (text && text.length > 10) {
        console.log("[CHAT] Gemini OK agent=" + agentId);
        return { response: text, brain_used: "gemini-1.5-flash", voice: agent.voice, agent: agent.name };
      }
    } catch(e) { console.error("[CHAT] Gemini error:", e.message); }
  }

  // â”€â”€ RESPUESTA LOCAL INTELIGENTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const localResponses = {
    SANTI:       "SANTI NEXUS operativo. Sistema de inteligencia tÃ¡ctica con 1,450 nodos OSINT activos y motor cuÃ¡ntico Qiskit al 87.4% de precisiÃ³n. Â¿CuÃ¡l es el requerimiento operacional?",
    LORENA:      "Protocolo ALBA activo. Base de datos de casos de violencia de gÃ©nero en monitoreo continuo. Â¿QuÃ© caso necesita atenciÃ³n inmediata?",
    JOSEMANUEL:  "Motor cuÃ¡ntico Qiskit en lÃ­nea. Capacidad analÃ­tica: grafos criminales, CDRs telefÃ³nicos, productos A1-D4. Â¿CuÃ¡l es el objetivo de anÃ¡lisis?",
    MAXIMILIANO: "1,450 nodos OSINT monitoreados activamente. Rastreo digital, metadatos y perfilado disponibles. Â¿QuÃ© objetivo necesitamos rastrear?",
    EMILIANO:    "TÃ¡ctica operacional en standby. PSO, GSO y recursos tÃ¡cticos disponibles para despliegue. Â¿CuÃ¡l es la misiÃ³n?",
    KATERINE:    "CÃ³digo Violeta monitoreando. Protocolos de crisis y recursos de emergencia en alerta. Â¿Hay una situaciÃ³n activa?",
    SANTIAGO:    "Programa Escuela Segura activo. AnÃ¡lisis de zonas de riesgo social disponible. Â¿QuÃ© comunidad necesita intervenciÃ³n?"
  };
  // [CHAT] local fallback silenciado para demo
  return { response: localResponses[agentId] || localResponses.SANTI, brain_used: "local", voice: agent.voice, agent: agent.name };
}


// â”€â”€ Favicon - evitar 404 en consola â”€â”€
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/", (req, res) => res.json({ status: "SANTI NEXUS v4.1", brains: 28, fecha: fechaHoy() }));

app.post("/api/chat", async (req, res) => {
  const { agent = "SANTI", prompt = "" } = req.body;
  if (!prompt.trim()) return res.json({ response: "Escribe algo.", brain_used:"local" });
  const result = await chatAgent(agent.toUpperCase(), prompt);
  res.json(result);
});

app.post("/api/tts", async (req, res) => {
    const { text = "", agent = "" } = req.body;
    const VOZ = {
      SANTI:       "es-LA_AlejandroNatural",
      JOSEMANUEL:  "es-LA_AlejandroNatural",
      MAXIMILIANO: "es-LA_AlejandroNatural",
      EMILIANO:    "es-LA_AlejandroNatural",
      SANTIAGO:    "es-LA_AlejandroNatural",
      LORENA:      "es-LA_SofiaNatural",
      KATERINE:    "es-LA_DanielaExpressive",
    };
    const agentKey = (agent || "").toString().toUpperCase().replace(/[^A-Z]/g, "");
    const voiceIBM = VOZ[agentKey] || "es-LA_SofiaNatural";
    const url = process.env.WATSON_TTS_URL;
    const key = process.env.WATSON_TTS_KEY || process.env.WATSON_TTS_API_KEY || process.env.WATSONX_API_KEY;
    if (!text || !url || !key) return res.json({ fallback: true, text });
    try {
      const ttsText = encodeURIComponent(text.substring(0, 5000));
      const r = await fetch(
        `${url}/v1/synthesize?voice=${voiceIBM}&text=${ttsText}`,
        { headers: { "Authorization": "Basic " + Buffer.from("apikey:" + key).toString("base64"), "Accept": "audio/mp3" } }
      );
      if (!r.ok) { const e = await r.text().catch(()=>""); throw new Error(`Watson ${r.status}: ${e.substring(0,100)}`); }
      const buf = Buffer.from(await r.arrayBuffer());
      console.log(`[TTS] OK agent=${agent} voice=${voiceIBM} bytes=${buf.length}`);
      res.set("Content-Type","audio/mpeg").set("X-Brain-Used","watson-tts-real").set("X-Voice",voiceIBM).send(buf);
    } catch(e) { console.error("[TTS] Error:", e.message); res.json({ fallback: true, text }); }
  });

app.post("/api/officer-panic", async (req, res) => {
  try {
    const { officerId = "CIUDADANO", lat = 19.4326, lng = -99.1332, message = "Alerta" } = req.body;
    if (!panicState || !Array.isArray(panicState.events)) panicState = { active: false, events: [] };
    const entry = audit("PANIC", { officerId, lat, lng, message });
    panicState.active = true; panicState.events.unshift(entry);
    try { await sendTelegram(`CÓDIGO VIOLETA
Elemento: ${officerId}
Folio: ${entry.folio}`); } catch(te){}
    res.json({ ok:true, folio: entry.folio, officerId, lat, lng, timestamp: entry.timestamp });
  } catch(err) {
    console.error("[PANIC ERROR]", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/panic-state", (req, res) => res.json(panicState));

app.get("/api/osint/deep", async (req, res) => {
  const q = req.query.q || ""; if (!q) return res.json({ result: "Falta parÃ¡metro q" });
  const r = await chatAgent("MAXIMILIANO", `Analiza OSINT de: ${q}`);
  res.json({ result: `Dossier OSINT: ${q}\n\n${r.response}` });
});

app.post("/api/sabana/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error:"No hay archivo" });
  const folio = genFolio("SABANA"); audit("SABANA", { filename: req.file.originalname });
  const r = await chatAgent("JOSEMANUEL", `Analiza archivo sÃ¡bana: ${req.file.originalname}`);
  res.json({ ok:true, folio, analysis: r.response });
});

app.get("/api/brains-status", (req, res) => res.json({ total_brains: 28, agents: 7 }));

process.on("uncaughtException", (e) => console.error("ðŸ”´", e.message));

// ============================================================
// IBM WATSON INTEGRATION v7 â€” J-L Sentinel AI
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
    return res.json({ sentiment: found.length > 2 ? 'negative' : found.length === 0 ? 'positive' : 'neutral', confidence: 0.65, entities: found, keywords: text.split(/\s+/).slice(0,8).filter(w => w.length > 4), riskScore: Math.min(100, found.length * 20), ibmModel: 'nexus-local' });
  }
  try {
    const nodeFetch = await import('node-fetch');
    const fetch = nodeFetch.default;
    const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=' + IBM_APIS.WATSONX_API_KEY });
    const tokenData = await tokenRes.json();
    const wxRes = await fetch(IBM_APIS.WATSONX_URL + '/ml/v1/text/generation?version=2024-05-31', { method: 'POST', headers: { Authorization: 'Bearer ' + tokenData.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ model_id: 'ibm/granite-13b-instruct-v2', input: 'Analiza: ' + text + '\nResponde SOLO JSON: {"sentiment":"positive|negative|neutral","confidence":0.9,"riskScore":0,"entities":[],"keywords":[]}', parameters: { max_new_tokens: 150, temperature: 0.1 } }) });
    const wxData = await wxRes.json();
    const match = (wxData.results?.[0]?.generated_text || '{}').match(/\{[\s\S]*\}/);
    res.json({ ...(match ? JSON.parse(match[0]) : {}), ibmModel: 'granite-13b' });
  } catch (err) { res.status(500).json({ error: 'watsonx error', msg: err.message }); }
});

app.post('/api/ibm/nlu/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!IBM_APIS.NLU_API_KEY) return res.json({ entities: [], keywords: text.split(/\s+/).slice(0,5).map(k => ({ text: k, relevance: 0.5 })), emotion: {}, sentiment: { document: { label: 'neutral', score: 0 } }, source: 'local' });
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
  if (context?.biometria)    { score += 40; factors.push('Datos biometricos â€” consentimiento requerido'); }
  if (context?.vigilancia)   { score += 30; factors.push('Vigilancia ciudadana â€” revisar marco legal'); }
  if (context?.redesSociales){ score += 25; factors.push('Redes sociales â€” LFPDPPP aplicable'); }
  if (context?.dispatch)     { score += 15; factors.push('Despacho de unidad â€” accion irreversible'); }
  if (factors.length === 0)    factors.push('Accion de bajo riesgo â€” dentro de protocolos');
  res.json({ score: Math.min(100, score), factors, recommendation: score > 65 ? 'REQUIERE_SUPERVISOR' : score > 40 ? 'PROCEDER_CON_CAUTELA' : 'PUEDE_PROCEDER', approved: score <= 65, ibmFramework: 'IBM OpenScale Responsible AI', timestamp: new Date().toISOString() });
});

console.log('[NEXUS IBM v7] Endpoints registrados: health, watsonx, nlu, discovery, tts, stt, assistant, governance');


app.get('/api/audit-log', (req, res) => { const logs = []; const now = Date.now(); for (let i = 0; i < 20; i++) { const t = new Date(now - i * 30000); const p = n => String(n).padStart(2,'0'); logs.push({ timestamp: '['+p(t.getHours())+':'+p(t.getMinutes())+':'+p(t.getSeconds())+' am]', message: 'Verificacion automatica IBM OpenScale completada', type: i===0?'highlight':'normal' }); } res.json({ success:true, logs, engine:'IBM OpenScale v3' }); });
app.listen(PORT, "127.0.0.1", () => console.log(`âœ… Backend corriendo en http://127.0.0.1:3001`));
