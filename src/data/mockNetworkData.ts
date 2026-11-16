/**
 * mockNetworkData.ts
 * ══════════════════════════════════════════════════════════════════════════════
 * OSINT simulation dataset — SANTI NEXUS Link Analysis
 *
 * All data is FICTIONAL and used exclusively for educational demonstration.
 * Names, numbers, usernames, and addresses are synthetic.
 * Coordinates are approximate public geographic areas (no private data).
 */

// ── Node types ────────────────────────────────────────────────────────────────
export type NodeType = "target" | "contact" | "social" | "location" | "device";

export interface NetworkNode {
  id:          string;
  label:       string;
  type:        NodeType;
  alias?:      string;
  phone?:      string;
  imei?:       string;
  // Social accounts
  tiktok?:     string;
  instagram?:  string;
  snapchat?:   string;
  facebook?:   string;
  // Location
  lat?:        number;
  lon?:        number;
  address?:    string;
  // Risk / meta
  risk:        number;   // 0.0 – 1.0
  calls:       number;   // total call count
  note?:       string;
  color:       string;   // pre-computed display color
  val:         number;   // node size hint for force-graph
}

export interface NetworkLink {
  source:      string;   // node id
  target:      string;   // node id
  weight:      number;   // # of contacts / calls — drives line thickness
  label?:      string;
  color:       string;
}

export interface CallRecord {
  id:          string;
  from:        string;   // node id
  to:          string;   // node id
  date:        string;   // ISO date
  time:        string;   // HH:MM
  duration:    number;   // seconds
  type:        "VOZ" | "SMS" | "DATOS" | "WAPP";
  direction:   "entrante" | "saliente";
  cellId?:     string;
  lat?:        number;
  lon?:        number;
}

export interface SocialPost {
  id:          string;
  nodeId:      string;
  platform:    "TikTok" | "Instagram" | "Snapchat" | "Facebook";
  date:        string;
  content:     string;
  location?:   string;
  relevant:    boolean;  // flagged by intel
}

// ── Color map ─────────────────────────────────────────────────────────────────
export const NODE_COLORS: Record<NodeType, string> = {
  target:   "#ff1744",   // rojo   — número objetivo
  contact:  "#ff6d00",   // naranja — contacto frecuente
  social:   "#1e88e5",   // azul   — perfil de red social
  location: "#00e676",   // verde  — ubicación / domicilio
  device:   "#c8a84b",   // dorado — dispositivo / IMEI
};

// ── 30-node network ───────────────────────────────────────────────────────────
export const NODES: NetworkNode[] = [
  // ── TARGET ────────────────────────────────────────────────────────────────
  {
    id: "T1", label: "OBJETIVO ALFA", type: "target",
    alias: "(a) El Kevin", phone: "+52 314 666-7148",
    imei: "358572073461366",
    tiktok: "@el.kevin.official", instagram: "@thekev_mx", snapchat: "kevin_snap19",
    lat: 19.4326, lon: -99.1332, address: "Col. Las Rosas, Álvaro Obregón, CDMX",
    risk: 0.94, calls: 342, val: 18,
    note: "Número principal de investigación. Alta frecuencia nocturna.",
    color: "#ff1744",
  },

  // ── CONTACTS FRECUENTES ───────────────────────────────────────────────────
  {
    id: "C1", label: "EL BRAYAN", type: "contact",
    alias: "(a) El Brayan", phone: "+52 314 555-0291",
    imei: "864729031582940",
    instagram: "@brayan_rdgz", snapchat: "bray291snap",
    lat: 19.4410, lon: -99.1280, address: "Av. Insurgentes Sur 1234, CDMX",
    risk: 0.87, calls: 214, val: 14, color: "#ff1744",
    note: "Contacto de alto riesgo. 214 llamadas en 30 días.",
  },
  {
    id: "C2", label: "LA CHULETA", type: "contact",
    alias: "(a) La Chuleta", phone: "+52 314 555-0482",
    instagram: "@la.chuleta.mx",
    lat: 19.4200, lon: -99.1450, address: "Periférico Sur 3720, Tlalpan, CDMX",
    risk: 0.75, calls: 98, val: 12, color: "#ff6d00",
  },
  {
    id: "C3", label: "EL DIABLO", type: "contact",
    alias: "(a) El Diablo", phone: "+52 314 555-0731",
    tiktok: "@diablo_narco", snapchat: "diablo.0731",
    lat: 19.3900, lon: -99.1600, address: "Tepito, Cuauhtémoc, CDMX",
    risk: 0.91, calls: 176, val: 13, color: "#ff1744",
    note: "Perfil de extremo riesgo. 3 referencias cruzadas con FGR.",
  },
  {
    id: "C4", label: "EL PANTERA", type: "contact",
    alias: "(a) El Pantera", phone: "+52 314 555-1102",
    instagram: "@pantera_sombras",
    lat: 19.4100, lon: -99.1700, address: "Iztapalapa, CDMX",
    risk: 0.70, calls: 84, val: 10, color: "#ff6d00",
  },
  {
    id: "C5", label: "JIMENA", type: "contact",
    alias: "Jimena (familiar)", phone: "+52 314 555-2244",
    instagram: "@jimena.loves_life",
    lat: 19.4500, lon: -99.1200, address: "Coyoacán, CDMX",
    risk: 0.08, calls: 189, val: 9, color: "#00e676",
    note: "Contacto familiar. Bajo riesgo.",
  },
  {
    id: "C6", label: "LA JAROZA", type: "contact",
    alias: "(a) La Jaroza", phone: "+52 331 444-9810",
    tiktok: "@jarozareal", facebook: "jaroza.oficial",
    lat: 19.4360, lon: -99.1380, address: "Benito Juárez, CDMX",
    risk: 0.62, calls: 67, val: 10, color: "#ff6d00",
  },
  {
    id: "C7", label: "JUAN ANTONIO", type: "contact",
    alias: "Juan Antonio (detenido)", phone: "+52 314 555-3817",
    lat: 19.4150, lon: -99.1250, address: "Pedregal de Santo Domingo, CDMX",
    risk: 0.55, calls: 43, val: 8, color: "#ff6d00",
    note: "Mencionado en audio OJ510/2017. En custodia.",
  },
  {
    id: "C8", label: "OCTAVIO L.", type: "contact",
    alias: "Octavio Leal Moncada", phone: "+52 618 555-0042",
    instagram: "@octavio_lm",
    lat: 24.0277, lon: -104.6532, address: "San Carlos, Nuevo Ideal, Durango",
    risk: 0.96, calls: 58, val: 14, color: "#ff1744",
    note: "Jefe de la Columna Armada — cruce con RED DE VÍNCULOS.",
  },
  {
    id: "C9", label: "JULIO BECERRA", type: "contact",
    alias: "(a) Junior", phone: "+52 618 555-0188",
    lat: 24.0100, lon: -104.6700, address: "Ejido La Nueva Unión, Durango",
    risk: 0.89, calls: 34, val: 11, color: "#ff1744",
  },
  {
    id: "C10", label: "ROBERTO O.", type: "contact",
    alias: "Roberto Ornelas", phone: "+52 618 555-0293",
    lat: 24.0350, lon: -104.6410, address: "Ejido Barranca Azul, San Carlos",
    risk: 0.72, calls: 27, val: 9, color: "#ff6d00",
  },

  // ── REDES SOCIALES ─────────────────────────────────────────────────────────
  {
    id: "S1", label: "@el.kevin.official", type: "social",
    tiktok: "@el.kevin.official",
    note: "TikTok · 12.4K seguidores · contenido encriptado",
    risk: 0.60, calls: 0, val: 9, color: "#1e88e5",
  },
  {
    id: "S2", label: "@thekev_mx", type: "social",
    instagram: "@thekev_mx",
    note: "Instagram · Última publicación: mercado Tepito",
    risk: 0.55, calls: 0, val: 8, color: "#1e88e5",
  },
  {
    id: "S3", label: "@diablo_narco", type: "social",
    tiktok: "@diablo_narco",
    note: "TikTok · Contenido eliminado × 3. Verificado por MAXIMILIANO.",
    risk: 0.88, calls: 0, val: 10, color: "#1e88e5",
  },
  {
    id: "S4", label: "@jarozareal", type: "social",
    tiktok: "@jarozareal",
    note: "TikTok · Geotag frecuente: Benito Juárez",
    risk: 0.45, calls: 0, val: 7, color: "#1e88e5",
  },
  {
    id: "S5", label: "@brayan_rdgz", type: "social",
    instagram: "@brayan_rdgz",
    note: "Instagram · Fotos con C1 y C3",
    risk: 0.70, calls: 0, val: 8, color: "#1e88e5",
  },
  {
    id: "S6", label: "jaroza.oficial", type: "social",
    facebook: "jaroza.oficial",
    note: "Facebook · Grupo cerrado 'La Jugada'",
    risk: 0.50, calls: 0, val: 7, color: "#1e88e5",
  },

  // ── UBICACIONES ───────────────────────────────────────────────────────────
  {
    id: "L1", label: "DOMICILIO ALFA", type: "location",
    lat: 19.260601, lon: -99.105948,
    address: "Calle Las Rosas 123, Col. Las Rosas, Álvaro Obregón, CDMX",
    note: "Domicilio probable T1. Frecuencia: 13×",
    risk: 0.80, calls: 0, val: 8, color: "#00e676",
  },
  {
    id: "L2", label: "DOMICILIO BETA", type: "location",
    lat: 19.241290, lon: -99.070508,
    address: "Calle Jacrandas 23, Col. El Vergel, Xochimilco, CDMX",
    note: "Segunda residencia probable. Frecuencia: 5×",
    risk: 0.60, calls: 0, val: 7, color: "#00e676",
  },
  {
    id: "L3", label: "BAR CARIBE", type: "location",
    lat: 25.8701, lon: -97.5024,
    address: "Bar Caribe, Matamoros, Tamaulipas",
    note: "Punto de reunión. Mencionado en denuncia anónima.",
    risk: 0.78, calls: 0, val: 8, color: "#00e676",
  },
  {
    id: "L4", label: "LA TABERNA", type: "location",
    lat: 25.8750, lon: -97.5100,
    address: "La Taberna, Matamoros, Tamaulipas",
    note: "Secuestros en esta área. Caso 'Cheque'.",
    risk: 0.85, calls: 0, val: 9, color: "#ffeb3b",
  },
  {
    id: "L5", label: "CAFETERÍA JAROCHA", type: "location",
    lat: 19.3500, lon: -99.1622,
    address: "Coyoacán, CDMX",
    note: "Mapeo previo. Reunión confirmada.",
    risk: 0.65, calls: 0, val: 7, color: "#00e676",
  },
  {
    id: "L6", label: "PLAYA MIRAMAR", type: "location",
    lat: 22.2342, lon: -97.8612,
    address: "Playa Miramar, Ciudad Madero, Tamaulipas",
    note: "Mencionada en audio OJ510. Punto de entrega.",
    risk: 0.90, calls: 0, val: 9, color: "#ffeb3b",
  },

  // ── DISPOSITIVOS ─────────────────────────────────────────────────────────
  {
    id: "D1", label: "IMEI ALFA", type: "device",
    imei: "358572073461366",
    note: "iPhone 6S A1688. Asociado a T1. LAC 9007 / CellID 9384.",
    risk: 0.94, calls: 342, val: 8, color: "#c8a84b",
  },
  {
    id: "D2", label: "IMEI BETA", type: "device",
    imei: "864729031582940",
    note: "Samsung LTE. Asociado a C1. 214 registros.",
    risk: 0.87, calls: 214, val: 7, color: "#c8a84b",
  },
  {
    id: "D3", label: "IMEI GAMMA", type: "device",
    imei: "351756090941274",
    note: "Motorola G. Tercer dispositivo detectado en GEOLOCALIZACIÓN ZEUS.",
    risk: 0.70, calls: 98, val: 6, color: "#c8a84b",
  },

  // ── CONTACTOS ADICIONALES para alcanzar 30 nodos ─────────────────────────
  {
    id: "C11", label: "ANSELMO C.", type: "contact",
    alias: "Anselmo Cepeda", phone: "+52 618 555-0411",
    lat: 24.0480, lon: -104.6280,
    risk: 0.68, calls: 19, val: 7, color: "#ff6d00",
  },
  {
    id: "C12", label: "MARTIN F.", type: "contact",
    alias: "Martin Flores", phone: "+52 618 555-0533",
    lat: 24.0220, lon: -104.6590,
    risk: 0.66, calls: 15, val: 7, color: "#ff6d00",
  },
  {
    id: "C13", label: "CESA B.", type: "contact",
    alias: "(a) Junior y/o Becerra", phone: "+52 618 555-0640",
    tiktok: "@cesa_becerra_jr",
    lat: 24.0050, lon: -104.6820,
    risk: 0.80, calls: 22, val: 8, color: "#ff6d00",
  },
  {
    id: "C14", label: "JONATAN B.", type: "contact",
    alias: "(a) Jony y/o Junior", phone: "+52 618 555-0712",
    lat: 24.0160, lon: -104.6750,
    risk: 0.77, calls: 18, val: 7, color: "#ff6d00",
  },
  {
    id: "C15", label: "ABOGADO", type: "contact",
    phone: "+52 55 1234-5678",
    note: "Contacto legal. Referenciado en conversación.",
    risk: 0.25, calls: 31, val: 7, color: "#1e88e5",
  },
];

// ── Links ─────────────────────────────────────────────────────────────────────
export const LINKS: NetworkLink[] = [
  // T1 ↔ contacts
  { source: "T1", target: "C1",  weight: 214, label: "214 llamadas", color: "#ff174460" },
  { source: "T1", target: "C2",  weight: 98,  label: "98 llamadas",  color: "#ff6d0060" },
  { source: "T1", target: "C3",  weight: 176, label: "176 llamadas", color: "#ff174460" },
  { source: "T1", target: "C4",  weight: 84,  label: "84 llamadas",  color: "#ff6d0060" },
  { source: "T1", target: "C5",  weight: 189, label: "189 llamadas", color: "#00e67660" },
  { source: "T1", target: "C6",  weight: 67,  label: "67 llamadas",  color: "#ff6d0060" },
  { source: "T1", target: "C7",  weight: 43,  label: "43 llamadas",  color: "#ff6d0060" },
  { source: "T1", target: "C8",  weight: 58,  label: "58 llamadas",  color: "#ff174460" },
  { source: "T1", target: "C15", weight: 31,  label: "31 llamadas",  color: "#1e88e560" },
  // T1 ↔ social
  { source: "T1", target: "S1",  weight: 5,   label: "TikTok",       color: "#1e88e550" },
  { source: "T1", target: "S2",  weight: 5,   label: "Instagram",    color: "#1e88e550" },
  // T1 ↔ devices
  { source: "T1", target: "D1",  weight: 342, label: "IMEI principal", color: "#c8a84b60" },
  // T1 ↔ locations
  { source: "T1", target: "L1",  weight: 13,  label: "Domicilio probable",  color: "#00e67660" },
  { source: "T1", target: "L2",  weight: 5,   label: "Residencia alterna",  color: "#00e67650" },
  // C1 ↔ others
  { source: "C1", target: "C3",  weight: 88,  label: "Cruce directo",       color: "#ff174460" },
  { source: "C1", target: "S5",  weight: 4,   label: "Instagram",           color: "#1e88e550" },
  { source: "C1", target: "D2",  weight: 214, label: "IMEI asociado",       color: "#c8a84b60" },
  { source: "C1", target: "C4",  weight: 41,  label: "Cruce",               color: "#ff6d0050" },
  // C3 ↔ others
  { source: "C3", target: "S3",  weight: 5,   label: "TikTok",              color: "#1e88e550" },
  { source: "C3", target: "L4",  weight: 6,   label: "Zona La Taberna",     color: "#ffeb3b60" },
  { source: "C3", target: "C7",  weight: 21,  label: "Cruce",               color: "#ff6d0050" },
  // C6 ↔ social
  { source: "C6", target: "S4",  weight: 4,   label: "TikTok",              color: "#1e88e550" },
  { source: "C6", target: "S6",  weight: 3,   label: "Facebook grupo",      color: "#1e88e540" },
  // C8 Columna Armada
  { source: "C8", target: "C9",  weight: 34,  label: "Mando directo",       color: "#ff174460" },
  { source: "C8", target: "C10", weight: 27,  label: "Subordinado",         color: "#ff6d0060" },
  { source: "C8", target: "C11", weight: 19,  label: "Subordinado",         color: "#ff6d0050" },
  { source: "C8", target: "C12", weight: 15,  label: "Subordinado",         color: "#ff6d0050" },
  { source: "C8", target: "L3",  weight: 8,   label: "Bar Caribe",          color: "#00e67650" },
  { source: "C9", target: "C13", weight: 22,  label: "Mando C9→C13",        color: "#ff6d0060" },
  { source: "C9", target: "C14", weight: 18,  label: "Mando C9→C14",        color: "#ff6d0060" },
  // Locations
  { source: "C3", target: "L6",  weight: 5,   label: "Playa Miramar",       color: "#ff6d0050" },
  { source: "C1", target: "L6",  weight: 4,   label: "Punto de entrega",    color: "#ff6d0050" },
  { source: "T1", target: "L5",  weight: 3,   label: "Cafetería Jarocha",   color: "#00e67640" },
  // C5 family chain
  { source: "C5", target: "L1",  weight: 4,   label: "Misma zona",          color: "#00e67640" },
  // Device associations
  { source: "C3", target: "D3",  weight: 98,  label: "IMEI GAMMA",          color: "#c8a84b50" },
  { source: "C8", target: "D3",  weight: 12,  label: "Dispositivo compartido", color: "#c8a84b50" },
];

// ── Call records (35 records) ──────────────────────────────────────────────────
export const CALL_RECORDS: CallRecord[] = [
  { id: "CR001", from: "T1",  to: "C1",  date: "2017-04-15", time: "18:34", duration: 127, type: "VOZ",  direction: "saliente", cellId: "9384", lat: 19.4326, lon: -99.1332 },
  { id: "CR002", from: "T1",  to: "C1",  date: "2017-04-15", time: "22:44", duration: 213, type: "VOZ",  direction: "saliente", cellId: "9384" },
  { id: "CR003", from: "T1",  to: "C3",  date: "2017-04-15", time: "22:50", duration: 184, type: "VOZ",  direction: "saliente", cellId: "9384" },
  { id: "CR004", from: "C1",  to: "T1",  date: "2017-04-16", time: "01:12", duration: 89,  type: "WAPP", direction: "entrante"  },
  { id: "CR005", from: "T1",  to: "C2",  date: "2017-04-16", time: "08:30", duration: 45,  type: "SMS",  direction: "saliente"  },
  { id: "CR006", from: "T1",  to: "C5",  date: "2017-04-15", time: "18:34", duration: 62,  type: "VOZ",  direction: "saliente"  },
  { id: "CR007", from: "C3",  to: "T1",  date: "2017-04-16", time: "23:10", duration: 97,  type: "VOZ",  direction: "entrante"  },
  { id: "CR008", from: "T1",  to: "C4",  date: "2017-04-17", time: "09:15", duration: 210, type: "VOZ",  direction: "saliente"  },
  { id: "CR009", from: "T1",  to: "C8",  date: "2026-10-01", time: "20:00", duration: 310, type: "VOZ",  direction: "saliente"  },
  { id: "CR010", from: "C8",  to: "C9",  date: "2026-10-02", time: "14:22", duration: 154, type: "VOZ",  direction: "saliente"  },
  { id: "CR011", from: "T1",  to: "C6",  date: "2026-10-03", time: "21:45", duration: 88,  type: "WAPP", direction: "saliente"  },
  { id: "CR012", from: "C1",  to: "C3",  date: "2026-10-04", time: "02:30", duration: 400, type: "VOZ",  direction: "saliente"  },
  { id: "CR013", from: "T1",  to: "C7",  date: "2026-10-04", time: "11:00", duration: 55,  type: "SMS",  direction: "saliente"  },
  { id: "CR014", from: "C3",  to: "C7",  date: "2026-10-04", time: "11:45", duration: 123, type: "VOZ",  direction: "saliente"  },
  { id: "CR015", from: "T1",  to: "C15", date: "2026-10-05", time: "09:00", duration: 190, type: "VOZ",  direction: "saliente"  },
  { id: "CR016", from: "C8",  to: "C10", date: "2026-10-05", time: "18:30", duration: 240, type: "VOZ",  direction: "saliente"  },
  { id: "CR017", from: "C8",  to: "C11", date: "2026-10-06", time: "10:15", duration: 175, type: "VOZ",  direction: "saliente"  },
  { id: "CR018", from: "C8",  to: "C12", date: "2026-10-06", time: "12:00", duration: 142, type: "VOZ",  direction: "saliente"  },
  { id: "CR019", from: "C9",  to: "C13", date: "2026-10-07", time: "15:30", duration: 188, type: "WAPP", direction: "saliente"  },
  { id: "CR020", from: "C9",  to: "C14", date: "2026-10-07", time: "16:15", duration: 160, type: "VOZ",  direction: "saliente"  },
  { id: "CR021", from: "T1",  to: "C1",  date: "2026-10-08", time: "03:22", duration: 280, type: "VOZ",  direction: "saliente"  },
  { id: "CR022", from: "C1",  to: "C4",  date: "2026-10-08", time: "08:44", duration: 95,  type: "VOZ",  direction: "saliente"  },
  { id: "CR023", from: "T1",  to: "C3",  date: "2026-10-09", time: "23:58", duration: 345, type: "VOZ",  direction: "saliente"  },
  { id: "CR024", from: "T1",  to: "C5",  date: "2026-10-10", time: "19:00", duration: 73,  type: "VOZ",  direction: "saliente"  },
  { id: "CR025", from: "C3",  to: "C1",  date: "2026-10-10", time: "22:14", duration: 191, type: "WAPP", direction: "saliente"  },
  { id: "CR026", from: "T1",  to: "C2",  date: "2026-10-11", time: "07:30", duration: 38,  type: "SMS",  direction: "saliente"  },
  { id: "CR027", from: "T1",  to: "C8",  date: "2026-10-11", time: "20:50", duration: 270, type: "VOZ",  direction: "saliente"  },
  { id: "CR028", from: "C8",  to: "T1",  date: "2026-10-12", time: "09:10", duration: 130, type: "VOZ",  direction: "entrante"  },
  { id: "CR029", from: "T1",  to: "C6",  date: "2026-10-13", time: "01:05", duration: 165, type: "WAPP", direction: "saliente"  },
  { id: "CR030", from: "C4",  to: "T1",  date: "2026-10-14", time: "14:30", duration: 82,  type: "VOZ",  direction: "entrante"  },
  { id: "CR031", from: "T1",  to: "C1",  date: "2026-10-15", time: "04:11", duration: 430, type: "VOZ",  direction: "saliente", lat: 19.260601, lon: -99.105948 },
  { id: "CR032", from: "C8",  to: "C9",  date: "2026-10-15", time: "11:00", duration: 200, type: "VOZ",  direction: "saliente"  },
  { id: "CR033", from: "T1",  to: "C4",  date: "2026-10-16", time: "18:45", duration: 110, type: "VOZ",  direction: "saliente"  },
  { id: "CR034", from: "C1",  to: "C3",  date: "2026-10-17", time: "23:30", duration: 380, type: "WAPP", direction: "saliente"  },
  { id: "CR035", from: "T1",  to: "C7",  date: "2026-10-18", time: "10:00", duration: 55,  type: "SMS",  direction: "saliente"  },
];

// ── Social posts timeline ─────────────────────────────────────────────────────
export const SOCIAL_POSTS: SocialPost[] = [
  { id: "SP001", nodeId: "T1", platform: "TikTok",    date: "2026-10-01T20:15:00", content: "No sé por qué siguen buscando a Juan 😂", location: "CDMX", relevant: true },
  { id: "SP002", nodeId: "S3", platform: "TikTok",    date: "2026-10-02T01:30:00", content: "La jugada sigue en pie. Sin miedo. 🎯", relevant: true },
  { id: "SP003", nodeId: "C5", platform: "Instagram", date: "2026-10-03T12:00:00", content: "Tarde de café ☕ #coyoacan", location: "Coyoacán, CDMX", relevant: false },
  { id: "SP004", nodeId: "C6", platform: "TikTok",    date: "2026-10-04T22:00:00", content: "Los carreras de caballos del sábado 🐎 #sanluis", relevant: true },
  { id: "SP005", nodeId: "T1", platform: "Instagram", date: "2026-10-05T18:30:00", content: "Vista al atardecer desde mi lugar 🌅", location: "Xochimilco", relevant: true },
  { id: "SP006", nodeId: "S4", platform: "TikTok",    date: "2026-10-06T21:00:00", content: "Contenido eliminado por plataforma", relevant: true },
  { id: "SP007", nodeId: "C1", platform: "Instagram", date: "2026-10-07T15:45:00", content: "Reunión exitosa. Todo en orden 🙏", relevant: true },
  { id: "SP008", nodeId: "C13",platform: "Snapchat",  date: "2026-10-08T03:20:00", content: "Llegamos a Miramar. Todo limpio. 💯", location: "Tamaulipas", relevant: true },
  { id: "SP009", nodeId: "T1", platform: "TikTok",    date: "2026-10-09T23:00:00", content: "Noche tranquila 🌙 #vigilantes", relevant: false },
  { id: "SP010", nodeId: "S3", platform: "TikTok",    date: "2026-10-10T00:30:00", content: "Para los que quieren saber quién soy 🔥 [eliminado]", relevant: true },
  { id: "SP011", nodeId: "C6", platform: "Facebook",  date: "2026-10-11T10:00:00", content: "Grupo privado — acceso denegado a consulta OSINT", relevant: true },
  { id: "SP012", nodeId: "C5", platform: "Instagram", date: "2026-10-12T14:30:00", content: "Familia reunida 💕 #familia", relevant: false },
  { id: "SP013", nodeId: "T1", platform: "Instagram", date: "2026-10-15T21:00:00", content: "Nuevo teléfono, mismo número 📱 [geotag eliminado]", relevant: true },
  { id: "SP014", nodeId: "C8", platform: "Instagram", date: "2026-10-16T19:00:00", content: "Los negocios fluyen en el norte 🌵", location: "Durango", relevant: true },
  { id: "SP015", nodeId: "C1", platform: "Snapchat",  date: "2026-10-17T04:00:00", content: "Snap eliminado 4h después — capturado por SANTI", relevant: true },
];

// ── Helper: get call records for a specific node ──────────────────────────────
export function getCallsForNode(nodeId: string): CallRecord[] {
  return CALL_RECORDS.filter((r) => r.from === nodeId || r.to === nodeId)
    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
}

// ── Helper: get social posts for a specific node ──────────────────────────────
export function getPostsForNode(nodeId: string): SocialPost[] {
  return SOCIAL_POSTS.filter((p) => p.nodeId === nodeId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ── All timeline events merged + sorted ──────────────────────────────────────
export interface TimelineEvent {
  id:        string;
  date:      string;   // ISO
  type:      "call" | "social" | "location";
  nodeId:    string;
  label:     string;
  detail:    string;
  color:     string;
  relevant:  boolean;
}

export function buildTimeline(): TimelineEvent[] {
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const events: TimelineEvent[] = [];

  CALL_RECORDS.forEach((r) => {
    const src  = nodeMap.get(r.from);
    const dst  = nodeMap.get(r.to);
    const dtStr = `${r.date}T${r.time}:00`;
    events.push({
      id:       `TL-C-${r.id}`,
      date:     dtStr,
      type:     "call",
      nodeId:   r.from,
      label:    `${src?.alias ?? src?.label ?? r.from} → ${dst?.alias ?? dst?.label ?? r.to}`,
      detail:   `${r.type} · ${r.duration}s · ${r.direction}`,
      color:    src?.color ?? "#00ffcc",
      relevant: r.type === "VOZ" && r.duration > 120,
    });
  });

  SOCIAL_POSTS.forEach((p) => {
    const node = nodeMap.get(p.nodeId);
    events.push({
      id:       `TL-S-${p.id}`,
      date:     p.date,
      type:     "social",
      nodeId:   p.nodeId,
      label:    `${node?.alias ?? node?.label ?? p.nodeId} — ${p.platform}`,
      detail:   p.content,
      color:    "#1e88e5",
      relevant: p.relevant,
    });
  });

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
