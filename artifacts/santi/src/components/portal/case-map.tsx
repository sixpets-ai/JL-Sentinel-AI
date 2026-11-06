import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = { id: string; lat: number; lng: number; kind: "report" | "unit"; label: string; linkTo?: string };

export function CaseMap({ points, fitKey, label, height = 360 }: { points: MapPoint[]; fitKey: string; label: string; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef<string | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([19.4326, -99.1332], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 18,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; layer.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current, m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    const byId = new Map(points.map((p) => [p.id, p]));
    for (const p of points) {
      if (p.kind === "unit" && p.linkTo && byId.get(p.linkTo)) {
        const r = byId.get(p.linkTo)!;
        L.polyline([[p.lat, p.lng], [r.lat, r.lng]], { color: "hsl(41 86% 62%)", weight: 1.5, dashArray: "4 6", opacity: .8 }).addTo(g);
      }
      L.circleMarker([p.lat, p.lng], p.kind === "report"
        ? { radius: 9, color: "hsl(182 72% 56%)", fillColor: "hsl(182 72% 56%)", fillOpacity: .35, weight: 2 }
        : { radius: 7, color: "hsl(41 86% 62%)", fillColor: "hsl(41 86% 62%)", fillOpacity: .9, weight: 2 })
        .bindTooltip(p.label).addTo(g);
    }
    if (points.length && fitted.current !== fitKey) {
      fitted.current = fitKey;
      m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])).pad(0.35), { maxZoom: 16 });
    }
  }, [points, fitKey]);

  return <div ref={el} className="gc-map" style={{ height, minHeight: 260 }} role="region" aria-label={label} data-testid="map-case" />;
}
