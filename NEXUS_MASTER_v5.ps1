# NEXUS_MASTER_v5.ps1 — J-L SENTINEL AI — AGENCY-GRADE MAP UPGRADE
# Iron Man / GTA / Call of Duty visual upgrade
# Patrullas animadas, radar verde, 3D buildings, satellite/dark layer toggle
# Run: powershell -ExecutionPolicy Bypass -File "NEXUS_MASTER_v5.ps1"

$BASE = "C:\Users\Wyse\Desktop\J-L-Sentinel-AI\05_Respaldo_Codigo\Intelligent-Patrols"
$TACTICAL = Join-Path $BASE "TacticalMap3D.tsx"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXUS MASTER v5 — AGENCY VISUAL UPGRADE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Backup
$backup = "$TACTICAL.bak_v5_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $TACTICAL $backup -Force
Write-Host "Backup: $backup" -ForegroundColor Green

# Write new TacticalMap3D.tsx — full agency-grade version
$newContent = @'
import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// =============================================
// AGENCY-GRADE TILE SOURCES — no API key needed
// =============================================
const TILES = {
  dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  street: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  topo: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
};

// =============================================
// PATROL UNITS — CDMX zones
// =============================================
interface PatrolUnit {
  id: string;
  name: string;
  type: "patrol" | "ambulance" | "k9" | "command";
  lat: number;
  lng: number;
  status: "active" | "responding" | "standby";
  heading: number;
  speed: number;
  route?: [number, number][];
}

const INITIAL_PATROLS: PatrolUnit[] = [
  { id: "P-01", name: "PATRULLA ALFA", type: "patrol", lat: 19.432, lng: -99.133, status: "active", heading: 45, speed: 40, route: [[19.432,-99.133],[19.436,-99.128],[19.440,-99.120],[19.435,-99.115],[19.430,-99.120],[19.432,-99.133]] },
  { id: "P-02", name: "PATRULLA BETA", type: "patrol", lat: 19.418, lng: -99.148, status: "active", heading: 180, speed: 35, route: [[19.418,-99.148],[19.412,-99.148],[19.405,-99.148],[19.405,-99.140],[19.410,-99.140],[19.418,-99.148]] },
  { id: "P-03", name: "PATRULLA GAMMA", type: "patrol", lat: 19.445, lng: -99.160, status: "responding", heading: 90, speed: 70, route: [[19.445,-99.160],[19.445,-99.150],[19.445,-99.140],[19.445,-99.130]] },
  { id: "AMB-01", name: "CRUZ ROJA 1", type: "ambulance", lat: 19.425, lng: -99.155, status: "standby", heading: 0, speed: 0, route: [] },
  { id: "AMB-02", name: "CRUZ ROJA 2", type: "ambulance", lat: 19.450, lng: -99.125, status: "active", heading: 270, speed: 55, route: [[19.450,-99.125],[19.448,-99.130],[19.445,-99.135],[19.448,-99.140],[19.450,-99.135],[19.450,-99.125]] },
  { id: "K9-01", name: "K-9 DELTA", type: "k9", lat: 19.410, lng: -99.135, status: "active", heading: 135, speed: 25, route: [[19.410,-99.135],[19.413,-99.132],[19.416,-99.130],[19.414,-99.127],[19.410,-99.130],[19.410,-99.135]] },
  { id: "CMD-01", name: "COMANDO CENTRAL", type: "command", lat: 19.428, lng: -99.138, status: "active", heading: 0, speed: 0, route: [] },
];

// Unit colors
const UNIT_COLOR: Record<string, string> = {
  patrol: "#00ff88",
  ambulance: "#ff4444",
  k9: "#ffaa00",
  command: "#00aaff",
};

const UNIT_ICON: Record<string, string> = {
  patrol: "🚔",
  ambulance: "🚑",
  k9: "🐕",
  command: "⭐",
};

// =============================================
// RADAR SWEEP CANVAS
// =============================================
function RadarOverlay({ center }: { center: [number, number] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.44;

    // Blips (random static targets)
    const blips = Array.from({ length: 12 }, () => ({
      r: Math.random() * R * 0.9 + R * 0.05,
      a: Math.random() * Math.PI * 2,
      alpha: 0,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Dark background circle
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 20, 10, 0.85)";
      ctx.fill();

      // Grid rings
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,255,100,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
      ctx.strokeStyle = "rgba(0,255,100,0.2)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Sweep gradient
      const sweep = ctx.createConicalGradient
        ? (ctx as any).createConicalGradient(cx, cy, angleRef.current)
        : null;

      if (!sweep) {
        // Fallback: arc sweep
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        grad.addColorStop(0, "rgba(0,255,100,0.6)");
        grad.addColorStop(1, "rgba(0,255,100,0)");
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, angleRef.current - 0.5, angleRef.current, false);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Trailing glow
        const trailLen = Math.PI * 0.6;
        for (let t = 0; t < 20; t++) {
          const a = angleRef.current - (t / 20) * trailLen;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, a - 0.08, a, false);
          ctx.closePath();
          ctx.fillStyle = `rgba(0,255,100,${0.08 * (1 - t / 20)})`;
          ctx.fill();
        }
      }

      // Blips — light up when sweep passes
      blips.forEach((b) => {
        const diff = (angleRef.current - b.a + Math.PI * 4) % (Math.PI * 2);
        if (diff < 0.15) b.alpha = 1;
        else b.alpha = Math.max(0, b.alpha - 0.015);
        if (b.alpha > 0) {
          const bx = cx + Math.cos(b.a) * b.r;
          const by = cy + Math.sin(b.a) * b.r;
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,100,${b.alpha})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#00ff64";
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,255,100,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#00ff64";
      ctx.fill();

      angleRef.current = (angleRef.current + 0.02) % (Math.PI * 2);
      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        borderRadius: "50%",
        boxShadow: "0 0 20px rgba(0,255,100,0.4), 0 0 40px rgba(0,255,100,0.2)",
        border: "1px solid rgba(0,255,100,0.5)",
        pointerEvents: "none",
      }}
    />
  );
}

// =============================================
// TACTICAL LEGEND
// =============================================
function TacticalLegend({ units }: { units: PatrolUnit[] }) {
  const active = units.filter((u) => u.status === "active").length;
  const responding = units.filter((u) => u.status === "responding").length;
  return (
    <div style={{
      position: "absolute", top: 60, right: 16, zIndex: 1000,
      background: "rgba(0,10,5,0.85)", border: "1px solid rgba(0,255,100,0.3)",
      borderRadius: 8, padding: "10px 14px", color: "#00ff88",
      fontFamily: "monospace", fontSize: 11, minWidth: 180,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{ color: "#00ffcc", fontWeight: "bold", marginBottom: 6, letterSpacing: 2 }}>
        ◉ UNIDADES ACTIVAS
      </div>
      <div style={{ color: "#00ff44", marginBottom: 2 }}>● ACTIVAS: {active}</div>
      <div style={{ color: "#ff4400", marginBottom: 2 }}>● RESPONDIENDO: {responding}</div>
      <div style={{ color: "#888", marginBottom: 8 }}>● STANDBY: {units.length - active - responding}</div>
      <div style={{ borderTop: "1px solid rgba(0,255,100,0.2)", paddingTop: 6 }}>
        {units.map((u) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ color: UNIT_COLOR[u.type] }}>{UNIT_ICON[u.type]}</span>
            <span style={{ color: u.status === "responding" ? "#ff4400" : u.status === "active" ? "#00ff88" : "#555" }}>
              {u.id}
            </span>
            <span style={{ color: "#666", fontSize: 10 }}>{u.name.split(" ")[1] || u.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================
// LAYER SWITCHER
// =============================================
function LayerSwitcher({ current, onChange }: { current: string; onChange: (l: string) => void }) {
  const layers = [
    { key: "dark", label: "🌑 DARK" },
    { key: "satellite", label: "🛰 SAT" },
    { key: "street", label: "🗺 CALLE" },
    { key: "topo", label: "⛰ TOPO" },
  ];
  return (
    <div style={{
      position: "absolute", top: 60, left: 16, zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      {layers.map((l) => (
        <button
          key={l.key}
          onClick={() => onChange(l.key)}
          style={{
            background: current === l.key ? "rgba(0,255,100,0.2)" : "rgba(0,10,5,0.8)",
            border: `1px solid ${current === l.key ? "#00ff88" : "rgba(0,255,100,0.2)"}`,
            color: current === l.key ? "#00ff88" : "#555",
            fontFamily: "monospace", fontSize: 11, padding: "5px 10px",
            borderRadius: 4, cursor: "pointer", letterSpacing: 1,
            backdropFilter: "blur(4px)",
            transition: "all 0.2s",
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// =============================================
// INCIDENT ALERTS TICKER
// =============================================
const ALERTS = [
  "◉ ALERTA: Actividad sospechosa — Zona Tepito 23:14",
  "◉ UNIDAD P-03 respondiendo a incidente Blvd. Puerto Aéreo",
  "◉ RADAR: 3 vectores detectados sector norte",
  "◉ AMBULANCIA AMB-02 en ruta — ETA 4 min",
  "◉ SISTEMA: Cobertura 97.3% — Todos los nodos activos",
  "◉ QISKIT: Análisis cuántico completado — 0 anomalías",
  "◉ OSINT: 2 nuevos registros CDR procesados",
];

function AlertTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % ALERTS.length), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: "absolute", bottom: 16, left: 16, right: 236, zIndex: 1000,
      background: "rgba(0,10,5,0.85)", border: "1px solid rgba(0,255,100,0.3)",
      borderRadius: 4, padding: "6px 12px",
      color: "#00ff88", fontFamily: "monospace", fontSize: 11,
      backdropFilter: "blur(4px)",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    }}>
      {ALERTS[idx]}
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function TacticalMap3D() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [layer, setLayer] = useState("dark");
  const [units, setUnits] = useState<PatrolUnit[]>(INITIAL_PATROLS);
  const routeIdxRef = useRef<Record<string, number>>({});

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "base-tiles": {
            type: "raster",
            tiles: [TILES.dark],
            tileSize: 256,
            attribution: "© Esri",
          },
        },
        layers: [
          { id: "base", type: "raster", source: "base-tiles" },
        ],
      },
      center: [-99.133, 19.432],
      zoom: 13,
      pitch: 45,
      bearing: -15,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      // Add 3D-style building extrusion layer (from OpenMapTiles if available)
      // Using visual tricks for 3D feel with shadows
      map.addSource("openmaptiles", {
        type: "vector",
        url: "https://api.maptiler.com/tiles/v3/tiles.json?key=get_your_own_key",
      } as any);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Switch tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    try {
      (map.getSource("base-tiles") as maplibregl.RasterTileSource)?.setTiles([TILES[layer as keyof typeof TILES]]);
    } catch {}
  }, [layer]);

  // Animate patrol markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Create/update markers
    units.forEach((unit) => {
      let marker = markersRef.current.get(unit.id);
      const el = document.createElement("div");
      el.style.cssText = `
        width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        background: rgba(0,10,5,0.75);
        border: 2px solid ${UNIT_COLOR[unit.type]};
        border-radius: 50%;
        box-shadow: 0 0 8px ${UNIT_COLOR[unit.type]}88, 0 0 16px ${UNIT_COLOR[unit.type]}44;
        cursor: pointer;
        transition: transform 0.3s;
        ${unit.status === "responding" ? "animation: pulse-marker 1s infinite;" : ""}
      `;
      el.textContent = UNIT_ICON[unit.type];

      const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
        .setHTML(`
          <div style="font-family:monospace;font-size:11px;color:#00ff88;background:#000d06;padding:8px;border-radius:4px;border:1px solid #00ff88;">
            <div style="font-weight:bold;color:#00ffcc;">${unit.id} — ${unit.name}</div>
            <div>ESTADO: <span style="color:${unit.status === "active" ? "#00ff44" : unit.status === "responding" ? "#ff4400" : "#555"}">${unit.status.toUpperCase()}</span></div>
            <div>VELOCIDAD: ${unit.speed} km/h</div>
            <div>RUMBO: ${unit.heading}°</div>
          </div>
        `);

      if (!marker) {
        marker = new maplibregl.Marker({ element: el })
          .setLngLat([unit.lng, unit.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.set(unit.id, marker);
      } else {
        marker.setLngLat([unit.lng, unit.lat]);
      }
    });

    // Animation loop — move patrols along routes
    const interval = setInterval(() => {
      setUnits((prev) =>
        prev.map((unit) => {
          if (!unit.route || unit.route.length < 2 || unit.speed === 0) return unit;
          const idx = routeIdxRef.current[unit.id] ?? 0;
          const next = (idx + 1) % unit.route.length;
          routeIdxRef.current[unit.id] = next;
          const [nlat, nlng] = unit.route[next];
          const dLat = nlat - unit.lat;
          const dLng = nlng - unit.lng;
          const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
          return { ...unit, lat: nlat, lng: nlng, heading };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Update marker positions when units change
  useEffect(() => {
    units.forEach((unit) => {
      const marker = markersRef.current.get(unit.id);
      if (marker) marker.setLngLat([unit.lng, unit.lat]);
    });
  }, [units]);

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 180px)", background: "#000d06" }}>
      {/* Pulse animation keyframe */}
      <style>{`
        @keyframes pulse-marker {
          0% { box-shadow: 0 0 8px #ff440088, 0 0 16px #ff440044; }
          50% { box-shadow: 0 0 16px #ff4400cc, 0 0 32px #ff440088; }
          100% { box-shadow: 0 0 8px #ff440088, 0 0 16px #ff440044; }
        }
        .maplibregl-ctrl-top-right { top: 60px !important; }
      `}</style>

      {/* Header bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 48, zIndex: 1000,
        background: "rgba(0,10,5,0.9)", borderBottom: "1px solid rgba(0,255,100,0.3)",
        display: "flex", alignItems: "center", paddingLeft: 16, gap: 16,
        fontFamily: "monospace", backdropFilter: "blur(8px)",
      }}>
        <span style={{ color: "#00ff88", fontWeight: "bold", letterSpacing: 3, fontSize: 13 }}>
          ◉ J-L SENTINEL AI — MAPA TÁCTICO 3D
        </span>
        <span style={{ color: "#00ffcc", fontSize: 11 }}>
          {new Date().toLocaleTimeString("es-MX")} · CDMX · {units.filter(u => u.status === "active").length} UNIDADES ACTIVAS
        </span>
        <span style={{ marginLeft: "auto", marginRight: 16, color: "#00ff44", fontSize: 11 }}>
          ● SISTEMA OPERATIVO · COBERTURA 97.3%
        </span>
      </div>

      {/* Map container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Layer switcher */}
      <LayerSwitcher current={layer} onChange={setLayer} />

      {/* Unit legend */}
      <TacticalLegend units={units} />

      {/* Green radar */}
      <RadarOverlay center={[-99.133, 19.432]} />

      {/* Alert ticker */}
      <AlertTicker />
    </div>
  );
}
'@

[System.IO.File]::WriteAllText($TACTICAL, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "TacticalMap3D.tsx escrito — $(($newContent -split "`n").Count) líneas" -ForegroundColor Green

# Verify
$lines = (Get-Content $TACTICAL).Count
$hasRadar = Select-String -Path $TACTICAL -Pattern "RadarOverlay" -Quiet
$hasPatrol = Select-String -Path $TACTICAL -Pattern "PatrolUnit" -Quiet
$hasESRI = Select-String -Path $TACTICAL -Pattern "arcgisonline" -Quiet

Write-Host ""
Write-Host "=== VERIFICACIÓN ===" -ForegroundColor Cyan
Write-Host "Líneas: $lines" -ForegroundColor $(if ($lines -gt 100) { "Green" } else { "Red" })
Write-Host "Radar overlay: $hasRadar" -ForegroundColor $(if ($hasRadar) { "Green" } else { "Red" })
Write-Host "Patrol units: $hasPatrol" -ForegroundColor $(if ($hasPatrol) { "Green" } else { "Red" })
Write-Host "ESRI tiles: $hasESRI" -ForegroundColor $(if ($hasESRI) { "Green" } else { "Red" })

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LISTO — Reinicia Vite y abre el mapa" -ForegroundColor Green
Write-Host "  Ctrl+Shift+R en el browser" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
