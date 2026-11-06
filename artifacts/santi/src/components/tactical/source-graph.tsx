import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import type { TacticalEdge, TacticalNode } from "@workspace/api-client-react";
import { Maximize2, RotateCcw } from "lucide-react";

type Props = {
  nodes: TacticalNode[];
  edges: TacticalEdge[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
};

export function SourceGraph({ nodes, edges, selectedNodeId, onSelectNode }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const cy = useRef<cytoscape.Core | null>(null);
  const selRef = useRef(onSelectNode);
  selRef.current = onSelectNode;

  useEffect(() => {
    if (!el.current) return;
    const ids = new Set(nodes.map((n) => n.id));
    const inst = cytoscape({
      container: el.current,
      elements: [
        ...nodes.map((n) => ({ data: { id: n.id, label: n.label, kind: n.kind } })),
        ...edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ data: { id: e.id, source: e.source, target: e.target, label: e.label } })),
      ],
      layout: { name: "cose", animate: false, padding: 24, nodeRepulsion: () => 9000 },
      minZoom: 0.3, maxZoom: 3,
      style: [
        { selector: "node", style: { label: "data(label)", color: "#d9dcf5", "font-size": 9, "font-family": "IBM Plex Mono, monospace", "text-valign": "bottom", "text-margin-y": 5, "text-wrap": "ellipsis", "text-max-width": "90px", width: 18, height: 18, "border-width": 1.5, "border-color": "#2a2550" } },
        { selector: 'node[kind = "incident"]', style: { "background-color": "#f0607e", shape: "diamond", width: 24, height: 24 } },
        { selector: 'node[kind = "source"]', style: { "background-color": "#a77bff", shape: "ellipse" } },
        { selector: 'node[kind = "zone"]', style: { "background-color": "#ff9f33", shape: "round-rectangle" } },
        { selector: "edge", style: { width: 1.2, "line-color": "#5b52a0", "line-style": "dashed", "curve-style": "bezier", "target-arrow-shape": "none", label: "", "font-size": 7, color: "#8a87b8", "text-rotation": "autorotate", "text-background-color": "#0d0b1c", "text-background-opacity": 0.8, "text-background-padding": "2px" } },
        { selector: ".faded", style: { opacity: 0.18 } },
        { selector: "node.focus", style: { "border-color": "#fff3d6", "border-width": 3 } },
        { selector: "edge.focus", style: { "line-color": "#ffb057", width: 2.4, "line-style": "solid", color: "#ffd9a8", label: "data(label)" } },
      ],
    });
    inst.on("tap", "node", (ev) => selRef.current(ev.target.id()));
    inst.on("tap", (ev) => { if (ev.target === inst) selRef.current(null); });
    const observer = new ResizeObserver(() => { inst.resize(); });
    observer.observe(el.current);
    cy.current = inst;
    return () => { observer.disconnect(); inst.destroy(); cy.current = null; };
  }, [nodes, edges]);

  useEffect(() => {
    const c = cy.current;
    if (!c) return;
    c.elements().removeClass("faded focus");
    if (!selectedNodeId) return;
    const n = c.getElementById(selectedNodeId);
    if (n.empty()) return;
    const hood = n.closedNeighborhood();
    c.elements().not(hood).addClass("faded");
    hood.addClass("focus");
  }, [selectedNodeId, nodes, edges]);

  const fit = () => {
    const c = cy.current;
    if (!c) return;
    const n = selectedNodeId ? c.getElementById(selectedNodeId) : null;
    c.animate({ fit: { eles: n && !n.empty() ? n.closedNeighborhood() : c.elements(), padding: 30 } }, { duration: 300 });
  };
  const reset = () => { selRef.current(null); cy.current?.animate({ fit: { eles: cy.current.elements(), padding: 24 } }, { duration: 300 }); };

  return (
    <div className="space-y-2 min-w-0 max-w-full">
      <div ref={el} className="td-graph" role="img" aria-label="Grafo simulado de correlaciones entre incidentes, fuentes y zonas" data-testid="graph-tactical" />
      <div className="flex flex-wrap gap-2">
        <button className="td-btn td-btn-ghost !min-h-[36px] flex-1" onClick={fit} data-testid="button-graph-fit"><Maximize2 size={14} /> Encuadrar</button>
        <button className="td-btn td-btn-ghost !min-h-[36px] flex-1" onClick={reset} data-testid="button-graph-reset"><RotateCcw size={14} /> Restablecer</button>
      </div>
    </div>
  );
}
