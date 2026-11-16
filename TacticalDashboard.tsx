import React, { useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const TacticalDashboard = () => {
  const [agentResponse, setAgentResponse] = useState(
    "Sistema SANTI NEXUS en línea. Esperando instrucciones.",
  );

  // ── Barge-in voice ──────────────────────────────────────────────────────────
  // speakResponse: cancels any ongoing speech before starting new utterance.
  // startListening: calls speechSynthesis.cancel() immediately so the agent
  //   stops talking the instant the user begins speaking — "barge-in" behaviour.
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  const speakResponse = useCallback((text: string, agentName: string) => {
    // Cancel any speech currently playing (barge-in: new speech interrupts old)
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    if (agentName === "KATERING") {
      utterance.pitch = 1.6;
      utterance.rate = 1.05;
    } else {
      utterance.pitch = 0.8;
      utterance.rate = 1.0;
    }
    // Pick best available Spanish voice
    const loadAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.lang.includes("es") && v.name.includes("Google")) ||
        voices.find((v) => v.lang.includes("es"));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length) {
      loadAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = loadAndSpeak;
    }
  }, []);

  const startListening = useCallback((onResult: (transcript: string) => void) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // ── Barge-in: stop the agent speaking the instant the mic opens ──────────
    window.speechSynthesis.cancel();

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend   = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) onResult(transcript.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#050505",
        color: "#fff",
      }}
    >
      {/* 🗺️ EL MAPA DE ÉLITE (Filtro CSS oscuro táctico sobre OpenStreetMap) */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={[23.6345, -102.5528]} // Centro de México Federal
          zoom={5}
          style={{
            height: "100%",
            width: "100%",
            filter:
              "invert(100%) hue-rotate(180deg) brightness(90%) contrast(120%)",
          }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          <Marker position={[23.6345, -102.5528]}>
            <Popup>Centro de Comando Nacional (CNIC)</Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* PANEL DE AGENTES Y VOZ */}
      <div
        style={{
          width: "400px",
          padding: "20px",
          backgroundColor: "#111",
          borderLeft: "1px solid #333",
        }}
      >
        <h2 style={{ color: "#00ffcc" }}>SANTI NEXUS - CMO</h2>
        <p style={{ fontSize: "12px", color: "#888" }}>
          Nivel Federal - Coordinación Interinstitucional
        </p>

        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#1a1a1a",
            borderRadius: "8px",
          }}
        >
          <p>
            <strong>Último Reporte:</strong> {agentResponse}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const msg = "Hola, soy KATERING. Estoy aquí para apoyarte. ¿Te sientes en peligro?";
              setAgentResponse(msg);
              speakResponse(msg, "KATERING");
            }}
            style={{ padding: "10px", backgroundColor: "#ff00aa", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            🦋 Hablar con Katering
          </button>

          <button
            onClick={() => {
              const msg = "Soy SANTI. Coordinando despliegue táctico a nivel federal.";
              setAgentResponse(msg);
              speakResponse(msg, "SANTI");
            }}
            style={{ padding: "10px", backgroundColor: "#0088ff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            🛡️ Hablar con SANTI
          </button>

          {/* Barge-in mic button — stops agent speech, starts listening */}
          <button
            onClick={() => startListening((transcript) => {
              setAgentResponse(`[Transcripción]: ${transcript}`);
              speakResponse(`Entendido. Dijiste: ${transcript}`, "SANTI");
            })}
            style={{
              padding: "10px", backgroundColor: isListening ? "#ff4400" : "#223322",
              color: isListening ? "white" : "#00ff88",
              border: `1px solid ${isListening ? "#ff4400" : "#00ff8840"}`,
              borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "11px",
            }}
          >
            {isListening ? "🔴 Escuchando..." : "🎤 Hablar (Barge-in)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TacticalDashboard;
