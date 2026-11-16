/**
 * ApiStatusBar.tsx
 * Semáforo en tiempo real de Gemini, Watsonx e IBM Telegram.
 * Se monta en la esquina superior izquierda de la app (fija, no invasiva).
 */
import React, { useState } from "react";
import { useApiStatus, ServiceHealth, ApiStatus } from "./AgentLogicController";

// ── Color per status ──────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ApiStatus, string> = {
  online:   "#00e676",
  degraded: "#ffd600",
  offline:  "#ff1744",
  checking: "#4a8a6a",
};

const STATUS_LABEL: Record<ApiStatus, string> = {
  online:   "EN LÍNEA",
  degraded: "DEGRADADO",
  offline:  "FUERA DE LÍNEA",
  checking: "VERIFICANDO…",
};

const SERVICE_ICON: Record<string, string> = {
  gemini:   "✦",
  watsonx:  "⬡",
  telegram: "✈",
};

const SERVICE_FULL: Record<string, string> = {
  gemini:   "Google Gemini",
  watsonx:  "IBM Watsonx",
  telegram: "Telegram Bot",
};

// ── CSS ───────────────────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes dot-blink {
      0%,100%{opacity:1} 50%{opacity:.25}
    }
    @keyframes status-bar-in {
      from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none}
    }
    .api-dot-online   { animation: none; }
    .api-dot-checking { animation: dot-blink 1.2s ease-in-out infinite; }
    .api-dot-degraded { animation: dot-blink 0.7s ease-in-out infinite; }
    .api-dot-offline  { animation: dot-blink 0.4s ease-in-out infinite; }
    .api-status-bar   { animation: status-bar-in 0.35s ease-out both; }
    .api-tooltip      { pointer-events:none; white-space:nowrap; }
  `;
  document.head.appendChild(s);
}

// ── ServiceDot ─────────────────────────────────────────────────────────────────
const ServiceDot: React.FC<{ svc: ServiceHealth; expanded: boolean }> = ({ svc, expanded }) => {
  const color = STATUS_COLOR[svc.status];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: expanded ? "3px 8px" : "3px 6px",
      borderRadius: 20,
      background: `${color}12`,
      border: `1px solid ${color}40`,
      transition: "all 0.2s",
      position: "relative",
    }}>
      {/* LED dot */}
      <div
        className={`api-dot-${svc.status}`}
        style={{
          width: 7, height: 7, borderRadius: "50%",
          background: color,
          boxShadow: svc.status === "online" ? `0 0 6px ${color}` : "none",
          flexShrink: 0,
        }}
      />
      {/* Icon + name when expanded */}
      <span style={{ fontSize: 9, color, fontFamily: "monospace", letterSpacing: "0.5px" }}>
        {SERVICE_ICON[svc.name]}
        {expanded && (
          <span style={{ marginLeft: 4 }}>{SERVICE_FULL[svc.name].split(" ")[1]}</span>
        )}
      </span>
      {/* Latency badge */}
      {expanded && svc.latencyMs !== null && (
        <span style={{ fontSize: 8, color: `${color}aa`, fontFamily: "monospace" }}>
          {svc.latencyMs}ms
        </span>
      )}
    </div>
  );
};

// ── Detail panel ──────────────────────────────────────────────────────────────
const DetailPanel: React.FC<{ services: ServiceHealth[]; onRefresh: () => void }> = ({ services, onRefresh }) => (
  <div style={{
    position: "absolute", top: "calc(100% + 6px)", left: 0,
    minWidth: 280,
    background: "rgba(2,8,16,0.97)",
    border: "1px solid rgba(0,255,200,0.2)",
    borderRadius: 10,
    padding: "12px 14px",
    zIndex: 10001,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 9, color: "#00ffcc", letterSpacing: "2px" }}>ESTADO DE APIS — SANTI NEXUS</span>
      <button
        onClick={onRefresh}
        style={{
          background: "rgba(0,255,200,0.1)", border: "1px solid rgba(0,255,200,0.3)",
          borderRadius: 4, color: "#00ffcc", fontSize: 8, cursor: "pointer",
          padding: "3px 8px", fontFamily: "monospace",
        }}
      >
        ↺ ACTUALIZAR
      </button>
    </div>
    {services.map((svc) => {
      const color = STATUS_COLOR[svc.status];
      return (
        <div key={svc.name} style={{
          marginBottom: 8, padding: "8px 10px", borderRadius: 6,
          background: `${color}08`,
          border: `1px solid ${color}25`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <div
              className={`api-dot-${svc.status}`}
              style={{
                width: 8, height: 8, borderRadius: "50%", background: color,
                boxShadow: svc.status === "online" ? `0 0 6px ${color}` : "none", flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 9, color, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "1px" }}>
              {SERVICE_FULL[svc.name]} — {STATUS_LABEL[svc.status]}
            </span>
            {svc.latencyMs !== null && (
              <span style={{ marginLeft: "auto", fontSize: 8, color: `${color}aa`, fontFamily: "monospace" }}>
                {svc.latencyMs}ms
              </span>
            )}
          </div>
          <p style={{ fontSize: 8, color: "#4a8a6a", margin: 0, fontFamily: "monospace", lineHeight: 1.5 }}>
            {svc.note}
          </p>
          {svc.lastCheck && (
            <p style={{ fontSize: 7, color: "#2a4a3a", margin: "2px 0 0", fontFamily: "monospace" }}>
              Última verificación: {new Date(svc.lastCheck).toLocaleTimeString("es-MX")}
            </p>
          )}
        </div>
      );
    })}
    <p style={{ fontSize: 7, color: "#1a3a2a", margin: "8px 0 0", textAlign: "center", fontFamily: "monospace" }}>
      Verifica cada 30s · No afecta el backend · SANTI NEXUS Zero-Trust
    </p>
  </div>
);

// ── Main bar ──────────────────────────────────────────────────────────────────
export const ApiStatusBar: React.FC = () => {
  const { services, refresh } = useApiStatus(30_000);
  const [open, setOpen]       = useState(false);

  const overall: "online" | "degraded" | "offline" =
    services.some((s) => s.status === "offline")  ? "offline"  :
    services.some((s) => s.status === "degraded") ? "degraded" :
    services.every((s) => s.status === "online")  ? "online"   : "online";

  const overallColor = STATUS_COLOR[overall];

  return (
    <div
      className="api-status-bar"
      style={{
        position: "fixed", top: 10, left: 10, zIndex: 10000,
        display: "flex", alignItems: "center", gap: 5,
        background: "rgba(2,8,16,0.92)",
        border: `1px solid ${overallColor}30`,
        borderRadius: 20, padding: "5px 8px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={() => setOpen((o) => !o)}
    >
      {/* Overall pulse */}
      <div
        className={`api-dot-${overall}`}
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: overallColor,
          boxShadow: overall === "online" ? `0 0 7px ${overallColor}` : "none",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 8, color: overallColor, fontFamily: "monospace", letterSpacing: "1px" }}>
        APIs
      </span>
      {/* Individual dots */}
      {services.map((svc) => (
        <ServiceDot key={svc.name} svc={svc} expanded={false} />
      ))}
      <span style={{ fontSize: 8, color: "#3a6a5a", fontFamily: "monospace" }}>
        {open ? "▲" : "▼"}
      </span>

      {/* Detail dropdown */}
      {open && <DetailPanel services={services} onRefresh={() => { refresh(); }} />}
    </div>
  );
};
