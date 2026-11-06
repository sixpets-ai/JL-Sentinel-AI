import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GlobalEvent, GlobalPoint } from "@workspace/api-client-react";
import { KIND_COLOR } from "./utils";

type Props = {
  events: GlobalEvent[];
  showIntensity: boolean;
  selected: string[];
  onToggle: (id: string) => void;
  route: GlobalPoint[] | null;
};

export function GlobalMap({ events, showIntensity, selected, onToggle, route }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { worldCopyJump: true, minZoom: 2, zoomControl: true }).setView([18, -20], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 12,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; layer.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    const mapped = events.filter((e) => e.lat !== null && e.lng !== null);

    if (showIntensity) {
      const cells = new Map<string, { lat: number; lng: number; n: number }>();
      for (const e of mapped) {
        const k = `${Math.round(e.lat! / 3)}:${Math.round(e.lng! / 3)}`;
        const c = cells.get(k) ?? { lat: 0, lng: 0, n: 0 };
        const w = Math.max(1, e.mentions);
        c.lat += e.lat! * w; c.lng += e.lng! * w; c.n += w;
        cells.set(k, c);
      }
      const max = Math.max(1, ...[...cells.values()].map((c) => c.n));
      for (const c of cells.values()) {
        const t = c.n / max;
        L.circle([c.lat / c.n, c.lng / c.n], {
          radius: 120000 + t * 520000, stroke: false, fillColor: "hsl(41 86% 62%)", fillOpacity: 0.08 + t * 0.22, interactive: false,
        }).addTo(g);
      }
    }

    for (const e of mapped) {
      const sel = selected.includes(e.id);
      const mk = L.circleMarker([e.lat!, e.lng!], {
        radius: sel ? 9 : 5 + Math.min(5, Math.log2(1 + e.mentions)),
        color: sel ? "hsl(41 86% 70%)" : KIND_COLOR[e.kind] ?? "#9cc",
        weight: sel ? 3 : 1.5, fillColor: KIND_COLOR[e.kind] ?? "#9cc", fillOpacity: sel ? 0.9 : 0.55,
      });
      const tooltip = document.createElement("span");
      tooltip.textContent = `${e.title} — ${e.source}`;
      mk.bindTooltip(tooltip, { direction: "top" });
      mk.on("click", () => toggleRef.current(e.id));
      mk.addTo(g);
    }

    if (route && route.length > 1) {
      L.polyline(route.map((p) => [p.lat, p.lng] as [number, number]), {
        color: "hsl(41 86% 66%)", weight: 2, dashArray: "6 8", opacity: 0.9,
      }).bindTooltip("Línea recta ilustrativa — no es ruta vial").addTo(g);
    }
  }, [events, showIntensity, selected, route]);

  return <div ref={el} className="gc-map" role="region" aria-label="Mapa de eventos publicados" data-testid="map-global" />;
}
