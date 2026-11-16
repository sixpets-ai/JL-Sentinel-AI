import React, { useEffect, useRef, useState } from "react";

interface Node { id: string; label: string; type: "person" | "phone"; x: number; y: number; color: string; }
interface Edge { source: string; target: string; type: string; date: string; hour: string; company: string; callType: "entrante" | "saliente"; duration: string; }

const NODES: Node[] = [
  { id: "A", label: "Objetivo (Sujeto A)", type: "person", x: 400, y: 250, color: "#00ffcc" },
  { id: "B", label: "Contacto Frecuente", type: "person", x: 200, y: 100, color: "#ff1744" },
  { id: "C", label: "Red Social (IP)", type: "person", x: 600, y: 100, color: "#9c27b0" },
  { id: "D", label: "Bodega / Teléfono", type: "phone", x: 250, y: 400, color: "#ffb300" },
];

const EDGES: Edge[] = [
  { source: "A", target: "B", type: "Llamada Directa", date: "12/11/2026", hour: "14:30", company: "TELCEL", callType: "saliente", duration: "02:45" },
  { source: "A", target: "C", type: "Conexión IP", date: "12/11/2026", hour: "15:12", company: "Vodafone", callType: "entrante", duration: "00:12" },
  { source: "B", target: "D", type: "Llamada Pendiente", date: "11/11/2026", hour: "22:40", company: "AT&T", callType: "saliente", duration: "05:30" },
];

export const LinkAnalysisView = () => {
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#020810", display: "flex", flexDirection: "column", fontFamily: "monospace" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #00ffcc", color: "#00ffcc", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span>🔗 ANÁLISIS DE REDES TELEFÓNICAS - IBM I2 (LIVE)</span>
        <span style={{ color: "#00e676" }}>MODO FEDERAL ACTIVO</span>
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <svg width="100%" height="100%" style={{ background: "radial-gradient(circle, #0a192f 0%, #020810 100%)" }}>
            {/* ARISTAS CON METADATOS */}
            {EDGES.map((edge, i) => {
              const source = NODES.find(n => n.id === edge.source)!;
              const target = NODES.find(n => n.id === edge.target)!;
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              return (
                <g key={i} onClick={() => setSelectedEdge(edge)} style={{ cursor: "pointer" }}>
                  <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#ff1744" strokeWidth="2" strokeDasharray="5,5" />
                  <circle cx={midX} cy={midY} r="8" fill="#ff1744" />
                  <text x={midX + 12} y={midY + 4} fill="#ffb300" fontSize="10">{edge.company} | {edge.hour}</text>
                </g>
              );
            })}
            {/* NODOS */}
            {NODES.map(node => (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r="25" fill={`${node.color}33`} stroke={node.color} strokeWidth="2" style={{ filter: `drop-shadow(0 0 10px ${node.color})` }} />
                <text x={node.x} y={node.y + 4} textAnchor="middle" fill={node.color} fontSize="14">{node.type === "person" ? "👤" : "📞"}</text>
                <text x={node.x} y={node.y + 45} textAnchor="middle" fill="#fff" fontSize="11">{node.label}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* PANEL LATERAL DE DETALLE DE LLAMADA */}
        <div style={{ width: 350, padding: 20, background: "rgba(0,15,10,0.95)", borderLeft: "1px solid #333", color: "#fff" }}>
          <h3 style={{ color: "#00ffcc", borderBottom: "1px solid #00ffcc", paddingBottom: 10 }}>DETALLE DE VÍNCULO</h3>
          {selectedEdge ? (
            <div style={{ fontSize: 12, lineHeight: 2 }}>
              <p><b style={{ color: "#8aa" }}>TIPO:</b> {selectedEdge.type}</p>
              <p><b style={{ color: "#8aa" }}>FECHA:</b> {selectedEdge.date}</p>
              <p><b style={{ color: "#8aa" }}>HORA:</b> {selectedEdge.hour}</p>
              <p><b style={{ color: "#8aa" }}>COMPAÑÍA:</b> {selectedEdge.company}</p>
              <p><b style={{ color: "#8aa" }}>DIRECCIÓN:</b> <span style={{ color: selectedEdge.callType === "entrante" ? "#00e676" : "#ff1744" }}>{selectedEdge.callType.toUpperCase()}</span></p>
              <p><b style={{ color: "#8aa" }}>DURACIÓN:</b> {selectedEdge.duration}</p>
              <hr style={{ borderColor: "#333", margin: "15px 0" }} />
              <p style={{ fontSize: 10, color: "#8aa" }}>💡 Haz clic en una línea del grafo para inspeccionar los metadatos forenses de la llamada.</p>
            </div>
          ) : (
            <p style={{ color: "#8aa", fontSize: 12 }}>Selecciona una conexión en el grafo para ver el detalle forense.</p>
          )}
        </div>
      </div>
    </div>
  );
};
