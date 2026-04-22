import type { NetworkData, RawNode } from "@/lib/network-layout";

/**
 * TieredMap — top-down causal cascade with supernodes.
 *
 * Research-backed redesign (memos 13 & 14):
 *   - 4 named horizontal tiers (Prior → Mediator → Signature → Manifestation).
 *   - ≤7 visible supernodes at first paint (expand-on-demand would live here later).
 *   - Single pivot node (active imprint) visually distinct.
 *   - Every arrow labeled with a verb.
 *   - Interventions as perpendicular wedges from the right margin.
 *   - One accent color reserved for agency/intervention.
 *   - Typography carries hierarchy; color is semantic only.
 *
 * No force-directed layout. Every (x, y) is authored.
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
const W = 1200;
const H = 820;

// Tier bands (horizontal, named)
type Tier = {
  id: string;
  label: string;
  label_en: string;
  y: number;
  bandHeight: number;
};

const TIERS: Tier[] = [
  { id: "prior", label: "Prior predictivo", label_en: "Predictive prior", y: 80, bandHeight: 110 },
  { id: "mediator", label: "Mediador alostático", label_en: "Allostatic mediator", y: 240, bandHeight: 150 },
  { id: "signature", label: "Firma multimodal", label_en: "Multimodal signature", y: 440, bandHeight: 150 },
  { id: "manifestation", label: "Manifestación clínica", label_en: "Clinical manifestation", y: 640, bandHeight: 110 },
];

// ──────────────────────────────────────────────────────────── supernodes ──
type Supernode = {
  id: string;
  label_es: string;
  label_en: string;
  tier: string;
  x: number;
  members: string[]; // actual node IDs from network.json
  isPivot?: boolean;
  isActive?: boolean;
};

// Supernodes for patient "ana" (i8 Reserva dominant)
const SUPERNODES_ANA: Supernode[] = [
  // TIER 1 — prior (pivot: i8)
  {
    id: "prior_i8",
    label_es: "Impronta i8 — Reserva",
    label_en: "Imprint i8 — Reserve",
    tier: "prior",
    x: W / 2,
    members: ["imprint_i8_reserva"],
    isPivot: true,
    isActive: true,
  },

  // TIER 2 — mediator (3 supernodes)
  {
    id: "med_hpa",
    label_es: "Eje HPA rígido",
    label_en: "Rigid HPA axis",
    tier: "mediator",
    x: 260,
    members: ["hpa_axis_rigidity", "cortisol_chronic", "car_exaggerated"],
    isActive: true,
  },
  {
    id: "med_autonomic",
    label_es: "Tono autonómico",
    label_en: "Autonomic tone",
    tier: "mediator",
    x: 600,
    members: ["sympathetic_tone", "vagal_ventral", "hrv_reduction"],
    isActive: true,
  },
  {
    id: "med_gut",
    label_es: "Eje intestinal",
    label_en: "Gut axis",
    tier: "mediator",
    x: 940,
    members: ["gut_dysbiosis", "gut_permeability", "scfa_production"],
    isActive: true,
  },

  // TIER 3 — signature (3 supernodes)
  {
    id: "sig_metabolic",
    label_es: "Signatura metabólica",
    label_en: "Metabolic signature",
    tier: "signature",
    x: 260,
    members: [
      "visceral_adiposity",
      "ectopic_lipid",
      "adipose_insulin_resistance",
      "hepatic_insulin_resistance",
      "systemic_insulin_resistance",
      "hba1c_elevated",
      "atherogenic_dyslipidemia",
    ],
    isActive: true,
  },
  {
    id: "sig_inflammatory",
    label_es: "Signatura inflamatoria",
    label_en: "Inflammatory signature",
    tier: "signature",
    x: 600,
    members: ["adipose_inflammation", "systemic_inflammation", "treg_th17_imbalance"],
    isActive: true,
  },
  {
    id: "sig_hepatic",
    label_es: "Firma hepática",
    label_en: "Hepatic signature",
    tier: "signature",
    x: 940,
    members: ["masld", "mitochondrial_dysfunction", "oxidative_stress", "ldl_oxidation"],
    isActive: true,
  },

  // TIER 4 — manifestation
  {
    id: "manif_metabolic",
    label_es: "Pre-diabetes · dislipidemia",
    label_en: "Pre-T2D · dyslipidemia",
    tier: "manifestation",
    x: 360,
    members: ["pathology_t2dm"],
    isActive: true,
  },
  {
    id: "manif_cv",
    label_es: "Riesgo cardiovascular",
    label_en: "Cardiovascular risk",
    tier: "manifestation",
    x: 720,
    members: ["pathology_atherosclerosis"],
    isActive: true,
  },
  {
    id: "manif_masld",
    label_es: "MASLD emergente",
    label_en: "Emerging MASLD",
    tier: "manifestation",
    x: 1040,
    members: ["pathology_masld_advanced"],
    isActive: false, // at risk but not active yet
  },
];

// ──────────────────────────────────────────────────────────── flow edges ──
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
  { from: "med_hpa", to: "sig_inflammatory", verb_es: "modula", verb_en: "modulates" },
  { from: "med_autonomic", to: "sig_metabolic", verb_es: "amplifica", verb_en: "amplifies" },
  { from: "med_autonomic", to: "sig_hepatic", verb_es: "favorece", verb_en: "promotes" },
  { from: "med_gut", to: "sig_inflammatory", verb_es: "alimenta", verb_en: "feeds", strong: true },
  { from: "med_gut", to: "sig_hepatic", verb_es: "sensibiliza", verb_en: "sensitises" },

  // Signature → manifestation
  { from: "sig_metabolic", to: "manif_metabolic", verb_es: "manifiesta", verb_en: "surfaces as", strong: true },
  { from: "sig_metabolic", to: "manif_cv", verb_es: "escala a", verb_en: "escalates to" },
  { from: "sig_inflammatory", to: "manif_cv", verb_es: "acelera", verb_en: "accelerates" },
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
  return SUPERNODES_ANA.find((s) => s.id === id);
}

function tierById(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

// Supernode card dimensions (pivot larger)
const SN_W = 190;
const SN_H = 62;
const PIVOT_W = 260;
const PIVOT_H = 72;

function snRect(s: Supernode) {
  const w = s.isPivot ? PIVOT_W : SN_W;
  const h = s.isPivot ? PIVOT_H : SN_H;
  return { x: s.x - w / 2, y: (tierById(s.tier)?.y ?? 0) - h / 2 + 40, w, h };
}

// Smooth cubic bezier from bottom-center of one rect to top-center of next.
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

// ──────────────────────────────────────────────────────────── component ──
export default function TieredMap({
  locale = "en",
}: {
  data: NetworkData; // kept for signature parity, not used in the tiered view
  patient?: "ana" | null;
  locale?: "en" | "es";
}) {
  return (
    <div className="w-full overflow-x-auto bg-paper-soft">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        style={{ minWidth: 800, maxWidth: "100%", display: "block" }}
        role="img"
        aria-label="Tiered physiopathological cascade"
      >
        {/* Tier labels (left gutter) ---------------------------------- */}
        <g>
          {TIERS.map((t) => (
            <g key={t.id}>
              <line
                x1={32}
                x2={W - 160}
                y1={t.y - 32}
                y2={t.y - 32}
                stroke={RULE}
                strokeWidth={1}
              />
              <text
                x={32}
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

        {/* Flows (cubic beziers + verbs) ------------------------------ */}
        <g>
          {FLOWS.map((f) => {
            const fromS = supernodeById(f.from);
            const toS = supernodeById(f.to);
            if (!fromS || !toS) return null;
            const a = snRect(fromS);
            const b = snRect(toS);
            const midX = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
            const midY = (a.y + a.h + b.y) / 2;
            const strokeW = f.strong ? 1.8 : 1.1;
            return (
              <g key={`${f.from}-${f.to}`}>
                <path
                  d={smoothPath(fromS, toS)}
                  fill="none"
                  stroke={INK}
                  strokeWidth={strokeW}
                  opacity={fromS.isActive && toS.isActive ? 0.9 : 0.3}
                />
                {/* Verb label on the curve — body copy italic */}
                <rect
                  x={midX - 36}
                  y={midY - 10}
                  width={72}
                  height={20}
                  fill={PAPER}
                  opacity={0.95}
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fontFamily="Fraunces, serif"
                  fontStyle="italic"
                  fontSize={12}
                  fill={INK_QUIET}
                >
                  {locale === "en" ? f.verb_en : f.verb_es}
                </text>
              </g>
            );
          })}
        </g>

        {/* Supernodes --------------------------------------------------- */}
        <g>
          {SUPERNODES_ANA.map((s) => {
            const r = snRect(s);
            const fill = s.isPivot ? ACCENT : s.isActive ? INK : PAPER;
            const stroke = s.isPivot ? ACCENT : s.isActive ? INK : RULE;
            const labelFill = s.isPivot || s.isActive ? PAPER : INK_SOFT;
            const tier = tierById(s.tier);

            return (
              <g key={s.id}>
                {/* soft drop shadow for active nodes */}
                {s.isActive && (
                  <rect
                    x={r.x}
                    y={r.y + 2}
                    width={r.w}
                    height={r.h}
                    fill={INK}
                    opacity={0.06}
                    rx={2}
                  />
                )}
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={s.isPivot ? 2 : 1}
                  rx={2}
                />
                {/* Category eyebrow */}
                <text
                  x={r.x + 12}
                  y={r.y + 16}
                  fontFamily="Inter, sans-serif"
                  fontSize={8.5}
                  fill={s.isPivot || s.isActive ? PAPER : INK_MUTE}
                  opacity={0.7}
                  letterSpacing="0.18em"
                >
                  {(tier
                    ? locale === "en"
                      ? tier.label_en
                      : tier.label
                    : ""
                  ).toUpperCase()}
                </text>
                {/* Main label */}
                <text
                  x={r.x + 12}
                  y={s.isPivot ? r.y + 40 : r.y + 38}
                  fontFamily="Fraunces, serif"
                  fontSize={s.isPivot ? 18 : 14}
                  fontWeight={500}
                  fill={labelFill}
                  letterSpacing="-0.01em"
                >
                  {locale === "en" ? s.label_en : s.label_es}
                </text>
                {/* Member count badge */}
                {s.members.length > 1 && (
                  <g>
                    <text
                      x={r.x + r.w - 12}
                      y={r.y + 16}
                      textAnchor="end"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize={9}
                      fill={s.isPivot || s.isActive ? PAPER : INK_MUTE}
                      opacity={0.7}
                    >
                      {s.members.length}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Interventions — perpendicular wedges from right margin -------- */}
        <g>
          {INTERVENTIONS.map((iv, idx) => {
            const tgt = supernodeById(iv.targetSupernode);
            if (!tgt) return null;
            const r = snRect(tgt);
            // Wedge starts at the right margin and enters at mid-height of target
            const wedgeY = r.y + r.h / 2;
            const wedgeStartX = W - 60 + (idx % 2) * 12; // slight stagger
            const wedgeEndX = r.x + r.w + 12;
            return (
              <g key={iv.id}>
                {/* Leader line */}
                <line
                  x1={wedgeEndX}
                  y1={wedgeY}
                  x2={wedgeStartX}
                  y2={wedgeY}
                  stroke={ACCENT}
                  strokeWidth={1}
                  opacity={0.55}
                />
                {/* Wedge mark on edge */}
                <rect
                  x={wedgeEndX - 4}
                  y={wedgeY - 5}
                  width={8}
                  height={10}
                  fill={ACCENT}
                />
                {/* Label */}
                <text
                  x={wedgeStartX + 6}
                  y={wedgeY + 3}
                  fontFamily="Fraunces, serif"
                  fontStyle="italic"
                  fontSize={12.5}
                  fill={ACCENT}
                  fontWeight={500}
                >
                  + {iv.label}
                </text>
                <text
                  x={wedgeStartX + 6}
                  y={wedgeY + 17}
                  fontFamily="Inter, sans-serif"
                  fontSize={9.5}
                  fill={INK_QUIET}
                >
                  {locale === "en" ? iv.mechanism_en : iv.mechanism_es}
                </text>
              </g>
            );
          })}
        </g>

        {/* Right-margin agency column label ----------------------------- */}
        <g>
          <text
            x={W - 140}
            y={40}
            fontFamily="Inter, sans-serif"
            fontSize={10}
            fill={ACCENT}
            letterSpacing="0.22em"
            fontWeight={500}
          >
            {locale === "en" ? "AGENCY · INTERVENTION" : "AGENCIA · INTERVENCIÓN"}
          </text>
          <line
            x1={W - 140}
            x2={W - 20}
            y1={48}
            y2={48}
            stroke={ACCENT}
            strokeWidth={1}
            opacity={0.4}
          />
        </g>

        {/* Legend (top-right) ------------------------------------------ */}
        <g transform={`translate(${W - 280}, ${H - 50})`}>
          <text
            x={0}
            y={0}
            fontFamily="Inter, sans-serif"
            fontSize={9}
            fill={INK_MUTE}
            letterSpacing="0.18em"
          >
            {(locale === "en" ? "LEGEND" : "LEYENDA").toUpperCase()}
          </text>
          <line x1={0} x2={260} y1={8} y2={8} stroke={RULE} strokeWidth={1} />
          <g transform="translate(0, 22)">
            <rect width={14} height={10} fill={INK} />
            <text x={20} y={9} fontFamily="Inter" fontSize={10} fill={INK_SOFT}>
              Active node
            </text>
            <rect x={110} width={14} height={10} fill={PAPER} stroke={RULE} />
            <text x={130} y={9} fontFamily="Inter" fontSize={10} fill={INK_SOFT}>
              At-risk
            </text>
            <rect x={190} width={14} height={10} fill={ACCENT} />
            <text x={210} y={9} fontFamily="Inter" fontSize={10} fill={INK_SOFT}>
              Agency
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
