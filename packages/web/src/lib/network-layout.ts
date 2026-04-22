/**
 * Deterministic column-based layout for the flexibility network.
 *
 * Categories are mapped to columns left → right so the causal cascade
 * is readable: imprints (upstream) → neuroendocrine/autonomic →
 * gut/metabolic → hepatic/inflammatory → pathology (downstream).
 *
 * Within a column, nodes are ordered by their position_hint.row when present,
 * falling back to alphabetical by id. Absolute positions are computed so
 * React Flow can render without physics simulation.
 */

export type RawNode = {
  id: string;
  label: string;
  label_en?: string;
  category: string;
  description?: string;
  imprint_association?: Record<string, number>;
  nutrient_modulators?: Array<{ name: string; mechanism?: string; direction?: string }>;
  snp_enrichment?: string[];
  evidence_markers?: string[];
  citations?: string[];
  position_hint?: { col?: number; row?: number };
};

export type RawEdge = {
  from: string;
  to: string;
  type?: "promotes" | "inhibits" | "modulates";
  strength?: number;
  rationale?: string;
  citation?: string;
};

export type NetworkData = {
  nodes: RawNode[];
  edges: RawEdge[];
};

// Column ordering (left to right) — the causal story of the network.
const COLUMN_ORDER: Record<string, number> = {
  imprint: 0,
  neuroendocrine: 1,
  autonomic: 2,
  gut: 3,
  metabolic: 4,
  hepatic: 5,
  inflammatory: 6,
  pathology: 7,
};

const COLUMN_GAP = 280;
const ROW_GAP = 110;
const PADDING_Y = 60;

export function computeLayout(data: NetworkData) {
  // Group nodes by the column their category maps to.
  const byColumn = new Map<number, RawNode[]>();
  for (const node of data.nodes) {
    const col = node.position_hint?.col ?? COLUMN_ORDER[node.category] ?? 0;
    if (!byColumn.has(col)) byColumn.set(col, []);
    byColumn.get(col)!.push(node);
  }

  // Within each column, sort by position_hint.row then id.
  for (const [, list] of byColumn) {
    list.sort((a, b) => {
      const ra = a.position_hint?.row ?? 999;
      const rb = b.position_hint?.row ?? 999;
      if (ra !== rb) return ra - rb;
      return a.id.localeCompare(b.id);
    });
  }

  const positioned = new Map<string, { x: number; y: number }>();
  for (const [col, list] of byColumn) {
    list.forEach((node, idx) => {
      positioned.set(node.id, {
        x: col * COLUMN_GAP + 40,
        y: idx * ROW_GAP + PADDING_Y,
      });
    });
  }
  return positioned;
}

// Tone maps for each category (all tuned for dark background).
export const CATEGORY_STYLES: Record<
  string,
  { accent: string; text: string; border: string; label: string }
> = {
  imprint: {
    accent: "bg-indigo-500/30",
    text: "text-indigo-200",
    border: "border-indigo-400/60",
    label: "Impronta",
  },
  neuroendocrine: {
    accent: "bg-rose-500/25",
    text: "text-rose-200",
    border: "border-rose-400/50",
    label: "Neuroendocrino",
  },
  autonomic: {
    accent: "bg-amber-500/25",
    text: "text-amber-100",
    border: "border-amber-400/50",
    label: "Autonómico",
  },
  gut: {
    accent: "bg-emerald-500/25",
    text: "text-emerald-200",
    border: "border-emerald-400/50",
    label: "Intestinal",
  },
  metabolic: {
    accent: "bg-cyan-500/25",
    text: "text-cyan-200",
    border: "border-cyan-400/50",
    label: "Metabólico",
  },
  hepatic: {
    accent: "bg-orange-500/25",
    text: "text-orange-200",
    border: "border-orange-400/50",
    label: "Hepático",
  },
  inflammatory: {
    accent: "bg-fuchsia-500/25",
    text: "text-fuchsia-200",
    border: "border-fuchsia-400/50",
    label: "Inflamatorio",
  },
  pathology: {
    accent: "bg-slate-600/40",
    text: "text-slate-200",
    border: "border-slate-400/40",
    label: "Patología",
  },
};

export function styleFor(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.pathology;
}
