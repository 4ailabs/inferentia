import type { NetworkData, RawEdge, RawNode } from "@/lib/network-layout";

/**
 * CuratedMap — Hand-authored SVG physiopathology map.
 *
 * Six visible bands, left-to-right clinical cascade:
 *   0. Imprints (BV4 predictive priors)
 *   1. Neuroendocrine (HPA)
 *   2. Autonomic + Gut (stacked)
 *   3. Metabolic core
 *   4. Hepatic + Inflammatory
 *   5. Pathology (downstream)
 *
 * Every node coordinate is manually placed — no auto-layout.
 * Active patient mode ("ana") = all nodes with imprint_i8_reserva >= 0.55.
 */

// ───────────────────────────────────────────────────────────── palette ──
const PAPER = "#FAFAF7";
const INK = "#0F0F0E";
const INK_SOFT = "#3A3A36";
const INK_MUTE = "#8B8A85";
const INK_QUIET = "#6E6D68";
const RULE = "#D8D4CB";
const ACCENT = "#6B3FA0";
const DANGER = "#8A2C1B";

// ───────────────────────────────────────────────────────────── geometry ──
const NODE_W = 168;
const NODE_H = 52;
const STRIPE_H = 2;

// Manually placed coordinates per node id. (x, y) = top-left of the card.
// Columns roughly: 20, 220, 420, 620, 820, 1020.
const POS: Record<string, { x: number; y: number }> = {
  // Column 0 — Imprints (upstream priors)
  imprint_i1_desacople: { x: 20, y: 70 },
  imprint_i4_fijacion_externa: { x: 20, y: 180 },
  imprint_i7_hibernacion: { x: 20, y: 510 },
  imprint_i8_reserva: { x: 20, y: 340 },

  // Column 1 — Neuroendocrine (HPA)
  hpa_axis_rigidity: { x: 220, y: 120 },
  cortisol_chronic: { x: 220, y: 220 },
  car_exaggerated: { x: 220, y: 320 },
  adrenergic_drive: { x: 220, y: 420 },

  // Column 2 — Autonomic (top) + Gut (bottom)
  sympathetic_tone: { x: 420, y: 70 },
  vagal_ventral: { x: 420, y: 160 },
  vagal_dorsal_collapse: { x: 420, y: 250 },
  hrv_reduction: { x: 420, y: 340 },
  gut_dysbiosis: { x: 420, y: 460 },
  gut_permeability: { x: 420, y: 550 },
  scfa_production: { x: 420, y: 640 },

  // Column 3 — Metabolic core (7 nodes, densest column)
  visceral_adiposity: { x: 620, y: 70 },
  ectopic_lipid: { x: 620, y: 160 },
  adipose_insulin_resistance: { x: 620, y: 250 },
  hepatic_insulin_resistance: { x: 620, y: 340 },
  systemic_insulin_resistance: { x: 620, y: 430 },
  hba1c_elevated: { x: 620, y: 520 },
  atherogenic_dyslipidemia: { x: 620, y: 610 },

  // Column 4 — Hepatic + Inflammatory
  masld: { x: 820, y: 70 },
  mitochondrial_dysfunction: { x: 820, y: 160 },
  oxidative_stress: { x: 820, y: 250 },
  ldl_oxidation: { x: 820, y: 340 },
  adipose_inflammation: { x: 820, y: 440 },
  systemic_inflammation: { x: 820, y: 540 },
  treg_th17_imbalance: { x: 820, y: 640 },

  // Column 5 — Pathology (downstream)
  pathology_masld_advanced: { x: 1020, y: 110 },
  pathology_atherosclerosis: { x: 1020, y: 270 },
  pathology_t2dm: { x: 1020, y: 430 },
  pathology_neuropathy: { x: 1020, y: 590 },
};

// Category → roman numeral eyebrow (per page.tsx convention)
const CAT_NUMERAL: Record<string, string> = {
  imprint: "I",
  neuroendocrine: "II",
  autonomic: "III",
  gut: "IV",
  metabolic: "V",
  hepatic: "VI",
  inflammatory: "VII",
  pathology: "VIII",
};

// Modulator annotation tags (5 key modulators next to primary targets)
const MODULATOR_TAGS: Array<{ node: string; text: string; dy?: number }> = [
  { node: "hpa_axis_rigidity", text: "ashwagandha" },
  { node: "systemic_insulin_resistance", text: "myo-inositol" },
  { node: "systemic_inflammation", text: "omega-3 EPA/DHA" },
  { node: "cortisol_chronic", text: "Mg-glicinato" },
  { node: "hba1c_elevated", text: "berberina" },
];

// ──────────────────────────────────────────────────── helpers ──
function isActive(node: RawNode): boolean {
  return (node.imprint_association?.i8 ?? 0) >= 0.55;
}

function wrapLabel(label: string, max = 22): [string, string] {
  if (label.length <= max) return [label, ""];
  // break at the last space before `max`
  const cut = label.lastIndexOf(" ", max);
  const idx = cut > 8 ? cut : max;
  return [label.slice(0, idx).trim(), label.slice(idx).trim()];
}

function edgeStyle(
  e: RawEdge,
  fromActive: boolean,
  toActive: boolean
): { stroke: string; strokeWidth: number; opacity: number; dash?: string } {
  const bothActive = fromActive && toActive;
  const neither = !fromActive && !toActive;

  // Special edge types override color
  if (e.type === "inhibits") {
    return {
      stroke: DANGER,
      strokeWidth: bothActive ? 1 : 0.8,
      opacity: bothActive ? 0.85 : neither ? 0.22 : 0.4,
    };
  }
  if (e.type === "modulates") {
    return {
      stroke: ACCENT,
      strokeWidth: bothActive ? 1 : 0.8,
      opacity: bothActive ? 0.85 : neither ? 0.22 : 0.4,
      dash: "4 3",
    };
  }

  if (bothActive) return { stroke: INK, strokeWidth: 1, opacity: 0.85 };
  if (neither) return { stroke: RULE, strokeWidth: 0.6, opacity: 0.2 };
  return { stroke: INK_QUIET, strokeWidth: 0.8, opacity: 0.35 };
}

/**
 * Cubic bezier from (fromCx, fromCy) to (toCx, toCy) biased rightward.
 * Hints the cascade direction with a gentle horizontal curvature.
 */
function bezierPath(
  fx: number,
  fy: number,
  tx: number,
  ty: number
): string {
  const dx = tx - fx;
  const cx1 = fx + dx * 0.5;
  const cy1 = fy;
  const cx2 = tx - dx * 0.5;
  const cy2 = ty;
  return `M ${fx} ${fy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
}

// ─────────────────────────────────────────────────── component ──
type Props = {
  data: NetworkData;
  patient?: "ana" | null;
};

export default function CuratedMap({ data, patient = "ana" }: Props) {
  const activeMode = patient === "ana";

  // Index nodes by id for fast lookup
  const nodeMap = new Map<string, RawNode>();
  for (const n of data.nodes) nodeMap.set(n.id, n);

  // Active set (only meaningful in "ana" mode)
  const activeSet = new Set<string>();
  if (activeMode) {
    for (const n of data.nodes) {
      if (isActive(n)) activeSet.add(n.id);
    }
  }

  const activeCount = activeSet.size;
  const totalCount = data.nodes.length;

  // Filter edges to only those we can draw (both endpoints positioned)
  const drawableEdges = data.edges.filter(
    (e) => POS[e.from] && POS[e.to]
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 1200 820"
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        role="img"
        aria-label="Fig. ii — Flexibility network, patient 001 (i8 Reserva)"
        style={{ background: PAPER, fontFamily: "Inter, sans-serif" }}
      >
        {/* soft drop-shadow for active nodes */}
        <defs>
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="160%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="0"
              floodColor={INK}
              floodOpacity="0.08"
            />
          </filter>
        </defs>

        {/* ────────────── column band headers ────────────── */}
        <g aria-hidden="true">
          {[
            { label: "Imprints", x: 20 },
            { label: "Neuroendocrine", x: 220 },
            { label: "Autonomic · Gut", x: 420 },
            { label: "Metabolic core", x: 620 },
            { label: "Hepatic · Inflammatory", x: 820 },
            { label: "Pathology", x: 1020 },
          ].map((c) => (
            <text
              key={c.label}
              x={c.x}
              y={40}
              fill={INK_MUTE}
              fontSize={8.5}
              fontFamily="Inter, sans-serif"
              letterSpacing="0.14em"
              fontWeight={500}
            >
              {c.label.toUpperCase()}
            </text>
          ))}
          {/* Hairline under headers */}
          <line x1={20} y1={50} x2={1180} y2={50} stroke={RULE} strokeWidth={0.5} />
        </g>

        {/* ────────────── edges (drawn first so nodes sit on top) ────────────── */}
        <g>
          {drawableEdges.map((e, i) => {
            const from = POS[e.from];
            const to = POS[e.to];
            // emanate from right-middle of source, enter left-middle of target
            const fx = from.x + NODE_W;
            const fy = from.y + NODE_H / 2;
            const tx = to.x;
            const ty = to.y + NODE_H / 2;

            const fromActive = activeSet.has(e.from);
            const toActive = activeSet.has(e.to);
            const inactiveAll = !activeMode;
            // In neutral atlas mode, render all edges as neither-active
            const style = inactiveAll
              ? edgeStyle(e, false, false)
              : edgeStyle(e, fromActive, toActive);

            return (
              <path
                key={`e-${i}-${e.from}-${e.to}`}
                d={bezierPath(fx, fy, tx, ty)}
                fill="none"
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeOpacity={style.opacity}
                strokeDasharray={style.dash}
                strokeLinecap="round"
              >
                <title>
                  {e.from} → {e.to}
                  {e.type ? ` (${e.type})` : ""}
                  {e.rationale ? ` — ${e.rationale}` : ""}
                </title>
              </path>
            );
          })}
        </g>

        {/* ────────────── nodes ────────────── */}
        <g>
          {data.nodes.map((node) => {
            const pos = POS[node.id];
            if (!pos) return null;
            const active = activeMode && activeSet.has(node.id);
            const isImprint = node.category === "imprint";
            const isAccentImprint = node.id === "imprint_i8_reserva" && activeMode;

            // Fill + text logic
            const fill = active
              ? isAccentImprint
                ? ACCENT
                : INK
              : PAPER;
            const stripeFill = isImprint ? ACCENT : INK;
            const stripeOpacity = active ? 1 : 0.6;
            const strokeColor = active ? "none" : RULE;
            const labelFill = active ? PAPER : isImprint ? INK : INK_SOFT;
            const eyebrowFill = active ? PAPER : INK_MUTE;

            const [line1, line2] = wrapLabel(node.label, 24);

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="node-card"
                filter={active ? "url(#card-shadow)" : undefined}
              >
                <title>
                  {node.label}
                  {node.description ? ` — ${node.description.slice(0, 180)}` : ""}
                </title>

                {/* card body */}
                <rect
                  x={0}
                  y={0}
                  width={NODE_W}
                  height={NODE_H}
                  rx={2}
                  ry={2}
                  fill={fill}
                  stroke={strokeColor}
                  strokeWidth={1}
                />

                {/* top stripe */}
                <rect
                  x={0}
                  y={0}
                  width={NODE_W}
                  height={STRIPE_H}
                  fill={stripeFill}
                  fillOpacity={stripeOpacity}
                />

                {/* eyebrow — category numeral */}
                <text
                  x={10}
                  y={15}
                  fill={eyebrowFill}
                  fontSize={7.5}
                  fontFamily="Inter, sans-serif"
                  letterSpacing="0.14em"
                  fontWeight={500}
                >
                  {(CAT_NUMERAL[node.category] ?? "·") + " · " + node.category.toUpperCase()}
                </text>

                {/* label line 1 */}
                <text
                  x={10}
                  y={line2 ? 31 : 36}
                  fill={labelFill}
                  fontSize={11}
                  fontFamily="'Fraunces', serif"
                  fontWeight={500}
                >
                  {line1}
                </text>
                {line2 && (
                  <text
                    x={10}
                    y={44}
                    fill={labelFill}
                    fontSize={11}
                    fontFamily="'Fraunces', serif"
                    fontWeight={500}
                  >
                    {line2}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* ────────────── modulator tags ────────────── */}
        <g aria-hidden="true">
          {MODULATOR_TAGS.map((tag) => {
            const pos = POS[tag.node];
            if (!pos) return null;
            const active = activeMode && activeSet.has(tag.node);
            return (
              <text
                key={tag.node + tag.text}
                x={pos.x + NODE_W + 6}
                y={pos.y + NODE_H - 6 + (tag.dy ?? 0)}
                fill={active ? ACCENT : INK_MUTE}
                fontSize={9.5}
                fontFamily="'Fraunces', serif"
                fontStyle="italic"
              >
                + {tag.text}
              </text>
            );
          })}
        </g>

        {/* ────────────── legend (top-right swatches) ────────────── */}
        <g transform="translate(930, 20)" aria-hidden="true">
          {[
            { label: "Active", color: INK, kind: "box" },
            { label: "Inactive", color: RULE, kind: "box-outline" },
            { label: "Inhibits", color: DANGER, kind: "line" },
            { label: "Modulates", color: ACCENT, kind: "dash" },
          ].map((item, i) => {
            const x = i * 62;
            return (
              <g key={item.label} transform={`translate(${x}, 0)`}>
                {item.kind === "box" && (
                  <rect x={0} y={0} width={10} height={10} fill={item.color} />
                )}
                {item.kind === "box-outline" && (
                  <rect
                    x={0}
                    y={0}
                    width={10}
                    height={10}
                    fill={PAPER}
                    stroke={item.color}
                    strokeWidth={1}
                  />
                )}
                {item.kind === "line" && (
                  <line
                    x1={0}
                    y1={5}
                    x2={12}
                    y2={5}
                    stroke={item.color}
                    strokeWidth={1.2}
                  />
                )}
                {item.kind === "dash" && (
                  <line
                    x1={0}
                    y1={5}
                    x2={12}
                    y2={5}
                    stroke={item.color}
                    strokeWidth={1.2}
                    strokeDasharray="3 2"
                  />
                )}
                <text
                  x={16}
                  y={9}
                  fill={INK_SOFT}
                  fontSize={8}
                  fontFamily="Inter, sans-serif"
                  letterSpacing="0.08em"
                >
                  {item.label.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>

        {/* ────────────── figure caption (below diagram) ────────────── */}
        <g transform="translate(20, 760)">
          <line x1={0} y1={0} x2={1160} y2={0} stroke={RULE} strokeWidth={0.5} />
          <text
            x={0}
            y={20}
            fill={INK_MUTE}
            fontSize={8.5}
            fontFamily="Inter, sans-serif"
            letterSpacing="0.14em"
            fontWeight={500}
          >
            FIG. II · PATIENT 001 · I8 RESERVA
          </text>
          <text
            x={0}
            y={42}
            fill={INK_SOFT}
            fontSize={11.5}
            fontFamily="'Fraunces', serif"
            fontStyle="italic"
          >
            {activeMode
              ? `${activeCount} active nodes / ${totalCount}. Cortisol rigidity drives the cascade upstream. Prescribed modulators tagged beside their target nodes.`
              : `${totalCount} nodes, neutral atlas. No patient active — outline mode.`}
          </text>
        </g>

        {/* hover rule (CSS only, no JS) */}
        <style>{`
          .node-card { transition: opacity 160ms ease; }
          svg:hover .node-card { opacity: 0.55; }
          svg:hover .node-card:hover { opacity: 1; }
        `}</style>
      </svg>
    </div>
  );
}
