const fs=require('fs');
const bak=(f)=>{if(fs.existsSync(f))fs.copyFileSync(f,f+'.BAK_BOB_'+Date.now());};

// SOLUCIÓN 1: TacticalMap3D con 10,000 unidades animadas
bak('TacticalMap3D.tsx');
fs.writeFileSync('TacticalMap3D.tsx',`import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
const MAP_STYLE: any = {
  version: 8,
  sources: {
    "satellite": { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "© Esri" },
    "fallback-1": { type: "raster", tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"], tileSize: 256 },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0a0f18" } },
    { id: "fallback-layer", type: "raster", source: "fallback-1", paint: { "raster-opacity": 0.7 } },
    { id: "sat-layer", type: "raster", source: "satellite", paint: { "raster-opacity": 0.95, "raster-brightness-max": 0.5 } },
  ],
};
export const TacticalMap3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const unitsRef = useRef<any>(null);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current, style: MAP_STYLE,
      center: [-99.1332, 19.4326], zoom: 11, pitch: 45, bearing: -20, antialias: true, maxPitch: 85,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      const features: any[] = [];
      const colors = ["#00ffcc","#ff1744","#ff9100","#9c27b0","#2979ff","#00e676"];
      for (let i = 0; i < 10000; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.5;
        features.push({ type:"Feature", properties:{ color:colors[Math.floor(Math.random()*colors.length)], bearing:angle, speed:0.0001+Math.random()*0.0003, turnRate:(Math.random()-0.5)*0.05 }, geometry:{ type:"Point", coordinates:[-99.1332+Math.cos(angle)*radius, 19.4326+Math.sin(angle)*radius] } });
      }
      unitsRef.current = { type:"FeatureCollection", features };
      map.addSource("units", { type:"geojson", data:unitsRef.current });
      map.addLayer({ id:"units-glow", type:"circle", source:"units", paint:{ "circle-radius":10, "circle-color":["get","color"], "circle-opacity":0.15, "circle-blur":1 } });
      map.addLayer({ id:"units-dot", type:"circle", source:"units", paint:{ "circle-radius":5, "circle-color":["get","color"], "circle-stroke-width":1, "circle-stroke-color":"#fff" } });
      setInterval(() => {
        const src = map.getSource("units") as any;
        if (!src || !unitsRef.current) return;
        unitsRef.current.features.forEach((f: any) => {
          f.properties.bearing += f.properties.turnRate;
          f.geometry.coordinates[0] += Math.cos(f.properties.bearing) * f.properties.speed;
          f.geometry.coordinates[1] += Math.sin(f.properties.bearing) * f.properties.speed;
          const dx = f.geometry.coordinates[0]-(-99.1332), dy = f.geometry.coordinates[1]-19.4326;
          if (Math.abs(dx)>0.55||Math.abs(dy)>0.55) f.properties.bearing += Math.PI;
        });
        src.setData(unitsRef.current);
      }, 100);
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);
  return (
    <div style={{width:"100%",height:"100%",position:"relative"}}>
      <div ref={containerRef} style={{width:"100%",height:"100%"}} />
      <div style={{position:"absolute",top:16,left:16,background:"rgba(0,0,0,0.7)",border:"1px solid #00ffcc",borderRadius:8,padding:"8px 14px",color:"#00ffcc",fontSize:12,fontFamily:"monospace"}}>
        RADAR SATELITE ESRI<br/>Unidades: 10.000 | Paso: 45 deg
      </div>
      <div style={{position:"absolute",bottom:20,left:16,display:"flex",flexDirection:"column",gap:8}}>
        {[["2D",0,0],["3D",45,-20],["CALLE",0,0]].map(([l,p,b])=>(
          <button key={String(l)} onClick={()=>mapRef.current?.easeTo({pitch:Number(p),bearing:Number(b),duration:1000})}
            style={{padding:"6px 14px",background:"rgba(0,0,0,0.8)",color:"#00ffcc",border:"1px solid #00ffcc",borderRadius:4,cursor:"pointer",fontSize:11}}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
};
export default TacticalMap3D;
`,'utf8');
console.log('OK TacticalMap3D.tsx — 10,000 unidades restauradas');

// SOLUCIÓN 2: Fix removeChild en SabanaAnalyzer
let sa=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
bak('SabanaAnalyzer.tsx');
// key dinamica para evitar removeChild crash
sa=sa.replace(/key=['"]map['"]/g,"key={`map-${Date.now()}`}");
// tiles CartoDB sin DNS externo problemático
sa=sa.replace(/url=['"]https:\/\/tile\.openstreetmap\.org[^'"]+['"]/g,
  "url='https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'");
sa=sa.replace(/url=['"]https:\/\/\{s\}\.tile\.openstreetmap[^'"]+['"]/g,
  "url='https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'");
fs.writeFileSync('SabanaAnalyzer.tsx',sa,'utf8');
console.log('OK SabanaAnalyzer.tsx — removeChild fix + CartoDB tiles');

// SOLUCIÓN 3: Tabs limpias en App.tsx
let app=fs.readFileSync('App.tsx','utf8');
bak('App.tsx');
const TABS_CLEAN=`const TABS: Tab[] = [
  { id: "citizen",   label: "C.M.O.",      icon: "🌍",  color: "#00ffcc", group: "ops"   },
  { id: "command",   label: "Mando",        icon: "🛡️", color: "#c8a84b", group: "ops"   },
  { id: "guardian",  label: "Guardián",     icon: "👁️", color: "#cc44ff", group: "ops"   },
  { id: "forensic",  label: "Forense",      icon: "🔬", color: "#7c4dff", group: "intel" },
  { id: "links",     label: "Redes i2",     icon: "🕸️", color: "#ff6d00", group: "intel" },
  { id: "osint",     label: "OSINT",        icon: "📡", color: "#9c27b0", group: "intel", gated: true },
  { id: "cases",     label: "Carpetas",     icon: "📁", color: "#00e5ff", group: "intel", gated: true },
  { id: "sabana",    label: "Sábana",       icon: "📱", color: "#00e5ff", group: "field", gated: true },
  { id: "agentes",   label: "Agentes IA",   icon: "🤖", color: "#ff4fc8", group: "field", gated: true },
  { id: "education", label: "Academia",     icon: "📚", color: "#00e676", group: "field" },
];`;
// Reemplazar bloque TABS existente
app=app.replace(/const TABS:\s*Tab\[\]\s*=\s*\[[\s\S]*?\];/, TABS_CLEAN);
fs.writeFileSync('App.tsx',app,'utf8');
console.log('OK App.tsx — TABS con emojis limpios');

console.log('\n=== LISTO ===');
console.log('Reinicia: npm run dev');
console.log('El .env con API keys lo debes actualizar manualmente');
