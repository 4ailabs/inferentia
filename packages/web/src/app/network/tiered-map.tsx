import type { NetworkData } from "@/lib/network-layout";

/**
 * TieredMap — top-down causal cascade with supernodes.
 *
 * Research-backed redesign (memos 13 & 14):
 *   - 4 named horizontal tiers (Prior → Mediator → Signature → Manifestation).
 *   - ≤7 visible supernodes at first paint.
 *   - Single pivot node (active imprint) visually distinct.
 *   - Every arrow labeled with a verb.
 *   - Interventions as perpendicular wedges from the right margin.
 *   - One accent color reserved for agency/intervention.
 *   - Typography carries hierarchy; color is semantic only.
 *
 * No force-directed layout. Every (x, y) is authored.
 * Canvas is anchored to a fixed viewBox so responsive scaling never
 * clips content — the SVG scales down as a whole; we budget generous
 * margins so labels at the right-hand agency column stay in-frame.
 */

// ──────────────────────────────────────────────────────────── palette ──
const PAPER = "#FAFAF7";
const INK = "#0F0F0E";
const INK_SOFT = "#3A3A36";
const INK_QUIET = "#6E6D68";
const INK_MUTE = "#8B8A85";
const RULE = "#D8D4CB";
const ACCENT = "#6B3FA0";

// ──────────────────────────────────────────────────────────── geometry ──
/**
 * Canvas is 1440 × 860. Left margin 64, right margin 320 (for the agency
 * column), top 72, bottom 64. The cascade lives in the central 1056 px band.
 */
const W = 1440;
const H = 860;

const CASCADE_LEFT = 64;
const CASCADE_RIGHT = W - 320; // agency column lives past this line
const CASCADE_WIDTH = CASCADE_RIGHT - CASCADE_LEFT; // 1056

// Three columns inside the cascade (for tiers 2 & 3 which have 3 supernodes)
const COL_CENTERS = [
  CASCADE_LEFT + CASCADE_WIDTH * 0.17, // ~243
  CASCADE_LEFT + CASCADE_WIDTH * 0.5,  // ~592
  CASCADE_LEFT + CASCADE_WIDTH * 0.83, // ~941
];

// Manifestation column centers — slightly compressed, centered under the cascade
const MANIF_COLS = [
  CASCADE_LEFT + CASCADE_WIDTH * 0.25,
  CASCADE_LEFT + CASCADE_WIDTH * 0.5,
  CASCADE_LEFT + CASCADE_WIDTH * 0.75,
];

// Pivot center — offset from the middle column so bezier paths don't
// lie on top of the central mediator supernode.
const PIVOT_X = CASCADE_LEFT + CASCADE_WIDTH * 0.5;

type Tier = {
  id: string;
  label: string;
  label_en: string;
  y: number;
};

// y coordinates are the TOP of each tier band; supernodes center on y + ~40
const TIERS: Tier[] = [
  { id: "prior", label: "Prior predictivo", label_en: "Predictive prior", y: 92 },
  { id: "mediator", label: "Mediador alostático", label_en: "Allostatic mediator", y: 268 },
  { id: "signature", label: "Firma multimodal", label_en: "Multimodal signature", y: 470 },
  { id: "manifestation", label: "Manifestación clínica", label_en: "Clinical manifestation", y: 672 },
];

// ──────────────────────────────────────────────────────────── supernodes ──
type Supernode = {
  id: string;
  label_es: string;
  label_en: string;
  tier: string;
  x: number;
  isPivot?: boolean;
  isActive?: boolean;
  memberCount?: number;
};

const SUPERNODES: Supernode[] = [
  // TIER 1 — prior (pivot)
  {
    id: "prior_i8",
    label_es: "Impronta i8 — Reserva",
    label_en: "Imprint i8 — Reserve",
    tier: "prior",
    x: PIVOT_X,
    isPivot: true,
    isActive: true,
  },

  // TIER 2 — mediator
  {
    id: "med_hpa",
    label_es: "Eje HPA rígido",
    label_en: "Rigid HPA axis",
    tier: "mediator",
    x: COL_CENTERS[0],
    isActive: true,
    memberCount: 3,
  },
  {
    id: "med_autonomic",
    label_es: "Tono autonómico",
    label_en: "Autonomic tone",
    tier: "mediator",
    x: COL_CENTERS[1],
    isActive: true,
    memberCount: 3,
  },
  {
    id: "med_gut",
    label_es: "Eje intestinal",
    label_en: "Gut axis",
    tier: "mediator",
    x: COL_CENTERS[2],
    isActive: true,
    memberCount: 3,
  },

  // TIER 3 — signature
  {
    id: "sig_metabolic",
    label_es: "Signatura metabólica",
    label_en: "Metabolic signature",
    tier: "signature",
    x: COL_CENTERS[0],
    isActive: true,
    memberCount: 7,
  },
  {
    id: "sig_inflammatory",
    label_es: "Signatura inflamatoria",
    label_en: "Inflammatory signature",
    tier: "signature",
    x: COL_CENTERS[1],
    isActive: true,
    memberCount: 3,
  },
  {
    id: "sig_hepatic",
    label_es: "Firma hepática",
    label_en: "Hepatic signature",
    tier: "signature",
    x: COL_CENTERS[2],
    isActive: true,
    memberCount: 4,
  },

  // TIER 4 — manifestation
  {
    id: "manif_metabolic",
    label_es: "Pre-diabetes · dislipidemia",
    label_en: "Pre-T2D · dyslipidemia",
    tier: "manifestation",
    x: MANIF_COLS[0],
    isActive: true,
  },
  {
    id: "manif_cv",
    label_es: "Riesgo cardiovascular",
    label_en: "Cardiovascular risk",
    tier: "manifestation",
    x: MANIF_COLS[1],
    isActive: true,
  },
  {
    id: "manif_masld",
    label_es: "MASLD emergente",
    label_en: "Emerging MASLD",
    tier: "manifestation",
    x: MANIF_COLS[2],
    isActive: false,
  },
];

// ──────────────────────────────────────────────────────────── flows ──
type Flow = {
  from: string;
  to: string;
  verb_es: string;
  verb_en: string;
  strong?: boolean;
};

const FLOWS: Flow[] = [
  // Prior → mediator
  { from: "prior_i8", to: "med_hpa", verb_es: "rigidiza", verb_en: "rigidifies", strong: true },
  { from: "prior_i8", to: "med_autonomic", verb_es: "desregula", verb_en: "dysregulates" },
  { from: "prior_i8", to: "med_gut", verb_es: "altera", verb_en: "disrupts" },

  // Mediator → signature
  { from: "med_hpa", to: "sig_metabolic", verb_es: "dirige", verb_en: "drives", strong: true },
  { from: "med_autonomic", to: "sig_inflammatory", verb_es: "amplifica", verb_en: "amplifies" },
  { from: "med_gut", to: "sig_inflammatory", verb_es: "alimenta", verb_en: "feeds", strong: true },
  { from: "med_gut", to: "sig_hepatic", verb_es: "sensibiliza", verb_en: "sensitises" },

  // Signature → manifestation
  { from: "sig_metabolic", to: "manif_metabolic", verb_es: "manifiesta", verb_en: "surfaces as", strong: true },
  { from: "sig_inflammatory", to: "manif_cv", verb_es: "acelera", verb_en: "accelerates", strong: true },
  { from: "sig_hepatic", to: "manif_masld", verb_es: "progresa a", verb_en: "progresses to" },
];

// ──────────────────────────────────────────────────────────── interventions ──
type Intervention = {
  id: string;
  label: string;
  targetSupernode: string;
  mechanism_es: string;
  mechanism_en: string;
};

const INTERVENTIONS: Intervention[] = [
  {
    id: "iv_ashwa",
    label: "Ashwagandha",
    targetSupernode: "med_hpa",
    mechanism_es: "restaura ritmo cortisol",
    mechanism_en: "restores cortisol rhythm",
  },
  {
    id: "iv_mg",
    label: "Mg-glicinato",
    targetSupernode: "med_autonomic",
    mechanism_es: "tono parasimpático",
    mechanism_en: "parasympathetic tone",
  },
  {
    id: "iv_inositol",
    label: "Myo-inositol + berberina",
    targetSupernode: "sig_metabolic",
    mechanism_es: "AMPK · sensibilidad insulínica",
    mechanism_en: "AMPK · insulin sensitivity",
  },
  {
    id: "iv_omega",
    label: "Omega-3 EPA/DHA",
    targetSupernode: "sig_inflammatory",
    mechanism_es: "síntesis de resolvinas",
    mechanism_en: "resolvin synthesis",
  },
];

// ──────────────────────────────────────────────────────────── helpers ──
function supernodeById(id: string): Supernode | undefined {
  return SUPERNODES.find((s) => s.id === id);
}

function tierById(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

const SN_W = 220;
const SN_H = 68;
const PIVOT_W = 280;
const PIVOT_H = 80;

function snRect(s: Supernode) {
  const w = s.isPivot ? PIVOT_W : SN_W;
  const h = s.isPivot ? PIVOT_H : SN_H;
  const tier = tierById(s.tier);
  const topY = tier?.y ?? 0;
  return { x: s.x - w / 2, y: topY, w, h };
}

// Smooth cubic bezier from bottom-center of source to top-center of target.
function smoothPath(fromS: Supernode, toS: Supernode): string {
  const a = snRect(fromS);
  const b = snRect(toS);
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h;
  const bx = b.x + b.w / 2;
  const by = b.y;
  const dy = by - ay;
  const c1y = ay + dy * 0.55;
  const c2y = by - dy * 0.55;
  return `M ${ax} ${ay} C ${ax} ${c1y}, ${bx} ${c2y}, ${bx} ${by}`;
}

// Midpoint of a cubic bezier at t=0.5 (good enough for a label anchor).
function bezierMid(fromS: Supernode, toS: Supernode): { x: number; y: number } {
  const a = snRect(fromS);
  const b = snRect(toS);
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h;
  const bx = b.x + b.w / 2;
  const by = b.y;
  return { x: (ax + bx) / 2, y: (ay + by) / 2 };
}

// ──────────────────────────────────────────────────────────── component ──
export default function TieredMap({
  patient = "ana",
  locale = "en",
}: {
  data: NetworkData;
  patient?: "ana" | null;
  locale?: "en" | "es";
}) {
  // When patient=null (atlas mode), every supernode is rendered as a neutral
  // outline — no active fills, no pivot accent, no interventions wedges.
  // Ana is the only patient backing the active-state layout in MVP.
  const isAtlas = patient === null;
  return (
    <div className="w-full bg-paper-soft">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="auto"
        style={{ display: "block" }}
        role="img"
        aria-label="Tiered physiopathological cascade"
      >
        {/* Tier band labels + rules (left gutter) ---------------------- */}
        <g>
          {TIERS.map((t) => (
            <g key={t.id}>
              <line
                x1={CASCADE_LEFT - 24}
                x2={CASCADE_RIGHT}
                y1={t.y - 30}
                y2={t.y - 30}
                stroke={RULE}
                strokeWidth={1}
              />
              <text
                x={CASCADE_LEFT - 24}
                y={t.y - 40}
                fontFamily="Inter, sans-serif"
                fontSize={10}
                fill={INK_MUTE}
                letterSpacing="0.22em"
                fontWeight={500}
              >
                {(locale === "en" ? t.label_en : t.label).toUpperCase()}
              </text>
            </g>
          ))}
        </g>

        {/* Right-margin agency column header --------------------------- */}
        {!isAtlas && (
          <g>
            <text
              x={CASCADE_RIGHT + 20}
              y={52}
              fontFamily="Inter, sans-serif"
              fontSize={10}
              fill={ACCENT}
              letterSpacing="0.22em"
              fontWeight={600}
            >
              {(locale === "en" ? "AGENCY · INTERVENTION" : "AGENCIA · INTERVENCIÓN").toUpperCase()}
            </text>
            <line
              x1={CASCADE_RIGHT + 20}
              x2={W - 40}
              y1={62}
              y2={62}
              stroke={ACCENT}
              strokeWidth={1}
              opacity={0.4}
            />
          </g>
        )}

        {/* Flows -------------------------------------------------------- */}
        <g>
          {FLOWS.map((f) => {
            const fromS = supernodeById(f.from);
            const toS = supernodeById(f.to);
            if (!fromS || !toS) return null;
            const mid = bezierMid(fromS, toS);
            const strokeW = f.strong ? 1.8 : 1.1;
            const bothActive = fromS.isActive && toS.isActive;
            const verbLabel = locale === "en" ? f.verb_en : f.verb_es;
            const labelWidth = Math.max(60, verbLabel.length * 6.2 + 18);
            return (
              <g key={`${f.from}-${f.to}`}>
                <path
                  d={smoothPath(fromS, toS)}
                  fill="none"
                  stroke={INK_QUIET}
                  strokeWidth={strokeW}
                  opacity={bothActive ? 0.55 : 0.2}
                />
                {/* Verb label — soft paper-soft tile tangent to the curve. */}
                <rect
                  x={mid.x - labelWidth / 2}
                  y={mid.y - 9}
                  width={labelWidth}
                  height={18}
                  fill="#F1EEE6"
                  rx={2}
                />
                <text
                  x={mid.x}
                  y={mid.y + 4}
                  textAnchor="middle"
                  fontFamily="Fraunces, serif"
                  fontStyle="italic"
                  fontSize={11}
                  fill={INK_QUIET}
                >
                  {verbLabel}
                </text>
              </g>
            );
          })}
        </g>

        {/* Supernodes --------------------------------------------------- */}
        <g>
          {SUPERNODES.map((s) => {
            const r = snRect(s);
            // In atlas mode every node renders as a neutral outline — we
            // don't know which supernodes are active because no patient is
            // selected. In patient mode the active/pivot visuals apply.
            const effectiveActive = !isAtlas && s.isActive;
            const effectivePivot = !isAtlas && s.isPivot;
            const fill = effectivePivot
              ? "#F2ECF7"
              : effectiveActive
                ? "#F1EEE6"
                : PAPER;
            const stroke = effectivePivot
              ? ACCENT
              : effectiveActive
                ? INK_SOFT
                : RULE;
            const labelFill = INK_SOFT;
            const tier = tierById(s.tier);
            const eyebrowText = tier
              ? (locale === "en" ? tier.label_en : tier.label).toUpperCase()
              : "";

            return (
              <g key={s.id}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={effectivePivot ? 1.5 : 1}
                  rx={2}
                />
                {/* Thin accent top rule marking "active" status */}
                {(effectiveActive || effectivePivot) && (
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={2}
                    fill={ACCENT}
                    opacity={effectivePivot ? 1 : 0.55}
                  />
                )}
                {/* Eyebrow */}
                <text
                  x={r.x + 14}
                  y={r.y + 22}
                  fontFamily="Inter, sans-serif"
                  fontSize={9}
                  fill={INK_MUTE}
                  letterSpacing="0.18em"
                  fontWeight={500}
                >
                  {eyebrowText}
                </text>
                {/* Main label */}
                <text
                  x={r.x + 14}
                  y={s.isPivot ? r.y + 52 : r.y + 50}
                  fontFamily="Fraunces, serif"
                  fontSize={s.isPivot ? 20 : 15}
                  fontWeight={500}
                  fill={labelFill}
                  letterSpacing="-0.01em"
                >
                  {locale === "en" ? s.label_en : s.label_es}
                </text>
                {/* Member count badge */}
                {s.memberCount && s.memberCount > 1 && (
                  <text
                    x={r.x + r.w - 14}
                    y={r.y + 22}
                    textAnchor="end"
                    fontFamily="JetBrains Mono, monospace"
                    fontSize={9}
                    fill={INK_MUTE}
                  >
                    {s.memberCount}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Interventions — right-margin index with leader lines ---------- */}
        {/* Labels live on a vertical grid; leader lines connect each label */}
        {/* to the right edge of its target supernode. No horizontal stagger. */}
        {/* Hidden in atlas mode — interventions are patient-specific. */}
        <g style={{ display: isAtlas ? "none" : undefined }}>
          {INTERVENTIONS.map((iv, idx) => {
            const tgt = supernodeById(iv.targetSupernode);
            if (!tgt) return null;
            const r = snRect(tgt);
            const targetY = r.y + r.h / 2;
            const wedgeX = r.x + r.w + 10;

            // Fixed vertical grid for labels starting below the agency header
            const labelY = 110 + idx * 68;
            const labelX = CASCADE_RIGHT + 40;

            return (
              <g key={iv.id}>
                {/* Leader: bezier from supernode right edge to label baseline */}
                <path
                  d={`M ${wedgeX} ${targetY} C ${wedgeX + 60} ${targetY}, ${labelX - 20} ${labelY - 8}, ${labelX - 6} ${labelY - 8}`}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth={0.8}
                  opacity={0.45}
                />
                {/* Wedge mark on edge of supernode */}
                <rect
                  x={wedgeX - 3}
                  y={targetY - 6}
                  width={8}
                  height={12}
                  fill={ACCENT}
                  rx={1}
                />
                {/* Label stack */}
                <text
                  x={labelX}
                  y={labelY - 10}
                  fontFamily="Inter, sans-serif"
                  fontSize={9}
                  fill={INK_MUTE}
                  letterSpacing="0.18em"
                  fontWeight={500}
                >
                  {(locale === "en" ? `MODULATOR ${idx + 1}` : `MODULADOR ${idx + 1}`).toUpperCase()}
                </text>
                <text
                  x={labelX}
                  y={labelY + 10}
                  fontFamily="Fraunces, serif"
                  fontStyle="italic"
                  fontSize={15}
                  fill={ACCENT}
                  fontWeight={500}
                >
                  {iv.label}
                </text>
                <text
                  x={labelX}
                  y={labelY + 28}
                  fontFamily="Inter, sans-serif"
                  fontSize={10}
                  fill={INK_QUIET}
                >
                  {locale === "en" ? iv.mechanism_en : iv.mechanism_es}
                </text>
              </g>
            );
          })}
        </g>

        {/* Legend (bottom-right) --------------------------------------- */}
        <g transform={`translate(${CASCADE_RIGHT + 20}, ${H - 60})`}>
          <text
            x={0}
            y={0}
            fontFamily="Inter, sans-serif"
            fontSize={9}
            fill={INK_MUTE}
            letterSpacing="0.18em"
            fontWeight={500}
          >
            {(locale === "en" ? "LEGEND" : "LEYENDA").toUpperCase()}
          </text>
          <line x1={0} x2={260} y1={8} y2={8} stroke={RULE} strokeWidth={1} />
          <g transform="translate(0, 22)">
            {/* Active: warm paper tint, ink-soft stroke (matches supernode rendering) */}
            <rect
              width={14}
              height={10}
              fill="#F1EEE6"
              stroke={INK_SOFT}
              strokeWidth={1}
              rx={1}
            />
            <text x={20} y={9} fontFamily="Inter" fontSize={10} fill={INK_SOFT}>
              {locale === "en" ? "Active" : "Activo"}
            </text>
            <rect x={76} width={14} height={10} fill={PAPER} stroke={RULE} rx={1} />
            <text x={96} y={9} fontFamily="Inter" fontSize={10} fill={INK_SOFT}>
              {locale === "en" ? "At risk" : "En riesgo"}
            </text>
            <rect
              x={154}
              width={14}
              height={10}
              fill="#F2ECF7"
              stroke={ACCENT}
              strokeWidth={1.2}
              rx={1}
            />
            <text x={174} y={9} fontFamily="Inter" fontSize={10} fill={INK_SOFT}>
              {locale === "en" ? "Agency" : "Agencia"}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
