/**
 * Deterministic column-based layout for the flexibility network.
 *
 * Categories are mapped to columns left → right so the causal cascade
 * is readable: imprints (upstream) → neuroendocrine/autonomic →
 * gut/metabolic → hepatic/inflammatory → pathology (downstream).
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

const COLUMN_GAP = 300;
const ROW_GAP = 108;
const PADDING_Y = 60;

export function computeLayout(data: NetworkData) {
  const byColumn = new Map<number, RawNode[]>();
  for (const node of data.nodes) {
    const col = node.position_hint?.col ?? COLUMN_ORDER[node.category] ?? 0;
    if (!byColumn.has(col)) byColumn.set(col, []);
    byColumn.get(col)!.push(node);
  }

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

// Editorial paper tokens per category. Only imprints carry the accent;
// everything else reads as varying greys on cream.
export const CATEGORY_STYLES: Record<
  string,
  { borderClass: string; numeral: string; label: string; accent: boolean }
> = {
  imprint: {
    borderClass: "border-accent",
    numeral: "i",
    label: "Imprint",
    accent: true,
  },
  neuroendocrine: {
    borderClass: "border-ink",
    numeral: "ii",
    label: "Neuroendocrine",
    accent: false,
  },
  autonomic: {
    borderClass: "border-ink-soft",
    numeral: "iii",
    label: "Autonomic",
    accent: false,
  },
  gut: {
    borderClass: "border-ink-quiet",
    numeral: "iv",
    label: "Gut",
    accent: false,
  },
  metabolic: {
    borderClass: "border-ink-soft",
    numeral: "v",
    label: "Metabolic",
    accent: false,
  },
  hepatic: {
    borderClass: "border-ink-quiet",
    numeral: "vi",
    label: "Hepatic",
    accent: false,
  },
  inflammatory: {
    borderClass: "border-ink-quiet",
    numeral: "vii",
    label: "Inflammatory",
    accent: false,
  },
  pathology: {
    borderClass: "border-ink",
    numeral: "viii",
    label: "Pathology",
    accent: false,
  },
};

export function styleFor(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.pathology;
}
