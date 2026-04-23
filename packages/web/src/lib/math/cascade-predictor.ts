/**
 * Capa 3 — Cascada generativa: firma bioquímica esperada
 *
 * Dado el posterior sobre las 20 sensaciones, marginaliza la cascada
 * esperada por cada eje bioquímico. Devuelve media + desviación
 * (intervalo de confianza) + componentes (cuánto aporta cada sensación).
 *
 * Fuente: Tratado BV4, Cap 9.4 (cascadas por sensación) + Cap 9.5
 * (carga alostática = cascada que no se apaga).
 *
 * Matemática:
 *   Para cada eje y:
 *     μ_y(obs) = Σ_s P(s | obs) · cascade(s, y)
 *     σ_y²(obs) = Σ_s P(s | obs) · [σ_y² + (cascade(s, y) - μ_y(obs))²]
 *
 *   Esto es la media y varianza de una gaussiana mezclada:
 *   propaga correctamente la incertidumbre del posterior sobre
 *   sensaciones al eje bioquímico.
 *
 *   Si el posterior es casi puro en una sensación, σ_y² ≈ σ_y² base.
 *   Si el posterior es ambiguo, σ_y² ↑ (incertidumbre propagada).
 *
 * Después, `computeDiscordances` compara la firma esperada contra los
 * labs observados (en z-score) y clasifica cada eje como:
 *   - concordante   si |z_obs - μ_y| ≤ σ_y
 *   - leve          si σ_y < |z_obs - μ_y| ≤ 1.5 σ_y
 *   - moderada      si 1.5 σ_y < |z_obs - μ_y| ≤ 2 σ_y
 *   - fuerte        si |z_obs - μ_y| > 2 σ_y
 *
 * Eso REEMPLAZA las discordancias que el LLM adivinaba antes.
 * Cada número es auditable.
 */

import {
  SENSATIONS,
  type CascadeSignature,
  type SensationId,
} from "./sensations";
import { LAB_REFERENCE, type LabKey } from "./labs-zscore";

/** Varianza base por eje antes de propagar incertidumbre. En z-units. */
const BASE_CASCADE_SIGMA = 1.0;

export type ExpectedMarker = {
  key: LabKey;
  /** Media esperada en z-score. */
  expected_z: number;
  /** Desviación esperada en z-score (propaga incertidumbre del posterior). */
  expected_sd_z: number;
  /** Intervalo de confianza 68% (±1σ) en z. */
  ci68_z: [number, number];
  /** Intervalo de confianza 95% (±2σ) en z. */
  ci95_z: [number, number];
  /** Valores traducidos a escala cruda (unidades clínicas) si hay ref. */
  expected_raw: number | null;
  expected_sd_raw: number | null;
  ci68_raw: [number, number] | null;
  ci95_raw: [number, number] | null;
  unit: string | null;
  /**
   * Contribución por sensación: cuánto empuja cada una al valor
   * esperado. Útil para explicar por qué el sistema espera ese valor.
   */
  components: Array<{
    sensation_id: SensationId;
    sensation_name_es: string;
    posterior_weight: number;
    contribution_z: number;
  }>;
};

export type CascadePrediction = {
  version: string;
  markers: Partial<Record<LabKey, ExpectedMarker>>;
};

export function predictCascade(
  sensationPosterior: Array<{ id: SensationId; posterior: number }>,
): CascadePrediction {
  // Collect all lab keys referenced by any sensation's cascade.
  const allKeys = new Set<LabKey>();
  for (const s of Object.values(SENSATIONS)) {
    for (const k of Object.keys(s.cascade) as LabKey[]) allKeys.add(k);
  }

  const markers: Partial<Record<LabKey, ExpectedMarker>> = {};
  for (const key of allKeys) {
    // Mean: Σ P(s|obs) · μ_s,y
    let mu = 0;
    const components: ExpectedMarker["components"] = [];
    for (const entry of sensationPosterior) {
      const cascade = SENSATIONS[entry.id].cascade as CascadeSignature;
      const dz = cascade[key];
      if (typeof dz !== "number") continue;
      const w = entry.posterior;
      const contrib = w * dz;
      mu += contrib;
      if (w > 0.01 || Math.abs(dz) > 0.5) {
        components.push({
          sensation_id: entry.id,
          sensation_name_es: SENSATIONS[entry.id].name_es,
          posterior_weight: w,
          contribution_z: contrib,
        });
      }
    }

    // Variance: Σ P(s|obs) · [σ² + (μ_s,y - μ)²]
    let variance = 0;
    for (const entry of sensationPosterior) {
      const cascade = SENSATIONS[entry.id].cascade as CascadeSignature;
      const dz = cascade[key] ?? 0;
      const w = entry.posterior;
      variance += w * (BASE_CASCADE_SIGMA * BASE_CASCADE_SIGMA + (dz - mu) ** 2);
    }
    const sd = Math.sqrt(variance);

    const ref = LAB_REFERENCE[key];
    const toRaw = (z: number) => (ref ? ref.mean + z * ref.sd : null);
    const toRawSd = (zsd: number) => (ref ? zsd * ref.sd : null);

    markers[key] = {
      key,
      expected_z: mu,
      expected_sd_z: sd,
      ci68_z: [mu - sd, mu + sd],
      ci95_z: [mu - 2 * sd, mu + 2 * sd],
      expected_raw: toRaw(mu),
      expected_sd_raw: toRawSd(sd),
      ci68_raw:
        ref != null
          ? [ref.mean + (mu - sd) * ref.sd, ref.mean + (mu + sd) * ref.sd]
          : null,
      ci95_raw:
        ref != null
          ? [
              ref.mean + (mu - 2 * sd) * ref.sd,
              ref.mean + (mu + 2 * sd) * ref.sd,
            ]
          : null,
      unit: ref?.unit ?? null,
      components: components
        .sort((a, b) => Math.abs(b.contribution_z) - Math.abs(a.contribution_z))
        .slice(0, 5),
    };
  }

  return { version: "cascade-predictor-v0.3", markers };
}

export type DiscordanceDirection =
  | "concordant"
  | "above_expected"
  | "below_expected";
export type DiscordanceSeverity = "concordant" | "mild" | "moderate" | "strong";

export type Discordance = {
  key: LabKey;
  observed_raw: number;
  observed_z: number;
  expected_z: number;
  expected_sd_z: number;
  observed_z_deviation: number; // (observed_z - expected_z) / expected_sd_z
  direction: DiscordanceDirection;
  severity: DiscordanceSeverity;
  /**
   * Nota clínica generada del patrón: "observado por encima de lo
   * que la cascada dominante predice en 2.1σ — considerar fuente
   * adicional no explicada por la sensación activa".
   */
  note_es: string;
  note_en: string;
};

export function computeDiscordances(
  observedZ: Partial<Record<LabKey, number>>,
  observedRaw: Partial<Record<LabKey, number>>,
  prediction: CascadePrediction,
): Discordance[] {
  const out: Discordance[] = [];
  for (const [k, zObs] of Object.entries(observedZ) as Array<
    [LabKey, number]
  >) {
    if (typeof zObs !== "number" || !Number.isFinite(zObs)) continue;
    const marker = prediction.markers[k];
    if (!marker) continue;
    const rawObs = observedRaw[k];
    const deviation = (zObs - marker.expected_z) / Math.max(marker.expected_sd_z, 0.01);
    const absDev = Math.abs(deviation);
    let severity: DiscordanceSeverity;
    if (absDev <= 1.0) severity = "concordant";
    else if (absDev <= 1.5) severity = "mild";
    else if (absDev <= 2.0) severity = "moderate";
    else severity = "strong";
    const direction: DiscordanceDirection =
      severity === "concordant"
        ? "concordant"
        : deviation > 0
          ? "above_expected"
          : "below_expected";

    const note_es = buildNote(k, direction, severity, deviation, "es");
    const note_en = buildNote(k, direction, severity, deviation, "en");

    out.push({
      key: k,
      observed_raw: typeof rawObs === "number" ? rawObs : Number.NaN,
      observed_z: zObs,
      expected_z: marker.expected_z,
      expected_sd_z: marker.expected_sd_z,
      observed_z_deviation: deviation,
      direction,
      severity,
      note_es,
      note_en,
    });
  }
  // Order: strong first, then moderate, then mild, then concordant.
  const order: Record<DiscordanceSeverity, number> = {
    strong: 0,
    moderate: 1,
    mild: 2,
    concordant: 3,
  };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

function buildNote(
  key: LabKey,
  direction: DiscordanceDirection,
  severity: DiscordanceSeverity,
  deviation: number,
  locale: "es" | "en",
): string {
  if (severity === "concordant") {
    return locale === "es"
      ? `Concordante con la cascada esperada (desviación ${deviation.toFixed(2)}σ).`
      : `Concordant with expected cascade (deviation ${deviation.toFixed(2)}σ).`;
  }
  const arrow = direction === "above_expected" ? "↑" : "↓";
  const sevEs = severity === "mild" ? "leve" : severity === "moderate" ? "moderada" : "fuerte";
  const sevEn = severity === "mild" ? "mild" : severity === "moderate" ? "moderate" : "strong";
  if (locale === "es") {
    return `Discordancia ${sevEs} ${arrow} — observado a ${Math.abs(deviation).toFixed(2)}σ de la cascada predicha. Considerar fuente adicional no explicada por la señal activa.`;
  }
  return `${sevEn} discordance ${arrow} — observed ${Math.abs(deviation).toFixed(2)}σ from predicted cascade. Consider additional source not explained by the active signal.`;
}
