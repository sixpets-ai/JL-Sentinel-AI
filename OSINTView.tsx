import React, { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export const OSINTView = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "esri": {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            maxzoom: 19,
          },
          "osm": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#0a0f18" } },
          { id: "osm-layer", type: "raster", source: "osm", paint: { "raster-opacity": 0.5, "raster-saturation": -0.8 } },
          { id: "esri-layer", type: "raster", source: "esri", paint: { "raster-opacity": 1, "raster-brightness-max": 0.6 } },
        ],
      },
      center: [-99.1332, 19.4326],
      zoom: 11,
      pitch: 45,
    });
    mapRef.current = map;
    map.on("load", () => {
      new maplibregl.Marker({ color: "#ff1744" }).setLngLat([-99.1332, 19.4326]).addTo(map);
      new maplibregl.Marker({ color: "#00ffcc" }).setLngLat([-99.2, 19.4]).addTo(map);
    });
    return () => { 
      if (mapRef.current) { 
        try { mapRef.current.remove(); } catch(e) {} 
        mapRef.current = null; 
      } 
    };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#020810", color: "#fff", fontFamily: "monospace" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", top: 20, left: 20, background: "rgba(0,0,0,0.85)", padding: 12, border: "1px solid #00ffcc", borderRadius: 8, color: "#00ffcc" }}>
          <b>MAPA OSINT — MULTI-TILE ESRI + OSM</b>
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#8aa" }}>Sin API key · Sin marca de agua</p>
        </div>
      </div>
      <div style={{ width: 400, padding: 20, background: "rgba(0,15,10,0.95)", borderLeft: "1px solid #333", overflowY: "auto" }}>
        <h2 style={{ color: "#00ffcc", borderBottom: "2px solid #00ffcc", paddingBottom: 10, marginTop: 0 }}>ANÁLISIS EJECUTIVO</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "rgba(0,255,200,0.1)", padding: 10, borderRadius: 6, border: "1px solid #00ffcc" }}><p style={{ margin: 0, fontSize: 10, color: "#8aa" }}>Operativos</p><p style={{ margin: 0, fontSize: 16, color: "#00ffcc", fontWeight: "bold" }}>142</p></div>
          <div style={{ background: "rgba(0,255,200,0.1)", padding: 10, borderRadius: 6, border: "1px solid #00ffcc" }}><p style={{ margin: 0, fontSize: 10, color: "#8aa" }}>Ahorro Comb.</p><p style={{ margin: 0, fontSize: 16, color: "#00ffcc", fontWeight: "bold" }}>2.4M L</p></div>
        </div>
        <h3 style={{ color: "#ff1744", fontSize: 13 }}>🎯 PLANES OPERATIVOS</h3>
        <div style={{ borderLeft: "3px solid #ff1744", paddingLeft: 10, marginBottom: 15 }}>
          <p style={{ margin: 0, fontWeight: "bold", fontSize: 12 }}>Operativo "Tormenta"</p>
          <p style={{ margin: "3px 0", fontSize: 10, color: "#8aa" }}>Zona: Sierra de Tamaulipas</p>
        </div>
        <div style={{ borderLeft: "3px solid #ffb300", paddingLeft: 10 }}>
          <p style={{ margin: 0, fontWeight: "bold", fontSize: 12 }}>Operativo "Muro"</p>
          <p style={{ margin: "3px 0", fontSize: 10, color: "#8aa" }}>Zona: CDMX Norte</p>
        </div>
      </div>
    </div>
  );
};
