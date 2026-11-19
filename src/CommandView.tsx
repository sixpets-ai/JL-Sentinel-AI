// CommandView.tsx — SANTI NEXUS v4.1 — Panel Mando + Metricas en Tiempo Real
import React, { useState, useEffect } from "react";

interface Metrics {
  modelo: string; osint: string; consultas: number; osintHits: number;
  watsonxOK: number; ttsOK: number; uptime: string;
  ultimaConsulta: string | null; agentes: number; nodos: number; status: string;
}

const StatTile: React.FC<{ label: string; value: string | number; color?: string; blink?: boolean }> = ({
  label, value, color = "#00ff88", blink = false
}) => (
  <div style={{ background:"#0d0d1a", border:`1px solid ${color}33`, borderRadius:6, padding:"10px 14px", minWidth:110, flex:"1 1 110px" }}>
    <div style={{ color:"#666", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>{label}</div>
    <div style={{ color, fontSize:18, fontWeight:"bold", fontFamily:"Courier New", animation: blink ? "blink 1.2s step-end infinite" : "none" }}>{value}</div>
  </div>
);

export const CommandView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [activo, setActivo] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const r = await fetch("/api/metrics");
        if (r.ok) { setMetrics(await r.json()); setMetricsError(false); }
      } catch { setMetricsError(true); }
    };
    fetchMetrics();
    const id = setInterval(fetchMetrics, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const activarRojo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/officer-panic", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ officerId:"CMD-001", lat:19.4326, lng:-99.1332, message:"Codigo Rojo" }) });
      const data = await res.json();
      setActivo(true);
      setLog(p => [`CODIGO ROJO — Folio: ${data.folio || "N/A"}`, ...p]);
    } catch (e: any) { setLog(p => [`ERROR: ${e.message}`, ...p]); }
    finally { setLoading(false); }
  };

  const dotColor = tick % 2 === 0 ? "#00ff88" : "#00cc66";

  return (
    <div style={{ padding:20, background:"#0a0a0f", color:"#e0e0e0", minHeight:"100%", fontFamily:"Courier New" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:dotColor, boxShadow:`0 0 8px ${dotColor}` }} />
        <div style={{ color:"#ff4444", fontSize:18, fontWeight:"bold", letterSpacing:2 }}>MANDO TACTICO — SANTI NEXUS</div>
        <div style={{ marginLeft:"auto", color:"#444", fontSize:11 }}>{new Date().toLocaleString("es-MX",{hour12:false})}</div>
      </div>

      <div style={{ background:"#080812", border:"1px solid #1a1a3a", borderRadius:10, padding:16, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <span style={{ color:"#4488ff", fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>◈ SISTEMA EN TIEMPO REAL</span>
          {!metricsError && metrics && <span style={{ marginLeft:"auto", color:"#00ff8888", fontSize:10 }}>● LIVE · uptime {metrics.uptime}</span>}
          {metricsError && <span style={{ marginLeft:"auto", color:"#ff444488", fontSize:10 }}>⚠ sin datos</span>}
        </div>
        {metrics ? (<>
          <div style={{ marginBottom:10, padding:"8px 10px", background:"#0d0d1a", borderRadius:6, border:"1px solid #1a1a2e" }}>
            <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
              <div><span style={{ color:"#555", fontSize:10 }}>MODELO · </span><span style={{ color:"#4488ff", fontSize:12, fontWeight:"bold" }}>{metrics.modelo}</span></div>
              <div><span style={{ color:"#555", fontSize:10 }}>OSINT · </span><span style={{ color:"#aa88ff", fontSize:12 }}>{metrics.osint}</span></div>
              <div><span style={{ color:"#555", fontSize:10 }}>AGENTES · </span><span style={{ color:"#00ff88", fontSize:12, fontWeight:"bold" }}>{metrics.agentes}</span></div>
              <div><span style={{ color:"#555", fontSize:10 }}>NODOS · </span><span style={{ color:"#ffaa00", fontSize:12, fontWeight:"bold" }}>{metrics.nodos.toLocaleString()}</span></div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <StatTile label="Consultas" value={metrics.consultas} color="#4488ff" />
            <StatTile label="OSINT hits" value={metrics.osintHits} color="#aa88ff" blink={metrics.osintHits > 0} />
            <StatTile label="Watsonx OK" value={metrics.watsonxOK} color="#00ff88" />
            <StatTile label="TTS OK" value={metrics.ttsOK} color="#ffaa00" />
            <StatTile label="Estado" value={metrics.status} color={metrics.status==="OPERATIVO"?"#00ff88":"#ff4444"} blink={metrics.status==="OPERATIVO"} />
          </div>
          {metrics.ultimaConsulta && (
            <div style={{ marginTop:8, color:"#444", fontSize:10 }}>ULTIMA CONSULTA · {new Date(metrics.ultimaConsulta).toLocaleTimeString("es-MX",{hour12:false})}</div>
          )}
        </>) : (
          <div style={{ color:"#333", fontSize:12, textAlign:"center", padding:20 }}>Cargando metricas del sistema…</div>
        )}
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={activarRojo} disabled={loading}
          style={{ padding:"14px 28px", background: activo?"#ff000033":"#ff444422", border:"2px solid #ff4444", color:"#ff4444", borderRadius:8, cursor:"pointer", fontSize:15, fontWeight:"bold", letterSpacing:1 }}>
          {loading ? "Enviando…" : "⚠ CODIGO ROJO"}
        </button>
        <button onClick={() => { setActivo(false); setLog(p => ["Alerta cancelada", ...p]); }}
          style={{ padding:"14px 28px", background:"transparent", border:"1px solid #333", color:"#666", borderRadius:8, cursor:"pointer" }}>
          Cancelar
        </button>
      </div>

      <div style={{ background:"#080812", border:"1px solid #1a1a2e", borderRadius:8, padding:12, maxHeight:220, overflowY:"auto" }}>
        <div style={{ color:"#333", fontSize:10, letterSpacing:2, marginBottom:8 }}>LOG TACTICO</div>
        {log.length === 0 && <div style={{ color:"#2a2a3a", fontSize:12 }}>Sin eventos registrados</div>}
        {log.map((l, i) => (
          <div key={i} style={{ color: l.startsWith("ERROR")?"#ff4444":l.startsWith("CODIGO")?"#ff8800":"#00ff8899", fontSize:12, marginBottom:4, borderBottom:"1px solid #0d0d1a", paddingBottom:4 }}>
            <span style={{ color:"#333", marginRight:8 }}>{new Date().toLocaleTimeString("es-MX",{hour12:false})}</span>{l}
          </div>
        ))}
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
};
