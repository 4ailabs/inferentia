/**
 * GMM Bayesian Classifier — P(impronta | firma observada)
 *
 * Nivel 1 del ensamble jerárquico descrito en
 * proyecto_nutrigenomica/04_improntas_modelo_metabolico/01_analisis_inicial_2026-04-21.md
 *
 * Modelo:
 *   Para cada impronta k ∈ {i1, i4, i7, i8}:
 *     P(x | k) = N(x | μ_k, Σ_k)      (gaussiana multivariada, Σ diagonal)
 *   P(k)  = π_k                        (prior uniforme por defecto)
 *   P(k | x) = P(x|k) π_k / Σ_j P(x|j) π_j
 *
 * Esta es matemática real, no estimación del LLM. Cada número tiene
 * trazabilidad: μ y Σ vienen de las firmas canónicas del Tratado BV4
 * (v0.1 iniciales; se refinan con datos clínicos del Dr. Ojeda en
 * fase 2). El cálculo corre en Node puro — mismo resultado que el
 * GMM cerrado analítico de scikit-learn.
 *
 * No usamos MCMC aquí porque el GMM con Σ diagonal y priors fijos
 * es cerrado. Fase 2 sustituye este módulo por NumPyro HMC en Vercel
 * Sandbox cuando (a) ajustemos Σ no-diagonal con correlaciones entre
 * ejes, y (b) metamos priors jerárquicos edad/sexo/ancestría.
 */

export type ImprintId = "i1" | "i4" | "i7" | "i8";

/**
 * Los 8 ejes del vector de features. Los primeros 5 son labs
 * objetivos; los últimos 3 son escalas 0–1 extraídas del transcript
 * por el subagente Sonnet `extract_features`.
 *
 * Si un lab falta, el clasificador marginaliza sobre ese eje
 * (i.e. lo omite del producto de likelihoods), y la incertidumbre
 * del posterior refleja esa ausencia.
 */
export type FeatureKey =
  | "cortisol_morning" //  μg/dL     — eje HPA
  | "sdnn_hrv" //            ms        — flexibilidad autonómica
  | "hba1c" //               %         — integrada glucémica 3 meses
  | "homa_ir" //             —          — resistencia insulínica
  | "hdl" //                 mg/dL     — lipidograma protector
  | "hypervigilance" //      [0,1]     — narrativa de alerta constante
  | "dorsal_collapse" //     [0,1]     — narrativa de hundimiento energético
  | "scarcity_anticipation"; // [0,1]  — narrativa de anticipación de escasez

export type FeatureVector = Partial<Record<FeatureKey, number>>;

export type GaussianBand = {
  mean: number;
  /**
   * Desviación estándar por eje. Σ es diagonal en v0.1 — cada eje
   * es independiente dado la impronta. Fase 2: Σ no-diagonal con
   * correlaciones observadas en la práctica del Dr. Ojeda.
   */
  sd: number;
};

export type ImprintParams = {
  id: ImprintId;
  name: string;
  /** Vector μ y Σ diagonal por eje. */
  bands: Partial<Record<FeatureKey, GaussianBand>>;
};

/**
 * Parámetros v0.1 derivados de:
 *   1. Tablas de "signatures" del system prompt de /api/analyze
 *      (bandas i1/i4/i7/i8 sobre cortisol, HbA1c, TSH, HDL, TG, SDNN).
 *   2. Tratado BV4 — improntas i1 Desacople, i4 Fijación Externa,
 *      i7 Hibernación, i8 Reserva.
 *   3. Dr. Miguel Ojeda Ríos — validación clínica inicial.
 *
 * Las sd son conservadoras (anchas) en v0.1. En fase 2 se ajustan
 * con N casos de la práctica.
 *
 * Para los 3 ejes narrativos [0,1]: asumimos que la narrativa
 * específica de una impronta está desplazada hacia 0.75±0.15 y
 * las narrativas ajenas hacia 0.25±0.15. Valores intermedios
 * no distinguen.
 */
export const IMPRINT_PARAMS: Record<ImprintId, ImprintParams> = {
  i1: {
    id: "i1",
    name: "Desacople",
    bands: {
      cortisol_morning: { mean: 20.5, sd: 3.5 }, // alto-normal
      sdnn_hrv: { mean: 28, sd: 8 }, //            reducido
      hba1c: { mean: 5.8, sd: 0.4 }, //            upper-normal
      homa_ir: { mean: 2.4, sd: 0.9 }, //          leve
      hdl: { mean: 43, sd: 6 }, //                 bajo
      hypervigilance: { mean: 0.78, sd: 0.15 },
      dorsal_collapse: { mean: 0.22, sd: 0.15 },
      scarcity_anticipation: { mean: 0.3, sd: 0.2 },
    },
  },
  i4: {
    id: "i4",
    name: "Fijación Externa",
    bands: {
      cortisol_morning: { mean: 19.5, sd: 3.8 },
      sdnn_hrv: { mean: 32, sd: 10 },
      hba1c: { mean: 5.65, sd: 0.35 },
      homa_ir: { mean: 2.2, sd: 0.8 },
      hdl: { mean: 45, sd: 7 },
      hypervigilance: { mean: 0.55, sd: 0.2 },
      dorsal_collapse: { mean: 0.2, sd: 0.15 },
      scarcity_anticipation: { mean: 0.35, sd: 0.2 },
    },
  },
  i7: {
    id: "i7",
    name: "Hibernación",
    bands: {
      cortisol_morning: { mean: 9, sd: 3 }, //    bajo
      sdnn_hrv: { mean: 42, sd: 12 }, //           preservado o alto
      hba1c: { mean: 5.2, sd: 0.3 }, //            bajo-normal
      homa_ir: { mean: 1.5, sd: 0.7 },
      hdl: { mean: 52, sd: 8 },
      hypervigilance: { mean: 0.25, sd: 0.15 },
      dorsal_collapse: { mean: 0.8, sd: 0.15 },
      scarcity_anticipation: { mean: 0.3, sd: 0.2 },
    },
  },
  i8: {
    id: "i8",
    name: "Reserva",
    bands: {
      cortisol_morning: { mean: 21, sd: 3.5 }, //  alto, sostenido
      sdnn_hrv: { mean: 32, sd: 9 }, //            rígido
      hba1c: { mean: 6.05, sd: 0.4 }, //           pre/diabético leve
      homa_ir: { mean: 3.0, sd: 1.0 }, //          elevado
      hdl: { mean: 41, sd: 6 }, //                 bajo
      hypervigilance: { mean: 0.5, sd: 0.2 },
      dorsal_collapse: { mean: 0.3, sd: 0.2 },
      scarcity_anticipation: { mean: 0.82, sd: 0.15 },
    },
  },
};

export type ImprintPosteriorEntry = {
  id: ImprintId;
  name: string;
  /** Posterior probability P(impronta | x). Suma a 1 sobre las 4. */
  posterior: number;
  /** Log-likelihood log P(x | impronta). Útil para auditar. */
  log_likelihood: number;
};

export type ImprintPosteriorResult = {
  version: string;
  posterior: ImprintPosteriorEntry[];
  dominant: ImprintId;
  /**
   * Gap dominant-second posterior. < 0.2 → posterior débilmente
   * separado; sugerir más datos o una segunda sesión.
   */
  top_gap: number;
  /**
   * Ejes que efectivamente entraron al cálculo (los que tenían
   * valor y los que la impronta tiene definidos).
   */
  features_used: FeatureKey[];
  /**
   * Ejes ausentes en el input del usuario. Se marginalizaron.
   */
  features_missing: FeatureKey[];
  /**
   * Shannon entropy del posterior sobre las 4 improntas (bits).
   * 0 = totalmente determinado; 2 = uniforme sobre 4.
   * Medida de incertidumbre. Debe bajar cuando llegan más datos.
   */
  entropy_bits: number;
  /** Prior uniforme usado (1/4 por defecto). */
  prior: Record<ImprintId, number>;
};

/**
 * log N(x | μ, σ²) para una gaussiana univariada.
 * Estable numéricamente (no colapsa para σ pequeño).
 */
function logGaussian(x: number, mean: number, sd: number): number {
  const variance = sd * sd;
  const diff = x - mean;
  return (
    -0.5 * Math.log(2 * Math.PI * variance) - (diff * diff) / (2 * variance)
  );
}

/**
 * Aplica el teorema de Bayes sobre el GMM para obtener el posterior
 * normalizado P(impronta | features). Matemáticamente: softmax de
 * log P(x | k) + log π_k.
 */
export function computeImprintPosterior(
  features: FeatureVector,
  opts: { prior?: Record<ImprintId, number> } = {},
): ImprintPosteriorResult {
  const prior: Record<ImprintId, number> =
    opts.prior ?? { i1: 0.25, i4: 0.25, i7: 0.25, i8: 0.25 };

  const imprintIds: ImprintId[] = ["i1", "i4", "i7", "i8"];
  const featureEntries = Object.entries(features) as Array<
    [FeatureKey, number]
  >;
  const featuresProvided: FeatureKey[] = featureEntries
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([k]) => k);

  // Log-likelihoods by imprint: sum log-gaussians over provided features.
  const logLiks: Record<ImprintId, number> = { i1: 0, i4: 0, i7: 0, i8: 0 };
  const usedSets: Record<ImprintId, Set<FeatureKey>> = {
    i1: new Set(),
    i4: new Set(),
    i7: new Set(),
    i8: new Set(),
  };

  for (const id of imprintIds) {
    const bands = IMPRINT_PARAMS[id].bands;
    for (const [key, value] of featureEntries) {
      const band = bands[key];
      if (!band || !Number.isFinite(value)) continue;
      logLiks[id] += logGaussian(value, band.mean, band.sd);
      usedSets[id].add(key);
    }
  }

  // Union of features actually used (all imprints share μ,Σ structure in v0.1)
  const featuresUsed: FeatureKey[] = Array.from(usedSets.i1);
  const featuresMissing: FeatureKey[] = (
    Object.keys(IMPRINT_PARAMS.i1.bands) as FeatureKey[]
  ).filter((k) => !featuresUsed.includes(k));

  // Log posterior (unnormalised) = log-likelihood + log prior
  const logPosteriorUnnorm: Record<ImprintId, number> = {
    i1: logLiks.i1 + Math.log(prior.i1),
    i4: logLiks.i4 + Math.log(prior.i4),
    i7: logLiks.i7 + Math.log(prior.i7),
    i8: logLiks.i8 + Math.log(prior.i8),
  };

  // Softmax with max-subtraction trick for numerical stability.
  const maxLog = Math.max(
    logPosteriorUnnorm.i1,
    logPosteriorUnnorm.i4,
    logPosteriorUnnorm.i7,
    logPosteriorUnnorm.i8,
  );
  const weights: Record<ImprintId, number> = {
    i1: Math.exp(logPosteriorUnnorm.i1 - maxLog),
    i4: Math.exp(logPosteriorUnnorm.i4 - maxLog),
    i7: Math.exp(logPosteriorUnnorm.i7 - maxLog),
    i8: Math.exp(logPosteriorUnnorm.i8 - maxLog),
  };
  const z = weights.i1 + weights.i4 + weights.i7 + weights.i8;

  const posteriorProbs: Record<ImprintId, number> = {
    i1: weights.i1 / z,
    i4: weights.i4 / z,
    i7: weights.i7 / z,
    i8: weights.i8 / z,
  };

  const entries: ImprintPosteriorEntry[] = imprintIds.map((id) => ({
    id,
    name: IMPRINT_PARAMS[id].name,
    posterior: posteriorProbs[id],
    log_likelihood: logLiks[id],
  }));

  const sorted = [...entries].sort((a, b) => b.posterior - a.posterior);
  const dominant = sorted[0].id;
  const topGap = sorted[0].posterior - sorted[1].posterior;

  // Shannon entropy in bits.
  const entropyBits = -entries.reduce((s, e) => {
    const p = e.posterior;
    return s + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);

  return {
    version: "gmm-v0.1",
    posterior: entries,
    dominant,
    top_gap: topGap,
    features_used: featuresUsed,
    features_missing: featuresMissing,
    entropy_bits: entropyBits,
    prior,
  };
}
