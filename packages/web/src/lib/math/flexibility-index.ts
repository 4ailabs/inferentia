/**
 * Flexibility Index — Perfil de Flexibilidad Fenotípica (PFF)
 *
 * Operacionaliza el vector ℝ⁸ del vocabulario canónico de CLAUDE.md
 * (originalmente propuesto como ℝ⁸ incluyendo agencia; las imágenes
 * del autor muestran 6 sub-procesos metabólicos + 2 que añadimos:
 * flexibilidad autonómica + agencia predictiva).
 *
 * Derivado de:
 *   - van Ommen / TNO / NuGO: phenotypic flexibility / PhenFlex test
 *   - Stroeve et al. 2015: phenotypic flexibility score
 *   - Mehrhof Fleming Nord 2025: interoceptive energy allostasis
 *
 * Cada componente es 0-1, donde 0 = rígido, 1 = flexible.
 */

import type { SystemState, LabInput, ClinicalContext } from "./system-state";

export type FlexibilityComponent =
  | "inflammation_control"
  | "satiety"
  | "insulin_sensitivity"
  | "fatty_acid_oxidation"
  | "lipid_distribution"
  | "insulin_production"
  | "autonomic_flexibility"
  | "predictive_agency";

export type FlexibilityScore = {
  component: FlexibilityComponent;
  /** 0-1, 0 rígido, 1 flexible */
  flexibility: number;
  /** 1 - flexibility (equivalente en rigidez) */
  rigidity: number;
  /** Qué nodos del system state alimentan este componente */
  contributing_nodes: string[];
  /** Nota clínica */
  note: string;
};

export type FlexibilityIndex = {
  version: string;
  components: Record<FlexibilityComponent, FlexibilityScore>;
  /** Promedio global de flexibilidad (0-1) */
  global_flexibility: number;
  /** Componente más rígido (punto de apalancamiento primario) */
  weakest_component: FlexibilityComponent;
  /** Componente más preservado (recurso del paciente) */
  strongest_component: FlexibilityComponent;
  /** Ranking ordenado de menor a mayor flexibilidad */
  ranking: Array<{ component: FlexibilityComponent; flexibility: number }>;
};

/**
 * Cada componente del PFF se calcula como 1 - promedio de rigideces
 * de los nodos que lo determinan.
 */
const COMPONENT_NODES: Record<FlexibilityComponent, Array<keyof SystemState["nodes"]>> = {
  inflammation_control: ["systemic_inflammation", "adipose_inflammation", "hepatic_inflammation", "gut_inflammation", "endothelial_inflammation"],
  satiety: ["visceral_adiposity", "adipose_IR", "ectopic_lipid_overload"],
  insulin_sensitivity: ["systemic_IR", "hepatic_IR", "adipose_IR", "muscle_metabolic_inflexibility"],
  fatty_acid_oxidation: ["muscle_metabolic_inflexibility", "fatty_liver", "ectopic_lipid_overload"],
  lipid_distribution: ["dyslipidemia", "high_cholesterol", "LDL_elevated", "ectopic_lipid_overload"],
  insulin_production: ["beta_cell_failure", "high_glucose", "glucose_toxicity"],
  autonomic_flexibility: ["endothelial_inflammation", "hypertension_structural"],
  predictive_agency: [], // se calcula con input externo (agencia del paciente)
};

const COMPONENT_NOTES: Record<FlexibilityComponent, { high: string; low: string }> = {
  inflammation_control: {
    high: "Capacidad antiinflamatoria preservada; resolución inflamatoria adecuada.",
    low: "Inflamación crónica sin resolución. Foco: Ω-3 EPA/DHA, polifenoles, Vit D, cofactores antioxidantes.",
  },
  satiety: {
    high: "Señales de saciedad integradas; regulación leptina/grelina funcional.",
    low: "Resistencia leptina probable. Foco: reducir inflamación, restaurar sensibilidad receptor, Ω-3, fibra soluble.",
  },
  insulin_sensitivity: {
    high: "Tejidos responden bien a insulina. Switch metabólico funcional.",
    low: "IR multitejido. Foco: berberina, epicatequinas, Mg, cromo, carnitina, ejercicio de intervalos.",
  },
  fatty_acid_oxidation: {
    high: "Flexibilidad entre sustratos (glucosa ↔ grasa) preservada.",
    low: "Músculo/hígado no oxidan grasa eficientemente. Foco: L-carnitina, CoQ10, riboflavina, HIIT.",
  },
  lipid_distribution: {
    high: "Distribución lipídica fisiológica entre compartimentos.",
    low: "Flujo ectópico activo. Foco: estanoles, Ω-3, colina, reducción fructosa.",
  },
  insulin_production: {
    high: "β-célula con capacidad secretora preservada.",
    low: "Estrés de β-célula. Ventana de preservación crítica. Foco: antocianinas, Mg, Vit D, descanso de glucosa.",
  },
  autonomic_flexibility: {
    high: "Eje simpático-parasimpático en balance; HRV adecuada.",
    low: "Tono autonómico rígido. Foco: Ω-3, Mg, respiración vagal, sueño, reducción cortisol.",
  },
  predictive_agency: {
    high: "Sistema capaz de revisar sus priors; cono cognitivo amplio.",
    low: "Priors rígidos defienden el estado actual. Foco: intervención del prior (nivel psicosomático) antes que nutricional.",
  },
};

function meanRigidity(nodes: Array<keyof SystemState["nodes"]>, systemState: SystemState): number {
  if (nodes.length === 0) return 0.5;
  const rigidities = nodes.map((n) => systemState.nodes[n].rigidity);
  return rigidities.reduce((s, v) => s + v, 0) / rigidities.length;
}

export type PredictiveAgencyInput = {
  /** Fortaleza estimada de la impronta activa (0-1). A mayor fortaleza, menor agencia predictiva. */
  imprint_strength?: number;
  /** Score explícito de agencia si disponible (Pearlin Mastery breve o similar, 0-1). */
  agency_score?: number;
  /** Cronicidad de la carga alostática */
  allostatic_load_type?: 1 | 2 | 3 | "indeterminate";
};

export function computeFlexibilityIndex(
  systemState: SystemState,
  predictiveInput?: PredictiveAgencyInput,
): FlexibilityIndex {
  const components: Record<FlexibilityComponent, FlexibilityScore> = {} as Record<
    FlexibilityComponent,
    FlexibilityScore
  >;

  for (const comp of Object.keys(COMPONENT_NODES) as FlexibilityComponent[]) {
    if (comp === "predictive_agency") {
      // Agencia predictiva: deriva del input externo, no del estado metabólico
      let agency = 0.5;
      if (predictiveInput?.agency_score !== undefined) {
        agency = predictiveInput.agency_score;
      } else if (predictiveInput?.imprint_strength !== undefined) {
        // Impronta fuerte = agencia baja (el prior domina)
        agency = 1 - predictiveInput.imprint_strength;
        // Ajuste por carga alostática
        if (predictiveInput.allostatic_load_type === 3) agency *= 0.6;
        else if (predictiveInput.allostatic_load_type === 2) agency *= 0.8;
      }
      const flex = Math.max(0, Math.min(1, agency));
      components[comp] = {
        component: comp,
        flexibility: flex,
        rigidity: 1 - flex,
        contributing_nodes: [],
        note: flex > 0.6 ? COMPONENT_NOTES[comp].high : COMPONENT_NOTES[comp].low,
      };
      continue;
    }
    const nodes = COMPONENT_NODES[comp];
    const meanR = meanRigidity(nodes, systemState);
    const flex = 1 - meanR;
    components[comp] = {
      component: comp,
      flexibility: flex,
      rigidity: meanR,
      contributing_nodes: nodes,
      note: flex > 0.6 ? COMPONENT_NOTES[comp].high : COMPONENT_NOTES[comp].low,
    };
  }

  const compArr = Object.values(components);
  const global = compArr.reduce((s, c) => s + c.flexibility, 0) / compArr.length;
  const ranking = compArr
    .map((c) => ({ component: c.component, flexibility: c.flexibility }))
    .sort((a, b) => a.flexibility - b.flexibility);

  return {
    version: "flexibility-index-v1.0",
    components,
    global_flexibility: global,
    weakest_component: ranking[0].component,
    strongest_component: ranking[ranking.length - 1].component,
    ranking,
  };
}
