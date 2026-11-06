import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GlobalRoute, TacticalHeatPoint, TacticalIncident } from "@workspace/api-client-react";
import { IMPACT_COLOR } from "./constants";

type Props = {
  incidents: TacticalIncident[];
  heat: TacticalHeatPoint[];
  showHeat: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  route: GlobalRoute | null;
};

// Ultraviolet -> magenta -> sodium -> pale ramp, 256 entries
function buildRamp(): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 1;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, "rgba(60,30,160,0)");
  gr.addColorStop(0.25, "rgb(110,60,230)");
  gr.addColorStop(0.5, "rgb(220,60,170)");
  gr.addColorStop(0.75, "rgb(255,150,50)");
  gr.addColorStop(1, "rgb(255,240,200)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 1);
  return g.getImageData(0, 0, 256, 1).data;
}

export function TacticalHeatMap({ incidents, heat, showHeat, selectedId, onSelect, route }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const selRef = useRef(onSelect);
  selRef.current = onSelect;
  const heatRef = useRef({ heat, showHeat });
  heatRef.current = { heat, showHeat };
  const drawRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([19.41, -99.14], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 16,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    const cv = document.createElement("canvas");
    cv.className = "td-heat";
    const heatPane = m.createPane("tacticalHeat");
    heatPane.style.zIndex = "350";
    heatPane.style.pointerEvents = "none";
    heatPane.appendChild(cv);
    canvas.current = cv;
    const ramp = buildRamp();

    drawRef.current = () => {
      const size = m.getSize();
      const dpr = window.devicePixelRatio || 1;
      cv.width = size.x * dpr; cv.height = size.y * dpr;
      cv.style.width = `${size.x}px`; cv.style.height = `${size.y}px`;
      L.DomUtil.setPosition(cv, m.containerPointToLayerPoint([0, 0]));
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const { heat: pts, showHeat: on } = heatRef.current;
      if (!on || pts.length === 0) return;
      const maxW = Math.max(...pts.map((p) => p.weight), 0.0001);
      const radius = Math.max(28, 9 * Math.pow(1.45, m.getZoom() - 8)) * dpr;
      for (const p of pts) {
        const pt = m.latLngToContainerPoint([p.lat, p.lng]);
        const x = pt.x * dpr, y = pt.y * dpr;
        const a = Math.min(1, 0.25 + 0.75 * (p.weight / maxW));
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const al = d[i + 3];
        if (!al) continue;
        const o = al * 4;
        d[i] = ramp[o]; d[i + 1] = ramp[o + 1]; d[i + 2] = ramp[o + 2];
        d[i + 3] = Math.min(220, al * 1.15);
      }
      ctx.putImageData(img, 0, 0);
    };
    const redraw = () => drawRef.current();
    m.on("move zoom resize viewreset", redraw);
    map.current = m;
    redraw();
    return () => { m.off("move zoom resize viewreset", redraw); m.remove(); map.current = null; layer.current = null; canvas.current = null; };
  }, []);

  useEffect(() => { drawRef.current(); }, [heat, showHeat]);

  useEffect(() => {
    const g = layer.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    for (const inc of incidents) {
      const sel = inc.id === selectedId;
      const col = IMPACT_COLOR[inc.impact] ?? "#aab";
      if (sel) L.circleMarker([inc.lat, inc.lng], { radius: 20, color: col, weight: 1, fillOpacity: 0.08, interactive: false }).addTo(g);
      const mk = L.circleMarker([inc.lat, inc.lng], {
        radius: sel ? 10 : 7, color: sel ? "hsl(40 100% 90%)" : col, weight: sel ? 3 : 2, fillColor: col, fillOpacity: 0.9,
      });
      const tip = document.createElement("span");
      tip.textContent = `${inc.title} · impacto ${inc.impact} · simulado`;
      mk.bindTooltip(tip, { direction: "top" });
      mk.on("click", () => selRef.current(inc.id));
      mk.addTo(g);
    }
    if (route && route.points.length > 1) {
      const ll = route.points.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(ll, { color: "hsl(262 92% 76%)", weight: 3, dashArray: "2 9", lineCap: "round", opacity: 0.95 })
        .bindTooltip("Trayecto ilustrativo en línea recta, no ruta vial").addTo(g);
      route.points.forEach((p, i) => {
        L.circleMarker([p.lat, p.lng], { radius: 4, color: "hsl(262 92% 80%)", fillOpacity: 1, weight: 1 })
          .bindTooltip(`${i + 1}. ${p.name}`).addTo(g);
      });
    }
  }, [incidents, selectedId, route]);

  useEffect(() => {
    const m = map.current;
    const inc = incidents.find((i) => i.id === selectedId);
    if (m && inc) m.panTo([inc.lat, inc.lng], { animate: true });
  }, [selectedId, incidents]);

  return <div ref={el} className="td-map" role="region" aria-label="Mapa táctico simulado de la Ciudad de México" data-testid="map-tactical" />;
}
