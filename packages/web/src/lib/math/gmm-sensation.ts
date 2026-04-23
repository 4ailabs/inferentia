/**
 * Capa 1 — P(sensación | observables)
 *
 * Fuente: Tratado BV4, Cap 9.1–9.4. La sensación visceral es la
 * capa 1 del modelo de 4 capas: es la señal biológica primitiva
 * que activa la cascada fisiológica. Trabajar aquí — no sobre la
 * impronta ni sobre el síntoma — es el núcleo de la intervención BV4.
 *
 * Entrada:
 *   - Labs z-scored contra población (desviaciones respecto a normal).
 *   - Zonas corporales reportadas (categórico, multi-hot).
 *   - 0..n sensaciones narrativas puntuadas [0,1] por Sonnet.
 *
 * Modelo:
 *   Para cada sensación s ∈ {s1..s20}:
 *     log P(obs | s) =
 *         Σ_eje log N( lab_z(eje) | μ = cascade(s, eje), σ = σ_eje )
 *       + Σ_zona log P(zona | s)       (multinomial por zona)
 *       + Σ_sn  log N( narr_score(sn) | μ = match(s, sn), σ )
 *
 *   P(s | obs) = softmax( log P(obs|s) + log π(s) )
 *
 * El prior π(s) se puede modular por edad/sexo/contexto; por defecto
 * uniforme 1/20.
 *
 * Propiedades:
 *   - Marginaliza ejes ausentes.
 *   - Cerrado analíticamente — Node puro, microsegundos.
 *   - Trazable: cada log-likelihood atribuible a un eje concreto.
 */

import {
  ALL_SENSATION_IDS,
  SENSATIONS,
  type BodyZone,
  type CascadeSignature,
  type SensationId,
} from "./sensations";

/**
 * Observables que recibe el clasificador. Todos opcionales.
 * lab_z: valores ya convertidos a z-score respecto a referencia
 * poblacional (ver labs-zscore.ts). Si recibes valores crudos, el
 * endpoint los convierte antes de llamar aquí.
 */
export type SensationObservables = {
  /** Z-scores de labs (vs referencia poblacional adulta). */
  lab_z?: Partial<Record<keyof CascadeSignature, number>>;
  /** Zonas corporales donde el paciente reporta la sensación. */
  reported_zones?: BodyZone[];
  /**
   * Para cada sensación, score narrativo [0,1] que Sonnet puntuó
   * leyendo el transcript — "¿cuánto se parece la narrativa a esta
   * sensación?". Valor 0 = ausente, 1 = dominante.
   */
  narrative_scores?: Partial<Record<SensationId, number>>;
};

/**
 * Σ por eje para el likelihood gaussiano: cuánta variabilidad
 * permitimos entre cascadas. Conservador en v0.3 — amplio para no
 * sobre-clasificar. Se estrecha con más casos reales.
 */
const LAB_SIGMA = 1.0; // z-score units

/**
 * Probabilidad de que una zona esté presente dado que la sensación
 * está activa. Multinomial suavizado.
 */
const ZONE_GIVEN_SENSATION_IF_LISTED = 0.7;
const ZONE_GIVEN_SENSATION_IF_NOT_LISTED = 0.08;

/** Narrativa: cuán cerca de 1.0 esperamos cuando la sensación es la activa. */
const NARRATIVE_MU_MATCH = 0.8;
const NARRATIVE_MU_NONMATCH = 0.18;
const NARRATIVE_SIGMA = 0.2;

function logGaussian(x: number, mean: number, sd: number): number {
  const v = sd * sd;
  const d = x - mean;
  return -0.5 * Math.log(2 * Math.PI * v) - (d * d) / (2 * v);
}

export type SensationLikelihoodBreakdown = {
  from_labs: number;
  from_zones: number;
  from_narrative: number;
  total_log_lik: number;
};

export type SensationPosteriorEntry = {
  id: SensationId;
  number: number;
  name_es: string;
  name_en: string;
  posterior: number;
  breakdown: SensationLikelihoodBreakdown;
};

export type SensationPosteriorResult = {
  version: string;
  posterior: SensationPosteriorEntry[];
  dominant: SensationId;
  top_gap: number;
  entropy_bits: number;
  prior: Record<SensationId, number>;
  inputs_summary: {
    labs_used: string[];
    labs_missing_from_any_cascade: string[];
    zones_reported: BodyZone[];
    narratives_provided: SensationId[];
  };
};

export type ComputeSensationOptions = {
  prior?: Partial<Record<SensationId, number>>;
};

export function computeSensationPosterior(
  obs: SensationObservables,
  opts: ComputeSensationOptions = {},
): SensationPosteriorResult {
  // ── Prior (uniforme por defecto) ──
  const prior: Record<SensationId, number> = Object.fromEntries(
    ALL_SENSATION_IDS.map((id) => [id, 1 / ALL_SENSATION_IDS.length]),
  ) as Record<SensationId, number>;
  if (opts.prior) {
    for (const [k, v] of Object.entries(opts.prior) as Array<[SensationId, number]>) {
      if (typeof v === "number" && v > 0) prior[k] = v;
    }
    // Re-normalize
    const z = Object.values(prior).reduce((s, v) => s + v, 0);
    for (const k of ALL_SENSATION_IDS) prior[k] /= z;
  }

  const labZ = obs.lab_z ?? {};
  const reportedZones = obs.reported_zones ?? [];
  const narrativeScores = obs.narrative_scores ?? {};

  const labKeysProvided = Object.keys(labZ).filter(
    (k) => typeof labZ[k as keyof CascadeSignature] === "number",
  );
  const labKeysUsedByAny = new Set<string>();

  // ── Compute log-likelihood per sensation ──
  const breakdownPerSensation: Record<
    SensationId,
    SensationLikelihoodBreakdown
  > = {} as Record<SensationId, SensationLikelihoodBreakdown>;

  const logUnnorm: Record<SensationId, number> = {} as Record<
    SensationId,
    number
  >;

  for (const sid of ALL_SENSATION_IDS) {
    const sensation = SENSATIONS[sid];
    const cascade = sensation.cascade;

    // 1) Labs
    let logLabs = 0;
    for (const [key, value] of Object.entries(labZ)) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const expected = cascade[key as keyof CascadeSignature];
      const mu = typeof expected === "number" ? expected : 0;
      logLabs += logGaussian(value, mu, LAB_SIGMA);
      if (typeof expected === "number") {
        labKeysUsedByAny.add(key);
      }
    }

    // 2) Zones (multi-hot multinomial)
    let logZones = 0;
    if (reportedZones.length > 0) {
      for (const z of reportedZones) {
        const listed = sensation.body_zones.includes(z);
        const p = listed
          ? ZONE_GIVEN_SENSATION_IF_LISTED
          : ZONE_GIVEN_SENSATION_IF_NOT_LISTED;
        logZones += Math.log(p);
      }
    }

    // 3) Narrative scores (per-sensation Sonnet match)
    let logNarr = 0;
    for (const [otherSid, score] of Object.entries(narrativeScores)) {
      if (typeof score !== "number" || !Number.isFinite(score)) continue;
      const mu = otherSid === sid ? NARRATIVE_MU_MATCH : NARRATIVE_MU_NONMATCH;
      logNarr += logGaussian(score, mu, NARRATIVE_SIGMA);
    }

    const total = logLabs + logZones + logNarr;
    breakdownPerSensation[sid] = {
      from_labs: logLabs,
      from_zones: logZones,
      from_narrative: logNarr,
      total_log_lik: total,
    };
    logUnnorm[sid] = total + Math.log(prior[sid]);
  }

  // ── Softmax normalization (numerically stable) ──
  const maxLog = Math.max(...ALL_SENSATION_IDS.map((s) => logUnnorm[s]));
  const weights: Record<SensationId, number> = {} as Record<SensationId, number>;
  let z = 0;
  for (const s of ALL_SENSATION_IDS) {
    const w = Math.exp(logUnnorm[s] - maxLog);
    weights[s] = w;
    z += w;
  }
  const posteriorProbs: Record<SensationId, number> = {} as Record<
    SensationId,
    number
  >;
  for (const s of ALL_SENSATION_IDS) posteriorProbs[s] = weights[s] / z;

  const entries: SensationPosteriorEntry[] = ALL_SENSATION_IDS.map((id) => ({
    id,
    number: SENSATIONS[id].number,
    name_es: SENSATIONS[id].name_es,
    name_en: SENSATIONS[id].name_en,
    posterior: posteriorProbs[id],
    breakdown: breakdownPerSensation[id],
  }));

  const sorted = [...entries].sort((a, b) => b.posterior - a.posterior);
  const dominant = sorted[0].id;
  const topGap = sorted[0].posterior - sorted[1].posterior;

  const entropyBits = -entries.reduce((s, e) => {
    const p = e.posterior;
    return s + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);

  const labsMissingFromAny = labKeysProvided.filter(
    (k) => !labKeysUsedByAny.has(k),
  );

  return {
    version: "gmm-sensation-v0.3",
    posterior: entries.sort((a, b) => b.posterior - a.posterior),
    dominant,
    top_gap: topGap,
    entropy_bits: entropyBits,
    prior,
    inputs_summary: {
      labs_used: Array.from(labKeysUsedByAny).sort(),
      labs_missing_from_any_cascade: labsMissingFromAny,
      zones_reported: reportedZones,
      narratives_provided: Object.keys(narrativeScores) as SensationId[],
    },
  };
}
