/**
 * Free Energy Estimator — estimador de energía libre regulatoria
 * liberable por intervención nutrigenómica.
 *
 * Aproximación operacional al principio de Friston aplicado al
 * sistema metabólico real (no literal en joules; métrica clínica).
 *
 * Interpretación: cuánta capacidad regulatoria del sistema se libera
 * al reducir la rigidez de nodos específicos. Esa capacidad, antes
 * consumida en compensar la rigidez crónica, queda disponible para
 * reparación, mantenimiento, adaptación.
 *
 * Fórmula operacional:
 *
 *   ΔFE_libre = Σ_nodo [ Δrigidity(nodo) × cost_weight(nodo) × expected_response(intervencion, nodo) ]
 *             × horizon_factor
 *
 * Donde:
 *   - Δrigidity: mejora esperada en rigidez (antes - después)
 *   - cost_weight: cuánta capacidad regulatoria consume el nodo rígido
 *   - expected_response: efectividad documentada de la intervención
 *   - horizon_factor: escala temporal (8-12 semanas típico)
 *
 * Referencias:
 *   - Friston 2010: free energy principle
 *   - Stephan et al 2016: allostatic self-efficacy
 *   - Mehrhof Fleming Nord 2025: interoceptive energy allostasis
 *   - McEwen: allostatic load biomarkers
 */

import type { NodeId, NodeState, SystemState } from "./system-state";

/**
 * Peso de coste regulatorio por nodo.
 * Nodos sistémicos y centrales cuestan más; nodos periféricos menos.
 * Normalizado: ~ΣW = 20 (uno por nodo en promedio).
 */
const COST_WEIGHT: Record<NodeId, number> = {
  systemic_inflammation: 2.5,
  adipose_inflammation: 1.5,
  hepatic_inflammation: 1.5,
  endothelial_inflammation: 2.0,
  gut_inflammation: 1.2,
  systemic_IR: 2.5,
  hepatic_IR: 2.0,
  adipose_IR: 1.5,
  muscle_metabolic_inflexibility: 1.8,
  visceral_adiposity: 1.5,
  ectopic_lipid_overload: 1.6,
  fatty_liver: 1.8,
  dyslipidemia: 1.2,
  high_glucose: 1.5,
  high_cholesterol: 0.8,
  LDL_elevated: 0.8,
  glucose_toxicity: 2.0,
  beta_cell_failure: 2.2,
  microvascular_damage: 2.5,   // daño estructural cuesta sostener
  atherosclerosis: 2.2,
  hypertension_structural: 1.8,
  fibrosis_hepatic: 2.0,
};

export type InterventionEffect = {
  /** Identificador de la intervención */
  intervention_id: string;
  /** Factor de mejora esperado por nodo (0-1, fracción de rigidez que se reduce) */
  expected_delta_rigidity: Partial<Record<NodeId, number>>;
  /** Horizonte en semanas */
  horizon_weeks: number;
};

export type FreeEnergyEstimate = {
  version: string;
  /** Métrica normalizada 0-100 (porcentaje de capacidad regulatoria liberada) */
  free_energy_released_pct: number;
  /** Contribución por nodo */
  node_contributions: Array<{
    node: NodeId;
    rigidity_before: number;
    rigidity_after_expected: number;
    cost_weight: number;
    contribution_pct: number;
  }>;
  /** Capacidad regulatoria total consumida antes (normalizada 0-100) */
  baseline_burden_pct: number;
  /** Capacidad regulatoria residual tras intervención esperada (normalizada 0-100) */
  post_intervention_burden_pct: number;
  /** Interpretación clínica */
  clinical_interpretation: string;
  /** Horizonte temporal considerado */
  horizon_weeks: number;
};

/**
 * Calcula la capacidad regulatoria consumida por el estado actual
 * (baseline burden). Normalizada 0-100.
 */
function computeBaselineBurden(systemState: SystemState): number {
  let totalBurden = 0;
  let maxPossible = 0;
  for (const [nodeId, node] of Object.entries(systemState.nodes) as Array<[NodeId, NodeState]>) {
    const weight = COST_WEIGHT[nodeId] ?? 1;
    totalBurden += node.rigidity * weight;
    maxPossible += 1 * weight;
  }
  return (totalBurden / maxPossible) * 100;
}

/**
 * Estima la rigidez esperada tras una intervención dada.
 */
function applyIntervention(
  systemState: SystemState,
  effect: InterventionEffect,
): Record<NodeId, number> {
  const result: Record<NodeId, number> = {} as Record<NodeId, number>;
  for (const [nodeId, node] of Object.entries(systemState.nodes) as Array<[NodeId, NodeState]>) {
    const delta = effect.expected_delta_rigidity[nodeId] ?? 0;
    // Los nodos irreversibles no mejoran (solo se estabilizan)
    const maxReduction =
      node.category === "pathology_irreversible" ? 0.1 : 0.8;
    const effectiveDelta = Math.min(delta, maxReduction);
    result[nodeId] = Math.max(0, node.rigidity * (1 - effectiveDelta));
  }
  return result;
}

export function estimateFreeEnergy(
  systemState: SystemState,
  effect: InterventionEffect,
): FreeEnergyEstimate {
  const baselineBurden = computeBaselineBurden(systemState);
  const afterRigidity = applyIntervention(systemState, effect);

  let totalWeightedDelta = 0;
  let maxPossible = 0;
  const contributions: FreeEnergyEstimate["node_contributions"] = [];

  for (const [nodeId, node] of Object.entries(systemState.nodes) as Array<[NodeId, NodeState]>) {
    const weight = COST_WEIGHT[nodeId] ?? 1;
    const before = node.rigidity;
    const after = afterRigidity[nodeId];
    const delta = before - after;
    const contribution = delta * weight;
    totalWeightedDelta += contribution;
    maxPossible += weight;

    contributions.push({
      node: nodeId,
      rigidity_before: before,
      rigidity_after_expected: after,
      cost_weight: weight,
      contribution_pct: 0, // se calcula después como %
    });
  }

  // Normalizar contribuciones a porcentaje del total liberado
  const sumContributions = contributions.reduce(
    (s, c) =>
      s + (systemState.nodes[c.node].rigidity - c.rigidity_after_expected) * c.cost_weight,
    0,
  );
  for (const c of contributions) {
    const rawContrib =
      (systemState.nodes[c.node].rigidity - c.rigidity_after_expected) * c.cost_weight;
    c.contribution_pct = sumContributions > 0 ? (rawContrib / sumContributions) * 100 : 0;
  }
  contributions.sort((a, b) => b.contribution_pct - a.contribution_pct);

  const freeEnergyReleasedPct = (totalWeightedDelta / maxPossible) * 100;

  const postBurden = Math.max(0, baselineBurden - freeEnergyReleasedPct);

  const interpretation = buildInterpretation(
    freeEnergyReleasedPct,
    baselineBurden,
    effect.horizon_weeks,
  );

  return {
    version: "free-energy-estimator-v1.0",
    free_energy_released_pct: freeEnergyReleasedPct,
    node_contributions: contributions,
    baseline_burden_pct: baselineBurden,
    post_intervention_burden_pct: postBurden,
    clinical_interpretation: interpretation,
    horizon_weeks: effect.horizon_weeks,
  };
}

function buildInterpretation(
  released: number,
  baseline: number,
  horizonWeeks: number,
): string {
  const magnitude =
    released > 15
      ? "alta"
      : released > 8
        ? "moderada"
        : released > 3
          ? "modesta"
          : "marginal";
  const horizonNote = `en ${horizonWeeks} semanas`;

  if (released < 3) {
    return `Ganancia ${magnitude} ${horizonNote}. La intervención modulada no libera capacidad regulatoria significativa; revisar si el apalancamiento primario está bien identificado o si el prior predictivo (impronta) bloquea la respuesta metabólica.`;
  }

  const contextNote =
    baseline > 60
      ? "Carga basal elevada: intervención necesaria pero con expectativas de fase 1 (estabilización)."
      : baseline > 40
        ? "Carga basal moderada: ventana de reversibilidad amplia si se sostiene la intervención."
        : "Carga basal baja: intervención mantenimiento, foco en preservar flexibilidad residual.";

  return `Ganancia ${magnitude} ${horizonNote}: liberación estimada de ${released.toFixed(1)}% de capacidad regulatoria antes consumida en sostener rigidez crónica. ${contextNote}`;
}

/**
 * Helper: construye un InterventionEffect "ideal" para evaluar
 * el máximo teórico de ganancia si el punto de apalancamiento
 * primario respondiera óptimamente.
 */
export function buildHypotheticalEffect(
  targetNodes: NodeId[],
  responseFactor: number = 0.5,
  horizonWeeks: number = 12,
): InterventionEffect {
  const deltaMap: Partial<Record<NodeId, number>> = {};
  for (const node of targetNodes) {
    deltaMap[node] = responseFactor;
  }
  return {
    intervention_id: `hypothetical_${targetNodes.join("_")}_${responseFactor}`,
    expected_delta_rigidity: deltaMap,
    horizon_weeks: horizonWeeks,
  };
}
