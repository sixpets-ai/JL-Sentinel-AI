import { useState, useRef, useCallback, useEffect } from "react";

let _speechUnlocked = false;
function unlockSpeech() {
  if (_speechUnlocked) return;
  _speechUnlocked = true;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

const BASE = import.meta.env.VITE_IBM_BASE_URL || "http://localhost:3001";

const AGENTES = [
  { id:"SANTI",      nombre:"SANTI",      emoji:"ðŸ‘®", color:"#C8A84B", rol:"Comandante Nacional Â· IA TÃ¡ctica",           voz:"es-LA_JorgeV3Voice", pitch:0.80, rate:0.85, genero:"m" },
  { id:"LORENA",     nombre:"LORENA",     emoji:"ðŸŒ¸", color:"#ff4fc8", rol:"Directora DDHH Â· AtenciÃ³n a VÃ­ctimas",       voz:"es-LA_SofiaV3Voice", pitch:1.05, rate:0.95, genero:"f" },
  { id:"JOSEMANUEL", nombre:"JOSE MANUEL",emoji:"âš›",  color:"#00b0ff", rol:"CientÃ­fico de Datos Â· Motor CuÃ¡ntico Qiskit", voz:"es-LA_JorgeV3Voice", pitch:0.84, rate:0.90, genero:"m" },
  { id:"MAXIMILIANO",nombre:"MAXI",       emoji:"ðŸ”Ž", color:"#9C27B0", rol:"Inteligencia Â· C2 Â· OSINT",                  voz:"es-LA_JorgeV3Voice", pitch:0.84, rate:0.87, genero:"m" },
  { id:"EMILIANO",   nombre:"EMILIANO",   emoji:"âš”ï¸", color:"#1E88E5", rol:"Comandante TÃ¡ctico Â· Operaciones de Campo",  voz:"es-LA_JorgeV3Voice", pitch:0.88, rate:0.92, genero:"m" },
  { id:"KATERINE",   nombre:"KATERINE",   emoji:"ðŸš¨", color:"#E91E8C", rol:"CÃ³digo Violeta Â· GestiÃ³n de Crisis",         voz:"es-LA_SofiaV3Voice", pitch:1.22, rate:0.83, genero:"f" },
  { id:"SANTIAGO",   nombre:"SANTIAGO",   emoji:"ðŸ«", color:"#00897B", rol:"Escuela Segura Â· PrevenciÃ³n del Delito",     voz:"es-LA_JorgeV3Voice", pitch:0.96, rate:0.90, genero:"m" },
];

const FALLBACKS: Record<string,string> = {
  SANTI:      "SANTI en lÃ­nea. 1450 nodos OSINT activos. Â¿CuÃ¡l es su consulta tÃ¡ctica?",
  LORENA:     "Lorena en lÃ­nea. EstÃ¡s en buenas manos. Protocolo ALBA disponible. Â¿QuÃ© necesitas?",
  JOSEMANUEL: "JosÃ© Manuel en modo local. Motor cuÃ¡ntico Qiskit standby. 87.4% de certeza en prÃ³ximo anÃ¡lisis.",
  MAXIMILIANO:"Maxi en local. Rastreo OSINT con 1450 nodos monitoreados. Listo para anÃ¡lisis.",
  EMILIANO:   "Emiliano en local. Unidades desplegadas. Despliegue tÃ¡ctico autorizado bajo protocolo.",
  KATERINE:   "Katerine en local. CÃ³digo Violeta en standby. Unidades de respuesta en alerta.",
  SANTIAGO:   "Santiago en local. Programa Escuela Segura activo. 23 planteles monitoreados.",
};

const FIN_CONVERSACION = ["eso es todo","gracias","hasta luego","adiós","bye","hasta pronto","fin","terminar","cerrar","that's all","thank you","goodbye","hasta mañana","nos vemos"];

const IDIOMAS = [
  { code:"es-MX", label:"ES Mexico",    flag:"MX" },
  { code:"es-ES", label:"ES Espana",    flag:"ES" },
  { code:"es-AR", label:"ES Argentina", flag:"AR" },
  { code:"en-US", label:"EN USA",       flag:"US" },
  { code:"fr-FR", label:"FR France",    flag:"FR" },
];

function useWatchdog(onRevive:()=>void) {
  const fails = useRef(0);
  useEffect(()=>{
    const t = setInterval(async()=>{
      try { const r=await fetch(`${BASE}/api/ibm/health`); if(r.ok){fails.current=0}else{fails.current++; if(fails.current>=2){onRevive();fails.current=0;}} }
      catch { fails.current++; if(fails.current>=2){onRevive();fails.current=0;} }
    },15000);
    return ()=>clearInterval(t);
  },[]);
}

// â”€â”€ Avatar hologrÃ¡fico SVG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AvatarHolograma = ({ agente, isSpeaking, isListening, isThinking, modoChat }:
  { agente:any, isSpeaking:boolean, isListening:boolean, isThinking:boolean, modoChat:boolean }) => {
  const color = agente.color;
  const esF = agente.genero === "f";
  const [bocaAbierta, setBocaAbierta] = useState(false);
  const [scanY, setScanY] = useState(0);
  const [parpadeo, setParpadeo] = useState(false);

  useEffect(()=>{
    if(!isSpeaking){ setBocaAbierta(false); return; }
    const t = setInterval(()=> setBocaAbierta(p=>!p), 150);
    return ()=>clearInterval(t);
  },[isSpeaking]);

  useEffect(()=>{
    const parpadear = () => {
      setParpadeo(true);
      setTimeout(()=>setParpadeo(false), 100);
      setTimeout(parpadear, 2500 + Math.random()*3000);
    };
    const id = setTimeout(parpadear, 1000);
    return ()=>clearTimeout(id);
  },[]);

  useEffect(()=>{
    const t = setInterval(()=> setScanY(p=>(p+2)%160), 30);
    return ()=>clearInterval(t);
  },[]);

  const glowSize = isSpeaking ? "0 0 40px" : isListening ? "0 0 25px" : "0 0 15px";
  const glowColor = isListening ? "#00ffcc" : color;

  return (
    <div style={{
      position:"relative", width:"100%", display:"flex", justifyContent:"center", alignItems:"center",
      padding:"8px 0", background:"radial-gradient(ellipse at center, rgba(0,8,20,0.9) 0%, #030810 100%)"
    }}>
      {/* Anillos orbitales */}
      {[1,2,3].map(i=>(
        <div key={i} style={{
          position:"absolute", borderRadius:"50%",
          width: 80+i*40, height: 80+i*40,
          border:`1px solid ${color}${i===1?"33":i===2?"22":"11"}`,
          animation:`orbit ${3+i}s linear infinite`,
          boxShadow:`0 0 ${i*4}px ${color}22`
        }}/>
      ))}

      <svg width="140" height="160" viewBox="0 0 140 160" style={{
        filter:`drop-shadow(${glowSize} ${glowColor}88)`,
        transition:"filter 0.3s"
      }}>
        <defs>
          <radialGradient id={`fg${agente.id}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#000820" stopOpacity="0.95"/>
          </radialGradient>
          <radialGradient id={`skin${agente.id}`} cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor={esF?"#ffe4d0":"#d4b896"} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={esF?"#c9956a":"#8a6540"} stopOpacity="0.7"/>
          </radialGradient>
          <filter id={`glow${agente.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id={`clip${agente.id}`}>
            <ellipse cx="70" cy="65" rx="38" ry="46"/>
          </clipPath>
        </defs>

        {/* Fondo hologrÃ¡fico */}
        <ellipse cx="70" cy="80" rx="62" ry="72" fill={`url(#fg${agente.id})`}/>
        <ellipse cx="70" cy="80" rx="62" ry="72" fill="none" stroke={color} strokeWidth="0.5" opacity="0.4"/>

        {/* Scan line hologrÃ¡fico */}
        <line x1="10" y1={scanY} x2="130" y2={scanY}
          stroke={color} strokeWidth="1" opacity="0.15"
          style={{transition:"none"}}/>

        {/* Grid hologrÃ¡fico de fondo */}
        {[20,40,60,80,100,120].map(x=>(
          <line key={x} x1={x} y1="10" x2={x} y2="150" stroke={color} strokeWidth="0.3" opacity="0.06"/>
        ))}
        {[20,40,60,80,100,120,140].map(y=>(
          <line key={y} x1="10" y1={y} x2="130" y2={y} stroke={color} strokeWidth="0.3" opacity="0.06"/>
        ))}

        {/* â”€â”€ ROSTRO â”€â”€ */}
        {/* Cuello */}
        <rect x="58" y="104" width="24" height="20" rx="4" fill={`url(#skin${agente.id})`} opacity="0.8"/>

        {/* Hombros / uniforme */}
        {esF ? (
          <path d="M 20 145 Q 35 118 55 112 L 85 112 Q 105 118 120 145 Z"
            fill={color} opacity="0.25"/>
        ):(
          <path d="M 15 150 Q 30 115 55 110 L 85 110 Q 110 115 125 150 Z"
            fill={color} opacity="0.3"/>
        )}
        {/* Insignia */}
        {!esF && <polygon points="70,114 73,121 80,121 74,125 76,132 70,128 64,132 66,125 60,121 67,121"
          fill={color} opacity="0.6" transform="scale(0.7) translate(30,50)"/>}

        {/* Cabeza */}
        <ellipse cx="70" cy="65" rx="38" ry="46"
          fill={`url(#skin${agente.id})`}
          stroke={color} strokeWidth="0.8" opacity="0.95"/>

        {/* Cabello */}
        {esF ? (
          <>
            <path d="M 32 55 Q 30 25 70 18 Q 110 25 108 55 Q 100 30 70 28 Q 40 30 32 55 Z"
              fill={color} opacity="0.7"/>
            <path d="M 32 55 Q 28 80 32 95" stroke={color} strokeWidth="8" fill="none" opacity="0.5" strokeLinecap="round"/>
            <path d="M 108 55 Q 112 80 108 95" stroke={color} strokeWidth="8" fill="none" opacity="0.5" strokeLinecap="round"/>
          </>
        ):(
          <path d="M 32 58 Q 32 22 70 18 Q 108 22 108 58 Q 102 32 70 28 Q 38 32 32 58 Z"
            fill={color} opacity="0.6"/>
        )}

        {/* Cejas */}
        <path d={esF?"M 50 48 Q 58 44 66 47":"M 48 50 Q 56 45 65 48"}
          stroke={color} strokeWidth={esF?"1.5":"2"} fill="none" opacity="0.9" strokeLinecap="round"/>
        <path d={esF?"M 74 47 Q 82 44 90 48":"M 75 48 Q 84 45 92 50"}
          stroke={color} strokeWidth={esF?"1.5":"2"} fill="none" opacity="0.9" strokeLinecap="round"/>

        {/* Ojos */}
        {/* Ojo izquierdo */}
        <ellipse cx="58" cy={esF?57:58} rx={esF?8:7} ry={esF?6:5}
          fill="#000820" stroke={color} strokeWidth="1" opacity="0.95"/>
        <ellipse cx="58" cy={esF?57:58} rx={esF?5:4} ry={esF?4:3.5}
          fill={color} opacity="0.8"/>
        <ellipse cx="58" cy={esF?57:58} rx={esF?2.5:2} ry={esF?2.5:2}
          fill="#000"/>
        <ellipse cx={esF?60:60} cy={esF?55:56} rx="1" ry="1" fill="#fff" opacity="0.9"/>
        {esF && <path d="M 50 54 Q 58 50 66 54" stroke={color} strokeWidth="1.5" fill="none" opacity="0.7"/>}

        {/* Ojo derecho */}
        <ellipse cx="82" cy={esF?57:58} rx={esF?8:7} ry={esF?6:5}
          fill="#000820" stroke={color} strokeWidth="1" opacity="0.95"/>
        <ellipse cx="82" cy={esF?57:58} rx={esF?5:4} ry={esF?4:3.5}
          fill={color} opacity="0.8"/>
        <ellipse cx="82" cy={esF?57:58} rx={esF?2.5:2} ry={esF?2.5:2}
          fill="#000"/>
        <ellipse cx={esF?84:84} cy={esF?55:56} rx="1" ry="1" fill="#fff" opacity="0.9"/>
        {esF && <path d="M 74 54 Q 82 50 90 54" stroke={color} strokeWidth="1.5" fill="none" opacity="0.7"/>}

        {/* Nariz */}
        <path d={esF?"M 68 65 Q 70 72 72 65":"M 67 66 Q 70 74 73 66"}
          stroke={color} strokeWidth="1" fill="none" opacity="0.5"/>
        {!esF && <path d="M 65 72 Q 70 75 75 72" stroke={color} strokeWidth="1" fill="none" opacity="0.4"/>}

        {/* Boca animada */}
        {bocaAbierta ? (
          <ellipse cx="70" cy={esF?83:84} rx={esF?10:9} ry={esF?5:6}
            fill="#000820" stroke={color} strokeWidth="1" opacity="0.9"/>
        ):(
          <path d={esF?"M 61 83 Q 70 89 79 83":"M 61 84 Q 70 90 79 84"}
            stroke={color} strokeWidth={esF?"1.5":"2"} fill="none" opacity="0.9" strokeLinecap="round"/>
        )}
        {/* Dientes si boca abierta */}
        {bocaAbierta && (
          <rect x="63" y={esF?83:84} width="14" height="3" rx="1" fill="#ffffffcc"/>
        )}

        {/* Mejillas femeninas */}
        {esF && <>
          <ellipse cx="50" cy="70" rx="8" ry="5" fill={color} opacity="0.12"/>
          <ellipse cx="90" cy="70" rx="8" ry="5" fill={color} opacity="0.12"/>
        </>}

        {/* HUD overlay */}
        <rect x="10" y="10" width="30" height="12" rx="2"
          fill="rgba(0,0,0,0.6)" stroke={color} strokeWidth="0.5"/>
        <text x="13" y="19" fill={color} fontSize="5" fontFamily="monospace" opacity="0.8">
          {isThinking?"PROC...":isSpeaking?"EMIT":isListening?"AUDIO":"STANDBY"}
        </text>

        <rect x="100" y="10" width="30" height="12" rx="2"
          fill="rgba(0,0,0,0.6)" stroke={color} strokeWidth="0.5"/>
        <text x="103" y="19" fill={color} fontSize="5" fontFamily="monospace" opacity="0.8">
          IBM v4.1
        </text>

        {/* LÃ­neas de datos laterales */}
        {[0,1,2,3].map(i=>(
          <rect key={i} x="10" y={30+i*8} width={8+Math.random()*15} height="2" rx="1"
            fill={color} opacity={isSpeaking?0.6:0.2}/>
        ))}
        {[0,1,2,3].map(i=>(
          <rect key={i} x={130-(8+Math.random()*15)} y={30+i*8} width={8+Math.random()*15} height="2" rx="1"
            fill={color} opacity={isSpeaking?0.6:0.2}/>
        ))}

        {/* Indicador estado inferior */}
        <rect x="30" y="148" width="80" height="8" rx="4"
          fill="rgba(0,0,0,0.5)" stroke={color} strokeWidth="0.5"/>
        <rect x="32" y="149" width={isThinking?40:isSpeaking?70:isListening?55:20} height="6" rx="3"
          fill={color} opacity="0.7"
          style={{transition:"width 0.3s"}}/>
      </svg>

      {/* Estado texto */}
      <div style={{
        position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)",
        fontSize:7, letterSpacing:2, color:isListening?"#00ffcc":color,
        fontFamily:"monospace", opacity:0.8, whiteSpace:"nowrap"
      }}>
        {isThinking?"âŸ³ PROCESANDO":isSpeaking?"â—‰ TRANSMITIENDO":isListening?"â—Ž ESCUCHANDO":"â—ˆ EN LÃNEA"}
      </div>
    </div>
  );
};
export const TacticalDashboard = () => {
  const [agente, setAgente] = useState(AGENTES[0]);
  const [respuesta, setRespuesta] = useState("Sistema SANTI NEXUS v4.1 en lÃ­nea. 7 agentes IBM activos.");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [input, setInput] = useState("");
  const [estados, setEstados] = useState<Record<string,string>>(Object.fromEntries(AGENTES.map(a=>[a.id,"online"])));
  const [historial, setHistorial] = useState<{agente:string,color:string,emoji:string,texto:string,hora:string}[]>([]);
  const [modoChat, setModoChat] = useState(false);
  const [idiomaDetectado, setIdiomaDetectado] = useState("es-MX");
  const [idiomaManual, setIdiomaManual] = useState("es-MX");
  const [showIdiomas, setShowIdiomas] = useState(false);
  const [inputInterim, setInputInterim] = useState("");
  const recRef = useRef<any>(null);
  const cicloRef = useRef(false);

  const detectarIdioma = (texto:string) => {
    const en = /\b(the|is|are|what|how|when|where|who|can|please|hello|hi|thanks)\b/i.test(texto);
    const fr = /\b(le|la|les|est|sont|que|qui|comment|merci|bonjour)\b/i.test(texto);
    if(en) return "en-US";
    if(fr) return "fr-FR";
    return idiomaManual;
  };

  const esFin = (texto:string) =>
    FIN_CONVERSACION.some(f => texto.toLowerCase().includes(f));

  const hablar = useCallback(async(texto:string, ag=agente):Promise<void>=>{
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    return new Promise(async(resolve)=>{
      try {
        const res=await fetch(`${BASE}/api/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:texto,voice:ag.voz})});
        if(res.ok){
          const ct=res.headers.get('content-type')||'';
          if(ct.includes('audio')){
            const blob=await res.blob();
            const url=URL.createObjectURL(blob);
            const audio=new Audio(url);
            audio.onended=()=>{setIsSpeaking(false);URL.revokeObjectURL(url);resolve();};
            audio.onerror=()=>{setIsSpeaking(false);resolve();};
            await audio.play(); return;
          }
        }
      } catch {}
      const u=new SpeechSynthesisUtterance(texto);
      u.lang=idiomaDetectado; u.pitch=ag.pitch; u.rate=ag.rate;
      u.onend=()=>{setIsSpeaking(false);resolve();};
      u.onerror=()=>{setIsSpeaking(false);resolve();};
      const hablarConVoz=()=>{
        const vs=window.speechSynthesis.getVoices();
        const v=vs.find(x=>x.lang.includes("es")&&x.name.includes("Google"))||vs.find(x=>x.lang.includes("es"))||vs[0];
        if(v)u.voice=v;
        window.speechSynthesis.cancel();
        setTimeout(()=>window.speechSynthesis.speak(u),100);
      };
      if(window.speechSynthesis.getVoices().length>0){hablarConVoz();}
      else{window.speechSynthesis.onvoiceschanged=hablarConVoz;}
    });
  },[agente, idiomaDetectado]);

  const consultar = useCallback(async(texto:string, ag=agente)=>{
    if(!texto.trim()) return;
    const idioma = detectarIdioma(texto);
    setIdiomaDetectado(idioma);
    setIsThinking(true);
    setEstados(e=>({...e,[ag.id]:"thinking"}));
    const hora=new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    let reply="";
    try {
      const r1=await fetch(`${BASE}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:ag.id,message:texto,lang:idioma})});
      if(r1.ok){const d=await r1.json();reply=d.response||d.text||d.generated_text||"";}
    } catch {}
    if(!reply){
      try {
        const r2=await fetch(`${BASE}/api/ibm/watsonx/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:texto,agent:ag.id,model_id:"meta-llama/llama-3-3-70b-instruct"})});
        if(r2.ok){const d=await r2.json();reply=d.results?.[0]?.generated_text||d.generated_text||d.text||"";}
      } catch {}
    }
    if(!reply){
      try {
        const r3=await fetch(`${BASE}/api/ibm/assistant/message`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:texto,agent:ag.id})});
        if(r3.ok){const d=await r3.json();reply=d.output?.generic?.[0]?.text||d.text||d.response||"";}
      } catch {}
    }
    if(!reply) reply=FALLBACKS[ag.id]||"Sistema en modo local.";
    reply=reply.trim();
    setRespuesta(reply);
    setHistorial(h=>[...h.slice(-19),{agente:ag.nombre,color:ag.color,emoji:ag.emoji,texto:reply,hora}]);
    setEstados(e=>({...e,[ag.id]:"online"}));
    setIsThinking(false);
    await hablar(reply, ag);
    // Ciclo continuo: si estÃ¡ en modo chat, vuelve a escuchar
    if(cicloRef.current && !esFin(texto)){
      setTimeout(()=>{ if(cicloRef.current) escucharCiclo(ag); }, 400);
    } else if(esFin(texto)){
      cicloRef.current=false;
      setModoChat(false);
    }
  },[agente, hablar]);

  const escucharCiclo = useCallback((ag=agente)=>{
    if(!cicloRef.current) return;
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR) return;
    if(recRef.current){ try{ recRef.current.abort(); }catch{} }
    const r=new SR();
    r.lang=idiomaDetectado; r.continuous=false; r.interimResults=false;
    r.onstart=()=>setIsListening(true);
    r.onend=()=>setIsListening(false);
    r.onerror=()=>{ setIsListening(false); if(cicloRef.current) setTimeout(()=>escucharCiclo(ag),1000); };
    r.onresult=(e:any)=>{
      const t=e.results[0]?.[0]?.transcript||"";
      if(t.trim()){ setInput(t); consultar(t, ag); }
      else if(cicloRef.current) setTimeout(()=>escucharCiclo(ag),500);
    };
    recRef.current=r;
    try{ r.start(); }catch{}
  },[agente, consultar, idiomaDetectado]);

  const escuchar = useCallback(()=>{
    window.speechSynthesis.cancel(); setIsSpeaking(false);
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){ alert("Navegador no soporta voz"); return; }
    if(recRef.current){ try{ recRef.current.abort(); }catch{} }
    const r=new SR();
    r.lang=idiomaManual; r.continuous=false; r.interimResults=true;
    r.onstart=()=>setIsListening(true);
    r.onend=()=>{ setIsListening(false); setInputInterim(""); };
    r.onerror=()=>{ setIsListening(false); setInputInterim(""); };
    r.onresult=(e:any)=>{
      let interim="", final_="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal) final_+=e.results[i][0].transcript;
        else interim+=e.results[i][0].transcript;
      }
      setInputInterim(interim);
      if(final_.trim()){ setInput(final_.trim()); setInputInterim(""); consultar(final_.trim()); }
    };
    recRef.current=r;
    try{ r.start(); }catch{}
  },[consultar, idiomaDetectado]);

  const iniciarModoChat = useCallback(async(ag=agente)=>{
    unlockSpeech();
    cicloRef.current=true;
    setModoChat(true);
    const saludo=FALLBACKS[ag.id];
    setRespuesta(saludo);
    await hablar(saludo, ag);
    if(cicloRef.current) escucharCiclo(ag);
  },[agente, hablar, escucharCiclo]);

  const detenerModoChat = useCallback(()=>{
    cicloRef.current=false;
    setModoChat(false);
    setIsListening(false);
    window.speechSynthesis.cancel();
    if(recRef.current){ try{ recRef.current.abort(); }catch{} }
    setIsSpeaking(false);
  },[]);

  const cambiarAgente = useCallback((a:typeof AGENTES[0])=>{
    unlockSpeech();
    detenerModoChat();
    setAgente(a);
    setRespuesta(FALLBACKS[a.id]);
    hablar(FALLBACKS[a.id], a);
  },[detenerModoChat, hablar]);

  useWatchdog(()=>{
    setEstados(Object.fromEntries(AGENTES.map(a=>[a.id,"online"])));
    setRespuesta("Sistema SANTI NEXUS recuperado. 7 agentes IBM en lÃ­nea.");
  });

  const ACCESOS = ["Estado operativo","Incidentes activos","AnÃ¡lisis de riesgo","Protocolo de emergencia","Reporte OSINT","Escuela segura"];

  return (
    <div style={{width:"100%",height:"100%",background:"#030810",display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace",color:"#fff",overflow:"hidden"}}>

      {/* Header */}
      <div style={{padding:"8px 16px",borderBottom:"1px solid #C8A84B33",display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(90deg,rgba(200,168,75,0.08),transparent)"}}>
        <div>
          <div style={{color:"#C8A84B",fontWeight:"bold",fontSize:12,letterSpacing:3}}>â¬¡ SANTI NEXUS v4.1</div>
          <div style={{color:"#ffffff33",fontSize:7,letterSpacing:2}}>CENTRO DE MANDO OPERATIVO Â· IBM WATSONX Â· 28 CEREBROS</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{position:"relative"}}>
            <button onClick={e=>{e.stopPropagation();setShowIdiomas(s=>!s);}}
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:6,padding:"3px 9px",color:"#ffffff77",fontSize:8,cursor:"pointer",letterSpacing:1}}>
              {(IDIOMAS.find(i=>i.code===idiomaManual)||IDIOMAS[0]).flag} {(IDIOMAS.find(i=>i.code===idiomaManual)||IDIOMAS[0]).label}
            </button>
            {showIdiomas&&(
              <div style={{position:"absolute",top:"110%",right:0,background:"#080d18",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,overflow:"hidden",zIndex:200,minWidth:148}}>
                {IDIOMAS.map(id=>(
                  <div key={id.code} onClick={e=>{e.stopPropagation();setIdiomaManual(id.code);setShowIdiomas(false);}}
                    style={{padding:"7px 12px",cursor:"pointer",fontSize:9,display:"flex",gap:8,alignItems:"center",
                      color:idiomaManual===id.code?"#00ffcc":"#ffffff55",
                      background:idiomaManual===id.code?"rgba(0,255,200,0.08)":"transparent"}}>
                    <span>{id.flag}</span><span>{id.label}</span>
                    {idiomaManual===id.code&&<span style={{marginLeft:"auto",color:"#00ffcc",fontSize:10}}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {modoChat&&<div style={{fontSize:8,color:"#00ffcc",letterSpacing:2,animation:"pulse 1s infinite"}}>◉ CHARLA ACTIVA</div>}
          <div style={{width:6,height:6,borderRadius:"50%",background:"#00e676",boxShadow:"0 0 8px #00e676"}}/>
          <span style={{color:"#00e67677",fontSize:9,letterSpacing:1}}>{Object.values(estados).filter(s=>s==="online").length}/{AGENTES.length}</span>
        </div>
      </div>

      {/* Grid agentes */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:"#000",borderBottom:"1px solid #ffffff08"}}>
        {AGENTES.map(a=>(
          <div key={a.id} onClick={()=>cambiarAgente(a)}
            style={{padding:"7px 8px",cursor:"pointer",transition:"all 0.2s",
              background:agente.id===a.id?`${a.color}15`:"rgba(0,0,0,0.7)",
              borderBottom:agente.id===a.id?`2px solid ${a.color}`:"2px solid transparent"}}>
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:1}}>
              <div style={{width:5,height:5,borderRadius:"50%",flexShrink:0,
                background:estados[a.id]==="thinking"?"#ff9100":estados[a.id]==="online"?a.color:"#333",
                boxShadow:estados[a.id]==="online"?`0 0 5px ${a.color}`:"none"}}/>
              <span style={{fontSize:8,fontWeight:"bold",letterSpacing:1,color:agente.id===a.id?a.color:"#ffffff55"}}>{a.emoji} {a.id==="JOSEMANUEL"?"J.MANUEL":a.nombre}</span>
            </div>
            <div style={{color:"#ffffff22",fontSize:6,letterSpacing:0.5,lineHeight:1.3,paddingLeft:9}}>{a.rol.split("Â·")[0].trim()}</div>
          </div>
        ))}
      </div>

      {/* Layout principal: avatar + panel */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>

        {/* Avatar hologrÃ¡fico */}
        <div style={{width:160,flexShrink:0,borderRight:`1px solid ${agente.color}22`,
          background:"radial-gradient(ellipse at center, rgba(0,8,20,0.95) 0%, #030810 100%)",
          display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <AvatarHolograma
            agente={agente}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isThinking={isThinking}
            modoChat={modoChat}
          />
          {/* Info agente bajo avatar */}
          <div style={{padding:"6px 8px",borderTop:`1px solid ${agente.color}22`}}>
            <div style={{color:agente.color,fontSize:8,fontWeight:"bold",letterSpacing:1,marginBottom:2}}>{agente.emoji} {agente.nombre}</div>
            <div style={{color:"#ffffff44",fontSize:6,lineHeight:1.4}}>{agente.rol}</div>
          </div>
          {/* Botones charla */}
          <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:4}}>
            {!modoChat?(
              <button onClick={()=>iniciarModoChat(agente)}
                style={{padding:"7px 4px",borderRadius:8,cursor:"pointer",fontSize:7,fontWeight:"bold",letterSpacing:1,
                  background:`linear-gradient(135deg,${agente.color}33,${agente.color}11)`,
                  border:`1px solid ${agente.color}66`,color:agente.color}}>
                â–¶ INICIAR CHARLA
              </button>
            ):(
              <button onClick={detenerModoChat}
                style={{padding:"7px 4px",borderRadius:8,cursor:"pointer",fontSize:7,fontWeight:"bold",letterSpacing:1,
                  background:"rgba(255,68,0,0.15)",border:"1px solid #ff440066",color:"#ff4400"}}>
                â–  TERMINAR CHARLA
              </button>
            )}
            <button onClick={()=>{unlockSpeech();escuchar();}} disabled={isListening||isThinking||modoChat}
              style={{padding:"7px 4px",borderRadius:8,cursor:"pointer",fontSize:7,fontWeight:"bold",letterSpacing:1,
                background:isListening?"rgba(255,68,0,0.15)":"rgba(0,255,200,0.05)",
                border:isListening?"1px solid #ff4400":"1px solid rgba(0,255,200,0.2)",
                color:isListening?"#ff4400":"#00ffcc88",
                opacity:modoChat?0.3:1}}>
              {isListening?"â— ESCUCHANDO":"ðŸŽ¤ VOZ ÃšNICA"}
            </button>
            <button onClick={()=>{window.speechSynthesis.cancel();setIsSpeaking(false);}}
              style={{padding:"5px 4px",borderRadius:8,cursor:"pointer",fontSize:7,
                background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",color:"#ffffff44"}}>
              â–  SILENCIO
            </button>
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{flex:1,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8,overflow:"hidden",minWidth:0}}>

          {/* Respuesta */}
          <div style={{flex:1,background:"rgba(255,255,255,0.02)",borderRadius:10,border:`1px solid ${agente.color}22`,padding:"10px 12px",overflowY:"auto",position:"relative",minHeight:0}}>
            <div style={{color:agente.color,fontSize:7,letterSpacing:2,marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
              <span>{agente.emoji}</span><span>{agente.nombre}</span>
              <span style={{color:"#ffffff22"}}>Â·</span>
              <span style={{color:"#ffffff33"}}>{agente.rol}</span>
            </div>
            {isThinking?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:agente.color,opacity:0.6,animation:`bounce 0.8s ${i*0.2}s infinite`}}/>)}
                <span style={{color:"#ffffff33",fontSize:10,marginLeft:6}}>Procesando con IBM watsonx...</span>
              </div>
            ):(
              <div style={{color:"#fff",fontSize:12,lineHeight:1.8}}>{respuesta}</div>
            )}
            {isSpeaking&&(
              <div style={{position:"absolute",top:10,right:10,display:"flex",gap:2,alignItems:"flex-end"}}>
                {[2,4,6,4,6,3].map((h,i)=><div key={i} style={{width:3,background:agente.color,borderRadius:2,height:`${h*3}px`,opacity:0.9,animation:`wave ${0.5+i*0.1}s infinite alternate`}}/>)}
              </div>
            )}
          </div>

          {inputInterim&&(
            <div style={{padding:"4px 10px",borderRadius:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",color:"#ffffff55",fontSize:9,fontStyle:"italic",letterSpacing:0.5}}>
              * {inputInterim}
            </div>
          )}

          {/* Historial */}
          {historial.length>0&&(
            <div style={{maxHeight:60,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
              {historial.slice(-3).reverse().map((h,i)=>(
                <div key={i} style={{display:"flex",gap:5,fontSize:7,padding:"2px 6px",borderLeft:`2px solid ${h.color}44`}}>
                  <span>{h.emoji}</span>
                  <span style={{color:h.color,fontWeight:"bold",flexShrink:0}}>{h.agente}</span>
                  <span style={{color:"#ffffff22",flexShrink:0}}>{h.hora}</span>
                  <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#ffffff33"}}>{h.texto}</span>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <div style={{display:"flex",gap:5}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&consultar(input)}
                placeholder={modoChat?`Hablando con ${agente.nombre}...`:`Consulta a ${agente.nombre}...`}
                style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${agente.color}33`,borderRadius:8,padding:"8px 10px",color:"#fff",fontSize:10,outline:"none",fontFamily:"'Courier New',monospace"}}/>
              <button onClick={()=>{unlockSpeech();consultar(input);}} disabled={isThinking||!input.trim()}
                style={{padding:"8px 12px",background:`${agente.color}22`,border:`1px solid ${agente.color}55`,borderRadius:8,color:agente.color,cursor:"pointer",fontSize:9,fontWeight:"bold",letterSpacing:1,opacity:isThinking?0.4:1}}>
                ENVIAR
              </button>
            </div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {ACCESOS.map(q=>(
                <button key={q} onClick={()=>{unlockSpeech();setInput(q);consultar(q);}}
                  style={{padding:"3px 7px",borderRadius:12,cursor:"pointer",fontSize:7,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#ffffff44",letterSpacing:0.5}}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes wave{0%{opacity:0.4;transform:scaleY(0.7)}100%{opacity:1;transform:scaleY(1.3)}}
        @keyframes orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes orbit1{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes orbit2{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
        @keyframes orbit3{from{transform:rotate(60deg)}to{transform:rotate(420deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>
    </div>
  );
};

export default TacticalDashboard;
