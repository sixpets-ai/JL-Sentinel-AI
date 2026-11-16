import React from "react";

export function speakTextEnhanced(text: string, agent: { gender: "male" | "female"; rate: number }, onEnd: () => void): void {
  if (!window.speechSynthesis) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-US";
  u.volume = 1;

  if (agent.gender === "female") {
    u.pitch = 1.6;
    u.rate = 0.95;
  } else {
    u.pitch = 0.6;
    u.rate = 0.88;
  }

  const voices = window.speechSynthesis.getVoices();
  const esVoices = voices.filter(v => v.lang.toLowerCase().startsWith("es"));
  
  if (esVoices.length > 0) {
    if (agent.gender === "female") {
      const fem = esVoices.find(v => /female|mujer|sofia|paulina|helena|sabina|laura|monica|mónica|lucia/i.test(v.name));
      u.voice = fem || esVoices[0];
    } else {
      const masc = esVoices.find(v => /male|hombre|jorge|diego|juan|carlos|enrique|raul|pablo|miguel/i.test(v.name));
      u.voice = masc || esVoices[0];
    }
  }

  u.onend = onEnd;
  u.onerror = onEnd;
  setTimeout(() => window.speechSynthesis.speak(u), 50);
}
