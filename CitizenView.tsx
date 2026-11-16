import React, { useState, useRef, useEffect } from "react";
import { TacticalMap3D as TacticalMap } from "./TacticalMap3D"; // Asumo que este es el mapa táctico (puedes cambiarlo a TacticalMap3D si ya lo tienes listo)

// â”€â”€ Holographic agent config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AGENTS = [
  { id: "SANTI",       label: "SANTI",       role: "C.M.O. Nacional · Gemini 2.5",  color: "#00e5ff", ring: "#00e5ff" },
  { id: "LORENA",      label: "LORENA",      role: "Género / DDHH · ONU",           color: "#ff4fc8", ring: "#ff4fc8" },
  { id: "MAXIMILIANO", label: "MAXI",        role: "OSINT · Interpol",              color: "#c8a84b", ring: "#c8a84b" },
  { id: "EMILIANO",    label: "EMILIANO",    role: "Táctico · SSPC",                color: "#00e676", ring: "#00e676" },
  { id: "SANTIAGO",    label: "SANTIAGO",    role: "Escuela Segura · CNPJ",         color: "#7c4dff", ring: "#7c4dff" },
  { id: "KATERING",    label: "KATERING",    role: "Código Violeta · UNODC",        color: "#ff6d00", ring: "#ff6d00" },
];

// â”€â”€ CSS injected once â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes holo-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes holo-spin-rev { from{transform:rotate(360deg)} to{transform:rotate(0deg)} }
    @keyframes holo-pulse { 0%,100%{opacity:.55} 50%{opacity:1} }
    @keyframes holo-think {
      0%,100%{box-shadow:0 0 8px var(--ac),0 0 20px var(--ac)}
      50%{box-shadow:0 0 22px var(--ac),0 0 48px var(--ac),0 0 80px var(--ac)}
    }
    @keyframes violeta-pulse {
      0%,100%{box-shadow:0 0 14px #a200ff,0 0 28px #a200ff60;transform:scale(1)}
      50%{box-shadow:0 0 32px #a200ff,0 0 64px #a200ff80;transform:scale(1.04)}
    }
    @keyframes fab-ring {
      0%{transform:scale(1);opacity:.5}
      100%{transform:scale(1.9);opacity:0}
    }
    @keyframes chat-in {
      from{opacity:0;transform:translateY(6px)}
      to{opacity:1;transform:translateY(0)}
    }
    .holo-avatar { animation: holo-pulse 2.5s ease-in-out infinite; }
    .holo-think  { animation: holo-think 1s ease-in-out infinite; }
    .violeta-fab { animation: violeta-pulse 1.8s ease-in-out infinite; }
    .chat-bubble { animation: chat-in 0.22s ease-out both; }
  `;
  document.head.appendChild(s);
}

// â”€â”€ HoloAvatar component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HoloAvatar = ({
  agent, active, thinking, onClick,
}: { agent: typeof AGENTS[0]; active: boolean; thinking: boolean; onClick: () => void }) => {
  const ac = agent.color;
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative", width: "62px", height: "62px",
        cursor: "pointer", flexShrink: 0,
        // @ts-ignore CSS variable
        "--ac": ac,
      } as React.CSSProperties}
    >
      {/* Outer spin ring */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `1.5px dashed ${ac}55`,
        animation: "holo-spin 6s linear infinite",
        pointerEvents: "none",
      }} />
      {/* Inner spin ring reverse */}
      <div style={{
        position: "absolute", inset: "8px", borderRadius: "50%",
        border: `1px solid ${ac}80`,
        animation: "holo-spin-rev 3.5s linear infinite",
        pointerEvents: "none",
      }} />
      {/* Core circle */}
      <div
        className={thinking ? "holo-think" : "holo-avatar"}
        style={{
          position: "absolute", inset: "14px", borderRadius: "50%",
          background: `radial-gradient(circle, ${ac}22 0%, #050510 70%)`,
          border: `2px solid ${ac}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "15px", fontFamily: "monospace", fontWeight: 700,
          color: ac, letterSpacing: "0px",
          // @ts-ignore
          "--ac": ac,
        } as React.CSSProperties}
      >
        {agent.label.slice(0, 2)}
      </div>
      {/* Active indicator dot */}
      {active && (
        <div style={{
          position: "absolute", bottom: 2, right: 2,
          width: 9, height: 9, borderRadius: "50%",
          background: ac, boxShadow: `0 0 6px ${ac}`,
        }} />
      )}
    </div>
  );
};

// â”€â”€ Main CitizenView â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const CitizenView = () => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [justification, setJustification]     = useState("");
  const [activeAgent, setActiveAgent]          = useState(AGENTS[0]);
  const [chatHistory, setChatHistory]          = useState<Array<{ role: "user"|"agent"; text: string }>>([
    { role: "agent", text: "Sistema SANTI NEXUS en línea. C.M.O. Nacional activo. Esperando instrucciones del Director." },
  ]);
  const [chatInput, setChatInput]              = useState("");
  const [thinking, setThinking]               = useState(false);

  // Código Violeta state
  const [violetaStatus, setVioletaStatus]      = useState<string | null>(null);
  const [violetaLoading, setVioletaLoading]    = useState(false);

  // �”¥ MEJORA: Reloj y Clima en Tiempo Real
  const [time, setTime] = useState(new Date().toLocaleTimeString("es-MX"));
  const [weather, setWeather] = useState("â˜€ï¸ 24°C | Viento: 12 km/h | Despejado");

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [chatHistory]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString("es-MX")), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelUnit = () => {
    if (justification.length < 20) {
      alert("La justificación debe ser detallada (mínimo 20 caracteres). Quedará en el registro inmutable.");
      return;
    }
    alert("Cancelación registrada. Ha sido auditada por SANTI.");
    setShowCancelModal(false);
    setJustification("");
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || thinking) return;
    setChatInput("");
    setChatHistory((h) => [...h, { role: "user", text }]);
    setThinking(true);
    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: activeAgent.id, prompt: text, lang: "es" }),
      });
      const data = await res.json();
      setChatHistory((h) => [...h, { role: "agent", text: data.response ?? "Sin respuesta." }]);
    } catch {
      setChatHistory((h) => [...h, { role: "agent", text: "âš ï¸ Error de conexión con el servidor." }]);
    }
    setThinking(false);
  };

  // â”€â”€ Código Violeta trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const triggerVioleta = async () => {
    setVioletaLoading(true);
    setVioletaStatus(null);
    const secret = (import.meta as any).env?.VITE_PANIC_SECRET ?? "";
    try {
      const res = await fetch("/api/officer-panic", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Panic-Secret": secret },
        body: JSON.stringify({
          officerId: "VIOLETA-CIUDADANO",
          lat: 18.9242, lng: -99.2216,
          message: "�Ÿ£ CÃ“DIGO VIOLETA — Alerta ciudadana activada desde C.M.O.",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setVioletaStatus(`âœ... ALERTA ENVIADA · Folio: ${data.folio} · ${data.closestUnits?.length ?? 0} unidad(es) en camino.`);
      setChatHistory((h) => [...h, {
        role: "agent",
        text: `�Ÿ£ CÃ“DIGO VIOLETA ACTIVADO — Folio ${data.folio}. KATERING coordinando respuesta. ${data.closestUnits?.length ?? 0} unidades desplegadas en radio de 5 km.`,
      }]);
    } catch (e: any) {
      setVioletaStatus(`âŒ Error: ${e.message}`);
    }
    setVioletaLoading(false);
  };

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      backgroundColor: "#050505", color: "white",
    }}>
      {/* Main row */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexWrap: "wrap" as const }}>

        {/* â”€â”€ Left: Tactical Map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ flex: "1 1 320px", position: "relative", minHeight: "300px" }}>
          <TacticalMap />

          {/* �”¥ HUD: Reloj y Clima en el Mapa */}
          <div style={{ position: "absolute", top: 70, left: 20, zIndex: 1000, background: "rgba(2,8,16,0.85)", padding: "8px 12px", border: "1px solid #00ffcc", borderRadius: "8px", color: "#00ffcc", fontFamily: "monospace", pointerEvents: "none" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>{time}</p>
            <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#fff" }}>{weather}</p>
          </div>

          {/* â”€â”€ Código Violeta FAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 1100 }}>
            {/* Expanding ring behind FAB */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "999px",
              background: "transparent", border: "2px solid #a200ff",
              animation: "fab-ring 1.6s ease-out infinite",
              pointerEvents: "none",
            }} />
            <button
              onClick={triggerVioleta}
              disabled={violetaLoading}
              className="violeta-fab"
              style={{
                position: "relative",
                padding: "14px 32px",
                fontSize: "15px", fontWeight: "bold", fontFamily: "monospace",
                letterSpacing: "2px",
                background: "linear-gradient(135deg, #5500aa 0%, #a200ff 100%)",
                color: "#fff",
                border: "2px solid #cc44ff",
                borderRadius: "999px",
                cursor: violetaLoading ? "not-allowed" : "pointer",
                opacity: violetaLoading ? 0.65 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {violetaLoading ? "ENVIANDO..." : "�š¨ CÃ“DIGO VIOLETA"}
            </button>
          </div>

          {/* Violeta status toast */}
          {violetaStatus && (
            <div style={{
              position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)",
              background: "rgba(80,0,120,0.92)", border: "1px solid #cc44ff",
              borderRadius: "8px", padding: "8px 16px", zIndex: 1200,
              fontFamily: "monospace", fontSize: "10px", color: "#e0aaff",
              whiteSpace: "nowrap", maxWidth: "90vw", wordBreak: "break-all",
            }}>
              {violetaStatus}
            </div>
          )}
        </div>

        {/* â”€â”€ Right: Command panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{
          width: "400px", minWidth: "320px",
          background: "rgba(4, 12, 24, 0.82)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          padding: "16px",
          borderLeft: "1px solid rgba(0,255,200,0.12)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
          boxShadow: "inset -1px 0 0 rgba(0,255,200,0.06)",
        }}>
          <h2 style={{ color: "#00ffcc", letterSpacing: "2px", fontSize: "12px", fontFamily: "monospace", margin: "0 0 2px" }}>
            SANTI NEXUS · C.M.O. NACIONAL
          </h2>
          <p style={{ color: "#3a6a5a", fontSize: "8px", fontFamily: "monospace", letterSpacing: "1px", margin: "0 0 14px" }}>
            SEDE: CUERNAVACA · SSPC · GN · INTERPOL
          </p>

          {/* â”€â”€ Holographic agent row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <p style={{ color: "#2a5a4a", fontSize: "8px", fontFamily: "monospace", letterSpacing: "2px", marginBottom: "10px" }}>
            EQUIPO DE INTELIGENCIA
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
            {AGENTS.map((a) => (
              <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <HoloAvatar
                  agent={a}
                  active={activeAgent.id === a.id}
                  thinking={thinking && activeAgent.id === a.id}
                  onClick={() => setActiveAgent(a)}
                />
                <span style={{ fontSize: "7px", fontFamily: "monospace", color: a.color, letterSpacing: "0.5px" }}>
                  {a.label}
                </span>
              </div>
            ))}
          </div>

          {/* Active agent label */}
          <div style={{
            padding: "6px 10px", borderRadius: "6px",
            background: `${activeAgent.color}12`,
                              border: `1px solid 40`,
            marginBottom: "10px",
          }}>
            <span style={{ fontFamily: "monospace", fontSize: "9px", color: activeAgent.color }}>
              â–¶ {activeAgent.label} — {activeAgent.role}
            </span>
          </div>

          {/* â”€â”€ Chat history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{
            flex: 1, overflowY: "auto", minHeight: "160px", maxHeight: "320px",
            marginBottom: "10px",
            padding: "8px",
            background: "rgba(0,10,8,0.6)",
            borderRadius: "8px",
            border: "1px solid rgba(0,255,200,0.08)",
          }}>
            {chatHistory.map((m, i) => (
              <div
                key={i}
                className="chat-bubble"
                style={{
                  marginBottom: "8px",
                  display: "flex",
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                  gap: "6px",
                }}
              >
                {/* Avatar dot */}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: m.role === "user" ? "#1a4a3a" : `${activeAgent.color}22`,
                              border: `1px solid 40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "9px", fontFamily: "monospace",
                  color: m.role === "user" ? "#00ffcc" : activeAgent.color,
                }}>
                  {m.role === "user" ? "TÃš" : activeAgent.label.slice(0, 2)}
                </div>
                <div style={{
                  maxWidth: "80%",
                  padding: "6px 10px", borderRadius: "10px",
                  background: m.role === "user"
                    ? "rgba(0,255,200,0.07)"
                    : `${activeAgent.color}10`,
                  border: `1px solid ${m.role === "user" ? "rgba(0,255,200,0.15)" : activeAgent.color + "30"}`,
                  fontSize: "10px", lineHeight: "1.55",
                  color: m.role === "user" ? "#e0ffe8" : "#e8e8ff",
                  fontFamily: "system-ui, sans-serif",
                  wordBreak: "break-word",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="chat-bubble" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: `${activeAgent.color}22`, border: `1px solid ${activeAgent.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "9px", fontFamily: "monospace", color: activeAgent.color,
                }}>
                  {activeAgent.label.slice(0, 2)}
                </div>
                <div style={{
                  padding: "6px 12px", borderRadius: "10px",
                  background: `${activeAgent.color}10`,
                  border: `1px solid ${activeAgent.color}30`,
                  fontSize: "10px", color: activeAgent.color, fontFamily: "monospace",
                  letterSpacing: "2px",
                }}>
                  ···
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* â”€â”€ Chat input row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder={`Pregunta a ...`}
              style={{
                flex: 1, padding: "8px 10px",
                background: "rgba(0,20,12,0.8)", color: "#e0ffe8",
                              border: `1px solid ${activeAgent.color}`,
                borderRadius: "6px", outline: "none",
                fontFamily: "system-ui, sans-serif", fontSize: "11px",
              }}
            />
            <button
              onClick={sendChat}
              disabled={thinking || !chatInput.trim()}
              style={{
                padding: "8px 14px",
                background: thinking ? "#0a1a12" : activeAgent.color,
                color: thinking ? activeAgent.color : "#000",
                              border: `1px solid `,
                borderRadius: "6px", cursor: thinking ? "not-allowed" : "pointer",
                fontFamily: "monospace", fontWeight: "bold", fontSize: "11px",
                opacity: !chatInput.trim() ? 0.5 : 1,
              }}
            >
                  ➤
            </button>
          </div>

          {/* â”€â”€ Quantum analysis panel (existing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{
            marginTop: "14px", padding: "12px",
            background: "rgba(0,255,200,0.04)",
            border: "1px solid rgba(0,255,200,0.18)",
            borderRadius: "8px",
          }}>
            <h4 style={{ color: "#00ffcc", fontSize: "10px", fontFamily: "monospace", margin: "0 0 6px" }}>
            ⚡ MOTOR CUÁNTICO · ANÁLISIS BAYESIANO
            </h4>
            <div style={{ width: "100%", background: "#0a1a12", height: "7px", borderRadius: "4px", marginBottom: "6px" }}>
              <div style={{ width: "87%", background: "linear-gradient(90deg,#00ffcc,#00e676)", height: "100%", borderRadius: "4px" }} />
            </div>
            <p style={{ fontSize: "10px", color: "#aaa", margin: "2px 0", fontFamily: "monospace" }}>
              Localización: <strong style={{ color: "#00ffcc" }}>87.4%</strong> · Nodos OSINT: <strong style={{ color: "#00ffcc" }}>1,450</strong>
            </p>
          </div>

          {/* â”€â”€ Control panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{
            marginTop: "12px", padding: "12px",
            background: "rgba(255,23,68,0.05)",
            border: "1px solid rgba(255,23,68,0.25)",
            borderRadius: "8px",
          }}>
            <h4 style={{ color: "#ff4444", fontSize: "10px", fontFamily: "monospace", margin: "0 0 6px" }}>
              âš  CONTROL DE UNIDADES
            </h4>
            <p style={{ fontSize: "10px", color: "#ccc", margin: "2px 0" }}>FGR: 5640967363</p>
            <p style={{ fontSize: "10px", color: "#ccc", margin: "2px 0" }}>Fiscalía: 6623519171</p>
            <button
              onClick={() => setShowCancelModal(true)}
              style={{
                width: "100%", padding: "8px",
                backgroundColor: "#ff0000", color: "white",
                border: "none", cursor: "pointer",
                marginTop: "8px", fontWeight: "bold",
                borderRadius: "4px", fontSize: "11px",
              }}
            >
              Cancelar Asignación (Auditoría)
            </button>
          </div>

          <p style={{ fontSize: "8px", color: "#555", marginTop: "12px", textAlign: "center", fontFamily: "monospace" }}>
            Â© 2026 J&amp;L Sentinel AI · Software de apoyo a la decisión
          </p>
        </div>
      </div>

      {/* â”€â”€ Audit modal (unchanged logic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showCancelModal && (
        <div style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 3000,
        }}>
          <div style={{
            backgroundColor: "#1a1a1a", padding: "30px", borderRadius: "10px",
            width: "min(500px,90vw)", border: "1px solid #ff0000",
          }}>
            <h3 style={{ color: "#ff0000" }}>âš ï¸ Auditoría Obligatoria</h3>
            <p style={{ fontSize: "13px" }}>
              El mando puede cancelar, pero debe justificar legalmente. Este registro es inmutable.
            </p>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Escriba el motivo legal (mínimo 20 caracteres)â€¦"
              style={{
                width: "100%", height: "100px", marginTop: "10px",
                backgroundColor: "#000", color: "#fff", padding: "10px",
                border: "1px solid #555", resize: "none", borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
              <button onClick={handleCancelUnit} style={{ padding: "10px", backgroundColor: "#ff0000", color: "white", border: "none", cursor: "pointer", flex: 1, borderRadius: "4px" }}>
                Confirmar
              </button>
              <button onClick={() => setShowCancelModal(false)} style={{ padding: "10px", backgroundColor: "#555", color: "white", border: "none", cursor: "pointer", flex: 1, borderRadius: "4px" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};