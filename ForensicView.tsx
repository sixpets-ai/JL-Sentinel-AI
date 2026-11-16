import React, { useState, useRef, useEffect } from "react";

// ── CSS injected once ────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes node-pulse { 0%,100%{r:10} 50%{r:13} }
    @keyframes edge-dash { to{stroke-dashoffset:-24} }
    @keyframes scan-line {
      0%{transform:translateY(0%)} 100%{transform:translateY(100%)}
    }
    @keyframes bayes-fill { from{width:0%} to{width:var(--w)} }
    .forensic-node { animation: node-pulse 2.2s ease-in-out infinite; }
    .forensic-edge { animation: edge-dash 1.2s linear infinite; }
    .scan-overlay  { animation: scan-line 3s linear infinite; }
    @keyframes forensic-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .forensic-card { animation: forensic-in 0.3s ease-out both; }
  `;
  document.head.appendChild(s);
}

// ── Simulated forensic dataset ───────────────────────────────────────────────
// All data is fictional — educational simulation only.
const TARGET = {
  number: "+52 777 XXX-4821",
  alias: "OBJETIVO-ALFA",
  zone: "Cuernavaca Norte",
  pernocta: [[18.9310, -99.2300], [18.9180, -99.2100]],
  risk: 0.874,
};

const CONTACTS: Array<{
  id: string; label: string; role: string; calls: number; color: string;
  x: number; y: number; risk: number;
}> = [
  { id: "A", label: "MADRE",     role: "Familiar",        calls: 142, color: "#00e676", x: 180, y: 90,  risk: 0.05 },
  { id: "B", label: "PADRE",     role: "Familiar",        calls: 98,  color: "#00e5ff", x: 310, y: 90,  risk: 0.07 },
  { id: "C", label: "SOCIO-1",   role: "Socio comercial", calls: 67,  color: "#c8a84b", x: 420, y: 190, risk: 0.42 },
  { id: "D", label: "SOCIO-2",   role: "Socio comercial", calls: 55,  color: "#ff6d00", x: 420, y: 290, risk: 0.61 },
  { id: "E", label: "ABOGADO",   role: "Legal",           calls: 34,  color: "#7c4dff", x: 310, y: 360, risk: 0.18 },
  { id: "F", label: "DESCONOCIDO", role: "Sin registro",  calls: 21,  color: "#ff1744", x: 180, y: 360, risk: 0.88 },
];

const TARGET_POS = { x: 300, y: 225 };

const BAYESIAN: Array<{ label: string; value: number; color: string }> = [
  { label: "Probabilidad de localización",         value: 0.874, color: "#00ffcc" },
  { label: "Red de complicidad (p)",                value: 0.612, color: "#ff6d00" },
  { label: "Cruce OSINT positivo",                  value: 0.790, color: "#c8a84b" },
  { label: "Patrón de pernocta consistente",        value: 0.930, color: "#00e676" },
  { label: "Anomalía en sábana (llamadas nocturnas)",value: 0.543, color: "#ff4fc8" },
  { label: "Índice cuántico de riesgo (IQR)",       value: 0.874, color: "#7c4dff" },
];

// ── ForensicView ─────────────────────────────────────────────────────────────
export const ForensicView = () => {
  const [selected, setSelected] = useState<typeof CONTACTS[0] | null>(null);
  const [analysisLog, setAnalysisLog] = useState<string[]>([
    "[00:00:01] Iniciando análisis de sábana telefónica…",
    "[00:00:02] Cargando base OSINT · 1,450 nodos verificados.",
    "[00:00:03] Cruces con FGR y CNDH completados.",
    "[00:00:04] Motor Bayesiano inicializado. IQR: 0.874.",
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [analysisLog]);

  const runDeep = (c: typeof CONTACTS[0]) => {
    setSelected(c);
    setAnalysisLog((l) => [
      ...l,
      `[${new Date().toLocaleTimeString("es-MX")}] Analizando nodo: ${c.label} (${c.role}) — ${c.calls} llamadas.`,
      `[${new Date().toLocaleTimeString("es-MX")}] Índice de riesgo Bayesiano: ${(c.risk * 100).toFixed(1)}%.`,
      `[${new Date().toLocaleTimeString("es-MX")}] ${c.risk > 0.5 ? "⚠️ NODO DE ALTO RIESGO — Escalar a MAXIMILIANO." : "✅ Nodo de bajo riesgo. Sin escalamiento requerido."}`,
    ]);
  };

  return (
    <div style={{
      height: "100vh", display: "flex", backgroundColor: "#020810",
      color: "#e0ffe8", fontFamily: "monospace", overflow: "hidden",
      flexWrap: "wrap" as const,
    }}>

      {/* ── Left: Network graph ──────────────────────────────────────────── */}
      <div style={{
        flex: "1 1 480px", position: "relative", minHeight: "400px",
        background: "rgba(0,4,12,0.98)",
        border: "1px solid rgba(0,255,200,0.08)",
      }}>
        {/* HUD header */}
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 10,
          fontSize: "8px", letterSpacing: "2px", color: "#00ffcc60",
        }}>
          ANÁLISIS FORENSE · RED TÉCNICA · SÁBANA TELEFÓNICA
        </div>

        {/* Scan line overlay */}
        <div className="scan-overlay" style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "4px",
          background: "linear-gradient(0deg, transparent 0%, rgba(0,255,200,0.12) 50%, transparent 100%)",
          pointerEvents: "none", zIndex: 5,
        }} />

        <svg width="100%" height="100%" viewBox="0 0 600 450" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="target-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00ffcc" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Dashed animation for search radius ring */}
            <style>{`
              @keyframes radius-spin {
                from { stroke-dashoffset: 0; }
                to   { stroke-dashoffset: -60; }
              }
              .radius-ring { animation: radius-spin 6s linear infinite; }
            `}</style>
          </defs>

          {/* Grid lines */}
          {[0,1,2,3,4,5].map((i) => (
            <line key={`gh${i}`} x1="0" y1={i*90} x2="600" y2={i*90} stroke="#00ffcc08" strokeWidth="1" />
          ))}
          {[0,1,2,3,4,5,6].map((i) => (
            <line key={`gv${i}`} x1={i*100} y1="0" x2={i*100} y2="450" stroke="#00ffcc08" strokeWidth="1" />
          ))}

          {/* ── Search radius 150 m — visual ring around target ──────────── */}
          {/* In SVG-space: 150 m ≈ 88 px at this scale (viewBox 600×450 ≈ 1 700 m wide) */}
          {/* Outer fill — very faint */}
          <circle
            cx={TARGET_POS.x} cy={TARGET_POS.y} r="88"
            fill="rgba(255,215,0,0.04)"
            stroke="none"
          />
          {/* Animated dashed perimeter */}
          <circle
            className="radius-ring"
            cx={TARGET_POS.x} cy={TARGET_POS.y} r="88"
            fill="none"
            stroke="#ffd700"
            strokeWidth="1.5"
            strokeDasharray="10 6"
            strokeOpacity="0.55"
          />
          {/* 150 m label */}
          <text
            x={TARGET_POS.x + 64} y={TARGET_POS.y - 66}
            fontSize="7" fontFamily="monospace" fill="#ffd70099"
            textAnchor="start"
          >
            ⊙ 150 m
          </text>

          {/* Target aura */}
          <circle cx={TARGET_POS.x} cy={TARGET_POS.y} r="60" fill="url(#target-glow)" />

          {/* Edges */}
          {CONTACTS.map((c) => (
            <line
              key={`e${c.id}`}
              x1={TARGET_POS.x} y1={TARGET_POS.y}
              x2={c.x} y2={c.y}
              stroke={c.color}
              strokeWidth={c.risk > 0.5 ? 1.8 : 0.9}
              strokeOpacity={0.4}
              strokeDasharray="8 4"
              className="forensic-edge"
              style={{ animationDelay: `${CONTACTS.indexOf(c) * 0.18}s` }}
            />
          ))}

          {/* Contact nodes */}
          {CONTACTS.map((c) => (
            <g key={`n${c.id}`} onClick={() => runDeep(c)} style={{ cursor: "pointer" }}>
              <circle
                cx={c.x} cy={c.y} r="22"
                fill={`${c.color}15`} stroke={c.color} strokeWidth={selected?.id === c.id ? 2.5 : 1.2}
                filter="url(#glow)"
                className="forensic-node"
                style={{ animationDelay: `${CONTACTS.indexOf(c) * 0.3}s` }}
              />
              <text x={c.x} y={c.y - 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fontFamily="monospace" fontWeight="700" fill={c.color}>
                {c.label}
              </text>
              <text x={c.x} y={c.y + 10} textAnchor="middle" dominantBaseline="middle"
                fontSize="6" fontFamily="monospace" fill={c.color} opacity="0.7">
                {c.calls} llamadas
              </text>
            </g>
          ))}

          {/* Target node */}
          <g>
            <circle cx={TARGET_POS.x} cy={TARGET_POS.y} r="30"
              fill="rgba(0,255,200,0.12)" stroke="#00ffcc" strokeWidth="2" filter="url(#glow)" />
            <circle cx={TARGET_POS.x} cy={TARGET_POS.y} r="18"
              fill="rgba(0,255,200,0.18)" stroke="#00ffcc" strokeWidth="1" strokeDasharray="4 3" />
            <text x={TARGET_POS.x} y={TARGET_POS.y - 4} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fontFamily="monospace" fontWeight="700" fill="#00ffcc">
              OBJETIVO
            </text>
            <text x={TARGET_POS.x} y={TARGET_POS.y + 7} textAnchor="middle" dominantBaseline="middle"
              fontSize="6" fontFamily="monospace" fill="#00ffcc99">
              ALFA
            </text>
          </g>
        </svg>

        {/* Zone labels */}
        <div style={{
          position: "absolute", bottom: 12, left: 12,
          fontSize: "8px", color: "#00ffcc40", letterSpacing: "1px",
        }}>
          📍 ZONA DE PERNOCTA: {TARGET.zone}<br />
          Coord: 18.9310°N / 99.2300°W · 18.9180°N / 99.2100°W
        </div>
      </div>

      {/* ── Right: Analysis panels ────────────────────────────────────────── */}
      <div style={{
        width: "380px", minWidth: "300px",
        background: "rgba(4, 12, 24, 0.92)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderLeft: "1px solid rgba(0,255,200,0.12)",
        display: "flex", flexDirection: "column",
        overflowY: "auto", padding: "16px",
      }}>
        <h2 style={{ color: "#00ffcc", fontSize: "11px", letterSpacing: "2px", margin: "0 0 2px" }}>
          ANÁLISIS FORENSE · SANTI NEXUS
        </h2>
        <p style={{ color: "#3a6a5a", fontSize: "7px", letterSpacing: "1px", margin: "0 0 14px" }}>
          SÁBANA TELEFÓNICA · ANÁLISIS PROBABILÍSTICO BAYESIANO Y CUÁNTICO
        </p>

        {/* Target summary */}
        <div className="forensic-card" style={{
          padding: "10px", borderRadius: "8px",
          background: "rgba(0,255,200,0.05)",
          border: "1px solid rgba(0,255,200,0.2)",
          marginBottom: "12px",
        }}>
          <p style={{ fontSize: "9px", color: "#00ffcc", letterSpacing: "1px", margin: "0 0 6px" }}>
            🎯 OBJETIVO ANALIZADO
          </p>
          <p style={{ fontSize: "10px", color: "#e0ffe8", margin: "2px 0" }}>
            Número: <code style={{ color: "#c8a84b" }}>{TARGET.number}</code>
          </p>
          <p style={{ fontSize: "10px", color: "#e0ffe8", margin: "2px 0" }}>
            Alias: <strong>{TARGET.alias}</strong>
          </p>
          <p style={{ fontSize: "10px", color: "#e0ffe8", margin: "2px 0" }}>
            Zona de pernocta: <span style={{ color: "#00e676" }}>{TARGET.zone}</span>
          </p>
          <p style={{ fontSize: "10px", color: "#ff6d00", margin: "4px 0 0" }}>
            IQR: <strong>{(TARGET.risk * 100).toFixed(1)}%</strong> — ALTO RIESGO
          </p>
        </div>

        {/* Bayesian bars */}
        <p style={{ fontSize: "8px", color: "#2a5a4a", letterSpacing: "2px", marginBottom: "8px" }}>
          INDICADORES BAYESIANOS
        </p>
        {BAYESIAN.map((b, i) => (
          <div key={i} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
              <span style={{ fontSize: "8px", color: "#8aa", letterSpacing: "0.5px" }}>{b.label}</span>
              <span style={{ fontSize: "8px", color: b.color, fontWeight: "bold" }}>{(b.value * 100).toFixed(1)}%</span>
            </div>
            <div style={{ width: "100%", background: "#0a1a12", height: "5px", borderRadius: "3px" }}>
              <div style={{
                width: `${b.value * 100}%`,
                background: `linear-gradient(90deg, ${b.color}88, ${b.color})`,
                height: "100%", borderRadius: "3px",
                boxShadow: `0 0 6px ${b.color}60`,
                transition: "width 1s ease-out",
              }} />
            </div>
          </div>
        ))}

        {/* Selected contact detail */}
        {selected && (
          <div className="forensic-card" style={{
            marginTop: "10px", padding: "10px", borderRadius: "8px",
            background: `${selected.color}10`,
            border: `1px solid ${selected.color}40`,
          }}>
            <p style={{ fontSize: "9px", color: selected.color, letterSpacing: "1px", margin: "0 0 6px" }}>
              🔍 NODO SELECCIONADO
            </p>
            <p style={{ fontSize: "10px", color: "#e0ffe8", margin: "2px 0" }}>
              Contacto: <strong style={{ color: selected.color }}>{selected.label}</strong>
            </p>
            <p style={{ fontSize: "10px", color: "#e0ffe8", margin: "2px 0" }}>
              Rol: {selected.role}
            </p>
            <p style={{ fontSize: "10px", color: "#e0ffe8", margin: "2px 0" }}>
              Llamadas registradas: <strong>{selected.calls}</strong>
            </p>
            <p style={{ fontSize: "10px", margin: "4px 0 0",
              color: selected.risk > 0.5 ? "#ff1744" : "#00e676" }}>
              Índice Bayesiano: <strong>{(selected.risk * 100).toFixed(1)}%</strong>
              {selected.risk > 0.5 ? " · ⚠️ ALTO RIESGO" : " · ✅ BAJO RIESGO"}
            </p>
          </div>
        )}

        {/* Analysis log */}
        <p style={{ fontSize: "8px", color: "#2a5a4a", letterSpacing: "2px", margin: "12px 0 6px" }}>
          LOG DE ANÁLISIS
        </p>
        <div style={{
          flex: 1, overflowY: "auto", maxHeight: "200px",
          background: "rgba(0,8,4,0.7)",
          border: "1px solid rgba(0,255,200,0.08)",
          borderRadius: "6px", padding: "8px",
        }}>
          {analysisLog.map((line, i) => (
            <p key={i} style={{
              fontSize: "8px", color: "#4a8a6a", margin: "2px 0", lineHeight: "1.6",
              fontFamily: "monospace",
            }}>
              {line}
            </p>
          ))}
          <div ref={logEndRef} />
        </div>

        <p style={{ fontSize: "7px", color: "#333", marginTop: "10px", textAlign: "center" }}>
          © 2026 J&L Sentinel AI · Análisis probabilístico — no constituye prueba judicial
        </p>
      </div>
    </div>
  );
};
