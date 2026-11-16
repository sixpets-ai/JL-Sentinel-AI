import React, { useState, useEffect, useRef } from "react";
const VOICES = { SANTI:"es-ES_EnriqueV3Voice", LORENA:"es-LA_SofiaV3Voice", KATERINE:"es-ES_LauraV3Voice" };
export const AgenteAvatar: React.FC = () => {
  const [msg, setMsg] = useState("");
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const speak = async (t: string, agent: string) => {
    setSpeaking(true);
    const v = VOICES[agent] || VOICES.SANTI;
    try {
      const res = await fetch("/api/tts", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ text: t, voice: v }) });
      const data = await res.json();
      if (data.fallback) {
        const u = new SpeechSynthesisUtterance(t);
        u.pitch = agent === "LORENA" ? 1.4 : agent === "KATERINE" ? 1.3 : 0.85;
        u.rate = 0.9;
        u.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      } else {
        const audio = new Audio(URL.createObjectURL(await res.blob()));
        audio.onended = () => setSpeaking(false);
        audio.play();
      }
    } catch { setSpeaking(false); }
  };

  const send = async () => {
    if (!msg) return;
    const userMsg = msg; setMsg(""); setText("Pensando...");
    const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ agent:"SANTI", prompt: userMsg }) });
    const data = await res.json();
    setText(data.response);
    speak(data.response, "SANTI");
  };

  return (
    <div style={{ padding: 20, color: "white", background: "#000" }}>
      <h2>SANTI NEXUS {speaking && "🔊"}</h2>
      <div>{text}</div>
      <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Consulta..." />
      <button onClick={send}>Enviar</button>
    </div>
  );
};
export default AgenteAvatar;