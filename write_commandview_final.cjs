const fs = require('fs');
const f = 'C:/Users/Wyse/Desktop/J-L-Sentinel-AI/05_Respaldo_Codigo/Intelligent-Patrols/CommandView.tsx';

// CSS as plain string — NO template literals to avoid interpolation
const CSS_STR = [
  '@keyframes pal{0%,100%{opacity:1;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}',
  '@keyframes blk{0%,100%{opacity:1}50%{opacity:0.2}}',
  '@keyframes fin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
  '@keyframes scn{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}',
  '::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#00e5ff33}'
].join('');

const code = `import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const ALERTAS = [
  {id:"A-001",nivel:"Alta",tipo:"Homicidio",sector:"Iztapalapa",tiempo:"02:14",unidad:"SSP-042",coords:[19.3550,-99.0920]},
  {id:"A-002",nivel:"Alta",tipo:"Robo a negocio",sector:"Gustavo A. M.",tiempo:"03:41",unidad:"SSPC-107",coords:[19.4800,-99.1150]},
  {id:"A-003",nivel:"Media",tipo:"Accidente vial",sector:"Tlalpan",tiempo:"01:08",unidad:"BOMB-015",coords:[19.2900,-99.1600]},
  {id:"A-004",nivel:"Media",tipo:"Código Violeta",sector:"Benito Juárez",tiempo:"00:32",unidad:"SSP-318",coords:[19.3980,-99.1600]},
  {id:"A-005",nivel:"Baja",tipo:"Disturbio",sector:"Coyoacán",tiempo:"04:55",unidad:"GN-201",coords:[19.3500,-99.1600]},
  {id:"A-006",nivel:"Alta",tipo:"Secuestro activo",sector:"Álvaro Obregón",tiempo:"00:12",unidad:"FGR-523",coords:[19.3600,-99.2000]}
];

const KPI = [
  {label:"Unidades activas",valor:390,icono:"🚔",color:"#00e5ff"},
  {label:"Incidentes hoy",valor:847,icono:"📋",color:"#ff6d00"},
  {label:"Alertas críticas",valor:12,icono:"🔴",color:"#ff1744"},
  {label:"Cobertura territorial",valor:"98.6%",icono:"🛰️",color:"#00e676"},
  {label:"Sensores en línea",valor:1248,icono:"📡",color:"#aa00ff"},
  {label:"Equipos en campo",valor:24,icono:"🪖",color:"#ffd600"}
];

const C: Record<string,string> = {Alta:"#ff1744",Media:"#ff6d00",Baja:"#ffd600"};

export default function CommandView() {
  const mapRef = useRef<maplibregl.Map|null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [selAlerta, setSelAlerta] = useState<typeof ALERTAS[0]|null>(null);
  const [droneMode, setDroneMode] = useState(false);
  const [hora, setHora] = useState("");

  useEffect(() => {
    const iv = setInterval(() => {
      const n = new Date();
      setHora(n.toLocaleTimeString("es-MX",{hour12:false}));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let destroyed = false;
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          esri: {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "ESRI World Imagery"
          }
        },
        layers: [{id:"esri-layer",type:"raster",source:"esri"}]
      },
      center: [-99.1332, 19.4326],
      zoom: 10,
      attributionControl: false
    });
    mapRef.current = map;

    map.on("load", () => {
      if (destroyed) return;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      ALERTAS.forEach(a => {
        const el = document.createElement("div");
        el.style.cssText = [
          "width:14px;height:14px;border-radius:50%;",
          "background:" + C[a.nivel] + ";",
          "border:2px solid #fff;",
          "animation:pal 1.5s ease-in-out infinite;",
          "cursor:pointer;",
          "box-shadow:0 0 8px " + C[a.nivel]
        ].join("");
        el.addEventListener("click", () => setSelAlerta(a));
        const marker = new maplibregl.Marker({element:el})
          .setLngLat([a.coords[1], a.coords[0]])
          .addTo(map);
        markersRef.current.push(marker);
      });
    });

    return () => {
      destroyed = true;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const panelStyle: React.CSSProperties = {
    background:"#060e1a",
    border:"1px solid #00e5ff22",
    borderRadius:4,
    padding:"10px 8px",
    display:"flex",
    flexDirection:"column",
    gap:6,
    overflowY:"auto"
  };

  const labelStyle: React.CSSProperties = {
    fontSize:9,
    color:"#00e5ff99",
    textTransform:"uppercase",
    letterSpacing:1,
    marginBottom:2
  };

  return (
    <div style={{width:"100vw",height:"100vh",background:"#030810",fontFamily:"Courier New,monospace",display:"flex",flexDirection:"column",overflow:"hidden",color:"#c8e6ff"}}>
      <style>{"${CSS_PLACEHOLDER}"}</style>

      {/* HEADER */}
      <div style={{background:"#060e1a",borderBottom:"1px solid #00e5ff33",padding:"6px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:15,fontWeight:"bold",color:"#00e5ff",letterSpacing:3,textTransform:"uppercase"}}>⬡ SANTI NEXUS — MANDO ESTRATÉGICO NACIONAL</div>
          <div style={{fontSize:9,color:"#00e5ff88",letterSpacing:2}}>SECRETARÍA DE SEGURIDAD PÚBLICA · NIVEL ULTRA SECRETO · IBM WATSONX</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:18,color:"#00e5ff",fontWeight:"bold",animation:"blk 2s infinite"}}>{hora}</div>
          <div style={{fontSize:9,color:"#ff1744",animation:"blk 3s infinite"}}>● SISTEMA EN LÍNEA</div>
        </div>
      </div>

      {/* KPI ROW */}
      <div style={{display:"flex",gap:6,padding:"6px 10px",background:"#040c16",borderBottom:"1px solid #00e5ff22",flexShrink:0}}>
        {KPI.map(k => (
          <div key={k.label} style={{flex:1,background:"#060e1a",border:"1px solid " + k.color + "44",borderRadius:4,padding:"5px 8px",textAlign:"center",animation:"fin 0.5s ease"}}>
            <div style={{fontSize:16}}>{k.icono}</div>
            <div style={{fontSize:16,fontWeight:"bold",color:k.color}}>{k.valor}</div>
            <div style={{fontSize:8,color:"#8899aa",textTransform:"uppercase",letterSpacing:1,lineHeight:1.2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* MAIN AREA */}
      <div style={{flex:1,display:"flex",overflow:"hidden",padding:"6px",gap:6}}>

        {/* LEFT PANEL */}
        <div style={{...panelStyle,width:250,flexShrink:0}}>
          <div style={labelStyle}>▶ Alertas Activas</div>
          {ALERTAS.map(a => (
            <div key={a.id}
              onClick={() => { setSelAlerta(a); mapRef.current?.flyTo({center:[a.coords[1],a.coords[0]],zoom:14}); }}
              style={{background: selAlerta?.id===a.id ? "#00e5ff11" : "#0a1628",border:"1px solid " + C[a.nivel] + "66",borderLeft:"3px solid " + C[a.nivel],borderRadius:3,padding:"5px 7px",cursor:"pointer",animation:"fin 0.4s ease"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,color:C[a.nivel],fontWeight:"bold"}}>{a.id}</span>
                <span style={{fontSize:9,color:"#aaa"}}>{a.tiempo}</span>
              </div>
              <div style={{fontSize:11,color:"#e0eeff"}}>{a.tipo}</div>
              <div style={{fontSize:9,color:"#8899aa"}}>{a.sector} · {a.unidad}</div>
            </div>
          ))}

          <div style={{marginTop:8,...labelStyle}}>▶ Telemetría del Sistema</div>
          {[
            {l:"CPU Watsonx",v:67,c:"#00e5ff"},
            {l:"Memoria RAM",v:82,c:"#aa00ff"},
            {l:"Red Táctica",v:94,c:"#00e676"},
            {l:"Latencia (ms)",v:12,c:"#ffd600"},
          ].map(t => (
            <div key={t.l} style={{marginBottom:4}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#aaa",marginBottom:2}}>
                <span>{t.l}</span><span style={{color:t.c}}>{t.v}{t.l.includes("ms") ? "ms" : "%"}</span>
              </div>
              <div style={{background:"#0a1628",borderRadius:2,height:4}}>
                <div style={{width:t.v + "%",height:"100%",background:t.c,borderRadius:2,transition:"width 1s"}}/>
              </div>
            </div>
          ))}

          <div style={{marginTop:8,...labelStyle}}>▶ Infraestructura</div>
          {[
            {l:"Cámaras C5",v:342,t:400,c:"#00e5ff"},
            {l:"Drones activos",v:18,t:24,c:"#aa00ff"},
            {l:"Patrullas GPS",v:390,t:420,c:"#00e676"},
          ].map(i => (
            <div key={i.l} style={{fontSize:9,color:"#aaa",marginBottom:3}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:1}}>
                <span>{i.l}</span><span style={{color:i.c}}>{i.v}/{i.t}</span>
              </div>
              <div style={{background:"#0a1628",borderRadius:2,height:3}}>
                <div style={{width:(i.v/i.t*100) + "%",height:"100%",background:i.c,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </div>

        {/* CENTER MAP */}
        <div style={{flex:1,position:"relative",border:"1px solid #00e5ff33",borderRadius:4,overflow:"hidden"}}>
          <div ref={containerRef} style={{width:"100%",height:"100%"}}/>

          {/* DRONE SCAN LINE */}
          {droneMode && (
            <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",zIndex:10}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(transparent,#00e5ff88,transparent)",animation:"scn 2s linear infinite"}}/>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:60,height:60,border:"2px solid #00e5ff88",borderRadius:"50%"}}/>
              <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:"#00e5ff33",transform:"translateY(-50%)"}}/>
              <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"#00e5ff33",transform:"translateX(-50%)"}}/>
              <div style={{position:"absolute",top:8,left:8,fontSize:9,color:"#00e5ff",background:"#030810cc",padding:"2px 6px",borderRadius:2}}>◉ MODO DRONE ACTIVO</div>
            </div>
          )}

          {/* ALERTA POPUP */}
          {selAlerta && (
            <div style={{position:"absolute",bottom:50,left:"50%",transform:"translateX(-50%)",background:"#060e1aee",border:"1px solid " + C[selAlerta.nivel],borderRadius:6,padding:"10px 14px",minWidth:220,zIndex:20,animation:"fin 0.3s ease"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{color:C[selAlerta.nivel],fontWeight:"bold",fontSize:11}}>{selAlerta.id} — {selAlerta.nivel.toUpperCase()}</span>
                <span onClick={() => setSelAlerta(null)} style={{cursor:"pointer",color:"#aaa",fontSize:14}}>✕</span>
              </div>
              <div style={{fontSize:13,color:"#e0eeff",marginBottom:4}}>{selAlerta.tipo}</div>
              <div style={{fontSize:10,color:"#8899aa"}}>📍 {selAlerta.sector}</div>
              <div style={{fontSize:10,color:"#8899aa"}}>🚔 {selAlerta.unidad}</div>
              <div style={{fontSize:10,color:"#8899aa"}}>⏱ Hace {selAlerta.tiempo}</div>
              <div style={{fontSize:10,color:"#8899aa",marginTop:4}}>📡 {selAlerta.coords[0].toFixed(4)}, {selAlerta.coords[1].toFixed(4)}</div>
            </div>
          )}

          {/* MAP CONTROLS */}
          <div style={{position:"absolute",top:8,right:8,display:"flex",flexDirection:"column",gap:4,zIndex:15}}>
            <button onClick={() => mapRef.current?.flyTo({center:[-99.1332,19.4326],zoom:10})} style={{background:"#060e1a",border:"1px solid #00e5ff44",color:"#00e5ff",padding:"4px 8px",borderRadius:3,cursor:"pointer",fontSize:10}}>⌂ MX</button>
            <button onClick={() => setDroneMode(d => !d)} style={{background: droneMode ? "#00e5ff22" : "#060e1a",border:"1px solid " + (droneMode ? "#00e5ff" : "#00e5ff44"),color:"#00e5ff",padding:"4px 8px",borderRadius:3,cursor:"pointer",fontSize:10}}>◉ DRONE</button>
          </div>

          {/* EVENTS BAR */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,background:"#030810cc",borderTop:"1px solid #00e5ff22",padding:"4px 10px",display:"flex",gap:16,overflowX:"auto",flexShrink:0}}>
            {ALERTAS.map(a => (
              <div key={a.id} onClick={() => { setSelAlerta(a); mapRef.current?.flyTo({center:[a.coords[1],a.coords[0]],zoom:14}); }} style={{flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:C[a.nivel],animation:"blk 1.5s infinite"}}/>
                <span style={{fontSize:9,color:"#aaa",whiteSpace:"nowrap"}}>{a.sector}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{...panelStyle,width:260,flexShrink:0}}>
          <div style={labelStyle}>▶ CAM-NOR-04 — En Vivo</div>
          <div style={{background:"#000",borderRadius:4,overflow:"hidden",height:120,position:"relative",border:"1px solid #333"}}>
            <div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#0a1628 0%,#030810 50%,#0a2010 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>📷</div>
                <div style={{fontSize:9,color:"#00e676",animation:"blk 1s infinite"}}>● FEED EN VIVO</div>
                <div style={{fontSize:8,color:"#555"}}>Iztapalapa Norte · HD</div>
              </div>
            </div>
            <div style={{position:"absolute",top:4,left:4,fontSize:8,color:"#ff1744",animation:"blk 1s infinite"}}>● REC</div>
            <div style={{position:"absolute",top:4,right:4,fontSize:8,color:"#00e5ff"}}>23:37:12</div>
          </div>

          <div style={{marginTop:4,...labelStyle}}>▶ Sensores Ambientales</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {[
              {l:"Temperatura",v:"22°C",c:"#ff6d00"},
              {l:"Humedad",v:"68%",c:"#00e5ff"},
              {l:"Visibilidad",v:"9.2km",c:"#00e676"},
              {l:"Viento",v:"14 km/h",c:"#aa00ff"},
            ].map(s => (
              <div key={s.l} style={{background:"#0a1628",borderRadius:3,padding:"5px 6px",border:"1px solid #ffffff11"}}>
                <div style={{fontSize:8,color:"#8899aa"}}>{s.l}</div>
                <div style={{fontSize:13,color:s.c,fontWeight:"bold"}}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{marginTop:4,...labelStyle}}>▶ Actividad 24h</div>
          <svg width="100%" height="40" style={{display:"block"}}>
            {[45,67,34,89,120,78,95,110,67,145,89,110,134,98,76,88,105,145,167,134,120,89,67,54].map((v,i,arr) => {
              const max = Math.max(...arr);
              const x1 = (i/arr.length)*100;
              const x2 = ((i+1)/arr.length)*100;
              const y1 = 38 - (v/max)*34;
              const y2 = 38 - (arr[i+1] ? (arr[i+1]/max)*34 : (v/max)*34);
              return i < arr.length-1 ? <line key={i} x1={x1+"%"} y1={y1} x2={x2+"%"} y2={y2} stroke="#00e5ff" strokeWidth="1.5" opacity="0.7"/> : null;
            })}
          </svg>

          <div style={{marginTop:4,...labelStyle}}>▶ Reporte del Día</div>
          <div style={{fontSize:9,color:"#8899aa",lineHeight:1.6}}>
            <div>🔴 Incidentes críticos: <span style={{color:"#ff1744"}}>12</span></div>
            <div>🟡 Incidentes medios: <span style={{color:"#ff6d00"}}>34</span></div>
            <div>🟢 Incidentes bajos: <span style={{color:"#00e676"}}>89</span></div>
            <div>✅ Resueltos: <span style={{color:"#00e676"}}>847</span></div>
            <div>⏳ En proceso: <span style={{color:"#ffd600"}}>23</span></div>
            <div>🚨 Código Violeta: <span style={{color:"#aa00ff"}}>4</span></div>
          </div>

          <div style={{marginTop:4,...labelStyle}}>▶ Acciones Rápidas</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {[
              {l:"🚔 Despachar Unidad",c:"#00e5ff"},
              {l:"🚁 Activar Dron",c:"#aa00ff"},
              {l:"📡 Alerta Masiva",c:"#ff6d00"},
              {l:"🔒 Cerrar Perímetro",c:"#ff1744"},
            ].map(b => (
              <button key={b.l} style={{background:"#0a1628",border:"1px solid " + b.c + "55",color:b.c,padding:"6px 10px",borderRadius:3,cursor:"pointer",fontSize:10,textAlign:"left",transition:"background 0.2s"}}
                onMouseEnter={e => (e.currentTarget.style.background="#00e5ff11")}
                onMouseLeave={e => (e.currentTarget.style.background="#0a1628")}>
                {b.l}
              </button>
            ))}
          </div>

          <div style={{marginTop:"auto",paddingTop:8,borderTop:"1px solid #00e5ff11",fontSize:8,color:"#334455",textAlign:"center",lineHeight:1.5}}>
            IBM WATSONX · SANTI NEXUS v2.0<br/>
            CLASIFICADO · USO GUBERNAMENTAL<br/>
            SSP · SSPC · FGR · GN · C5
          </div>
        </div>

      </div>
    </div>
  );
}
`;

// Replace the placeholder with actual CSS string
const final = code.replace('"${CSS_PLACEHOLDER}"', JSON.stringify(CSS_STR));

fs.writeFileSync(f, final, 'utf8');
const lines = final.split('\n');
console.log('COMMANDVIEW INSTALADO OK');
console.log('chars:', final.length);
console.log('lines:', lines.length);
console.log('Last 3 lines:');
lines.slice(-3).forEach((l, i) => console.log('L' + (lines.length - 2 + i) + ':', l));
