/**
 * CasesView.tsx — SANTI NEXUS · Ciclo de Inteligencia
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestión de carpetas virtuales por tipo de delito.
 * Cada folio generado por AgenteAvatar o ingresado manualmente queda registrado
 * aquí, clasificado por categoría, con filtros activos y estado de seguimiento.
 *
 * ZERO TRUST: no toca server.js, no toca .env.
 */

import React, { useState, useMemo, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type CrimeCategory =
  | "extorsion"
  | "violencia"
  | "feminicidio"
  | "menores"
  | "secuestro"
  | "narcomenudeo"
  | "robo"
  | "homicidio"
  | "bullying"
  | "otro";

export interface CaseRecord {
  folio:     string;
  category:  CrimeCategory;
  keyword:   string;
  agency:    string;
  unit:      string;
  status:    "abierto" | "en_proceso" | "cerrado" | "escalado";
  analyst:   string;
  timestamp: string;
  notes:     string;
  hash?:     string;
}

// ── Category catalog ─────────────────────────────────────────────────────────
const CATEGORIES: Array<{ id: CrimeCategory; label: string; color: string; icon: string }> = [
  { id: "extorsion",    label: "Extorsión",         color: "#ff6d00", icon: "💰" },
  { id: "violencia",    label: "Violencia",          color: "#ff1744", icon: "⚡" },
  { id: "feminicidio",  label: "Feminicidio / Género", color: "#e91e8c", icon: "🦋" },
  { id: "menores",      label: "Abuso de Menores",  color: "#9c27b0", icon: "🛡️" },
  { id: "secuestro",    label: "Secuestro",          color: "#b71c1c", icon: "⛓️" },
  { id: "narcomenudeo", label: "Narcomenudeo",       color: "#4a148c", icon: "💊" },
  { id: "robo",         label: "Robo",               color: "#c8a84b", icon: "🔓" },
  { id: "homicidio",    label: "Homicidio",          color: "#37474f", icon: "🔎" },
  { id: "bullying",     label: "Bullying / Escolar", color: "#00897b", icon: "🏫" },
  { id: "otro",         label: "Otro",               color: "#00ffcc", icon: "📋" },
];

const CAT_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

// ── Status labels ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<CaseRecord["status"], string> = {
  abierto:    "#c8a84b",
  en_proceso: "#00e5ff",
  cerrado:    "#3a6a5a",
  escalado:   "#ff1744",
};
const STATUS_LABELS: Record<CaseRecord["status"], string> = {
  abierto:    "Abierto",
  en_proceso: "En proceso",
  cerrado:    "Cerrado",
  escalado:   "Escalado",
};

// ── SHA-256 helper ────────────────────────────────────────────────────────────
async function sha256Hex(data: string): Promise<string> {
  const buf    = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Folio generator ───────────────────────────────────────────────────────────
let _seq = 0;
function newFolio(cat: CrimeCategory): string {
  _seq++;
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `FOLIO-${cat.toUpperCase().slice(0, 4)}-${year}-${String(_seq).padStart(4, "0")}${rand}`;
}

// ── Seed data (demo — replaced by real folios from agent alerts) ──────────────
const SEED: CaseRecord[] = [
  {
    folio: "FOLIO-EXTO-2026-00011234", category: "extorsion",
    keyword: "extorsión", agency: "FGR / Unidad Antiextorsión",
    unit: "Agente Ministerial", status: "en_proceso",
    analyst: "Analista SANTI", timestamp: "2026-11-07T09:14:00Z",
    notes: "Víctima comerciante. Llamada desde número desechable. Sábana en proceso.",
  },
  {
    folio: "FOLIO-FEMI-2026-00025678", category: "feminicidio",
    keyword: "feminicidio", agency: "FGJ / Fiscalía Género",
    unit: "Unidad Género UIEEMPA", status: "escalado",
    analyst: "Analista SANTI", timestamp: "2026-11-06T22:30:00Z",
    notes: "Caso vinculado a Columna Armada. Requiere coordinación con UNODC.",
  },
  {
    folio: "FOLIO-BULL-2026-00039012", category: "bullying",
    keyword: "bullying", agency: "SEP / CNPJ Escuela Segura",
    unit: "Orientador Especializado", status: "abierto",
    analyst: "Analista SANTI", timestamp: "2026-11-08T08:05:00Z",
    notes: "Escuela primaria. Tres menores involucrados. Padres notificados.",
  },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes cases-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .case-escalado { animation: cases-pulse 1.2s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

// ── Component ─────────────────────────────────────────────────────────────────
export const CasesView: React.FC = () => {
  const [cases,      setCases]      = useState<CaseRecord[]>(SEED);
  const [filter,     setFilter]     = useState<CrimeCategory | "all">("all");
  const [statusFilt, setStatusFilt] = useState<CaseRecord["status"] | "all">("all");
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<CaseRecord | null>(null);
  const [showForm,   setShowForm]   = useState(false);

  // ── New case form state ────────────────────────────────────────────────────
  const [fmCat,     setFmCat]     = useState<CrimeCategory>("otro");
  const [fmKeyword, setFmKeyword] = useState("");
  const [fmAgency,  setFmAgency]  = useState("");
  const [fmUnit,    setFmUnit]    = useState("");
  const [fmAnalyst, setFmAnalyst] = useState("");
  const [fmNotes,   setFmNotes]   = useState("");

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (filter     !== "all" && c.category !== filter)    return false;
      if (statusFilt !== "all" && c.status   !== statusFilt) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.folio.toLowerCase().includes(q) &&
            !c.keyword.toLowerCase().includes(q) &&
            !c.agency.toLowerCase().includes(q) &&
            !c.notes.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [cases, filter, statusFilt, search]);

  // ── Category counts ───────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: cases.length };
    for (const c of cases) m[c.category] = (m[c.category] ?? 0) + 1;
    return m;
  }, [cases]);

  // ── Add case ──────────────────────────────────────────────────────────────
  const addCase = useCallback(async () => {
    if (!fmKeyword.trim() || !fmAgency.trim() || !fmAnalyst.trim()) {
      alert("Completa Palabra Clave, Dependencia y Analista.");
      return;
    }
    const folio = newFolio(fmCat);
    const ts    = new Date().toISOString();
    const hash  = await sha256Hex(`${folio}|${fmAnalyst}|${ts}`);
    const rec: CaseRecord = {
      folio, category: fmCat, keyword: fmKeyword.trim(),
      agency: fmAgency.trim(), unit: fmUnit.trim() || "—",
      status: "abierto", analyst: fmAnalyst.trim(),
      timestamp: ts, notes: fmNotes.trim(), hash,
    };
    setCases((prev) => [rec, ...prev]);
    setFmKeyword(""); setFmAgency(""); setFmUnit(""); setFmAnalyst(""); setFmNotes("");
    setShowForm(false);
    console.info(`[SANTI NEXUS] Carpeta creada: ${folio} · Delito: ${rec.keyword} · Analista: ${rec.analyst}`);
    fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CARPETA_CREADA", folio, category: fmCat, analyst: fmAnalyst, timestamp: ts }),
    }).catch(() => {});
  }, [fmCat, fmKeyword, fmAgency, fmUnit, fmAnalyst, fmNotes]);

  // ── Update status ─────────────────────────────────────────────────────────
  const updateStatus = (folio: string, status: CaseRecord["status"]) => {
    setCases((prev) => prev.map((c) => c.folio === folio ? { ...c, status } : c));
    if (selected?.folio === folio) setSelected((s) => s ? { ...s, status } : null);
  };

  const inputSt: React.CSSProperties = {
    padding: "8px 10px", background: "rgba(0,20,12,0.8)",
    border: "1px solid rgba(0,255,200,0.2)", borderRadius: 6,
    color: "#e0ffe8", fontFamily: "monospace", fontSize: 10, outline: "none",
  };

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      backgroundColor: "#020810", color: "#e0ffe8", fontFamily: "monospace",
    }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "10px 16px", borderBottom: "1px solid rgba(0,255,200,0.1)",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <h2 style={{ color: "#00ffcc", fontSize: 11, letterSpacing: "3px", margin: 0 }}>
          📂 CICLO DE INTELIGENCIA · CARPETAS DE CASO
        </h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              padding: "5px 12px", borderRadius: 6, cursor: "pointer",
              background: showForm ? "rgba(0,255,200,0.18)" : "rgba(0,255,200,0.07)",
              border: "1px solid rgba(0,255,200,0.35)",
              color: "#00ffcc", fontFamily: "monospace", fontSize: 9, letterSpacing: "1px",
            }}
          >
            {showForm ? "✕ CANCELAR" : "+ NUEVA CARPETA"}
          </button>
        </div>
      </div>

      {/* ── New case form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid rgba(0,255,200,0.08)",
          background: "rgba(0,255,200,0.03)",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 8,
        }}>
          <select value={fmCat} onChange={(e) => setFmCat(e.target.value as CrimeCategory)} style={inputSt}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
          <input value={fmKeyword} onChange={(e) => setFmKeyword(e.target.value)} placeholder="Palabra clave del delito" style={inputSt} />
          <input value={fmAgency}  onChange={(e) => setFmAgency(e.target.value)}  placeholder="Dependencia (FGR, SSPC...)" style={inputSt} />
          <input value={fmUnit}    onChange={(e) => setFmUnit(e.target.value)}    placeholder="Tipo de unidad" style={inputSt} />
          <input value={fmAnalyst} onChange={(e) => setFmAnalyst(e.target.value)} placeholder="Analista responsable" style={inputSt} />
          <input value={fmNotes}   onChange={(e) => setFmNotes(e.target.value)}   placeholder="Notas iniciales" style={inputSt} />
          <button
            onClick={addCase}
            style={{
              gridColumn: "1 / -1", padding: "9px", borderRadius: 6, cursor: "pointer",
              background: "rgba(0,255,200,0.12)", border: "1px solid rgba(0,255,200,0.4)",
              color: "#00ffcc", fontFamily: "monospace", fontWeight: "bold", fontSize: 10,
            }}
          >
            REGISTRAR CARPETA →
          </button>
        </div>
      )}

      {/* ── Category sidebar + main ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar: category folders */}
        <div style={{
          width: 180, borderRight: "1px solid rgba(0,255,200,0.08)",
          overflowY: "auto", padding: "10px 8px", flexShrink: 0,
        }}>
          <p style={{ color: "#3a6a5a", fontSize: 8, letterSpacing: "1.5px", margin: "0 0 8px" }}>
            CARPETAS POR DELITO
          </p>

          {/* All */}
          <button
            onClick={() => setFilter("all")}
            style={{
              width: "100%", padding: "7px 10px", marginBottom: 4, borderRadius: 6, cursor: "pointer",
              textAlign: "left", fontFamily: "monospace", fontSize: 9,
              background: filter === "all" ? "rgba(0,255,200,0.12)" : "transparent",
              border: `1px solid ${filter === "all" ? "rgba(0,255,200,0.4)" : "rgba(0,255,200,0.06)"}`,
              color: filter === "all" ? "#00ffcc" : "#3a6a5a",
              display: "flex", justifyContent: "space-between",
            }}
          >
            <span>📁 TODOS</span>
            <span style={{ background: "rgba(0,255,200,0.1)", borderRadius: 10, padding: "0 5px" }}>
              {counts["all"] ?? 0}
            </span>
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              style={{
                width: "100%", padding: "7px 10px", marginBottom: 4, borderRadius: 6, cursor: "pointer",
                textAlign: "left", fontFamily: "monospace", fontSize: 9,
                background: filter === cat.id ? `${cat.color}14` : "transparent",
                border: `1px solid ${filter === cat.id ? cat.color + "50" : "rgba(0,255,200,0.06)"}`,
                color: filter === cat.id ? cat.color : "#3a6a5a",
                display: "flex", justifyContent: "space-between",
              }}
            >
              <span>{cat.icon} {cat.label}</span>
              {(counts[cat.id] ?? 0) > 0 && (
                <span style={{ background: `${cat.color}20`, borderRadius: 10, padding: "0 5px", color: cat.color }}>
                  {counts[cat.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main: case list + detail */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Case list */}
          <div style={{ flex: "0 0 55%", overflowY: "auto", padding: "10px 12px", borderRight: "1px solid rgba(0,255,200,0.06)" }}>

            {/* Filters row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar folio, delito, dependencia…"
                style={{ ...inputSt, flex: 1, minWidth: 160 }}
              />
              <select
                value={statusFilt}
                onChange={(e) => setStatusFilt(e.target.value as CaseRecord["status"] | "all")}
                style={inputSt}
              >
                <option value="all">Todos los estados</option>
                <option value="abierto">Abierto</option>
                <option value="en_proceso">En proceso</option>
                <option value="escalado">Escalado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>

            {filtered.length === 0 && (
              <p style={{ color: "#3a6a5a", fontSize: 9, marginTop: 24, textAlign: "center" }}>
                Sin resultados. Ajusta los filtros.
              </p>
            )}

            {filtered.map((c) => {
              const cat  = CAT_MAP.get(c.category);
              const col  = cat?.color ?? "#00ffcc";
              const isEsc = c.status === "escalado";
              return (
                <div
                  key={c.folio}
                  onClick={() => setSelected(c)}
                  className={isEsc ? "case-escalado" : ""}
                  style={{
                    padding: "10px 12px", marginBottom: 8, borderRadius: 8, cursor: "pointer",
                    background: selected?.folio === c.folio ? `${col}14` : `${col}06`,
                    border: `1px solid ${selected?.folio === c.folio ? col : col + "25"}`,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <code style={{ color: col, fontSize: 8 }}>{c.folio}</code>
                    <span style={{
                      padding: "2px 7px", borderRadius: 10, fontSize: 7,
                      background: `${STATUS_COLORS[c.status]}20`,
                      border: `1px solid ${STATUS_COLORS[c.status]}50`,
                      color: STATUS_COLORS[c.status],
                    }}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <p style={{ color: col, fontSize: 9, margin: "0 0 2px", fontWeight: "bold" }}>
                    {cat?.icon} {c.keyword.toUpperCase()}
                  </p>
                  <p style={{ color: "#4a8a6a", fontSize: 8, margin: 0 }}>
                    {c.agency} · {c.timestamp.slice(0, 10)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {!selected ? (
              <p style={{ color: "#2a4a3a", fontSize: 9, marginTop: 40, textAlign: "center" }}>
                Selecciona una carpeta para ver el detalle.
              </p>
            ) : (() => {
              const cat = CAT_MAP.get(selected.category)!;
              return (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <h3 style={{ color: cat.color, fontSize: 11, letterSpacing: "2px", margin: 0 }}>
                      {cat.icon} CARPETA DE CASO
                    </h3>
                    <button
                      onClick={() => setSelected(null)}
                      style={{ background: "none", border: "none", color: "#3a6a5a", cursor: "pointer", fontSize: 14 }}
                    >✕</button>
                  </div>

                  {/* Folio + hash */}
                  <div style={{ padding: "10px 12px", borderRadius: 8, background: `${cat.color}08`, border: `1px solid ${cat.color}25`, marginBottom: 10 }}>
                    <p style={{ color: "#3a6a5a", fontSize: 8, letterSpacing: "1px", margin: "0 0 4px" }}>FOLIO</p>
                    <code style={{ color: cat.color, fontSize: 10, wordBreak: "break-all" }}>{selected.folio}</code>
                    {selected.hash && (
                      <p style={{ color: "#2a4a3a", fontSize: 7, margin: "4px 0 0", wordBreak: "break-all" }}>
                        SHA-256: {selected.hash}
                      </p>
                    )}
                  </div>

                  {/* Details grid */}
                  {[
                    ["Delito", selected.keyword.toUpperCase()],
                    ["Categoría", `${cat.icon} ${cat.label}`],
                    ["Dependencia", selected.agency],
                    ["Unidad asignada", selected.unit],
                    ["Analista", selected.analyst],
                    ["Timestamp", selected.timestamp.replace("T", " ").slice(0, 19)],
                  ].map(([label, value]) => (
                    <div key={label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      padding: "5px 0", borderBottom: "1px solid rgba(0,255,200,0.05)",
                    }}>
                      <span style={{ color: "#3a6a5a", fontSize: 8, flexShrink: 0, minWidth: 100 }}>{label}</span>
                      <span style={{ color: "#c8ffdc", fontSize: 9, textAlign: "right" }}>{value}</span>
                    </div>
                  ))}

                  {/* Notes */}
                  <div style={{ marginTop: 10 }}>
                    <p style={{ color: "#3a6a5a", fontSize: 8, letterSpacing: "1px", margin: "0 0 4px" }}>NOTAS</p>
                    <p style={{ color: "#8aa", fontSize: 9, lineHeight: 1.6, margin: 0 }}>
                      {selected.notes || "Sin notas."}
                    </p>
                  </div>

                  {/* Status change */}
                  <div style={{ marginTop: 14 }}>
                    <p style={{ color: "#3a6a5a", fontSize: 8, letterSpacing: "1px", margin: "0 0 6px" }}>
                      ACTUALIZAR ESTADO
                    </p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(["abierto", "en_proceso", "escalado", "cerrado"] as CaseRecord["status"][]).map((st) => (
                        <button
                          key={st}
                          onClick={() => updateStatus(selected.folio, st)}
                          style={{
                            padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                            background: selected.status === st ? `${STATUS_COLORS[st]}20` : "transparent",
                            border: `1px solid ${STATUS_COLORS[st]}50`,
                            color: STATUS_COLORS[st],
                            fontFamily: "monospace", fontSize: 8,
                          }}
                        >
                          {STATUS_LABELS[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
