import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const DEPENDENCIAS = [
  { id:"SSP",   nombre:"SSP",          color:"#2979ff", emoji:"🚔", tipo:"Policía Municipal"    },
  { id:"SSPC",  nombre:"SSPC",         color:"#00b0ff", emoji:"🚓", tipo:"Policía Estatal"      },
  { id:"GN",    nombre:"GN",           color:"#00e676", emoji:"🪖", tipo:"Guardia Nacional"     },
  { id:"FGR",   nombre:"FGR",          color:"#aa00ff", emoji:"🔍", tipo:"Fiscalía Federal"     },
  { id:"FGJEM", nombre:"FGJEM",        color:"#d500f9", emoji:"🔎", tipo:"Fiscalía Estatal"     },
  { id:"IMSS",  nombre:"IMSS",         color:"#ff1744", emoji:"🚑", tipo:"Ambulancia IMSS"      },
  { id:"CRUM",  nombre:"Cruz Roja",    color:"#ff5252", emoji:"🚨", tipo:"Cruz Roja"            },
  { id:"BOMB",  nombre:"Bomberos",     color:"#ff6d00", emoji:"🚒", tipo:"Bomberos"             },
  { id:"PERI",  nombre:"Peritos",      color:"#ffd600", emoji:"🧪", tipo:"Peritos"              },
  { id:"TRAN",  nombre:"Tránsito",     color:"#1de9b6", emoji:"🚦", tipo:"Tránsito Mpal"        },
];

const SECTORES_CDMX = [
  { nombre:"Centro",        lat:19.4326, lon:-99.1332 },
  { nombre:"Norte",         lat:19.5100, lon:-99.1200 },
  { nombre:"Sur",           lat:19.3200, lon:-99.1600 },
  { nombre:"Oriente",       lat:19.4200, lon:-98.9800 },
  { nombre:"Poniente",      lat:19.4100, lon:-99.2800 },
  { nombre:"Naucalpan",     lat:19.4800, lon:-99.2400 },
  { nombre:"Ecatepec",      lat:19.6100, lon:-99.0500 },
  { nombre:"Tlalpan",       lat:19.2900, lon:-99.1700 },
  { nombre:"Iztapalapa",    lat:19.3700, lon:-99.0600 },
  { nombre:"Gustavo A",     lat:19.4800, lon:-99.1000 },
];

const INCIDENTES = [
  "Robo a transeúnte","Accidente vial","Violencia familiar","Robo de vehículo",
  "Lesionado","Riña","Incendio","Persona extraviada","Asalto a negocio","Desmayo",
];

function generarUnidades() {
  const unidades: any[] = [];
  let id = 1;
  SECTORES_CDMX.forEach(sector => {
    DEPENDENCIAS.forEach(dep => {
      const count = dep.id === "SSP" ? 8 : dep.id === "SSPC" ? 6 : dep.id === "GN" ? 4 : 3;
      for (let i = 0; i < count; i++) {
        const spread = 0.04 + Math.random() * 0.06;
        const angle = Math.random() * Math.PI * 2;
        unidades.push({
          id: `${dep.id}-${id++}`,
          dep: dep.id,
          color: dep.color,
          emoji: dep.emoji,
          tipo: dep.tipo,
          sector: sector.nombre,
          lat: sector.lat + Math.sin(angle) * spread,
          lon: sector.lon + Math.cos(angle) * spread,
          bearing: Math.random() * Math.PI * 2,
          speed: 0.00008 + Math.random() * 0.00015,
          turnRate: (Math.random() - 0.5) * 0.03,
          estado: Math.random() < 0.15 ? "ATENDIENDO" : Math.random() < 0.08 ? "TRASLADO" : "DISPONIBLE",
          incidente: INCIDENTES[Math.floor(Math.random() * INCIDENTES.length)],
          unidad: `${dep.id}-${String(Math.floor(Math.random()*900)+100)}`,
          folio: `911-${String(Math.floor(Math.random()*90000)+10000)}`,
        });
      }
    });
  });
  return unidades;
}

export const TacticalMap3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const intervalRef = useRef<any>(null);
  const unitsRef = useRef<any[]>([]);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filtro, setFiltro] = useState<string>("TODOS");
  const [stats, setStats] = useState({ total:0, atendiendo:0, disponible:0 });

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: {
        version: 8,
        sources: {
          "esri-sat": {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "ESRI World Imagery"
          }
        },
        layers: [{ id: "esri-sat", type: "raster", source: "esri-sat" }]
      },
      center: [-99.1332, 19.4326],
      zoom: 11,
      pitch: 55,
      bearing: -20
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      if (destroyed) return;
      unitsRef.current = generarUnidades();

      const updateStats = () => {
        const u = unitsRef.current;
        setStats({ total: u.length, atendiendo: u.filter(x=>x.estado==="ATENDIENDO").length, disponible: u.filter(x=>x.estado==="DISPONIBLE").length });
      };
      updateStats();

      const createMarkerEl = (u: any) => {
        const el = document.createElement("div");
        const iconos: Record<string,string> = {
          SSP:"🚔", SSPC:"🚓", GN:"🪖", FGR:"🔍", FGJEM:"🔎",
          IMSS:"🚑", CRUM:"🚨", BOMB:"🚒", PERI:"🧪", TRAN:"🚦"
        };
        const icon = iconos[u.dep] || "🚔";
        el.style.cssText = `font-size:${u.estado==="ATENDIENDO"?"20px":"16px"};cursor:pointer;transition:all 0.3s;filter:drop-shadow(0 0 4px ${u.color});line-height:1;user-select:none;`;
        el.textContent = icon;
        if (u.estado === "ATENDIENDO") el.style.animation = "pulse 1s infinite";
        el.onclick = (e) => { e.stopPropagation(); setSelected(u); };
        return el;
      };

      unitsRef.current.forEach(u => {
        const el = createMarkerEl(u);
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([u.lon, u.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });

      intervalRef.current = setInterval(() => {
        if (destroyed || !mapRef.current) return;
        unitsRef.current.forEach((u, i) => {
          u.bearing += u.turnRate;
          u.lon += Math.cos(u.bearing) * u.speed;
          u.lat += Math.sin(u.bearing) * u.speed;
          const sector = SECTORES_CDMX.find(s => s.nombre === u.sector)!;
          const dx = u.lon - sector.lon;
          const dy = u.lat - sector.lat;
          if (Math.sqrt(dx*dx+dy*dy) > 0.12) {
            u.bearing += Math.PI + (Math.random()-0.5)*0.5;
          }
          if (markersRef.current[i]) {
            markersRef.current[i].setLngLat([u.lon, u.lat]);
          }
        });
        updateStats();
      }, 120);
    });

    return () => {
      destroyed = true;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      markersRef.current.forEach(m=>{try{m.remove()}catch(e){}});
      markersRef.current = [];
      if (mapRef.current) { try{mapRef.current.remove();}catch(e){} mapRef.current=null; }
    };
  }, []);

  return (
    <div style={{ width:"100%", height:"100%", marginLeft:"-0px", position:"relative", fontFamily:"monospace" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.4)}}`}</style>

      <div ref={containerRef} style={{ width:"100%", height:"100%" }} />
      <div style={{ position:"absolute", inset:0, background:"rgba(0,10,20,0.45)", pointerEvents:"none", mixBlendMode:"multiply" }} />
      <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,180,0.03) 2px,rgba(0,255,180,0.03) 4px)", pointerEvents:"none" }} />

      {/* HUD superior izquierdo */}
      <div style={{ position:"absolute", top:12, left:12, background:"rgba(0,0,0,0.85)", border:"1px solid #00ffcc", borderRadius:8, padding:"10px 14px", color:"#00ffcc", fontSize:11, minWidth:200 }}>
        <div style={{ fontSize:13, fontWeight:"bold", marginBottom:6 }}>⬡ SANTI NEXUS — RADAR TÁCTICO</div>
        <div>🚔 Unidades activas: <b style={{color:"#fff"}}>{stats.total}</b></div>
        <div>🔴 Atendiendo: <b style={{color:"#ff1744"}}>{stats.atendiendo}</b></div>
        <div>🟢 Disponibles: <b style={{color:"#00e676"}}>{stats.disponible}</b></div>
      </div>

      {/* Leyenda dependencias */}
      <div style={{ position:"absolute", top:12, right:60, background:"rgba(0,0,0,0.85)", border:"1px solid #333", borderRadius:8, padding:"8px 12px", fontSize:10, maxHeight:300, overflowY:"auto" }}>
        {DEPENDENCIAS.map(d => (
          <div key={d.id} onClick={() => setFiltro(filtro===d.id?"TODOS":d.id)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"2px 4px", cursor:"pointer", borderRadius:4, background: filtro===d.id?"rgba(255,255,255,0.1)":"transparent", marginBottom:2 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:d.color, flexShrink:0 }}/>
            <span style={{ color: filtro===d.id?"#fff":"#aaa" }}>{d.emoji} {d.id}</span>
          </div>
        ))}
        {filtro!=="TODOS" && <div onClick={()=>setFiltro("TODOS")} style={{color:"#ff5252",cursor:"pointer",marginTop:4,fontSize:9}}>✕ limpiar filtro</div>}
      </div>

      {/* Botones vista */}
      <div style={{ position:"absolute", bottom:40, left:12, display:"flex", flexDirection:"column", gap:6 }}>
        {([["2D",0,0],["3D",50,-20],["N",0,0]] as [string,number,number][]).map(([l,p,b]) => (
          <button key={l} onClick={() => mapRef.current?.easeTo({ pitch:p, bearing:b, duration:1200 })}
            style={{ padding:"6px 14px", background:"rgba(0,0,0,0.85)", color:"#00ffcc", border:"1px solid #00ffcc", borderRadius:4, cursor:"pointer", fontSize:11 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Panel unidad seleccionada */}
      {selected && (
        <div style={{ position:"absolute", bottom:40, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.92)", border:`1px solid ${selected.color}`, borderRadius:8, padding:"12px 18px", color:"#fff", fontSize:11, minWidth:280, maxWidth:360 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ color:selected.color, fontWeight:"bold", fontSize:13 }}>{selected.emoji} {selected.unidad}</span>
            <span onClick={()=>setSelected(null)} style={{ cursor:"pointer", color:"#aaa" }}>✕</span>
          </div>
          <div><b style={{color:"#aaa"}}>Dependencia:</b> {selected.tipo}</div>
          <div><b style={{color:"#aaa"}}>Sector:</b> {selected.sector}</div>
          <div><b style={{color:"#aaa"}}>Estado:</b> <span style={{color: selected.estado==="ATENDIENDO"?"#ff1744":selected.estado==="TRASLADO"?"#ff9100":"#00e676"}}>{selected.estado}</span></div>
          {selected.estado !== "DISPONIBLE" && <>
            <div><b style={{color:"#aaa"}}>Incidente:</b> {selected.incidente}</div>
            <div><b style={{color:"#aaa"}}>Folio 911:</b> {selected.folio}</div>
          </>}
          <div style={{ marginTop:6, fontSize:9, color:"#555" }}>
            {selected.lat.toFixed(4)}°N {Math.abs(selected.lon).toFixed(4)}°W
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalMap3D;




