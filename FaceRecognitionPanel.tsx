/**
 * FaceRecognitionPanel.tsx — SANTI NEXUS
 * ─────────────────────────────────────────────────────────────────────────────
 * M3: Reconocimiento Facial simulado + Control de Detenidos
 *
 * ZERO TRUST: no toca server.js, no toca .env.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScanResult {
  match:      number;       // porcentaje 0-100
  alias:      string;
  crime:      string;
  source:     string;
  riskLevel:  "BAJO" | "MEDIO" | "ALTO" | "CRÍTICO";
  riskColor:  string;
  timestamp:  string;
}

interface Detainee {
  id:        string;
  folio:     string;
  imageUrl:  string;
  alias:     string;
  crime:     string;
  timestamp: string;
  officer:   string;
}

// ── Simulated DB — realistic aliases linked to crimes ─────────────────────────
const SIM_DB: Array<{ alias: string; crime: string; source: string; riskLevel: ScanResult["riskLevel"]; riskColor: string }> = [
  { alias: "El Kevin",     crime: "Homicidio Calificado · Extorsión",  source: "RENAPO / Facebook",     riskLevel: "CRÍTICO", riskColor: "#ff1744" },
  { alias: "El Brayan",    crime: "Narcomenudeo · Portación de arma",  source: "Instagram / SEIDO",     riskLevel: "ALTO",    riskColor: "#ff6d00" },
  { alias: "La Jaroza",    crime: "Extorsión · Lavado de dinero",      source: "TikTok / FGR",           riskLevel: "ALTO",    riskColor: "#ff6d00" },
  { alias: "El Diablo",    crime: "Secuestro · Privación ilegal",      source: "Telegram / FEADS",       riskLevel: "CRÍTICO", riskColor: "#ff1744" },
  { alias: "La Chuleta",   crime: "Robo calificado · Lesiones",        source: "WhatsApp / SSPC",        riskLevel: "MEDIO",   riskColor: "#c8a84b" },
  { alias: "El Pantera",   crime: "Amenazas · Abuso de autoridad",     source: "Redes sociales",         riskLevel: "MEDIO",   riskColor: "#c8a84b" },
  { alias: "Desconocido",  crime: "Sin antecedentes en base de datos", source: "RENAPO",                 riskLevel: "BAJO",    riskColor: "#00e676" },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes face-scan-v {
      0%   { top: 0%; opacity: 1; }
      90%  { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    @keyframes face-scan-grid {
      0%   { opacity: 0; }
      20%  { opacity: 0.6; }
      80%  { opacity: 0.6; }
      100% { opacity: 0; }
    }
    @keyframes face-ring-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes face-result-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .face-scan-line {
      position: absolute; left: 0; width: 100%; height: 3px;
      background: linear-gradient(90deg, transparent, #00ffcc, transparent);
      animation: face-scan-v 1.8s linear 3;
      pointer-events: none; z-index: 5;
    }
    .face-scan-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(0,255,200,0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,200,0.08) 1px, transparent 1px);
      background-size: 24px 24px;
      animation: face-scan-grid 5.5s ease-in-out forwards;
      pointer-events: none; z-index: 4;
    }
    .face-ring {
      position: absolute; border-radius: 50%;
      border: 1.5px dashed rgba(0,255,200,0.4);
      animation: face-ring-spin 6s linear infinite;
    }
    .face-result-in {
      animation: face-result-in 0.4s ease-out forwards;
    }
  `;
  document.head.appendChild(s);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rndBetween(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(1);
}

let _detSeq = 0;
function newDetaineeId() {
  _detSeq++;
  return `DET-${new Date().getFullYear()}-${String(_detSeq).padStart(4, "0")}`;
}

// ── Scan phase labels ─────────────────────────────────────────────────────────
const SCAN_PHASES = [
  { pct: 12, label: "Inicializando red neuronal…" },
  { pct: 28, label: "Detectando puntos faciales (68 landmarks)…" },
  { pct: 47, label: "Vectorizando características biométricas…" },
  { pct: 64, label: "Consultando RENAPO / INTERPOL…" },
  { pct: 81, label: "Cruzando con redes sociales TikTok/IG…" },
  { pct: 93, label: "Verificando base de datos penal nacional…" },
  { pct: 100, label: "Generando ficha de coincidencia…" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const FaceRecognitionPanel: React.FC = () => {
  const [scanPhase,   setScanPhase]   = useState<"idle" | "scanning" | "done">("idle");
  const [scanResult,  setScanResult]  = useState<ScanResult | null>(null);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [progress,    setProgress]    = useState(0);
  const [phaseLabel,  setPhaseLabel]  = useState("");
  const [detainees,   setDetainees]   = useState<Detainee[]>([]);
  const [detFolio,    setDetFolio]    = useState("");
  const [detOfficer,  setDetOfficer]  = useState("");
  const [panelTab,    setPanelTab]    = useState<"scan" | "detainees">("scan");
  const fileRef    = useRef<HTMLInputElement>(null);
  const detFileRef = useRef<HTMLInputElement>(null);
  const [detImageUrl, setDetImageUrl] = useState<string | null>(null);

  // ── Animated progress bar during scan ────────────────────────────────────
  useEffect(() => {
    if (scanPhase !== "scanning") return;
    setProgress(0);
    setPhaseLabel(SCAN_PHASES[0].label);
    let step = 0;
    const TOTAL_MS = 2400;
    const TICK_MS  = TOTAL_MS / SCAN_PHASES.length;

    const id = setInterval(() => {
      step++;
      if (step >= SCAN_PHASES.length) {
        clearInterval(id);
        return;
      }
      setProgress(SCAN_PHASES[step].pct);
      setPhaseLabel(SCAN_PHASES[step].label);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [scanPhase]);

  // ── Handle image upload → start simulated scan ────────────────────────────
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanPhase("scanning");
    setScanResult(null);

    // Simulate ~2.5s AI scan → pick a random DB entry weighted by "match"
    setTimeout(() => {
      const pick = SIM_DB[Math.floor(Math.random() * SIM_DB.length)];
      const matchPct = pick.riskLevel === "BAJO"
        ? rndBetween(35, 62)
        : pick.riskLevel === "MEDIO"
          ? rndBetween(78, 91)
          : rndBetween(92, 99.9);

      setScanResult({
        match:     matchPct,
        alias:     pick.alias,
        crime:     pick.crime,
        source:    pick.source,
        riskLevel: pick.riskLevel,
        riskColor: pick.riskColor,
        timestamp: new Date().toISOString(),
      });
      setProgress(100);
      setPhaseLabel("✅ Análisis completado");
      setScanPhase("done");
    }, 2500);

    // Reset file input so same file can be re-uploaded
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  // ── Register detainee ─────────────────────────────────────────────────────
  const handleDetaineeUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDetImageUrl(URL.createObjectURL(file));
    if (detFileRef.current) detFileRef.current.value = "";
  }, []);

  const registerDetainee = useCallback(() => {
    if (!detImageUrl) { alert("Sube la foto del detenido."); return; }
    if (!detFolio.trim()) { alert("Ingresa el folio del caso."); return; }
    if (!detOfficer.trim()) { alert("Ingresa el nombre del oficial responsable."); return; }
    const alias = scanResult?.alias ?? "Sin identificar";
    const crime = scanResult?.crime ?? "Sin cargo registrado";
    const det: Detainee = {
      id:        newDetaineeId(),
      folio:     detFolio.trim(),
      imageUrl:  detImageUrl,
      alias,
      crime,
      timestamp: new Date().toISOString(),
      officer:   detOfficer.trim(),
    };
    setDetainees((prev) => [det, ...prev]);
    setDetFolio("");
    setDetOfficer("");
    setDetImageUrl(null);
    setPanelTab("detainees");
    console.info(`[SANTI NEXUS] Detenido registrado: ${det.id} · Alias: ${alias} · Folio: ${det.folio}`);
  }, [detImageUrl, detFolio, detOfficer, scanResult]);

  const inputSt: React.CSSProperties = {
    padding: "7px 10px", background: "rgba(0,20,12,0.85)",
    border: "1px solid rgba(0,255,200,0.2)", borderRadius: 6,
    color: "#e0ffe8", fontFamily: "monospace", fontSize: 10, outline: "none",
    width: "100%",
  };

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "#020810", color: "#e0ffe8", fontFamily: "monospace",
    }}>
      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(0,255,200,0.1)",
        padding: "6px 14px", gap: 6,
      }}>
        {(["scan", "detainees"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPanelTab(t)}
            style={{
              padding: "5px 14px", borderRadius: 6, cursor: "pointer",
              background: panelTab === t ? "rgba(0,255,200,0.12)" : "transparent",
              border: `1px solid ${panelTab === t ? "rgba(0,255,200,0.4)" : "rgba(0,255,200,0.1)"}`,
              color: panelTab === t ? "#00ffcc" : "#3a6a5a",
              fontFamily: "monospace", fontSize: 9, letterSpacing: "1px",
            }}
          >
            {t === "scan" ? "🔎 RECONOCIMIENTO FACIAL" : `📋 DETENIDOS (${detainees.length})`}
          </button>
        ))}
      </div>

      {/* ── SCAN TAB ───────────────────────────────────────────────────────── */}
      {panelTab === "scan" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <p style={{ color: "#3a6a5a", fontSize: 9, marginBottom: 14, letterSpacing: "1px" }}>
            Sube una foto del sospechoso. El sistema consultará la base de datos nacional y redes sociales.
          </p>

          {/* Upload button */}
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
            padding: "8px 18px", borderRadius: 6, marginBottom: 16,
            background: "rgba(0,255,200,0.08)", border: "1px solid rgba(0,255,200,0.3)",
            color: "#00ffcc", fontSize: 10, letterSpacing: "1px",
          }}>
            📷 SUBIR FOTO / CAPTURA
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
          </label>

          {/* Preview + scan overlay */}
          {previewUrl && (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{
                position: "relative", borderRadius: 10, overflow: "hidden",
                border: `2px solid ${scanResult ? scanResult.riskColor : "rgba(0,255,200,0.4)"}`,
                width: 220, height: 220, flexShrink: 0,
              }}>
                <img src={previewUrl} alt="scan" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {scanPhase === "scanning" && (
                  <>
                    <div className="face-scan-grid" />
                    <div className="face-scan-line" />
                    {/* Concentric HUD rings */}
                    <div className="face-ring" style={{ inset: "15%",  zIndex: 6 }} />
                    <div className="face-ring" style={{ inset: "30%",  zIndex: 6, animationDirection: "reverse", animationDuration: "4s" }} />
                    {/* Corner brackets */}
                    {[
                      { top: 6, left: 6 },   { top: 6, right: 6 },
                      { bottom: 6, left: 6 }, { bottom: 6, right: 6 },
                    ].map((pos, i) => (
                      <div key={i} style={{
                        position: "absolute", ...pos,
                        width: 16, height: 16,
                        borderTop:    i < 2 ? "2px solid #00ffcc" : "none",
                        borderBottom: i >= 2 ? "2px solid #00ffcc" : "none",
                        borderLeft:   i % 2 === 0 ? "2px solid #00ffcc" : "none",
                        borderRight:  i % 2 === 1 ? "2px solid #00ffcc" : "none",
                        zIndex: 7,
                      }} />
                    ))}
                    <div style={{
                      position: "absolute", bottom: 6, left: 0, right: 0, zIndex: 8,
                      textAlign: "center", color: "#00ffcc", fontSize: 8,
                      fontFamily: "monospace", letterSpacing: "2px",
                    }}>
                      ESCANEANDO ROSTRO…
                    </div>
                  </>
                )}
                {scanPhase === "done" && scanResult && (
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 8,
                    background: `${scanResult.riskColor}cc`,
                    padding: "4px 8px", textAlign: "center",
                    fontSize: 9, color: "#fff", letterSpacing: "1px", fontWeight: "bold",
                  }}>
                    {scanResult.match}% · {scanResult.riskLevel}
                  </div>
                )}
              </div>

              {/* Result card */}
              {scanPhase === "done" && scanResult && (
                <div className="face-result-in" style={{
                  flex: 1, minWidth: 200,
                  padding: "14px 16px", borderRadius: 10,
                  background: `${scanResult.riskColor}10`,
                  border: `2px solid ${scanResult.riskColor}50`,
                }}>
                  <p style={{ color: scanResult.riskColor, fontSize: 9, letterSpacing: "2px", margin: "0 0 10px", fontWeight: "bold" }}>
                    🔬 RESULTADO — BASE DE DATOS NACIONAL
                  </p>
                  {[
                    { label: "Coincidencia",   value: `${scanResult.match}%` },
                    { label: "Alias",           value: scanResult.alias },
                    { label: "Delito",          value: scanResult.crime },
                    { label: "Fuente",          value: scanResult.source },
                    { label: "Nivel de riesgo", value: scanResult.riskLevel },
                    { label: "Timestamp",        value: scanResult.timestamp.replace("T"," ").slice(0,19) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "4px 0", borderBottom: "1px solid rgba(0,255,200,0.05)",
                    }}>
                      <span style={{ color: "#3a6a5a", fontSize: 8 }}>{label}</span>
                      <span style={{ color: "#e0ffe8", fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{value}</span>
                    </div>
                  ))}
                  <p style={{ fontSize: 7, color: "#2a4a3a", marginTop: 8 }}>
                    Coincidencia detectada en Redes Sociales / Base de Datos. Fuente: {scanResult.source}.
                    Vinculado a: {scanResult.crime}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Register as detainee */}
          {scanPhase === "done" && (
            <div style={{
              marginTop: 20, padding: "14px 16px", borderRadius: 10,
              background: "rgba(0,255,200,0.03)", border: "1px solid rgba(0,255,200,0.1)",
            }}>
              <p style={{ color: "#00ffcc", fontSize: 9, letterSpacing: "2px", margin: "0 0 10px" }}>
                📋 REGISTRAR COMO DETENIDO
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input value={detFolio}   onChange={(e) => setDetFolio(e.target.value)}   placeholder="Folio del caso" style={inputSt} />
                <input value={detOfficer} onChange={(e) => setDetOfficer(e.target.value)} placeholder="Oficial responsable" style={inputSt} />
              </div>
              <label style={{
                display: "block", padding: "7px 12px", marginBottom: 8, borderRadius: 6,
                background: "rgba(0,255,200,0.06)", border: "1px solid rgba(0,255,200,0.2)",
                cursor: "pointer", fontSize: 9, color: "#00ffcc",
              }}>
                {detImageUrl ? "✅ Foto del detenido cargada" : "📸 Subir foto del detenido"}
                <input ref={detFileRef} type="file" accept="image/*" onChange={handleDetaineeUpload} style={{ display: "none" }} />
              </label>
              <button onClick={registerDetainee} style={{
                width: "100%", padding: "9px", borderRadius: 6, cursor: "pointer",
                background: "rgba(0,255,200,0.12)", border: "1px solid rgba(0,255,200,0.4)",
                color: "#00ffcc", fontFamily: "monospace", fontWeight: "bold", fontSize: 10,
              }}>
                REGISTRAR DETENIDO →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DETAINEES TAB ──────────────────────────────────────────────────── */}
      {panelTab === "detainees" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          {detainees.length === 0 ? (
            <p style={{ color: "#2a4a3a", fontSize: 9, marginTop: 40, textAlign: "center" }}>
              Sin detenidos registrados. Usa la pestaña de Reconocimiento Facial.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {detainees.map((d) => (
                <div key={d.id} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  padding: "10px 12px", borderRadius: 8,
                  background: "rgba(255,23,68,0.05)", border: "1px solid rgba(255,23,68,0.2)",
                }}>
                  <img
                    src={d.imageUrl}
                    alt={d.id}
                    style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover",
                      border: "1px solid rgba(255,23,68,0.4)", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#ff1744", fontSize: 9, fontWeight: "bold", margin: "0 0 3px", letterSpacing: "1px" }}>
                      {d.id} · Folio: <code style={{ color: "#c8a84b" }}>{d.folio}</code>
                    </p>
                    <p style={{ color: "#e0ffe8", fontSize: 9, margin: "0 0 2px" }}>Alias: {d.alias}</p>
                    <p style={{ color: "#4a8a6a", fontSize: 8, margin: "0 0 2px" }}>Cargo: {d.crime}</p>
                    <p style={{ color: "#3a5a4a", fontSize: 7, margin: 0 }}>
                      Oficial: {d.officer} · {d.timestamp.replace("T"," ").slice(0,19)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
