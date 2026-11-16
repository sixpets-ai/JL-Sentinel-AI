# NEXUS TACTICAL v6 — TacticalMap3D con patrullas + radar + tiles ESRI
# Autor: Claude Sonnet 4.6 | J-L Sentinel AI
# Ejecutar desde la raiz del proyecto: powershell -ExecutionPolicy Bypass -File "NEXUS_TACTICAL_v6.ps1"

$ErrorActionPreference = "Stop"
$PROJECT = "C:\Users\Wyse\Desktop\J-L-Sentinel-AI\05_Respaldo_Codigo\Intelligent-Patrols"
$TARGET = Join-Path $PROJECT "TacticalMap3D.tsx"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  NEXUS TACTICAL v6 - PATROL MAP RESTORE  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $PROJECT)) {
    Write-Host "ERROR: No se encuentra el proyecto en $PROJECT" -ForegroundColor Red
    exit 1
}

# Backup del archivo actual
$backup = Join-Path $PROJECT "TacticalMap3D.tsx.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
if (Test-Path $TARGET) {
    Copy-Item $TARGET $backup
    Write-Host "Backup guardado: $backup" -ForegroundColor DarkGray
}

# Escribir el nuevo TacticalMap3D.tsx
$newContent = @'
import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// === RUTAS DE PATRULLAJE EN CDMX (coordenadas reales) ===
const PATROL_ROUTES = {
  "P-01": [
    [-99.1332, 19.4326], [-99.1310, 19.4340], [-99.1290, 19.4355],
    [-99.1270, 19.4370], [-99.1250, 19.4360], [-99.1230, 19.4345],
    [-99.1210, 19.4330], [-99.1230, 19.4315], [-99.1255, 19.4300],
    [-99.1280, 19.4310], [-99.1310, 19.4318], [-99.1332, 19.4326],
  ],
  "P-02": [
    [-99.1680, 19.4270], [-99.1650, 19.4290], [-99.1620, 19.4310],
    [-99.1595, 19.4295], [-99.1570, 19.4278], [-99.1595, 19.4260],
    [-99.1625, 19.4245], [-99.1655, 19.4255], [-99.1680, 19.4270],
  ],
  "P-03": [
    [-99.1450, 19.4100], [-99.1420, 19.4120], [-99.1395, 19.4140],
    [-99.1370, 19.4130], [-99.1360, 19.4110], [-99.1375, 19.4090],
    [-99.1400, 19.4075], [-99.1430, 19.4080], [-99.1450, 19.4100],
  ],
  "CRUZ-01": [
    [-99.1550, 19.4450], [-99.1520, 19.4465], [-99.1490, 19.4480],
    [-99.1465, 19.4468], [-99.1445, 19.4452], [-99.1465, 19.4435],
    [-99.1495, 19.4420], [-99.1525, 19.4430], [-99.1550, 19.4450],
  ],
  "CRUZ-02": [
    [-99.1200, 19.4550], [-99.1175, 19.4568], [-99.1148, 19.4580],
    [-99.1120, 19.4570], [-99.1105, 19.4552], [-99.1118, 19.4535],
    [-99.1145, 19.4522], [-99.1172, 19.4530], [-99.1200, 19.4550],
  ],
  "K9-01": [
    [-99.1800, 19.4150], [-99.1770, 19.4168], [-99.1740, 19.4180],
    [-99.1715, 19.4165], [-99.1700, 19.4148], [-99.1718, 19.4130],
    [-99.1748, 19.4118], [-99.1778, 19.4128], [-99.1800, 19.4150],
  ],
  "CMD-01": [
    [-99.1332, 19.4426], [-99.1300, 19.4445], [-99.1268, 19.4460],
    [-99.1240, 19.4448], [-99.1220, 19.4432], [-99.1238, 19.4415],
    [-99.1268, 19.4400], [-99.1300, 19.4410], [-99.1332, 19.4426],
  ],
};

const UNIT_META = {
  "P-01":    { label: "PATRULLA ALFA-01",   color: "#00ff88", type: "POLICIA",    speed: 42 },
  "P-02":    { label: "PATRULLA BETA-02",   color: "#00e5ff", type: "POLICIA",    speed: 38 },
  "P-03":    { label: "PATRULLA GAMMA-03",  color: "#00ff88", type: "POLICIA",    speed: 45 },
  "CRUZ-01": { label: "AMBULANCIA 01",      color: "#ff4444", type: "CRUZ ROJA",  speed: 65 },
  "CRUZ-02": { label: "AMBULANCIA 02",      color: "#ff6666", type: "CRUZ ROJA",  speed: 70 },
  "K9-01":   { label: "UNIDAD K-9 DELTA",   color: "#ffaa00", type: "K-9",        speed: 35 },
  "CMD-01":  { label: "COMANDO ESPECIAL",   color: "#cc44ff", type: "COMANDO",    speed: 55 },
};

const ALERTS = [
  "ALERTA: Reporte ciudadano - Col. Doctores - 20:14",
  "DISTURBIO: Av. Insurgentes Sur km 12 - atendido",
  "RADAR: Frecuencia irregular detectada - cuadrante 7",
  "DESPEJADO: Incidente Col. Roma Norte - cerrado",
  "PRIORITARIO: Apoyo medico - Metro Hospital General",
  "SATELITE: Cobertura total - sectores A-B-C activos",
  "SEGURO: Perimetro norte confirmado - sin incidentes",
  "NEXUS: Todos los sistemas operativos al 100%",
];

const TILE_LAYERS = {
  dark:      { label: "DARK",    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" },
  satellite: { label: "SAT",     url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" },
  streets:   { label: "CALLE",   url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" },
  topo:      { label: "TOPO",    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" },
};

function interpolateRoute(route, t) {
  const total = route.length;
  const idx = Math.floor(t * total) % total;
  const next = (idx + 1) % total;
  const frac = (t * total) % 1;
  return [
    route[idx][0] + (route[next][0] - route[idx][0]) * frac,
    route[idx][1] + (route[next][1] - route[idx][1]) * frac,
  ];
}

export default function TacticalMap3D() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const radarRef = useRef(null);
  const markersRef = useRef({});
  const animFrameRef = useRef(0);
  const radarFrameRef = useRef(0);
  const tRef = useRef({});

  const [activeLayer, setActiveLayer] = useState("dark");
  const [alertIndex, setAlertIndex] = useState(0);
  const [systemTime, setSystemTime] = useState("");
  const [pitch, setPitch] = useState(45);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const tick = () => setSystemTime(new Date().toLocaleTimeString("es-MX", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAlertIndex(i => (i + 1) % ALERTS.length), 3500);
    return () => clearInterval(id);
  }, []);

  // Radar canvas
  useEffect(() => {
    const canvas = radarRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let angle = 0;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(cx, cy) - 4;
    const blips = Array.from({ length: 8 }, () => ({
      r: (0.2 + Math.random() * 0.75) * R,
      a: Math.random() * Math.PI * 2,
      alpha: 1,
    }));
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0,10,0,0.92)";
      ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.fill();
      [0.25, 0.5, 0.75, 1].forEach(f => {
        ctx.beginPath(); ctx.arc(cx, cy, f * R, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,255,70,0.18)"; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.strokeStyle = "rgba(0,255,70,0.18)"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
      ctx.stroke();
      // Sweep arc
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, angle - 1.4, angle); ctx.closePath();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, "rgba(0,255,70,0.0)"); g.addColorStop(1, "rgba(0,255,70,0.4)");
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
      ctx.strokeStyle = "rgba(0,255,120,0.9)"; ctx.lineWidth = 2; ctx.stroke();
      blips.forEach(b => {
        const diff = ((angle - b.a) + Math.PI * 2) % (Math.PI * 2);
        if (diff < 0.1) b.alpha = 1; else b.alpha = Math.max(0, b.alpha - 0.008);
        if (b.alpha > 0.05) {
          const bx = cx + Math.cos(b.a) * b.r, by = cy + Math.sin(b.a) * b.r;
          ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,100,${b.alpha})`; ctx.fill();
          ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,100,${b.alpha * 0.3})`; ctx.fill();
        }
      });
      ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,255,70,0.5)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(0,255,70,0.7)"; ctx.font = "bold 9px monospace";
      ctx.textAlign = "center"; ctx.fillText("NEXUS RADAR", cx, H - 6);
      angle += 0.03; if (angle > Math.PI * 2) angle -= Math.PI * 2;
      radarFrameRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(radarFrameRef.current);
  }, []);

  // Map init
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: { "base-tiles": { type: "raster", tiles: [TILE_LAYERS.dark.url], tileSize: 256 } },
        layers: [{ id: "base-layer", type: "raster", source: "base-tiles", minzoom: 0, maxzoom: 22 }],
      },
      center: [-99.1332, 19.4326],
      zoom: 13, pitch: 45, bearing: -15, maxZoom: 20, minZoom: 9,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.on("load", () => {
      setMapReady(true);
      Object.entries(PATROL_ROUTES).forEach(([id, route]) => {
        tRef.current[id] = Math.random();
        const meta = UNIT_META[id];
        const el = document.createElement("div");
        el.style.cssText = "width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;";
        const ring = document.createElement("div");
        ring.style.cssText = `position:absolute;width:36px;height:36px;border-radius:50%;border:2px solid ${meta.color};animation:pulse-ring 1.8s ease-out infinite;opacity:0.7;`;
        el.appendChild(ring);
        const dot = document.createElement("div");
        dot.style.cssText = `position:relative;width:20px;height:20px;border-radius:50%;background:${meta.color}33;border:2px solid ${meta.color};display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 0 10px ${meta.color}88;`;
        dot.textContent = id.startsWith("CRUZ") ? "+" : id.startsWith("K9") ? "K" : id.startsWith("CMD") ? "C" : "P";
        el.appendChild(dot);
        if (id.startsWith("P-") || id.startsWith("CMD")) {
          const beacon = document.createElement("div");
          const bc = id.startsWith("CMD") ? "#cc44ff" : "#00ff88";
          beacon.style.cssText = `position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:${bc};animation:blink-beacon ${0.6 + Math.random() * 0.4}s step-start infinite;box-shadow:0 0 6px ${bc};`;
          el.appendChild(beacon);
        }
        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, className: "nexus-popup", offset: 25 })
          .setHTML(`<div style="font-family:monospace;color:#00ff88;background:#0a1a0a;padding:10px;min-width:180px;border:1px solid #00ff8844;"><div style="font-weight:bold;font-size:12px;border-bottom:1px solid #00ff8833;padding-bottom:6px;margin-bottom:6px;">${meta.type}</div><div style="font-size:11px;line-height:1.8;"><b>ID:</b> ${id}<br/><b>UNIDAD:</b> ${meta.label}<br/><b>ESTADO:</b> <span style="color:#00ff88">EN PATRULLAJE</span><br/><b>VELOCIDAD:</b> ${meta.speed} km/h<br/><b>NEXUS:</b> <span style="color:#00ff88">ACTIVO</span></div></div>`);
        new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(route[0]).setPopup(popup).addTo(map);
        markersRef.current[id] = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(route[0]).addTo(map);
        // redo properly
        markersRef.current[id].remove();
        const el2 = document.createElement("div");
        el2.style.cssText = "width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;";
        const ring2 = document.createElement("div");
        ring2.style.cssText = `position:absolute;width:36px;height:36px;border-radius:50%;border:2px solid ${meta.color};animation:pulse-ring 1.8s ease-out infinite;opacity:0.7;`;
        el2.appendChild(ring2);
        const dot2 = document.createElement("div");
        dot2.style.cssText = `position:relative;width:20px;height:20px;border-radius:50%;background:${meta.color}33;border:2px solid ${meta.color};display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 0 10px ${meta.color}88;`;
        dot2.textContent = id.startsWith("CRUZ") ? "+" : id.startsWith("K9") ? "K" : id.startsWith("CMD") ? "C" : "P";
        el2.appendChild(dot2);
        if (id.startsWith("P-") || id.startsWith("CMD")) {
          const b2 = document.createElement("div");
          const bc2 = id.startsWith("CMD") ? "#cc44ff" : "#00ff88";
          b2.style.cssText = `position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:${bc2};animation:blink-beacon ${0.6 + Math.random() * 0.4}s step-start infinite;box-shadow:0 0 6px ${bc2};`;
          el2.appendChild(b2);
        }
        const popup2 = new maplibregl.Popup({ closeButton: true, closeOnClick: false, className: "nexus-popup", offset: 25 })
          .setHTML(`<div style="font-family:monospace;color:#00ff88;background:#0a1a0a;padding:10px;min-width:180px;border:1px solid #00ff8844;"><div style="font-weight:bold;font-size:12px;border-bottom:1px solid #00ff8833;padding-bottom:6px;margin-bottom:6px;">${meta.type}</div><div style="font-size:11px;line-height:1.8;"><b>ID:</b> ${id}<br/><b>UNIDAD:</b> ${meta.label}<br/><b>ESTADO:</b> <span style="color:#00ff88">EN PATRULLAJE</span><br/><b>VELOCIDAD:</b> ${meta.speed} km/h<br/><b>NEXUS:</b> <span style="color:#00ff88">ACTIVO</span></div></div>`);
        const mk = new maplibregl.Marker({ element: el2, anchor: "center" }).setLngLat(route[0]).setPopup(popup2).addTo(map);
        markersRef.current[id] = mk;
      });
      let lastTime = performance.now();
      function animateUnits(now) {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        Object.entries(PATROL_ROUTES).forEach(([id, route]) => {
          tRef.current[id] = (tRef.current[id] + 0.015 * dt) % 1;
          const pos = interpolateRoute(route, tRef.current[id]);
          markersRef.current[id]?.setLngLat(pos);
        });
        animFrameRef.current = requestAnimationFrame(animateUnits);
      }
      animFrameRef.current = requestAnimationFrame(animateUnits);
    });
    mapRef.current = map;
    return () => { cancelAnimationFrame(animFrameRef.current); map.remove(); mapRef.current = null; };
  }, []);

  const switchLayer = useCallback((layerKey) => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    setActiveLayer(layerKey);
    const src = map.getSource("base-tiles");
    if (src) src.setTiles([TILE_LAYERS[layerKey].url]);
  }, [mapReady]);

  const togglePitch = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const np = pitch === 45 ? 0 : 45;
    map.easeTo({ pitch: np, duration: 600 });
    setPitch(np);
  }, [pitch]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse-ring { 0% { transform:scale(0.8);opacity:0.8; } 70% { transform:scale(1.6);opacity:0; } 100% { transform:scale(1.6);opacity:0; } }
      @keyframes blink-beacon { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
      @keyframes ticker-slide { 0% { opacity:0;transform:translateY(6px); } 10% { opacity:1;transform:translateY(0); } 85% { opacity:1;transform:translateY(0); } 100% { opacity:0;transform:translateY(-6px); } }
      .nexus-popup .maplibregl-popup-content { background:transparent!important;padding:0!important;border-radius:4px;box-shadow:0 0 20px rgba(0,255,100,0.3); }
      .nexus-popup .maplibregl-popup-tip { border-top-color:#00ff8844!important; }
      .maplibregl-ctrl-attrib { background:rgba(0,0,0,0.6)!important;color:#00ff8866!important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100vh",background:"#050d05",fontFamily:"monospace",overflow:"hidden" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",background:"linear-gradient(90deg,#0a1a0a 0%,#050d05 50%,#0a1a0a 100%)",borderBottom:"1px solid #00ff8833",flexShrink:0,gap:12 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:"50%",border:"2px solid #00ff88",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 12px #00ff8866" }}>X</div>
          <div>
            <div style={{ color:"#00ff88",fontWeight:"bold",fontSize:13,letterSpacing:2 }}>NEXUS TACTICAL COMMAND</div>
            <div style={{ color:"#00ff8866",fontSize:10 }}>J-L SENTINEL AI · CDMX OPS CENTER</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:6 }}>
          {Object.entries(TILE_LAYERS).map(([key, layer]) => (
            <button key={key} onClick={() => switchLayer(key)} style={{ padding:"4px 10px",background:activeLayer===key?"#00ff8822":"transparent",border:`1px solid ${activeLayer===key?"#00ff88":"#00ff8844"}`,color:activeLayer===key?"#00ff88":"#00ff8877",borderRadius:3,cursor:"pointer",fontSize:11,fontFamily:"monospace" }}>
              {layer.label}
            </button>
          ))}
          <button onClick={togglePitch} style={{ padding:"4px 10px",background:pitch===45?"#00ff8822":"transparent",border:`1px solid ${pitch===45?"#00ff88":"#00ff8844"}`,color:pitch===45?"#00ff88":"#00ff8877",borderRadius:3,cursor:"pointer",fontSize:11,fontFamily:"monospace" }}>
            {pitch === 45 ? "3D" : "2D"}
          </button>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:16,flexShrink:0 }}>
          <div style={{ color:"#00ff88",fontSize:11 }}><span style={{ color:"#00ff8866" }}>UNIDADES </span>{Object.keys(PATROL_ROUTES).length}</div>
          <div style={{ color:"#00ff88",fontSize:11 }}><span style={{ color:"#00ff8866" }}>SISTEMA </span><span style={{ color:"#00ff88" }}>ON</span></div>
          <div style={{ color:"#00ff88",fontSize:13,fontWeight:"bold",letterSpacing:2,minWidth:70 }}>{systemTime}</div>
        </div>
      </div>
      <div style={{ position:"relative",flex:1,overflow:"hidden" }}>
        <div ref={mapContainer} style={{ width:"100%",height:"100%" }} />
        <div style={{ position:"absolute",bottom:48,right:16,borderRadius:"50%",overflow:"hidden",boxShadow:"0 0 24px rgba(0,255,70,0.5)",border:"2px solid rgba(0,255,70,0.4)",pointerEvents:"none" }}>
          <canvas ref={radarRef} width={140} height={140} />
        </div>
        <div style={{ position:"absolute",top:12,left:12,background:"rgba(5,13,5,0.88)",border:"1px solid #00ff8833",borderRadius:4,padding:"8px 12px",minWidth:180,pointerEvents:"none" }}>
          <div style={{ color:"#00ff8866",fontSize:9,letterSpacing:2,marginBottom:6 }}>UNIDADES EN CAMPO</div>
          {Object.entries(UNIT_META).map(([id, meta]) => (
            <div key={id} style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:meta.color,boxShadow:`0 0 4px ${meta.color}`,flexShrink:0 }} />
              <span style={{ color:meta.color,fontSize:10 }}>{id}</span>
              <span style={{ color:"#00ff8866",fontSize:9 }}>{meta.type}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"6px 16px",background:"linear-gradient(90deg,#0a1a0a 0%,#050d05 50%,#0a1a0a 100%)",borderTop:"1px solid #00ff8833",flexShrink:0,height:36,overflow:"hidden" }}>
        <div style={{ color:"#ff4444",fontSize:10,fontWeight:"bold",letterSpacing:2,flexShrink:0,borderRight:"1px solid #00ff8833",paddingRight:10 }}>NEXUS FEED</div>
        <div key={alertIndex} style={{ color:"#00ff88",fontSize:11,animation:"ticker-slide 3.5s ease forwards",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
          {ALERTS[alertIndex]}
        </div>
      </div>
    </div>
  );
}
'@

[System.IO.File]::WriteAllText($TARGET, $newContent, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "TacticalMap3D.tsx INSTALADO" -ForegroundColor Green
Write-Host ""
Write-Host "Lo que tiene ahora:" -ForegroundColor Cyan
Write-Host "  7 unidades en movimiento (3 patrullas, 2 Cruz Roja, K-9, Comando)" -ForegroundColor White
Write-Host "  Radar sweep verde animado en canvas (esquina inferior derecha)" -ForegroundColor White
Write-Host "  4 capas de tiles ESRI: Dark / Satelite / Calles / Topo" -ForegroundColor White
Write-Host "  Toggle 3D/2D con pitch 45 grados" -ForegroundColor White
Write-Host "  Ticker de alertas en tiempo real" -ForegroundColor White
Write-Host "  Popups al click en cada unidad" -ForegroundColor White
Write-Host "  Torretas parpadeantes en patrullas y comando" -ForegroundColor White
Write-Host "  SIN API KEY - ESRI gratis" -ForegroundColor Green
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host "  1. Vite deberia auto-recargar (HMR)" -ForegroundColor White
Write-Host "  2. Si no, haz Ctrl+Shift+R en el browser" -ForegroundColor White
Write-Host "  3. Ve a la pestana TACTICA 3D" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
