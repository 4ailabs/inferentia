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
import {
  computeLayout,
  styleFor,
  type NetworkData,
  type RawNode,
} from "@/lib/network-layout";

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
  const dimmed = data.dimmed ? "opacity-30" : "opacity-100";
  const highlighted = data.highlighted ? "ring-1 ring-ink shadow-[0_2px_0_rgba(15,15,14,0.08)]" : "";

  return (
    <div
      className={`group relative bg-paper-raised transition-all duration-200 ${dimmed} ${highlighted}`}
      style={{ width: 232 }}
      onMouseEnter={() => data.onHover?.(id)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-ink-mute !border-paper-raised"
      />

      {/* Accent rule at top — only for imprints */}
      <div
        className={`h-[3px] ${s.accent ? "bg-accent" : "bg-ink"} ${
          s.accent ? "" : "opacity-60"
        }`}
      />

      <div className="px-4 py-3 border-x border-b border-rule">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-ink-mute">
            {s.numeral} · {s.label}
          </span>
          {s.accent && (
            <span className="w-1 h-1 bg-accent rounded-full" />
          )}
        </div>
        <p
          className="mt-2 text-[13px] leading-[1.3] text-ink font-medium"
          style={{
            fontFamily: "var(--font-fraunces), serif",
            letterSpacing: "-0.01em",
          }}
        >
          {data.label}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-ink-mute !border-paper-raised"
      />
    </div>
  );
}

const nodeTypes = { domain: DomainNodeCard };

export default function NetworkCanvas({ data }: { data: NetworkData }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { nodes, edges, hoveredNode } = useMemo(() => {
    const positions = computeLayout(data);

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

    const hoveredRaw = hovered
      ? data.nodes.find((n) => n.id === hovered) ?? null
      : null;

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
        type === "inhibits"
          ? "#8A2C1B"
          : type === "modulates"
          ? "#6B3FA0"
          : "#4A4944";
      const strength = Math.max(0.8, (e.strength ?? 0.5) * 1.8);
      return {
        id: `e${idx}`,
        source: e.from,
        target: e.to,
        animated: false,
        style: {
          stroke,
          strokeWidth: strength,
          opacity: inHover ? 0.85 : 0.08,
          strokeDasharray: type === "modulates" ? "4 3" : undefined,
        },
      };
    });

    return { nodes: rfNodes, edges: rfEdges, hoveredNode: hoveredRaw };
  }, [data, hovered]);

  return (
    <div className="relative">
      <div className="h-[700px] w-full border border-ink bg-paper-soft overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep" }}
          panOnScroll
          zoomOnScroll
        >
          <Background color="#D8D4CB" gap={32} size={1} />
          <Controls
            position="bottom-right"
            showInteractive={false}
            className="!shadow-none"
          />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            nodeColor={(n) => {
              const cat = (n.data as DomainNode["data"])?.category ?? "pathology";
              return styleFor(cat).accent ? "#6B3FA0" : "#0F0F0E";
            }}
            maskColor="rgba(244, 242, 236, 0.9)"
            style={{ width: 180, height: 110 }}
          />
        </ReactFlow>
      </div>

      {hoveredNode && (
        <aside className="pointer-events-none absolute top-5 right-5 w-[340px] bg-paper-raised border border-ink p-5 z-10 shadow-[0_1px_0_rgba(15,15,14,0.04)]">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              {styleFor(hoveredNode.category).numeral} ·{" "}
              {styleFor(hoveredNode.category).label}
            </span>
            {styleFor(hoveredNode.category).accent && (
              <span className="w-1.5 h-1.5 bg-accent rounded-full" />
            )}
          </div>

          <h3
            className="mt-3 editorial text-[22px] leading-tight text-ink"
            style={{ letterSpacing: "-0.015em" }}
          >
            {hoveredNode.label}
          </h3>
          {hoveredNode.label_en && (
            <p className="text-[11px] text-ink-mute mt-0.5 italic">
              {hoveredNode.label_en}
            </p>
          )}

          <div className="my-4 h-px bg-rule" />

          {hoveredNode.description && (
            <p className="text-[12.5px] text-ink-soft leading-[1.55]">
              {hoveredNode.description}
            </p>
          )}

          {hoveredNode.nutrient_modulators &&
            hoveredNode.nutrient_modulators.length > 0 && (
              <div className="mt-5">
                <p className="eyebrow">Modulators</p>
                <ul className="mt-2 space-y-1.5">
                  {hoveredNode.nutrient_modulators.slice(0, 5).map((m) => (
                    <li
                      key={m.name}
                      className="text-[11.5px] text-ink-soft leading-relaxed"
                    >
                      <span className="tabular text-accent mr-1.5">
                        {m.direction ?? "·"}
                      </span>
                      <span className="font-medium">{m.name}</span>
                      {m.mechanism && (
                        <span className="text-ink-mute">
                          {" "}
                          — {m.mechanism}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {hoveredNode.snp_enrichment &&
            hoveredNode.snp_enrichment.length > 0 && (
              <div className="mt-5">
                <p className="eyebrow">Snps</p>
                <p className="mt-2 tabular text-[11px] text-ink-soft leading-relaxed">
                  {hoveredNode.snp_enrichment.slice(0, 4).join(" · ")}
                </p>
              </div>
            )}
        </aside>
      )}
    </div>
  );
}
