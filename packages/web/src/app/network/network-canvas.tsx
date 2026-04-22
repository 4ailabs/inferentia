"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { computeLayout, styleFor, type NetworkData, type RawNode } from "@/lib/network-layout";

type DomainNode = Node<{
  label: string;
  label_en?: string;
  category: string;
  description?: string;
  imprint_association?: Record<string, number>;
  nutrient_modulators?: RawNode["nutrient_modulators"];
  snp_enrichment?: string[];
  onHover?: (id: string | null) => void;
  dimmed?: boolean;
  highlighted?: boolean;
}>;

function DomainNodeCard({ data, id }: NodeProps<DomainNode>) {
  const s = styleFor(data.category);
  const dimmed = data.dimmed ? "opacity-25" : "opacity-100";
  const highlighted = data.highlighted
    ? "ring-2 ring-white/60 shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)]"
    : "";
  return (
    <div
      className={`group relative rounded-lg border ${s.border} ${s.accent} backdrop-blur-sm transition-all duration-300 ${dimmed} ${highlighted}`}
      style={{ width: 220 }}
      onMouseEnter={() => data.onHover?.(id)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !border-slate-700" />
      <div className="px-3 py-2.5">
        <p className={`font-mono text-[9px] uppercase tracking-widest ${s.text} opacity-70`}>
          {s.label}
        </p>
        <p className={`mt-1 text-[13px] font-medium leading-tight ${s.text}`}>
          {data.label}
        </p>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !border-slate-700" />
    </div>
  );
}

const nodeTypes = { domain: DomainNodeCard };

export default function NetworkCanvas({ data }: { data: NetworkData }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { nodes, edges, hoveredNode } = useMemo(() => {
    const positions = computeLayout(data);

    // Build adjacency for highlight mode.
    const neighbors = new Map<string, Set<string>>();
    for (const edge of data.edges) {
      if (!neighbors.has(edge.from)) neighbors.set(edge.from, new Set());
      if (!neighbors.has(edge.to)) neighbors.set(edge.to, new Set());
      neighbors.get(edge.from)!.add(edge.to);
      neighbors.get(edge.to)!.add(edge.from);
    }

    const inHoverSet = (id: string) => {
      if (!hovered) return true;
      if (id === hovered) return true;
      return neighbors.get(hovered)?.has(id) ?? false;
    };

    const hoveredRaw = hovered ? data.nodes.find((n) => n.id === hovered) ?? null : null;

    const rfNodes: DomainNode[] = data.nodes.map((n) => ({
      id: n.id,
      type: "domain",
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      draggable: false,
      data: {
        label: n.label,
        label_en: n.label_en,
        category: n.category,
        description: n.description,
        imprint_association: n.imprint_association,
        nutrient_modulators: n.nutrient_modulators,
        snp_enrichment: n.snp_enrichment,
        onHover: setHovered,
        dimmed: hovered ? !inHoverSet(n.id) : false,
        highlighted: hovered === n.id,
      },
    }));

    const rfEdges: Edge[] = data.edges.map((e, idx) => {
      const inHover = !hovered || e.from === hovered || e.to === hovered;
      const type = e.type ?? "promotes";
      const stroke =
        type === "inhibits" ? "#f43f5e" : type === "modulates" ? "#22d3ee" : "#6366f1";
      return {
        id: `e${idx}`,
        source: e.from,
        target: e.to,
        animated: inHover && !!hovered,
        style: {
          stroke,
          strokeWidth: Math.max(0.8, (e.strength ?? 0.5) * 2.4),
          opacity: inHover ? 0.85 : 0.1,
        },
        label: e.type === "inhibits" ? "⊣" : undefined,
      };
    });

    return { nodes: rfNodes, edges: rfEdges, hoveredNode: hoveredRaw };
  }, [data, hovered]);

  return (
    <div className="relative">
      <div className="h-[680px] w-full rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep" }}
          panOnScroll
          zoomOnScroll
        >
          <Background color="#1e293b" gap={28} />
          <Controls
            position="bottom-right"
            showInteractive={false}
            className="[&_button]:!bg-slate-800 [&_button]:!border-slate-700 [&_button]:!text-slate-300"
          />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            nodeColor={(n) => {
              const cat = (n.data as DomainNode["data"])?.category ?? "pathology";
              return styleFor(cat).accent
                .replace("bg-", "")
                .replace("/25", "")
                .replace("/30", "")
                .replace("/40", "");
            }}
            maskColor="rgba(2,6,23,0.85)"
            className="!bg-slate-900 !border-slate-800 !rounded-md overflow-hidden"
            style={{ width: 180, height: 110 }}
          />
        </ReactFlow>
      </div>

      {hoveredNode && (
        <div className="pointer-events-none absolute top-4 right-4 w-80 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl p-4 z-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            {styleFor(hoveredNode.category).label}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-100">{hoveredNode.label}</h3>
          {hoveredNode.label_en && (
            <p className="text-xs text-slate-400 italic">{hoveredNode.label_en}</p>
          )}
          {hoveredNode.description && (
            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              {hoveredNode.description}
            </p>
          )}
          {hoveredNode.nutrient_modulators && hoveredNode.nutrient_modulators.length > 0 && (
            <div className="mt-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                Moduladores
              </p>
              <ul className="mt-1 space-y-1">
                {hoveredNode.nutrient_modulators.slice(0, 5).map((m) => (
                  <li key={m.name} className="text-[11px] text-slate-300">
                    <span className="font-mono text-emerald-300">
                      {m.direction ?? "·"}
                    </span>{" "}
                    {m.name}
                    {m.mechanism && (
                      <span className="text-slate-500"> — {m.mechanism}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hoveredNode.snp_enrichment && hoveredNode.snp_enrichment.length > 0 && (
            <div className="mt-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                SNPs
              </p>
              <p className="mt-1 text-[11px] text-violet-300 font-mono">
                {hoveredNode.snp_enrichment.slice(0, 4).join(" · ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
