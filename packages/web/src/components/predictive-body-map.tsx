"use client";

/**
 * PredictiveBodyMap — Output 1 del MVP, hero shot del demo.
 *
 * Renderiza:
 *   1. Silueta humana SVG (editorial, no médica)
 *   2. Zonas iluminadas según la impronta dominante (mapa BV4
 *      canónico — ver IMPRINT_ZONES).
 *   3. Radar lateral con 3 predicciones principales (priors activos
 *      con su strength).
 *
 * Visual, no interactivo por ahora. Alimenta del output del reasoner
 * o del clasificador GMM.
 */

import type { ImprintId } from "@/lib/math/sensations";

// ─── Mapa canónico impronta → zonas corporales (Apéndice B) ────
//
// Cada zona es un objeto {label, cx, cy, intensity} que describe
// dónde iluminar y con qué fuerza. Coordenadas sobre viewBox
// 320×640 (silueta escalada a esas dimensiones).

type Zone = {
  key: string;
  label_es: string;
  label_en: string;
  /** Centro del área iluminada dentro del viewBox 320×640. */
  cx: number;
  cy: number;
  /** Radio del glow. */
  r: number;
};

const IMPRINT_ZONES: Record<ImprintId, Zone[]> = {
  i1: [
    { key: "head", label_es: "Cabeza / ocular", label_en: "Head / ocular", cx: 160, cy: 52, r: 36 },
    { key: "feet", label_es: "Pies fríos", label_en: "Cold feet", cx: 160, cy: 615, r: 30 },
    { key: "periphery", label_es: "Periferia desconectada", label_en: "Disconnected periphery", cx: 80, cy: 340, r: 28 },
  ],
  i2: [
    { key: "trapezius", label_es: "Trapecios / dorsal alto", label_en: "Trapezius / upper back", cx: 160, cy: 140, r: 42 },
    { key: "occipital", label_es: "Base del cráneo", label_en: "Skull base", cx: 160, cy: 82, r: 24 },
    { key: "paravertebral", label_es: "Paravertebrales", label_en: "Paravertebral", cx: 160, cy: 250, r: 32 },
  ],
  i3: [
    { key: "lumbar", label_es: "Columna lumbar", label_en: "Lumbar spine", cx: 160, cy: 340, r: 32 },
    { key: "knees", label_es: "Articulaciones soporte", label_en: "Support joints", cx: 160, cy: 500, r: 36 },
    { key: "posture", label_es: "Postura encogida", label_en: "Shrunken posture", cx: 160, cy: 200, r: 28 },
  ],
  i4: [
    { key: "jaw", label_es: "Mandíbula", label_en: "Jaw", cx: 160, cy: 100, r: 26 },
    { key: "liver", label_es: "Hipocondrio derecho", label_en: "Right hypochondrium", cx: 200, cy: 280, r: 32 },
    { key: "forearms", label_es: "Antebrazos / puños", label_en: "Forearms / fists", cx: 95, cy: 320, r: 26 },
  ],
  i5: [
    { key: "throat", label_es: "Garganta / tiroides", label_en: "Throat / thyroid", cx: 160, cy: 130, r: 28 },
    { key: "chest_upper", label_es: "Pecho alto", label_en: "Upper chest", cx: 160, cy: 200, r: 30 },
    { key: "frontal", label_es: "Frontal / presión craneal", label_en: "Frontal / cranial pressure", cx: 160, cy: 60, r: 24 },
  ],
  i6: [
    { key: "skin_face", label_es: "Piel / cara", label_en: "Skin / face", cx: 160, cy: 60, r: 34 },
    { key: "dorsal", label_es: "Cifosis dorsal", label_en: "Dorsal kyphosis", cx: 160, cy: 230, r: 32 },
    { key: "shoulders", label_es: "Hombros cerrados", label_en: "Closed shoulders", cx: 160, cy: 160, r: 28 },
  ],
  i7: [
    { key: "global", label_es: "Depleción global", label_en: "Global depletion", cx: 160, cy: 320, r: 80 },
    { key: "thyroid", label_es: "Eje tiroideo", label_en: "Thyroid axis", cx: 160, cy: 130, r: 22 },
    { key: "whole", label_es: "Cuerpo entero apagado", label_en: "Whole-body shutdown", cx: 160, cy: 500, r: 40 },
  ],
  i8: [
    { key: "abdomen", label_es: "Abdomen / visceral", label_en: "Abdomen / visceral", cx: 160, cy: 340, r: 44 },
    { key: "prehension", label_es: "Cadena de prensión", label_en: "Prehension chain", cx: 100, cy: 380, r: 22 },
    { key: "metabolic", label_es: "Sistema metabólico", label_en: "Metabolic system", cx: 220, cy: 340, r: 24 },
  ],
  i9: [
    { key: "heart", label_es: "Corazón", label_en: "Heart", cx: 160, cy: 240, r: 36 },
    { key: "chest_center", label_es: "Pecho central", label_en: "Central chest", cx: 160, cy: 210, r: 28 },
    { key: "cv_system", label_es: "Sistema cardiovascular", label_en: "Cardiovascular system", cx: 160, cy: 280, r: 22 },
  ],
  i10: [
    { key: "symptomatic", label_es: "Zona del síntoma del otro", label_en: "Other's symptom zone", cx: 160, cy: 320, r: 50 },
    { key: "chronic", label_es: "Cronicidad replicada", label_en: "Replicated chronicity", cx: 160, cy: 400, r: 30 },
    { key: "systemic", label_es: "Carga sistémica", label_en: "Systemic load", cx: 160, cy: 240, r: 24 },
  ],
  i11: [
    { key: "diffuse", label_es: "Carga difusa", label_en: "Diffuse burden", cx: 160, cy: 300, r: 70 },
    { key: "circadian", label_es: "Ritmos circadianos", label_en: "Circadian rhythms", cx: 160, cy: 60, r: 26 },
    { key: "melancholia", label_es: "Melancolía de fondo", label_en: "Background melancholia", cx: 160, cy: 220, r: 28 },
  ],
  i12: [
    { key: "feet", label_es: "Pies / inestabilidad", label_en: "Feet / instability", cx: 160, cy: 605, r: 34 },
    { key: "renal", label_es: "Zona renal", label_en: "Renal zone", cx: 160, cy: 310, r: 30 },
    { key: "lumbar", label_es: "Lumbar soporte", label_en: "Lumbar support", cx: 160, cy: 380, r: 26 },
  ],
  i13: [
    { key: "precordial", label_es: "Zona precordial", label_en: "Precordial zone", cx: 160, cy: 230, r: 38 },
    { key: "pericardium", label_es: "Pericardio", label_en: "Pericardium", cx: 160, cy: 260, r: 28 },
    { key: "cv_rigid", label_es: "Cardiovascular rígido", label_en: "Rigid cardiovascular", cx: 160, cy: 290, r: 24 },
  ],
};

type PredictiveBodyMapProps = {
  imprintId: ImprintId;
  imprintName: string;
  strength: number; // 0–1
  priors: Array<{ label: string; strength: number }>;
  locale?: "en" | "es";
  /** Optional: raw node state from the math engine. If provided, renders a
      "System state" readout table alongside the silhouette instead of the
      auxiliary priors radar. Keys must match the 22 canonical node ids. */
  nodes?: Record<string, { rigidity: number; reversibility?: string }>;
};

export function PredictiveBodyMap({
  imprintId,
  imprintName,
  strength,
  priors,
  locale = "en",
  nodes,
}: PredictiveBodyMapProps) {
  const zones = IMPRINT_ZONES[imprintId] ?? [];
  const topPriors = priors.slice(0, 4);

  return (
    <div className="grid grid-cols-12 gap-6 items-start">
      {/* ─── Body silhouette ──────────────────────────────── */}
      <div className="col-span-12 md:col-span-7">
        <div className="border border-ink bg-paper-raised px-6 py-5">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow eyebrow-accent">
              {locale === "es" ? "Mapa predictivo" : "Predictive map"}
            </p>
            <span className="tabular text-[10.5px] tracking-[0.18em] uppercase text-accent">
              {imprintId.toUpperCase()} · {imprintName}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <svg
              viewBox="0 0 320 640"
              className="w-full max-w-[340px] h-auto"
              aria-label={`Predictive body map for ${imprintName}`}
            >
              <defs>
                <radialGradient id={`halo-${imprintId}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35 * strength} />
                  <stop offset="55%" stopColor="var(--accent)" stopOpacity={0.12 * strength} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </radialGradient>
              </defs>

              {/* ── Reference grid · anatomical-chart feel ────────── */}
              {/* Vertical center axis (mid-sagittal plane) */}
              <line
                x1="160"
                y1="36"
                x2="160"
                y2="604"
                stroke="var(--rule)"
                strokeWidth="0.5"
                strokeDasharray="2 4"
                strokeOpacity={0.7}
              />
              {/* Horizontal reference (umbilical plane, ~T10) */}
              <line
                x1="60"
                y1="300"
                x2="260"
                y2="300"
                stroke="var(--rule)"
                strokeWidth="0.5"
                strokeDasharray="2 4"
                strokeOpacity={0.5}
              />

              {/* ── Silhouette · minimalist single-outline figure ─────
                  Strong inspiration: Apple Health / iOS activity app.
                  Single continuous path, neutral androgynous proportions.
                  Not a medical illustration — a wayfinding icon.
                  Line 1.5px, no fill, corners rounded. */}
              <g
                fill="none"
                stroke="var(--ink)"
                strokeWidth="1.4"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeOpacity={0.85}
              >
                {/* Head — circle */}
                <circle cx="160" cy="80" r="30" />

                {/* Single outline: neck → shoulders → arms down → waist → hips → legs → feet
                    Counter-clockwise from neck-left. */}
                <path
                  d="M 150 110
                     L 146 130
                     C 124 135, 105 148, 96 172
                     L 88 220
                     L 82 280
                     L 78 330
                     C 76 350, 78 360, 88 360
                     C 96 360, 100 354, 102 340
                     L 108 290
                     L 114 240
                     L 120 214
                     L 120 336
                     L 118 420
                     L 122 510
                     L 128 590
                     L 132 614
                     C 132 622, 138 624, 144 622
                     C 150 620, 152 614, 152 606
                     L 156 520
                     L 160 430
                     L 160 336
                     L 160 430
                     L 164 520
                     L 168 606
                     C 168 614, 170 620, 176 622
                     C 182 624, 188 622, 188 614
                     L 192 590
                     L 198 510
                     L 202 420
                     L 200 336
                     L 200 214
                     L 206 240
                     L 212 290
                     L 218 340
                     C 220 354, 224 360, 232 360
                     C 242 360, 244 350, 242 330
                     L 238 280
                     L 232 220
                     L 224 172
                     C 215 148, 196 135, 174 130
                     L 170 110 Z"
                />
              </g>

              {/* ── Active zones · concentric marks (halo · ring · dot) ── */}
              {zones.map((z, i) => (
                <g key={z.key}>
                  {/* Outer halo */}
                  <circle
                    cx={z.cx}
                    cy={z.cy}
                    r={z.r * 1.2}
                    fill={`url(#halo-${imprintId})`}
                  />
                  {/* Clinical ring marker */}
                  <circle
                    cx={z.cx}
                    cy={z.cy}
                    r={10}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.1"
                    strokeOpacity={0.9}
                  />
                  <circle
                    cx={z.cx}
                    cy={z.cy}
                    r={5}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="0.8"
                    strokeOpacity={0.6}
                  />
                  {/* Center dot */}
                  <circle
                    cx={z.cx}
                    cy={z.cy}
                    r={1.8}
                    fill="var(--accent)"
                  />
                  {/* Ordinal badge top-right of ring */}
                  <text
                    x={z.cx + 13}
                    y={z.cy - 10}
                    fill="var(--accent)"
                    fontSize="8.5"
                    fontFamily="'JetBrains Mono', ui-monospace, monospace"
                    fontWeight="500"
                    letterSpacing="0.1em"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </text>
                </g>
              ))}

              {/* ── Leader lines + labels · aligned to ring edge ─── */}
              {zones.map((z) => {
                const isRight = z.cx >= 160;
                const lineStart = z.cx + (isRight ? 10 : -10);
                const textX = isRight ? z.cx + 26 : z.cx - 26;
                const anchor = isRight ? "start" : "end";
                return (
                  <g key={`label-${z.key}`}>
                    <line
                      x1={lineStart}
                      y1={z.cy}
                      x2={textX - (isRight ? 2 : -2)}
                      y2={z.cy}
                      stroke="var(--accent)"
                      strokeWidth="0.7"
                      strokeOpacity={0.5}
                    />
                    <text
                      x={textX}
                      y={z.cy + 3}
                      fill="var(--ink)"
                      fontSize="8.5"
                      fontFamily="'JetBrains Mono', ui-monospace, monospace"
                      textAnchor={anchor}
                      letterSpacing="0.08em"
                    >
                      {(locale === "es" ? z.label_es : z.label_en).toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-3 flex items-baseline justify-between text-[10.5px] tabular">
            <span className="tracking-[0.14em] uppercase text-ink-mute">
              {locale === "es" ? "Intensidad del mapa" : "Map intensity"}
            </span>
            <span className="text-accent">{Math.round(strength * 100)}%</span>
          </div>
          <div className="mt-1 h-[3px] bg-paper-soft overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${strength * 100}%` }} />
          </div>
        </div>
      </div>

      {/* ─── Right column ─────────────────────────────────────
          - If `nodes` is supplied: SystemStateReadout (tabla real del motor)
          - Otherwise: legacy Radar + priors list (usado cuando solo hay
            hipótesis de impronta sin cómputo del motor) */}
      <div className="col-span-12 md:col-span-5">
        {nodes ? (
          <SystemStateReadout nodes={nodes} locale={locale} />
        ) : (
          <div className="border border-rule bg-paper-raised px-5 py-5">
            <p className="eyebrow eyebrow-accent">
              {locale === "es" ? "Predicciones activas" : "Active predictions"}
            </p>
            <p className="mt-1 text-[10.5px] text-ink-mute">
              {locale === "es"
                ? "Priors que dirigen la alostasis"
                : "Priors directing allostasis"}
            </p>

            <div className="mt-5 flex items-center justify-center">
              <Radar priors={topPriors} />
            </div>

            <ul className="mt-5 space-y-2">
              {topPriors.map((p, i) => {
                const pct = Math.round(p.strength * 100);
                return (
                  <li key={i}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] text-ink-soft leading-snug">
                        {p.label}
                      </span>
                      <span className="tabular text-[11px] text-accent">
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-0.5 h-[3px] bg-paper-soft overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SystemStateReadout ─────────────────────────────────────────
// 10 clinical systems · dot scale 0..5 · tabular numeric rigidity.
// Reads raw node output from the math engine and aggregates into
// the systems clinicians actually think in.
type NodeMap = Record<string, { rigidity: number; reversibility?: string }>;

const SYSTEM_GROUPS: Array<{
  key: string;
  label_es: string;
  label_en: string;
  nodes: string[];
}> = [
  {
    key: "adipose",
    label_es: "Adiposo",
    label_en: "Adipose",
    nodes: ["visceral_adiposity", "adipose_inflammation", "adipose_IR"],
  },
  {
    key: "systemic_inflammation",
    label_es: "Inflamación",
    label_en: "Inflammation",
    nodes: [
      "systemic_inflammation",
      "endothelial_inflammation",
      "gut_inflammation",
      "hepatic_inflammation",
    ],
  },
  {
    key: "insulin",
    label_es: "Insulina",
    label_en: "Insulin",
    nodes: [
      "systemic_IR",
      "hepatic_IR",
      "high_glucose",
      "muscle_metabolic_inflexibility",
    ],
  },
  {
    key: "lipid",
    label_es: "Lipídico",
    label_en: "Lipid",
    nodes: [
      "dyslipidemia",
      "high_cholesterol",
      "LDL_elevated",
      "ectopic_lipid_overload",
    ],
  },
  {
    key: "hepatic",
    label_es: "Hepático",
    label_en: "Hepatic",
    nodes: ["fatty_liver", "fibrosis_hepatic"],
  },
  {
    key: "vascular",
    label_es: "Vascular",
    label_en: "Vascular",
    nodes: ["atherosclerosis", "hypertension_structural", "microvascular_damage"],
  },
  {
    key: "glucose_end",
    label_es: "Glucotoxicidad",
    label_en: "Glucotoxicity",
    nodes: ["glucose_toxicity", "beta_cell_failure"],
  },
];

function aggregateSystem(nodes: NodeMap, ids: string[]) {
  const values = ids.map((id) => nodes[id]?.rigidity).filter((v) => typeof v === "number") as number[];
  if (values.length === 0) return { mean: 0, max: 0, count: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return { mean: sum / values.length, max: Math.max(...values), count: values.length };
}

function SystemStateReadout({
  nodes,
  locale,
}: {
  nodes: NodeMap;
  locale: "en" | "es";
}) {
  const rows = SYSTEM_GROUPS.map((g) => ({
    ...g,
    ...aggregateSystem(nodes, g.nodes),
  })).sort((a, b) => b.mean - a.mean);

  return (
    <div className="border border-ink bg-paper-raised">
      {/* Header */}
      <div className="px-5 py-3 border-b border-rule flex items-baseline justify-between">
        <p className="eyebrow eyebrow-accent">
          {locale === "es" ? "Estado del sistema" : "System state"}
        </p>
        <p className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-mute">
          {locale === "es" ? "22 nodos" : "22 nodes"}
        </p>
      </div>

      {/* Legend */}
      <div className="px-5 pt-3 pb-2 flex items-center gap-3 font-mono text-[9px] tracking-[0.14em] uppercase text-ink-mute">
        <span>{locale === "es" ? "rigidez" : "rigidity"}</span>
        <span className="flex items-center gap-[2px]">
          <Dot filled={false} />
          <Dot filled={false} />
          <Dot filled={false} />
          <Dot filled={false} />
          <Dot filled={false} />
          <span className="ml-1">0.0</span>
        </span>
        <span className="text-rule">·</span>
        <span className="flex items-center gap-[2px]">
          <Dot filled />
          <Dot filled />
          <Dot filled />
          <Dot filled />
          <Dot filled />
          <span className="ml-1">1.0</span>
        </span>
      </div>

      {/* Rows */}
      <ul className="px-5 pb-4 pt-1 divide-y divide-rule/50">
        {rows.map((r) => {
          const dotsFilled = Math.round(r.mean * 5);
          return (
            <li
              key={r.key}
              className="py-2.5 flex items-center gap-3"
            >
              {/* Label — fixed width, truncates if too long. No wrap. */}
              <span className="text-[12px] text-ink-soft leading-tight flex-1 min-w-0 truncate">
                {locale === "es" ? r.label_es : r.label_en}
              </span>
              {/* Dots — fixed size, always rightmost area */}
              <span className="flex items-center gap-[2px] shrink-0">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Dot key={i} filled={i < dotsFilled} />
                ))}
              </span>
              {/* Numeric — fixed 44px width, right-aligned, tabular */}
              <span className="font-mono text-[11px] tabular-nums text-ink-quiet w-[44px] text-right shrink-0">
                {r.mean.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Dot({ filled }: { filled: boolean }) {
  return (
    <span
      className={`inline-block w-[7px] h-[7px] rounded-full ${
        filled ? "bg-accent" : "border border-rule"
      }`}
    />
  );
}

// ─── Radar auxiliar ────────────────────────────────────────────
function Radar({ priors }: { priors: Array<{ label: string; strength: number }> }) {
  const n = Math.max(3, priors.length);
  const radius = 80;
  const cx = 100;
  const cy = 100;

  // Rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Points
  const points = priors.map((p, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = p.strength * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      axisX: cx + radius * Math.cos(angle),
      axisY: cy + radius * Math.sin(angle),
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[220px] h-auto">
      {/* Rings */}
      {rings.map((r, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={radius * r}
          fill="none"
          stroke="var(--rule)"
          strokeWidth="0.6"
          strokeDasharray={i === rings.length - 1 ? "0" : "2 4"}
          strokeOpacity={0.6}
        />
      ))}
      {/* Axes */}
      {points.map((p, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={p.axisX}
          y2={p.axisY}
          stroke="var(--rule)"
          strokeWidth="0.6"
          strokeOpacity={0.5}
        />
      ))}
      {/* Filled polygon */}
      {priors.length >= 3 && (
        <polygon
          points={polygon}
          fill="var(--accent)"
          fillOpacity="0.18"
          stroke="var(--accent)"
          strokeWidth="1.1"
        />
      )}
      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="var(--accent)"
        />
      ))}
    </svg>
  );
}
