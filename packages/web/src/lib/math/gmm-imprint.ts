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
 * y se ajustan con la práctica clínica del Dr. Ojeda. Corre en Node
 * puro — mismo resultado que el GMM cerrado analítico de scikit-learn.
 *
 * Fase 2 sustituye este módulo por NumPyro HMC en Vercel Sandbox cuando
 * (a) ajustemos Σ no-diagonal con correlaciones entre ejes, y
 * (b) metamos priors jerárquicos edad/sexo/ancestría.
 *
 * v0.2 — vector clínico ampliado a ~40 ejes sobre 5 sistemas.
 * v0.1 parámetros se conservan en el historial del módulo (git).
 */

export type ImprintId = "i1" | "i4" | "i7" | "i8";

/**
 * Vector clínico ampliado — 40 ejes en 5 sistemas. Todos opcionales.
 * El clasificador marginaliza sobre los ejes ausentes: cuantos más
 * datos concretos, más estrecho el posterior.
 *
 * Rangos y unidades son los estándar de la práctica clínica del
 * Dr. Ojeda Ríos — valores fuera de los rangos esperados se aceptan
 * y contribuyen a la likelihood (no se censuran).
 */
export type FeatureKey =
  // ── Sistema HPA (3)
  | "cortisol_am" //            μg/dL
  | "cortisol_pm" //            μg/dL
  | "car" //                    awakening response, μg/dL increment
  // ── Metabolismo (8)
  | "hba1c" //                  %
  | "homa_ir" //                unitless
  | "fasting_glucose" //        mg/dL
  | "fasting_insulin" //        μIU/mL
  | "triglycerides" //          mg/dL
  | "hdl" //                    mg/dL
  | "ldl" //                    mg/dL
  | "leptin" //                 ng/mL
  // ── Inflamación (2)
  | "crp" //                    mg/L
  | "il6" //                    pg/mL
  // ── Tiroides (3)
  | "tsh" //                    mIU/L
  | "t3_free" //                pg/mL
  | "t4_free" //                ng/dL
  // ── Micronutrientes (4)
  | "ferritin" //               ng/mL
  | "vitamin_d" //              ng/mL
  | "b12" //                    pg/mL
  | "homocysteine" //           μmol/L
  // ── Autonómico (3)
  | "sdnn_hrv" //               ms
  | "rmssd_hrv" //              ms
  | "lf_hf_ratio" //            unitless
  // ── Composición corporal (3)
  | "visceral_fat" //           index (1–30, Tanita-style)
  | "lean_mass_pct" //          %
  | "body_water_pct" //         %
  // ── Narrativa [0,1] (12) — extraídas por Sonnet con verbatim quotes
  | "hypervigilance"
  | "dorsal_collapse"
  | "scarcity_anticipation"
  | "externalised_anger"
  | "rumination_agent"
  | "hepatobiliary_tag"
  | "peripheral_coldness"
  | "nocturnal_hyperphagia"
  | "inability_to_rest"
  | "panic_grief_tonality"
  | "dissociation_sudden_impact"
  | "interoceptive_suppression";

export type FeatureVector = Partial<Record<FeatureKey, number>>;

/** Agrupación por sistema — usada por la UI para intake modular. */
export const FEATURE_SYSTEMS: Array<{
  id: string;
  label_en: string;
  label_es: string;
  keys: FeatureKey[];
}> = [
  {
    id: "hpa",
    label_en: "HPA axis",
    label_es: "Eje HPA",
    keys: ["cortisol_am", "cortisol_pm", "car"],
  },
  {
    id: "metabolic",
    label_en: "Metabolic",
    label_es: "Metabolismo",
    keys: [
      "hba1c",
      "homa_ir",
      "fasting_glucose",
      "fasting_insulin",
      "triglycerides",
      "hdl",
      "ldl",
      "leptin",
    ],
  },
  {
    id: "inflammation",
    label_en: "Inflammation",
    label_es: "Inflamación",
    keys: ["crp", "il6"],
  },
  {
    id: "thyroid",
    label_en: "Thyroid",
    label_es: "Tiroides",
    keys: ["tsh", "t3_free", "t4_free"],
  },
  {
    id: "micronutrients",
    label_en: "Micronutrients",
    label_es: "Micronutrientes",
    keys: ["ferritin", "vitamin_d", "b12", "homocysteine"],
  },
  {
    id: "autonomic",
    label_en: "Autonomic",
    label_es: "Autonómico",
    keys: ["sdnn_hrv", "rmssd_hrv", "lf_hf_ratio"],
  },
  {
    id: "body_comp",
    label_en: "Body composition",
    label_es: "Composición corporal",
    keys: ["visceral_fat", "lean_mass_pct", "body_water_pct"],
  },
];

export const NARRATIVE_KEYS: FeatureKey[] = [
  "hypervigilance",
  "dorsal_collapse",
  "scarcity_anticipation",
  "externalised_anger",
  "rumination_agent",
  "hepatobiliary_tag",
  "peripheral_coldness",
  "nocturnal_hyperphagia",
  "inability_to_rest",
  "panic_grief_tonality",
  "dissociation_sudden_impact",
  "interoceptive_suppression",
];

/** Metadatos de visualización de cada feature — unidad, step, placeholder. */
export const FEATURE_META: Record<
  FeatureKey,
  { label_en: string; label_es: string; unit: string; step: string; placeholder?: string }
> = {
  cortisol_am: { label_en: "AM cortisol", label_es: "Cortisol AM", unit: "μg/dL", step: "0.1", placeholder: "22" },
  cortisol_pm: { label_en: "PM cortisol", label_es: "Cortisol PM", unit: "μg/dL", step: "0.1", placeholder: "6" },
  car: { label_en: "CAR (awakening response)", label_es: "CAR (despertar)", unit: "μg/dL Δ", step: "0.1", placeholder: "5" },
  hba1c: { label_en: "HbA1c", label_es: "HbA1c", unit: "%", step: "0.1", placeholder: "6.1" },
  homa_ir: { label_en: "HOMA-IR", label_es: "HOMA-IR", unit: "", step: "0.1", placeholder: "3.2" },
  fasting_glucose: { label_en: "Fasting glucose", label_es: "Glucosa ayuno", unit: "mg/dL", step: "1", placeholder: "96" },
  fasting_insulin: { label_en: "Fasting insulin", label_es: "Insulina ayuno", unit: "μIU/mL", step: "0.1", placeholder: "14" },
  triglycerides: { label_en: "Triglycerides", label_es: "Triglicéridos", unit: "mg/dL", step: "1", placeholder: "160" },
  hdl: { label_en: "HDL", label_es: "HDL", unit: "mg/dL", step: "1", placeholder: "42" },
  ldl: { label_en: "LDL", label_es: "LDL", unit: "mg/dL", step: "1", placeholder: "115" },
  leptin: { label_en: "Leptin", label_es: "Leptina", unit: "ng/mL", step: "0.1", placeholder: "16" },
  crp: { label_en: "hs-CRP", label_es: "PCR-us", unit: "mg/L", step: "0.01", placeholder: "2.5" },
  il6: { label_en: "IL-6", label_es: "IL-6", unit: "pg/mL", step: "0.1", placeholder: "2.0" },
  tsh: { label_en: "TSH", label_es: "TSH", unit: "mIU/L", step: "0.01", placeholder: "2.1" },
  t3_free: { label_en: "Free T3", label_es: "T3 libre", unit: "pg/mL", step: "0.01", placeholder: "3.2" },
  t4_free: { label_en: "Free T4", label_es: "T4 libre", unit: "ng/dL", step: "0.01", placeholder: "1.2" },
  ferritin: { label_en: "Ferritin", label_es: "Ferritina", unit: "ng/mL", step: "1", placeholder: "75" },
  vitamin_d: { label_en: "25-OH vitamin D", label_es: "25-OH vitamina D", unit: "ng/mL", step: "0.1", placeholder: "32" },
  b12: { label_en: "B12", label_es: "B12", unit: "pg/mL", step: "1", placeholder: "480" },
  homocysteine: { label_en: "Homocysteine", label_es: "Homocisteína", unit: "μmol/L", step: "0.1", placeholder: "10" },
  sdnn_hrv: { label_en: "HRV (SDNN)", label_es: "HRV (SDNN)", unit: "ms", step: "1", placeholder: "28" },
  rmssd_hrv: { label_en: "HRV (RMSSD)", label_es: "HRV (RMSSD)", unit: "ms", step: "1", placeholder: "25" },
  lf_hf_ratio: { label_en: "LF/HF ratio", label_es: "Cociente LF/HF", unit: "", step: "0.1", placeholder: "2.5" },
  visceral_fat: { label_en: "Visceral fat index", label_es: "Grasa visceral", unit: "", step: "0.5", placeholder: "10" },
  lean_mass_pct: { label_en: "Lean mass", label_es: "Masa magra", unit: "%", step: "0.1", placeholder: "58" },
  body_water_pct: { label_en: "Body water", label_es: "Agua corporal", unit: "%", step: "0.1", placeholder: "50" },
  // Narrative keys kept in meta for completeness
  hypervigilance: { label_en: "Hypervigilance", label_es: "Hipervigilancia", unit: "[0,1]", step: "0.01" },
  dorsal_collapse: { label_en: "Dorsal collapse", label_es: "Colapso dorsal", unit: "[0,1]", step: "0.01" },
  scarcity_anticipation: { label_en: "Scarcity anticipation", label_es: "Anticipación de escasez", unit: "[0,1]", step: "0.01" },
  externalised_anger: { label_en: "Externalised anger", label_es: "Ira externalizada", unit: "[0,1]", step: "0.01" },
  rumination_agent: { label_en: "Rumination on agent", label_es: "Rumiación sobre agente", unit: "[0,1]", step: "0.01" },
  hepatobiliary_tag: { label_en: "Hepatobiliary tag", label_es: "Etiqueta hepatobiliar", unit: "[0,1]", step: "0.01" },
  peripheral_coldness: { label_en: "Peripheral coldness", label_es: "Frialdad periférica", unit: "[0,1]", step: "0.01" },
  nocturnal_hyperphagia: { label_en: "Nocturnal hyperphagia", label_es: "Hiperfagia nocturna", unit: "[0,1]", step: "0.01" },
  inability_to_rest: { label_en: "Inability to rest", label_es: "Incapacidad de descansar", unit: "[0,1]", step: "0.01" },
  panic_grief_tonality: { label_en: "PANIC-GRIEF tonality", label_es: "Tonalidad PÁNICO-DUELO", unit: "[0,1]", step: "0.01" },
  dissociation_sudden_impact: { label_en: "Dissociation (sudden impact)", label_es: "Disociación (impacto súbito)", unit: "[0,1]", step: "0.01" },
  interoceptive_suppression: { label_en: "Interoceptive suppression", label_es: "Supresión interoceptiva", unit: "[0,1]", step: "0.01" },
};

export type GaussianBand = { mean: number; sd: number };

export type ImprintParams = {
  id: ImprintId;
  name: string;
  bands: Partial<Record<FeatureKey, GaussianBand>>;
};

/**
 * Parámetros v0.2 — vector ampliado a 40 ejes.
 *
 * Fuentes:
 *   1. Tablas de "signatures" del system prompt de /api/analyze
 *      (cortisol, HbA1c, TSH, HDL, TG, SDNN).
 *   2. Tratado BV4 — improntas i1 Desacople, i4 Fijación Externa,
 *      i7 Hibernación, i8 Reserva.
 *   3. Práctica clínica del Dr. Miguel Ojeda Ríos — ajustes de v0.1.
 *   4. Estándares de referencia nutrigenómica (rangos funcionales
 *      no poblacionales).
 *
 * sd deliberadamente anchas en v0.2 porque el modelo aprende con
 * casos reales. Estrechar σ prematuramente produce over-confidence.
 *
 * Convención narrativa: la impronta que "posee" la dimensión narrativa
 * tiene μ ≈ 0.78 (presencia marcada), σ ≈ 0.15. Las otras improntas
 * tienen μ ≈ 0.22–0.30 (presencia baja pero no cero). Valores
 * intermedios (0.4–0.6) aportan poca información al posterior.
 */
const NAR_HIGH: GaussianBand = { mean: 0.78, sd: 0.15 };
const NAR_MID: GaussianBand = { mean: 0.45, sd: 0.2 };
const NAR_LOW: GaussianBand = { mean: 0.22, sd: 0.15 };

export const IMPRINT_PARAMS: Record<ImprintId, ImprintParams> = {
  // ────────────────────────────────────────────────
  // i1 Desacople — hipervigilancia, simpaticotonía sostenida,
  // periféricos fríos, HPA alta, HRV colapsado, metabolismo tenso.
  // ────────────────────────────────────────────────
  i1: {
    id: "i1",
    name: "Desacople",
    bands: {
      // HPA
      cortisol_am: { mean: 20.5, sd: 3.5 },
      cortisol_pm: { mean: 6.5, sd: 2.0 },
      car: { mean: 6.5, sd: 2.0 },
      // Metabolic
      hba1c: { mean: 5.8, sd: 0.4 },
      homa_ir: { mean: 2.4, sd: 0.9 },
      fasting_glucose: { mean: 94, sd: 8 },
      fasting_insulin: { mean: 11, sd: 3 },
      triglycerides: { mean: 130, sd: 40 },
      hdl: { mean: 43, sd: 6 },
      ldl: { mean: 115, sd: 25 },
      leptin: { mean: 10, sd: 4 },
      // Inflammation
      crp: { mean: 1.8, sd: 1.2 },
      il6: { mean: 2.0, sd: 1.0 },
      // Thyroid
      tsh: { mean: 1.8, sd: 0.9 },
      t3_free: { mean: 3.1, sd: 0.4 },
      t4_free: { mean: 1.3, sd: 0.2 },
      // Micronutrients
      ferritin: { mean: 85, sd: 40 },
      vitamin_d: { mean: 28, sd: 10 },
      b12: { mean: 500, sd: 150 },
      homocysteine: { mean: 10, sd: 3 },
      // Autonomic — rigid sympathetic
      sdnn_hrv: { mean: 28, sd: 8 },
      rmssd_hrv: { mean: 22, sd: 7 },
      lf_hf_ratio: { mean: 3.2, sd: 1.2 },
      // Body composition
      visceral_fat: { mean: 9, sd: 3 },
      lean_mass_pct: { mean: 60, sd: 6 },
      body_water_pct: { mean: 52, sd: 5 },
      // Narrative
      hypervigilance: NAR_HIGH,
      dorsal_collapse: NAR_LOW,
      scarcity_anticipation: NAR_MID,
      externalised_anger: NAR_MID,
      rumination_agent: NAR_LOW,
      hepatobiliary_tag: NAR_LOW,
      peripheral_coldness: NAR_HIGH,
      nocturnal_hyperphagia: NAR_LOW,
      inability_to_rest: { mean: 0.65, sd: 0.18 },
      panic_grief_tonality: NAR_LOW,
      dissociation_sudden_impact: NAR_HIGH,
      interoceptive_suppression: { mean: 0.65, sd: 0.18 },
    },
  },
  // ────────────────────────────────────────────────
  // i4 Fijación Externa — anger, rumination, hepatobiliary load,
  // sympathetic tone elevado, TG elevados.
  // ────────────────────────────────────────────────
  i4: {
    id: "i4",
    name: "Fijación Externa",
    bands: {
      // HPA
      cortisol_am: { mean: 19.5, sd: 3.8 },
      cortisol_pm: { mean: 7.0, sd: 2.5 },
      car: { mean: 6.0, sd: 2.0 },
      // Metabolic
      hba1c: { mean: 5.65, sd: 0.35 },
      homa_ir: { mean: 2.2, sd: 0.8 },
      fasting_glucose: { mean: 92, sd: 8 },
      fasting_insulin: { mean: 10, sd: 3 },
      triglycerides: { mean: 185, sd: 50 },
      hdl: { mean: 45, sd: 7 },
      ldl: { mean: 130, sd: 30 },
      leptin: { mean: 11, sd: 4 },
      // Inflammation — moderate
      crp: { mean: 2.5, sd: 1.5 },
      il6: { mean: 2.5, sd: 1.2 },
      // Thyroid
      tsh: { mean: 1.9, sd: 0.9 },
      t3_free: { mean: 3.2, sd: 0.4 },
      t4_free: { mean: 1.2, sd: 0.2 },
      // Micronutrients
      ferritin: { mean: 150, sd: 70 },
      vitamin_d: { mean: 26, sd: 10 },
      b12: { mean: 520, sd: 150 },
      homocysteine: { mean: 11, sd: 3 },
      // Autonomic
      sdnn_hrv: { mean: 32, sd: 10 },
      rmssd_hrv: { mean: 25, sd: 8 },
      lf_hf_ratio: { mean: 2.8, sd: 1.0 },
      // Body composition
      visceral_fat: { mean: 11, sd: 4 },
      lean_mass_pct: { mean: 58, sd: 6 },
      body_water_pct: { mean: 51, sd: 5 },
      // Narrative
      hypervigilance: NAR_MID,
      dorsal_collapse: NAR_LOW,
      scarcity_anticipation: NAR_MID,
      externalised_anger: NAR_HIGH,
      rumination_agent: NAR_HIGH,
      hepatobiliary_tag: NAR_HIGH,
      peripheral_coldness: NAR_LOW,
      nocturnal_hyperphagia: NAR_LOW,
      inability_to_rest: NAR_MID,
      panic_grief_tonality: NAR_LOW,
      dissociation_sudden_impact: NAR_LOW,
      interoceptive_suppression: NAR_MID,
    },
  },
  // ────────────────────────────────────────────────
  // i7 Hibernación — dorsal-vagal collapse, hypersomnia, low cortisol,
  // TSH alta, energía conservada, metabolismo deprimido.
  // ────────────────────────────────────────────────
  i7: {
    id: "i7",
    name: "Hibernación",
    bands: {
      // HPA — blunted
      cortisol_am: { mean: 9, sd: 3 },
      cortisol_pm: { mean: 3.5, sd: 1.5 },
      car: { mean: 2.5, sd: 1.5 },
      // Metabolic
      hba1c: { mean: 5.2, sd: 0.3 },
      homa_ir: { mean: 1.5, sd: 0.7 },
      fasting_glucose: { mean: 85, sd: 7 },
      fasting_insulin: { mean: 7, sd: 2.5 },
      triglycerides: { mean: 100, sd: 35 },
      hdl: { mean: 52, sd: 8 },
      ldl: { mean: 110, sd: 25 },
      leptin: { mean: 8, sd: 3 },
      // Inflammation
      crp: { mean: 1.2, sd: 0.9 },
      il6: { mean: 1.5, sd: 0.8 },
      // Thyroid — subclinical hypothyroid tendency
      tsh: { mean: 4.0, sd: 1.5 },
      t3_free: { mean: 2.6, sd: 0.4 },
      t4_free: { mean: 1.0, sd: 0.2 },
      // Micronutrients
      ferritin: { mean: 45, sd: 25 },
      vitamin_d: { mean: 22, sd: 8 },
      b12: { mean: 420, sd: 140 },
      homocysteine: { mean: 11, sd: 3 },
      // Autonomic — preserved or high
      sdnn_hrv: { mean: 42, sd: 12 },
      rmssd_hrv: { mean: 38, sd: 12 },
      lf_hf_ratio: { mean: 1.2, sd: 0.6 },
      // Body composition
      visceral_fat: { mean: 8, sd: 3 },
      lean_mass_pct: { mean: 55, sd: 7 },
      body_water_pct: { mean: 49, sd: 5 },
      // Narrative
      hypervigilance: NAR_LOW,
      dorsal_collapse: NAR_HIGH,
      scarcity_anticipation: { mean: 0.35, sd: 0.18 },
      externalised_anger: NAR_LOW,
      rumination_agent: NAR_LOW,
      hepatobiliary_tag: NAR_LOW,
      peripheral_coldness: { mean: 0.55, sd: 0.2 },
      nocturnal_hyperphagia: NAR_LOW,
      inability_to_rest: NAR_LOW,
      panic_grief_tonality: NAR_LOW,
      dissociation_sudden_impact: NAR_LOW,
      interoceptive_suppression: NAR_HIGH,
    },
  },
  // ────────────────────────────────────────────────
  // i8 Reserva — scarcity, nocturnal hyperphagia, PANIC-GRIEF,
  // HbA1c y HOMA-IR elevados, no puede descansar.
  // ────────────────────────────────────────────────
  i8: {
    id: "i8",
    name: "Reserva",
    bands: {
      // HPA
      cortisol_am: { mean: 21, sd: 3.5 },
      cortisol_pm: { mean: 8, sd: 2.5 },
      car: { mean: 5.5, sd: 2.0 },
      // Metabolic — flag pattern
      hba1c: { mean: 6.05, sd: 0.4 },
      homa_ir: { mean: 3.0, sd: 1.0 },
      fasting_glucose: { mean: 102, sd: 10 },
      fasting_insulin: { mean: 14, sd: 4 },
      triglycerides: { mean: 165, sd: 45 },
      hdl: { mean: 41, sd: 6 },
      ldl: { mean: 125, sd: 28 },
      leptin: { mean: 18, sd: 6 },
      // Inflammation
      crp: { mean: 2.2, sd: 1.3 },
      il6: { mean: 2.2, sd: 1.0 },
      // Thyroid
      tsh: { mean: 2.3, sd: 1.0 },
      t3_free: { mean: 3.0, sd: 0.4 },
      t4_free: { mean: 1.2, sd: 0.2 },
      // Micronutrients
      ferritin: { mean: 120, sd: 60 },
      vitamin_d: { mean: 25, sd: 10 },
      b12: { mean: 460, sd: 150 },
      homocysteine: { mean: 11, sd: 3 },
      // Autonomic — rigid
      sdnn_hrv: { mean: 32, sd: 9 },
      rmssd_hrv: { mean: 26, sd: 8 },
      lf_hf_ratio: { mean: 2.8, sd: 1.0 },
      // Body composition — higher visceral
      visceral_fat: { mean: 13, sd: 4 },
      lean_mass_pct: { mean: 54, sd: 6 },
      body_water_pct: { mean: 48, sd: 5 },
      // Narrative
      hypervigilance: { mean: 0.5, sd: 0.2 },
      dorsal_collapse: NAR_LOW,
      scarcity_anticipation: NAR_HIGH,
      externalised_anger: NAR_LOW,
      rumination_agent: NAR_MID,
      hepatobiliary_tag: NAR_LOW,
      peripheral_coldness: NAR_LOW,
      nocturnal_hyperphagia: NAR_HIGH,
      inability_to_rest: NAR_HIGH,
      panic_grief_tonality: NAR_HIGH,
      dissociation_sudden_impact: NAR_LOW,
      interoceptive_suppression: { mean: 0.55, sd: 0.2 },
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
  top_gap: number;
  features_used: FeatureKey[];
  features_missing: FeatureKey[];
  entropy_bits: number;
  prior: Record<ImprintId, number>;
};

/** Gaussiana univariada en log-space (estable numéricamente). */
function logGaussian(x: number, mean: number, sd: number): number {
  const variance = sd * sd;
  const diff = x - mean;
  return (
    -0.5 * Math.log(2 * Math.PI * variance) - (diff * diff) / (2 * variance)
  );
}

/**
 * Aplica el teorema de Bayes sobre el GMM: softmax de
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

  const featuresUsed: FeatureKey[] = Array.from(usedSets.i1);
  const featuresMissing: FeatureKey[] = (
    Object.keys(IMPRINT_PARAMS.i1.bands) as FeatureKey[]
  ).filter((k) => !featuresUsed.includes(k));

  const logPosteriorUnnorm: Record<ImprintId, number> = {
    i1: logLiks.i1 + Math.log(prior.i1),
    i4: logLiks.i4 + Math.log(prior.i4),
    i7: logLiks.i7 + Math.log(prior.i7),
    i8: logLiks.i8 + Math.log(prior.i8),
  };

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

  const entropyBits = -entries.reduce((s, e) => {
    const p = e.posterior;
    return s + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);

  return {
    version: "gmm-v0.2",
    posterior: entries,
    dominant,
    top_gap: topGap,
    features_used: featuresUsed,
    features_missing: featuresMissing,
    entropy_bits: entropyBits,
    prior,
  };
}
