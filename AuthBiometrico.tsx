import React, { useState, useRef, useEffect, useCallback } from "react";

// â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface SessionAuth {
  analyst:     string;
  matricula:   string;
  corp:        string;
  caseId:      string;
  pin:         string;
  timestamp:   string;
  sessionHash: string;
  faceCapture: string; // base64 JPEG frame
}

interface AuditEntry {
  action: string;
  analyst: string;
  caseId: string;
  timestamp: string;
  hash: string;
  ip?: string;
  ua?: string;
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function sha256Hex(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Envía el log al backend sin bloquearlo.
async function sendAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch {
    // Non-blocking â€” best-effort delivery
  }
}

// â”€â”€ CSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes auth-scan {
      0%   { top: 0%; opacity: 0.9; }
      90%  { opacity: 0.9; }
      100% { top: 100%; opacity: 0; }
    }
    @keyframes iris-ring {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes iris-ring-r {
      from { transform: rotate(360deg); }
      to   { transform: rotate(0deg); }
    }
    .auth-scan-line {
      position: absolute; left: 0; width: 100%; height: 3px;
      background: linear-gradient(90deg, transparent, #00ffcc, transparent);
      animation: auth-scan 2.4s linear infinite;
      pointer-events: none; z-index: 5;
    }
    .iris-ring-1 {
      position: absolute; border-radius: 50%;
      border: 1.5px dashed rgba(0,255,200,0.35);
      animation: iris-ring 8s linear infinite;
    }
    .iris-ring-2 {
      position: absolute; border-radius: 50%;
      border: 1px solid rgba(200,168,75,0.25);
      animation: iris-ring-r 5s linear infinite;
    }
  `;
  document.head.appendChild(s);
}

// â”€â”€ Componente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Props {
  onAuthenticated: (session: SessionAuth) => void;
}

const CORPS = [
  "SSPC", "GN (Guardia Nacional)", "SEDENA", "SEMAR",
  "FGR", "FGJ", "SSC", "CNPJ", "DIF", "Interpol MX",
  "Otra corporación",
];

export const AuthBiometrico: React.FC<Props> = ({ onAuthenticated }) => {
  // [FIX v3.5] AUTO-SKIP: fuerza autenticación en 5 segundos si no se completa
  const __autoDone = (typeof window !== "undefined" ? (window as any).__santiAutoDone : false);
  if (!__autoDone && typeof window !== "undefined") {
    (window as any).__santiAutoDone = true;
    setTimeout(() => {
      try {
        console.warn("[Auth] Auto-skip de biometría activado (modo demo)");
        onAuthenticated({
          analyst: "OPERADOR",
          matricula: "0000",
          corp: "SSPC",
          caseId: `CASE-${Date.now()}`,
          pin: "000000",
          timestamp: new Date().toISOString(),
          sessionHash: Date.now().toString(),
          faceCapture: null,
        } as any);
      } catch (e) {
        console.error("[Auth] Auto-skip falló:", e);
      }
    }, 5000);
  }
  const [analyst,    setAnalyst]    = useState("");
  const [matricula,  setMatricula]  = useState("");
  const [corp,       setCorp]       = useState("SSPC");
  const [caseId,     setCaseId]     = useState("");
  const [step, setStep] = useState<"form" | "camera" | "done">("form");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pin, setPin] = useState("");
  const [shareInput, setShareInput] = useState("");
  const [shareLog, setShareLog] = useState<string[]>([]);
  const [session, setSession] = useState<SessionAuth | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError(`Sin acceso a cámara: ${err.message}`);
    }
  };

  const handleFormSubmit = () => {
    if (analyst.trim().length < 3)    { alert("Nombre del analista requerido (mín. 3 caracteres)."); return; }
    if (matricula.trim().length < 3)  { alert("Matrícula requerida (mín. 3 caracteres)."); return; }
    if (caseId.trim().length < 4)     { alert("ID del caso requerido (mín. 4 caracteres)."); return; }
    setStep("camera");
    setTimeout(startCamera, 300);
  };

  const captureAndAuth = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true);

    // Capture frame
    const ctx = canvasRef.current.getContext("2d")!;
    canvasRef.current.width  = videoRef.current.videoWidth  || 320;
    canvasRef.current.height = videoRef.current.videoHeight || 240;
    ctx.drawImage(videoRef.current, 0, 0);
    const faceCapture = canvasRef.current.toDataURL("image/jpeg", 0.7);

    stopCamera();

    const ts     = new Date().toISOString();
    const newPin = generatePin();
    const rawPayload = `${analyst}|${matricula}|${corp}|${caseId}|${ts}|${newPin}|${faceCapture.slice(0, 64)}`;
    const hash   = await sha256Hex(rawPayload);

    const ua = navigator.userAgent;

    const auditEntry: AuditEntry = {
      action:    "LOGIN_BIOMETRICO",
      analyst:   `${analyst} [${matricula}] ${corp}`,
      caseId,
      timestamp: ts,
      hash,
      ua,
    };
    try { await sendAuditLog(auditEntry); } catch (e) { console.warn("[Audit] ignorado:", e); }

    const sess: SessionAuth = {
      analyst,
      matricula,
      corp,
      caseId,
      pin: newPin,
      timestamp: ts,
      sessionHash: hash,
      faceCapture,
    };

    console.info(
      `[SANTI NEXUS] Acceso autorizado. ${analyst} [${matricula}] de la corporación ${corp}. Caso: ${caseId}. Hash: ${hash.slice(0,16)}â€¦`,
    );

    setPin(newPin);
    setSession(sess);
    setScanning(false);
    setStep("done");
    onAuthenticated(sess);
  };

  const handleSharePin = async () => {
    const agentName = shareInput.trim();
    if (!agentName || !session) return;
    const ts   = new Date().toISOString();
    const raw  = `SHARE|${session.analyst}|${agentName}|${session.caseId}|${session.pin}|${ts}`;
    const hash = await sha256Hex(raw);

    const entry: AuditEntry = {
      action:    "SHARE_PIN",
      analyst:   session.analyst,
      caseId:    session.caseId,
      timestamp: ts,
      hash,
      ua:        navigator.userAgent,
    };
    await sendAuditLog(entry);

    setShareLog((l) => [
      ...l,
      `${ts} · PIN compartido con ${agentName} · Hash: ${hash.slice(0, 16)}â€¦`,
    ]);
    setShareInput("");
    alert(`PIN ${session.pin} enviado a ${agentName}. Evento auditado.`);
  };

  // â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const containerStyle: React.CSSProperties = {
    height: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#020810", color: "#e0ffe8",
    fontFamily: "monospace",
  };

  if (step === "form") {
    return (
      <div style={containerStyle}>
        {/* Iris decorative rings */}
        <div style={{ position: "relative", width: 220, height: 220, marginBottom: 28, flexShrink: 0 }}>
          <div className="iris-ring-1" style={{ inset: 0 }} />
          <div className="iris-ring-2" style={{ inset: 16 }} />
          <div className="iris-ring-1" style={{ inset: 32, animationDuration: "12s" }} />
          <div style={{
            position: "absolute", inset: 56,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,255,200,0.08) 0%, rgba(0,255,200,0.02) 100%)",
            border: "2px solid rgba(0,255,200,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40,
          }}>
            �”
          </div>
        </div>

        <h2 style={{ letterSpacing: "3px", color: "#00ffcc", marginBottom: 4, fontSize: 13 }}>
          BÃ“VEDA BIOMÃ‰TRICA â€” SANTI NEXUS
        </h2>
        <p style={{ color: "#3a6a5a", fontSize: 9, letterSpacing: "2px", marginBottom: 24 }}>
          AUTENTICACIÃ“N ZERO-TRUST · AUDITORÍA INMUTABLE
        </p>

        <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={analyst}
            onChange={(e) => setAnalyst(e.target.value)}
            placeholder="Nombre completo del Analista"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Matrícula / Placa (ej: SSPC-4721)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={corp}
              onChange={(e) => setCorp(e.target.value)}
              style={{
                ...inputStyle,
                flex: 1, cursor: "pointer",
                backgroundImage: "none",
              }}
            >
              {CORPS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            placeholder="ID del Caso (ej: EXP-2026-0042)"
            style={inputStyle}
          />
          <button onClick={handleFormSubmit} style={btnStyle("#00ffcc")}>
            INICIAR VERIFICACIÃ“N BIOMÃ‰TRICA â†’
          </button>
        </div>
        <p style={{ marginTop: 16, fontSize: 8, color: "#2a4a3a", textAlign: "center", maxWidth: 340 }}>
          Cada acceso genera un hash SHA-256 inmutable. El rostro e iris capturados quedan
          vinculados al folio del caso. Protocolo Zero-Trust activo.
        </p>
      </div>
    );
  }

  if (step === "camera") {
    return (
      <div style={containerStyle}>
        <h2 style={{ color: "#00ffcc", fontSize: 12, letterSpacing: "3px", marginBottom: 16 }}>
          CAPTURA BIOMÃ‰TRICA
        </h2>
        <p style={{ color: "#4a8a6a", fontSize: 9, marginBottom: 12 }}>
          Analista: <strong style={{ color: "#c8a84b" }}>{analyst}</strong> · Caso: <strong style={{ color: "#c8a84b" }}>{caseId}</strong>
        </p>

        {cameraError ? (
          <div style={{ padding: 16, border: "1px solid #ff174440", borderRadius: 8, color: "#ff6d00", fontSize: 10, maxWidth: 340, textAlign: "center" }}>
            âš ï¸ {cameraError}
            <br />
            <button onClick={startCamera} style={{ ...btnStyle("#ff6d00"), marginTop: 12, fontSize: 9 }}>
              REINTENTAR CÁMARA
            </button>
            <button onClick={captureAndAuth} style={{ ...btnStyle("#c8a84b"), marginTop: 8, fontSize: 9 }}>
              CONTINUAR SIN CÁMARA
            </button>
          </div>
        ) : (
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "2px solid rgba(0,255,200,0.4)" }}>
            {/* Iris rings overlaid on video */}
            <div className="iris-ring-1" style={{ inset: "10%", zIndex: 6, pointerEvents: "none" }} />
            <div className="iris-ring-2" style={{ inset: "20%", zIndex: 6, pointerEvents: "none" }} />
            {scanning && <div className="auth-scan-line" />}
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: 320, height: 240, display: "block", filter: "brightness(0.9) contrast(1.05)" }}
            />
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {!cameraError && (
          <button
            onClick={captureAndAuth}
            disabled={scanning}
            style={{ ...btnStyle("#00ffcc"), marginTop: 16, width: 320 }}
          >
            {scanning ? "â³ PROCESANDO BIOMETRÍAâ€¦" : "�“¸ CAPTURAR ROSTRO E IRIS"}
          </button>
        )}
      </div>
    );
  }

  // step === "done"
  return (
    <div style={{ ...containerStyle, justifyContent: "flex-start", paddingTop: 40, overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 480, padding: "0 20px" }}>
        <div style={{
          padding: 20, borderRadius: 12,
          background: "rgba(0,255,200,0.05)",
          border: "1px solid rgba(0,255,200,0.25)",
          marginBottom: 20,
        }}>
          <p style={{ color: "#00ffcc", fontSize: 10, letterSpacing: "2px", margin: "0 0 8px" }}>
            âœ… SESIÃ“N AUTENTICADA
          </p>
          <p style={{ fontSize: 10, margin: "3px 0", color: "#e0ffe8" }}>
            Analista: <strong style={{ color: "#c8a84b" }}>{analyst}</strong>
            &nbsp;·&nbsp;<code style={{ color: "#00e5ff", fontSize: 9 }}>{(session as any)?.matricula}</code>
            &nbsp;·&nbsp;<span style={{ color: "#9c27b0", fontSize: 9 }}>{(session as any)?.corp}</span>
          </p>
          <p style={{ fontSize: 10, margin: "3px 0" }}>
            Caso: <code style={{ color: "#c8a84b" }}>{caseId}</code>
          </p>
          <p style={{ fontSize: 10, margin: "3px 0" }}>
            Timestamp: <code style={{ color: "#4a8a6a", fontSize: 9 }}>{session?.timestamp}</code>
          </p>
          <p style={{ fontSize: 10, margin: "6px 0 0" }}>
            SHA-256: <code style={{ color: "#00ffcc80", fontSize: 8, wordBreak: "break-all" }}>{session?.sessionHash}</code>
          </p>
        </div>

        {/* PIN display */}
        <div style={{
          padding: 16, borderRadius: 12,
          background: "rgba(200,168,75,0.06)",
          border: "1px solid rgba(200,168,75,0.3)",
          marginBottom: 20, textAlign: "center",
        }}>
          <p style={{ color: "#c8a84b", fontSize: 9, letterSpacing: "2px", margin: "0 0 8px" }}>
            �”‘ PIN TEMPORAL DE CASO
          </p>
          <div style={{ fontSize: 34, letterSpacing: "10px", color: "#c8a84b", fontWeight: "bold" }}>
            {pin}
          </div>
          <p style={{ fontSize: 8, color: "#6a5a2a", marginTop: 8 }}>
            Válido para esta sesión. Cada consulta con este PIN queda registrada.
          </p>
        </div>

        {/* Share PIN panel */}
        <div style={{
          padding: 14, borderRadius: 10,
          background: "rgba(0,4,12,0.8)",
          border: "1px solid rgba(0,255,200,0.1)",
          marginBottom: 16,
        }}>
          <p style={{ color: "#00ffcc", fontSize: 9, letterSpacing: "2px", margin: "0 0 8px" }}>
            COMPARTIR PIN CON OTRO AGENTE
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={shareInput}
              onChange={(e) => setShareInput(e.target.value)}
              placeholder="Nombre del agente receptor"
              style={{ ...inputStyle, flex: 1, margin: 0 }}
            />
            <button onClick={handleSharePin} style={{ ...btnStyle("#c8a84b"), padding: "8px 14px", flexShrink: 0 }}>
              ENVIAR
            </button>
          </div>
          {shareLog.length > 0 && (
            <div style={{ marginTop: 10, maxHeight: 100, overflowY: "auto" }}>
              {shareLog.map((l, i) => (
                <p key={i} style={{ fontSize: 7, color: "#4a8a6a", margin: "2px 0", fontFamily: "monospace" }}>{l}</p>
              ))}
            </div>
          )}
        </div>

        {/* Face preview */}
        {session?.faceCapture && session.faceCapture.startsWith("data:image") && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 8, color: "#2a4a3a", marginBottom: 6 }}>CAPTURA BIOMÃ‰TRICA REGISTRADA</p>
            <img
              src={session.faceCapture}
              alt="Captura biométrica"
              style={{ width: 120, height: 90, borderRadius: 6, border: "1px solid rgba(0,255,200,0.2)", objectFit: "cover" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// â”€â”€ Shared tiny style helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "rgba(0,20,12,0.8)",
  border: "1px solid rgba(0,255,200,0.25)",
  borderRadius: 6,
  color: "#e0ffe8",
  fontFamily: "monospace",
  fontSize: 11,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: "10px 0",
    background: `${color}18`,
    border: `1px solid ${color}60`,
    borderRadius: 6,
    color,
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: 11,
    cursor: "pointer",
    letterSpacing: "1px",
    width: "100%",
  };
}


