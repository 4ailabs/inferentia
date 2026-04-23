/**
 * Motor de scoring del Test de Improntas BV4.
 *
 * Fórmula (v0.3 draft, review psicométrico aplicado):
 *
 *   Score(k) =  w_A · mean(A_valid)
 *             + w_B · mean(B_valid)
 *             + w_C · (C_marcados / C_total) · 5
 *             + w_D · mean(D_valid)
 *             + w_E · E_value
 *             - w_R · (6 - R_value)            [reverse scoring]
 *
 * Donde:
 *   - _valid excluye respuestas 0 ("no accesible").
 *   - w_A=1.0, w_B=0.7, w_C=1.2, w_D=1.0, w_E=0.8, w_R=1.0 (pesos del review).
 *   - Score final se normaliza a 0–5.
 *
 * Umbrales:
 *   - Score ≥ 3.5 → impronta probable
 *   - Score ≥ 4.2 → impronta fuerte
 *   - Gap top-1 vs top-2 < 0.3 → coactivación (mostrar ambas)
 *
 * Cada score lleva desglose por canal para auditoría.
 */

import type { ImprintBank, ImprintDefinition } from "./imprint-test-loader";

export type ItemResponses = {
  /** Likert responses keyed by item id. 0 = no accesible, 1–5 = Likert. */
  likert: Record<string, number>;
  /** Checklist: by imprint id, set of indices (0-based) marked as present. */
  checklist: Record<string, number[]>;
};

export type ImprintScore = {
  imprint_id: string;
  name_es: string;
  name_en: string;
  total: number;
  band: "below" | "probable" | "strong";
  breakdown: {
    A: { mean: number | null; count_valid: number; count_total: number; weighted: number };
    B: { mean: number | null; count_valid: number; count_total: number; weighted: number };
    C: { marked: number; total: number; proportion: number; weighted: number };
    D: { mean: number | null; count_valid: number; count_total: number; weighted: number };
    E: { value: number | null; weighted: number };
    R: { value: number | null; reverse: number | null; weighted: number };
  };
  missing_items: string[];
};

export type TestResult = {
  version: string;
  scores: ImprintScore[];
  dominant: string;
  top_gap: number;
  coactivation: boolean;
  runner_up: string | null;
  top3: ImprintScore[];
  flags: string[];
};

function mean(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function scoreImprint(
  imprint: ImprintDefinition,
  responses: ItemResponses,
  weights: ImprintBank["scoring"]["weights"],
  thresholds: ImprintBank["scoring"]["thresholds"],
): ImprintScore {
  const { A, B, D, E, R, C_checklist } = imprint.items;
  const likert = responses.likert;

  const missing: string[] = [];

  // ---- Tipo A ----
  const aItems = A;
  const aValuesAll = aItems.map((i) => likert[i.id] ?? -1);
  const aValid = aValuesAll.filter((v) => v >= 1);
  aItems.forEach((i, idx) => {
    if (aValuesAll[idx] < 1 && aValuesAll[idx] !== 0) missing.push(i.id);
  });
  const aMean = mean(aValid);

  // ---- Tipo B ----
  const bItems = B;
  const bValuesAll = bItems.map((i) => likert[i.id] ?? -1);
  const bValid = bValuesAll.filter((v) => v >= 1);
  bItems.forEach((i, idx) => {
    if (bValuesAll[idx] < 1 && bValuesAll[idx] !== 0) missing.push(i.id);
  });
  const bMean = mean(bValid);

  // ---- Tipo C checklist ----
  const cTotal = C_checklist.items.length;
  const cMarkedIdx = responses.checklist[imprint.id] ?? [];
  const cMarked = cMarkedIdx.length;
  const cProp = cTotal > 0 ? cMarked / cTotal : 0;
  const cWeighted = weights.C * cProp * 5;

  // ---- Tipo D ----
  const dItems = D;
  const dValuesAll = dItems.map((i) => likert[i.id] ?? -1);
  const dValid = dValuesAll.filter((v) => v >= 1);
  dItems.forEach((i, idx) => {
    if (dValuesAll[idx] < 1 && dValuesAll[idx] !== 0) missing.push(i.id);
  });
  const dMean = mean(dValid);

  // ---- Tipo E ----
  const eVal = likert[E.id];
  const eValid = typeof eVal === "number" && eVal >= 1 ? eVal : null;
  if (eValid === null && eVal !== 0) missing.push(E.id);

  // ---- Tipo R (reverse-keyed) ----
  const rVal = likert[R.id];
  const rValid = typeof rVal === "number" && rVal >= 1 ? rVal : null;
  if (rValid === null && rVal !== 0) missing.push(R.id);
  // Reverse: 5→1, 1→5 → 6 - R
  const rReverse = rValid !== null ? 6 - rValid : null;

  // ---- Ponderados ----
  const aWeighted = aMean !== null ? weights.A * aMean : 0;
  const bWeighted = bMean !== null ? weights.B * bMean : 0;
  const dWeighted = dMean !== null ? weights.D * dMean : 0;
  const eWeighted = eValid !== null ? weights.E * eValid : 0;
  // R resta cuando la capacidad sana está presente (rReverse bajo = sano = resta poco)
  // Cuando rReverse alto = no sano = resta mucho negativo = suma efectivamente
  // Queremos: capacidad sana alta (R=5) → resta mucho del score de impronta.
  // rReverse = 6 - R. Si R=5, rReverse=1 → w_R · 1 pequeño resta.
  // Invertimos el signo: restamos el score invertido del impronta.
  // Fórmula: score_delta_R = -w_R · (6 - R) === -w_R · rReverse
  // Si R=5 (muy sano): resta w_R · 1 = 1 punto del score impronta (bien)
  // Si R=1 (no sano): resta w_R · 5 = 5 puntos del score impronta
  // Pero eso implica que R=1 castiga más que R=5, que es lo OPUESTO.
  // Corregimos: cuando R alto (sano), resta del impronta; cuando R bajo, no resta.
  // Fórmula correcta: score_delta_R = -w_R · R_value (cuando R alto, resta)
  // Pero queremos rango 0. Normalizamos:
  // rPenalty = w_R · (R - 1) / 4 · k, donde k calibra.
  // Simplificación: la R alta descuenta linealmente; Rbaja no descuenta.
  const rPenalty = rValid !== null ? weights.R * ((rValid - 1) / 4) : 0;

  // Raw total (suma ponderada), rango aproximado:
  // A:0-5, B:0-3.5, C:0-6, D:0-5, E:0-4 → max ≈ 23.5
  // Normalizamos a 0-5 dividiendo por suma de pesos efectivos.
  const sumWeights =
    (aMean !== null ? weights.A : 0) +
    (bMean !== null ? weights.B : 0) +
    (cTotal > 0 ? weights.C : 0) +
    (dMean !== null ? weights.D : 0) +
    (eValid !== null ? weights.E : 0);

  const sumWeighted = aWeighted + bWeighted + cWeighted + dWeighted + eWeighted;
  const rawScore = sumWeights > 0 ? sumWeighted / sumWeights : 0;
  const withPenalty = Math.max(0, rawScore - rPenalty);
  const total = Math.min(5, withPenalty);

  const band: "below" | "probable" | "strong" =
    total >= thresholds.strong
      ? "strong"
      : total >= thresholds.probable
        ? "probable"
        : "below";

  return {
    imprint_id: imprint.id,
    name_es: imprint.name_es,
    name_en: imprint.name_en,
    total,
    band,
    breakdown: {
      A: {
        mean: aMean,
        count_valid: aValid.length,
        count_total: aItems.length,
        weighted: aWeighted,
      },
      B: {
        mean: bMean,
        count_valid: bValid.length,
        count_total: bItems.length,
        weighted: bWeighted,
      },
      C: {
        marked: cMarked,
        total: cTotal,
        proportion: cProp,
        weighted: cWeighted,
      },
      D: {
        mean: dMean,
        count_valid: dValid.length,
        count_total: dItems.length,
        weighted: dWeighted,
      },
      E: { value: eValid, weighted: eWeighted },
      R: { value: rValid, reverse: rReverse, weighted: -rPenalty },
    },
    missing_items: missing,
  };
}

export function runTest(bank: ImprintBank, responses: ItemResponses): TestResult {
  const scores = bank.imprints.map((imp) =>
    scoreImprint(imp, responses, bank.scoring.weights, bank.scoring.thresholds),
  );

  const sorted = [...scores].sort((a, b) => b.total - a.total);
  const dominant = sorted[0].imprint_id;
  const topGap = sorted[0].total - sorted[1].total;
  const coactivation = topGap < bank.scoring.thresholds.coactivation_gap;
  const runnerUp = coactivation ? sorted[1].imprint_id : null;

  const flags: string[] = [];
  if (coactivation) {
    flags.push(
      `Coactivación detectada: top-1 ${sorted[0].name_es} (${sorted[0].total.toFixed(2)}) y top-2 ${sorted[1].name_es} (${sorted[1].total.toFixed(2)}) con gap ${topGap.toFixed(2)}. Revisar pares cronobiológicos.`,
    );
  }
  if (sorted[0].total < bank.scoring.thresholds.probable) {
    flags.push(
      `Ninguna impronta supera el umbral de probable (${bank.scoring.thresholds.probable}). Evidencia insuficiente.`,
    );
  }

  return {
    version: bank.version,
    scores,
    dominant,
    top_gap: topGap,
    coactivation,
    runner_up: runnerUp,
    top3: sorted.slice(0, 3),
    flags,
  };
}
