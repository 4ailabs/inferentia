/**
 * Capa 2 — P(impronta | sensación, contexto)
 *
 * Fuente: Tratado BV4, Cap 7 (13 improntas con diagnóstico
 * diferencial explícito) + Apéndice A (tabla sensación → improntas
 * frecuentes) + Apéndice B (referencia rápida).
 *
 * Modelo:
 *   P(k | sensación, contexto) ∝ P(sensación | k) · P(contexto | k) · π(k)
 *
 *   donde:
 *   - P(sensación | k) viene de la tabla Apéndice A:
 *       alta si la impronta k lista la sensación como primary
 *       media si la lista como secondary
 *       baja si no la lista
 *   - P(contexto | k) incorpora señales narrativas discriminativas
 *     derivadas de los diagnósticos diferenciales del Cap 7
 *   - π(k) prior uniforme por defecto; puede modularse por edad,
 *     historia clínica, grupo cronobiológico (Cap 7.16).
 *
 * Si la sensación aún no se ha identificado, el modelo usa sólo
 * P(contexto | k) · π(k). Si sí, la sensación pesa fuerte.
 */

import {
  SENSATIONS,
  type ImprintId,
  type SensationId,
} from "./sensations";

export const ALL_IMPRINT_IDS: ImprintId[] = [
  "i1",
  "i2",
  "i3",
  "i4",
  "i5",
  "i6",
  "i7",
  "i8",
  "i9",
  "i10",
  "i11",
  "i12",
  "i13",
];

export const IMPRINT_NAMES: Record<
  ImprintId,
  { es: string; en: string }
> = {
  i1: { es: "Desacople", en: "Decoupling" },
  i2: { es: "Acorazamiento", en: "Armoring" },
  i3: { es: "Retracción", en: "Retraction" },
  i4: { es: "Fijación Externa", en: "External Fixation" },
  i5: { es: "Compresión", en: "Compression" },
  i6: { es: "Camuflaje", en: "Camouflage" },
  i7: { es: "Hibernación", en: "Hibernation" },
  i8: { es: "Reserva", en: "Reserve" },
  i9: { es: "Confluencia", en: "Confluence" },
  i10: { es: "Vinculación", en: "Binding" },
  i11: { es: "Superposición", en: "Superposition" },
  i12: { es: "Desarraigo", en: "Uprooting" },
  i13: { es: "Encapsulamiento", en: "Encapsulation" },
};

/** Grupo cronobiológico del Cap 7.16 — útil para priors contextuales. */
export const IMPRINT_CHRONO_GROUP: Record<ImprintId, "A_individual" | "B_systemic"> = {
  i1: "A_individual",
  i2: "A_individual",
  i3: "A_individual",
  i4: "A_individual",
  i5: "A_individual",
  i6: "A_individual",
  i7: "A_individual", // punto de quiebre
  i8: "B_systemic",
  i9: "B_systemic",
  i10: "B_systemic",
  i11: "B_systemic",
  i12: "B_systemic",
  i13: "B_systemic",
};

/**
 * Log-likelihood de sensación dado impronta según tabla canónica:
 *   primary  → log(0.65)
 *   secondary → log(0.22)
 *   absent   → log(0.04)  (plano pero no cero — el paciente puede
 *                          reportar una sensación que la tabla no
 *                          lista como frecuente)
 */
function logLikSensationGivenImprint(
  s: SensationId,
  k: ImprintId,
): number {
  const sensation = SENSATIONS[s];
  // Si el id no existe en la tabla canónica, tratamos como sensación ausente:
  // prior plano pero no cero (evita NaN downstream si el input es ruidoso).
  if (!sensation) return Math.log(0.04);
  if (sensation.imprints_primary.includes(k)) return Math.log(0.65);
  if (sensation.imprints_secondary.includes(k)) return Math.log(0.22);
  return Math.log(0.04);
}

/**
 * Señales narrativas discriminativas derivadas del Cap 7 (preguntas
 * diferenciales de cada impronta). Cada clave es una "marca" que
 * Sonnet debe buscar en el transcript; el valor [0,1] indica cuán
 * presente está esa marca. Las marcas llevan al sistema hacia o
 * lejos de ciertas improntas.
 *
 * Mapeo marca → improntas que lo tienen como "activador":
 *   (cada entrada es la dirección positiva; si la marca está
 *    ausente, no penaliza — sólo favorece cuando aparece)
 */
export type NarrativeMark =
  | "sudden_impact_no_agent" //            i1
  | "betrayal_from_trusted" //             i2
  | "chronic_insufficiency_shame" //       i3
  | "rumination_on_agent" //               i4
  | "expression_blocked_or_ignored" //     i5
  | "humiliation_internalised" //          i6
  | "global_shutdown_no_energy" //         i7
  | "scarcity_accumulation" //             i8
  | "identity_dissolution_without_other" //i9
  | "loyalty_to_symptom_or_lost_person" // i10
  | "carrying_not_mine_grief" //           i11
  | "territorial_loss_no_home" //          i12
  | "heart_sealed_after_impact"; //        i13

export const MARK_TO_IMPRINT: Record<NarrativeMark, ImprintId> = {
  sudden_impact_no_agent: "i1",
  betrayal_from_trusted: "i2",
  chronic_insufficiency_shame: "i3",
  rumination_on_agent: "i4",
  expression_blocked_or_ignored: "i5",
  humiliation_internalised: "i6",
  global_shutdown_no_energy: "i7",
  scarcity_accumulation: "i8",
  identity_dissolution_without_other: "i9",
  loyalty_to_symptom_or_lost_person: "i10",
  carrying_not_mine_grief: "i11",
  territorial_loss_no_home: "i12",
  heart_sealed_after_impact: "i13",
};

const MARK_STRENGTH_MATCH = Math.log(0.75);
const MARK_STRENGTH_NONMATCH = Math.log(0.18);

function logLikMarksGivenImprint(
  marks: Partial<Record<NarrativeMark, number>>,
  k: ImprintId,
): number {
  let total = 0;
  for (const [markName, value] of Object.entries(marks) as Array<
    [NarrativeMark, number]
  >) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    // value ∈ [0,1]: activación de la marca en el transcript
    const target = MARK_TO_IMPRINT[markName];
    const matches = target === k;
    const p = matches ? MARK_STRENGTH_MATCH : MARK_STRENGTH_NONMATCH;
    // Mezcla ponderada por intensidad de la marca
    total += value * p + (1 - value) * Math.log(0.5);
  }
  return total;
}

export type ImprintBayesInput = {
  /**
   * Posterior sobre sensaciones (salida de Capa 1). Usamos el top-K
   * para no contaminar con ruido — se marginaliza sobre ellas.
   */
  sensation_posterior?: Array<{ id: SensationId; posterior: number }>;
  /** Marcas narrativas discriminativas puntuadas por Sonnet. */
  narrative_marks?: Partial<Record<NarrativeMark, number>>;
  /** Prior opcional por impronta. */
  prior?: Partial<Record<ImprintId, number>>;
};

export type ImprintPosteriorEntryV2 = {
  id: ImprintId;
  name_es: string;
  name_en: string;
  posterior: number;
  log_lik_sensations: number;
  log_lik_marks: number;
};

export type ImprintPosteriorResultV2 = {
  version: string;
  posterior: ImprintPosteriorEntryV2[];
  dominant: ImprintId;
  top_gap: number;
  entropy_bits: number;
  sensations_considered: SensationId[];
  marks_considered: NarrativeMark[];
};

export function computeImprintPosteriorFromSensations(
  input: ImprintBayesInput,
): ImprintPosteriorResultV2 {
  // ── Prior ──
  const prior: Record<ImprintId, number> = Object.fromEntries(
    ALL_IMPRINT_IDS.map((id) => [id, 1 / ALL_IMPRINT_IDS.length]),
  ) as Record<ImprintId, number>;
  if (input.prior) {
    for (const [k, v] of Object.entries(input.prior) as Array<
      [ImprintId, number]
    >) {
      if (typeof v === "number" && v > 0) prior[k] = v;
    }
    const z = Object.values(prior).reduce((s, v) => s + v, 0);
    for (const k of ALL_IMPRINT_IDS) prior[k] /= z;
  }

  const sensationPosterior = (input.sensation_posterior ?? [])
    .filter((e) => {
      if (e.posterior <= 0) return false;
      if (!SENSATIONS[e.id]) {
        // eslint-disable-next-line no-console
        console.warn(
          `[imprint-bayes] Ignoring unknown sensation id: "${e.id}". Expected canonical s1..s20 keys.`,
        );
        return false;
      }
      return true;
    })
    .sort((a, b) => b.posterior - a.posterior);

  const marks = input.narrative_marks ?? {};

  const logLikSensations: Record<ImprintId, number> = {} as Record<
    ImprintId,
    number
  >;
  const logLikMarks: Record<ImprintId, number> = {} as Record<
    ImprintId,
    number
  >;

  for (const k of ALL_IMPRINT_IDS) {
    // Marginalización sobre sensaciones: log-sum-exp ponderado por
    // el posterior de sensación (no se colapsa a la dominante).
    if (sensationPosterior.length === 0) {
      logLikSensations[k] = 0;
    } else {
      // lik(k) = Σ_s P(s | obs) · P(s | k)
      // En log-space: log Σ_s exp( log P(s|obs) + log P(s|k) )
      const terms = sensationPosterior.map(
        (e) => Math.log(e.posterior) + logLikSensationGivenImprint(e.id, k),
      );
      const maxT = Math.max(...terms);
      const logSum = maxT + Math.log(terms.reduce((s, t) => s + Math.exp(t - maxT), 0));
      logLikSensations[k] = logSum;
    }

    logLikMarks[k] = logLikMarksGivenImprint(marks, k);
  }

  // Unnormalised log posterior
  const logUnnorm: Record<ImprintId, number> = {} as Record<
    ImprintId,
    number
  >;
  for (const k of ALL_IMPRINT_IDS) {
    logUnnorm[k] = logLikSensations[k] + logLikMarks[k] + Math.log(prior[k]);
  }

  const maxLog = Math.max(...ALL_IMPRINT_IDS.map((k) => logUnnorm[k]));
  const weights: Record<ImprintId, number> = {} as Record<ImprintId, number>;
  let z = 0;
  for (const k of ALL_IMPRINT_IDS) {
    weights[k] = Math.exp(logUnnorm[k] - maxLog);
    z += weights[k];
  }
  const posteriorProbs: Record<ImprintId, number> = {} as Record<
    ImprintId,
    number
  >;
  for (const k of ALL_IMPRINT_IDS) posteriorProbs[k] = weights[k] / z;

  const entries: ImprintPosteriorEntryV2[] = ALL_IMPRINT_IDS.map((id) => ({
    id,
    name_es: IMPRINT_NAMES[id].es,
    name_en: IMPRINT_NAMES[id].en,
    posterior: posteriorProbs[id],
    log_lik_sensations: logLikSensations[id],
    log_lik_marks: logLikMarks[id],
  }));

  const sorted = [...entries].sort((a, b) => b.posterior - a.posterior);
  const dominant = sorted[0].id;
  const topGap = sorted[0].posterior - sorted[1].posterior;

  const entropyBits = -entries.reduce((s, e) => {
    const p = e.posterior;
    return s + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);

  return {
    version: "imprint-bayes-v0.3",
    posterior: sorted,
    dominant,
    top_gap: topGap,
    entropy_bits: entropyBits,
    sensations_considered: sensationPosterior.map((e) => e.id),
    marks_considered: Object.keys(marks) as NarrativeMark[],
  };
}
