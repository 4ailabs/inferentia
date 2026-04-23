/**
 * Conversión de labs crudos → z-score contra referencia poblacional
 * adulta sana (rangos funcionales, no meramente "no-enfermedad").
 *
 * Fuente de rangos: estándares de medicina funcional ampliamente
 * usados en la práctica clínica del Dr. Ojeda + referencias
 * generalmente aceptadas (ej. TSH funcional 1.0–2.5, cortisol AM
 * 10–18 μg/dL, etc.). Los valores se ajustarán con datos reales.
 *
 * Convención: mean = centro del rango funcional, sd = (max-min)/4
 * (aproximación gaussiana asumiendo que el 95% de la población sana
 * cae dentro del rango funcional, i.e. ±2σ).
 */

import type { CascadeSignature } from "./sensations";

export type LabKey = keyof CascadeSignature;

export type LabRef = { mean: number; sd: number; unit: string };

/** Rangos v0.3-draft. Ajustar con la experiencia del Dr. Ojeda. */
export const LAB_REFERENCE: Partial<Record<LabKey, LabRef>> = {
  // HPA
  cortisol_am: { mean: 14, sd: 3, unit: "μg/dL" },
  cortisol_pm: { mean: 5, sd: 2, unit: "μg/dL" },
  car: { mean: 5, sd: 2, unit: "μg/dL Δ" },
  // Metabolic
  hba1c: { mean: 5.3, sd: 0.3, unit: "%" },
  homa_ir: { mean: 1.5, sd: 0.5, unit: "" },
  fasting_glucose: { mean: 88, sd: 7, unit: "mg/dL" },
  fasting_insulin: { mean: 7, sd: 2.5, unit: "μIU/mL" },
  triglycerides: { mean: 100, sd: 35, unit: "mg/dL" },
  hdl: { mean: 55, sd: 10, unit: "mg/dL" },
  ldl: { mean: 105, sd: 25, unit: "mg/dL" },
  leptin: { mean: 10, sd: 5, unit: "ng/mL" },
  // Inflammation
  crp: { mean: 0.8, sd: 0.6, unit: "mg/L" },
  il6: { mean: 1.2, sd: 0.7, unit: "pg/mL" },
  tnf_alpha: { mean: 1.5, sd: 0.8, unit: "pg/mL" },
  // Thyroid
  tsh: { mean: 1.8, sd: 0.7, unit: "mIU/L" },
  t3_free: { mean: 3.2, sd: 0.4, unit: "pg/mL" },
  t4_free: { mean: 1.2, sd: 0.2, unit: "ng/dL" },
  // Micronutrients
  ferritin: { mean: 90, sd: 40, unit: "ng/mL" },
  vitamin_d: { mean: 42, sd: 12, unit: "ng/mL" },
  b12: { mean: 550, sd: 150, unit: "pg/mL" },
  homocysteine: { mean: 8, sd: 2, unit: "μmol/L" },
  // Autonomic
  sdnn_hrv: { mean: 45, sd: 12, unit: "ms" },
  rmssd_hrv: { mean: 40, sd: 12, unit: "ms" },
  lf_hf_ratio: { mean: 1.5, sd: 0.6, unit: "" },
  // Body composition
  visceral_fat: { mean: 7, sd: 3, unit: "idx" },
  lean_mass_pct: { mean: 60, sd: 6, unit: "%" },
  body_water_pct: { mean: 55, sd: 5, unit: "%" },
  // Hormonal — sex-specific in practice; placeholder unisex
  testosterone: { mean: 400, sd: 150, unit: "ng/dL" },
  estradiol: { mean: 80, sd: 40, unit: "pg/mL" },
  dhea_s: { mean: 200, sd: 80, unit: "μg/dL" },
  // Other
  aldosterone: { mean: 10, sd: 4, unit: "ng/dL" },
  ghrelin: { mean: 400, sd: 120, unit: "pg/mL" },
  catecholamines: { mean: 40, sd: 15, unit: "μg/24h" },
  fibrinogen: { mean: 300, sd: 60, unit: "mg/dL" },
};

export function labToZscore(key: LabKey, value: number): number | null {
  const ref = LAB_REFERENCE[key];
  if (!ref) return null;
  if (!Number.isFinite(value)) return null;
  return (value - ref.mean) / ref.sd;
}

export function labsToZscores(
  raw: Partial<Record<LabKey, number>>,
): Partial<Record<LabKey, number>> {
  const out: Partial<Record<LabKey, number>> = {};
  for (const [k, v] of Object.entries(raw) as Array<[LabKey, number]>) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const z = labToZscore(k, v);
    if (z !== null) out[k] = z;
  }
  return out;
}

/** Todas las keys conocidas, en orden estable. */
export const ALL_LAB_KEYS: LabKey[] = Object.keys(LAB_REFERENCE) as LabKey[];
