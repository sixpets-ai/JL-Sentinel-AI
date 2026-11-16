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