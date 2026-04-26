/**
 * Leverage Finder — identificador de puntos de apalancamiento.
 *
 * Dado el SystemState + FlexibilityIndex + impronta activa, calcula
 * el ROI esperado de intervenir en cada sub-proceso de flexibilidad.
 *
 * Score de apalancamiento:
 *
 *   leverage(c) = gain_potential(c)       // cuánto puede mejorar
 *               × tractability(c)          // cuán responsive es
 *               × alignment(c, impronta)   // sinergía con la impronta
 *               / energetic_cost(c)        // coste sostenible
 *
 * Output ordenado por prioridad de intervención.
 */

import type { FlexibilityIndex, FlexibilityComponent } from "./flexibility-index";
import type { SystemState } from "./system-state";

export type ImprintId =
  | "i1" | "i2" | "i3" | "i4" | "i5" | "i6" | "i7" | "i8" | "i9" | "i10" | "i11" | "i12" | "i13";

/**
 * Tractability: cuán responsive es cada sub-proceso a la modulación
 * nutrigenómica (basado en evidencia acumulada en RCTs).
 */
const TRACTABILITY: Record<FlexibilityComponent, number> = {
  inflammation_control: 0.85,  // Ω-3, polifenoles, Vit D: respuesta documentada
  satiety: 0.55,                // compleja — requiere reducir IR + inflamación + priors
  insulin_sensitivity: 0.75,    // berberina, epicatequinas, ejercicio: buena evidencia
  fatty_acid_oxidation: 0.70,   // carnitina, CoQ10, intervalo HIIT
  lipid_distribution: 0.80,     // estanoles, fibra, Ω-3: evidencia fuerte
  insulin_production: 0.45,     // difícil rescatar β-célula tardía
  autonomic_flexibility: 0.60,  // Mg, Ω-3, respiración, sueño
  predictive_agency: 0.40,      // requiere trabajo psicosomático, no solo molecular
};

/**
 * Alignment: cada impronta facilita o bloquea ciertos sub-procesos.
 * Valor 0-1 donde 1 = la impronta activa favorece la intervención.
 */
const ALIGNMENT: Record<ImprintId, Partial<Record<FlexibilityComponent, number>>> = {
  i1: {
    inflammation_control: 0.5,
    autonomic_flexibility: 0.3, // disociación hace difícil interocepción
    predictive_agency: 0.4,
  },
  i2: {
    inflammation_control: 0.6,
    autonomic_flexibility: 0.4, // blindaje muscular compite con relajación vagal
    predictive_agency: 0.4,
  },
  i3: {
    satiety: 0.5,
    insulin_sensitivity: 0.6,
    predictive_agency: 0.3, // insuficiencia interna bloquea agencia
  },
  i4: {
    inflammation_control: 0.4, // rabia crónica mantiene catecolaminas
    autonomic_flexibility: 0.3,
    predictive_agency: 0.5,
  },
  i5: {
    satiety: 0.5,
    insulin_sensitivity: 0.55,
    predictive_agency: 0.4,
  },
  i6: {
    inflammation_control: 0.4, // cutánea + sistémica
    predictive_agency: 0.3,
  },
  i7: {
    fatty_acid_oxidation: 0.3, // bajo metabolismo global
    autonomic_flexibility: 0.4,
    predictive_agency: 0.5, // paradójicamente, puede aceptar intervención si llega presencia
  },
  i8: {
    satiety: 0.35, // escasez mantiene hiperfagia nocturna
    insulin_sensitivity: 0.5,
    lipid_distribution: 0.55,
    predictive_agency: 0.45,
  },
  i9: {
    predictive_agency: 0.3,
    autonomic_flexibility: 0.4,
  },
  i10: {
    predictive_agency: 0.25, // síntoma = lugar vincular
    inflammation_control: 0.4,
  },
  i11: {
    predictive_agency: 0.4,
    fatty_acid_oxidation: 0.4,
  },
  i12: {
    autonomic_flexibility: 0.4, // emergencia territorial sostiene simpático
    insulin_sensitivity: 0.5,
    predictive_agency: 0.5,
  },
  i13: {
    autonomic_flexibility: 0.4,
    predictive_agency: 0.35,
  },
};

/**
 * Coste energético relativo de la intervención.
 * Menor = más accesible para el paciente.
 */
const ENERGETIC_COST: Record<FlexibilityComponent, number> = {
  inflammation_control: 0.3,   // añadir Ω-3/polifenoles: bajo
  satiety: 0.7,                // cambiar patrón alimentario: alto
  insulin_sensitivity: 0.5,
  fatty_acid_oxidation: 0.6,
  lipid_distribution: 0.35,
  insulin_production: 0.4,
  autonomic_flexibility: 0.5,  // requiere sueño, respiración, tiempo
  predictive_agency: 0.8,      // cambio de priors requiere proceso clínico sostenido
};

export type LeveragePoint = {
  component: FlexibilityComponent;
  /** 0-1, mayor = mejor candidato */
  leverage_score: number;
  /** Componentes del cálculo */
  breakdown: {
    gain_potential: number;
    tractability: number;
    alignment: number;
    energetic_cost: number;
  };
  /** Prioridad ordinal */
  priority: "primary" | "secondary" | "tertiary" | "maintenance" | "defer";
  /** Racional clínico */
  rationale: string;
};

export type LeverageAnalysis = {
  version: string;
  imprint_id: ImprintId | null;
  points: LeveragePoint[];
  primary_target: FlexibilityComponent;
  clinical_strategy: string;
};

export function findLeveragePoints(
  flexibilityIndex: FlexibilityIndex,
  systemState: SystemState,
  imprintId: ImprintId | null,
): LeverageAnalysis {
  const points: LeveragePoint[] = [];

  for (const [comp, score] of Object.entries(flexibilityIndex.components) as Array<
    [FlexibilityComponent, FlexibilityIndex["components"][FlexibilityComponent]]
  >) {
    const gainPotential = score.rigidity; // cuánto margen hay para mejorar
    const tract = TRACTABILITY[comp];
    const align =
      imprintId && ALIGNMENT[imprintId]?.[comp] !== undefined
        ? (ALIGNMENT[imprintId][comp] as number)
        : 0.6; // default neutral
    const cost = ENERGETIC_COST[comp];

    // Fórmula: gain × tract × align / cost, normalizada
    const raw = (gainPotential * tract * align) / Math.max(0.1, cost);
    // Normalizamos aproximadamente a [0, 1]
    const leverageScore = Math.min(1, raw * 1.5);

    let priority: LeveragePoint["priority"];
    if (leverageScore > 0.55) priority = "primary";
    else if (leverageScore > 0.35) priority = "secondary";
    else if (leverageScore > 0.2) priority = "tertiary";
    else if (gainPotential < 0.3) priority = "maintenance";
    else priority = "defer";

    const rationale = buildRationale(comp, gainPotential, tract, align, cost, priority);

    points.push({
      component: comp,
      leverage_score: leverageScore,
      breakdown: {
        gain_potential: gainPotential,
        tractability: tract,
        alignment: align,
        energetic_cost: cost,
      },
      priority,
      rationale,
    });
  }

  points.sort((a, b) => b.leverage_score - a.leverage_score);
  const primary = points[0].component;

  // Factor alostático influye en la estrategia
  const aloType = systemState.allostatic_load_hint.type;
  const strategy = buildStrategy(points, imprintId, aloType);

  return {
    version: "leverage-finder-v1.0",
    imprint_id: imprintId,
    points,
    primary_target: primary,
    clinical_strategy: strategy,
  };
}

function buildRationale(
  comp: FlexibilityComponent,
  gain: number,
  tract: number,
  align: number,
  cost: number,
  priority: LeveragePoint["priority"],
): string {
  const parts: string[] = [];
  if (gain > 0.6) parts.push(`high rigidity (${(gain * 100).toFixed(0)}%) with wide margin`);
  else if (gain > 0.3) parts.push(`moderate rigidity (${(gain * 100).toFixed(0)}%)`);
  else parts.push(`narrow margin (${(gain * 100).toFixed(0)}%)`);

  if (tract > 0.7) parts.push("well-documented nutrigenomic modulation");
  else if (tract < 0.5) parts.push("limited response to modulation");

  if (align > 0.6) parts.push("active pattern favors the intervention");
  else if (align < 0.4) parts.push("active pattern competes with this pathway");

  if (cost > 0.7) parts.push("high sustained cost");
  else if (cost < 0.4) parts.push("low cost, accessible");

  const priorityLabels: Record<LeveragePoint["priority"], string> = {
    primary: "Priority 1: start here",
    secondary: "Priority 2: follow in cascade",
    tertiary: "Priority 3: reassess after initial response",
    maintenance: "Maintenance: already in acceptable range",
    defer: "Defer: intervention not cost-effective now",
  };
  return `${priorityLabels[priority]}. ${parts.join(", ")}.`;
}

function buildStrategy(
  points: LeveragePoint[],
  imprintId: ImprintId | null,
  allostaticType: 1 | 2 | 3 | "indeterminate",
): string {
  const primary = points[0];
  const secondary = points[1];

  const preface =
    allostaticType === 3
      ? "Allostatic load type 3 (multisystemic dysregulation): prioritize stabilization before activation."
      : allostaticType === 2
        ? "Allostatic load type 2 (sustained activation): salutogenic intervention with careful sequencing."
        : allostaticType === 1
          ? "Allostatic load type 1 (wide window): intervention can be more assertive."
          : "Baseline state or insufficient data: map before intervening.";

  const imprintNote = imprintId
    ? `The active ${imprintId.toUpperCase()} pattern defines the predictive context: any molecular intervention acts on the cascade, but updating the prior (clinical work with the patient) determines the real therapeutic window.`
    : "Identifying the active pattern will refine the strategy.";

  return [
    preface,
    `Primary leverage: ${primary.component} (score ${primary.leverage_score.toFixed(2)}).`,
    `Secondary leverage: ${secondary.component} (score ${secondary.leverage_score.toFixed(2)}).`,
    imprintNote,
  ].join(" ");
}
