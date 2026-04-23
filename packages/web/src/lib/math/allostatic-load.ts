/**
 * Capa 4 — Clasificación de carga alostática (McEwen, tres tipos).
 *
 * Fuente: Tratado BV4 Cap 9.5; McEwen 1998/2007; Juster-McEwen-Lupien 2010.
 *
 * Los tres tipos de carga alostática:
 *   Tipo 1: Activación frecuente — múltiples estresores repetidos,
 *           cada uno activa cascada completa, acumulación por
 *           frecuencia. Patrón: múltiples sensaciones con posterior
 *           moderado (entropía alta), labs con elevaciones moderadas
 *           múltiples.
 *   Tipo 2: Falla para apagar — la cascada de una señal permanece
 *           activa crónicamente. Patrón: una sensación dominante
 *           (posterior alto, entropía baja), labs fuertemente
 *           desviados en la dirección que esa cascada predice.
 *           ESTE ES EL PATRÓN NUCLEAR BV4.
 *   Tipo 3: Desregulación multisistémica — ejes contra-regulatorios
 *           hiperactivados por falla primaria. Patrón: labs con
 *           direcciones contradictorias, hipocortisolismo paradójico
 *           (cortisol bajo con inflamación alta), múltiples
 *           discordancias fuertes.
 *
 * Biomarcadores clave (Juster-McEwen-Lupien 2010):
 *   cortisol urinario 24h, DHEA-S, epi/norepi urinarias, PA sistólica
 *   y diastólica, colesterol total, HDL, HbA1c, cintura/cadera, PCR,
 *   fibrinógeno, IL-6.
 */

import type { Discordance } from "./cascade-predictor";
import type { SensationPosteriorResult } from "./gmm-sensation";

export type AllostaticLoadType = 1 | 2 | 3;

export type AllostaticLoadResult = {
  version: string;
  type: AllostaticLoadType;
  type_label_es: string;
  type_label_en: string;
  confidence: number; // [0,1]
  rationale_es: string;
  rationale_en: string;
  biomarkers_counted: {
    key: string;
    z: number;
    within_juster_set: boolean;
  }[];
  metrics: {
    sensation_entropy_bits: number;
    sensation_top_posterior: number;
    strong_discordances: number;
    moderate_discordances: number;
    multisystem_contradictions: number;
  };
};

/**
 * Biomarcadores core del set Juster-McEwen-Lupien 2010.
 * Se usa para contar cuántos ejes del set canónico están
 * disponibles en el caso evaluado.
 */
const JUSTER_SET = new Set<string>([
  "cortisol_am",
  "cortisol_pm",
  "dhea_s",
  "catecholamines",
  "hdl",
  "ldl",
  "hba1c",
  "crp",
  "fibrinogen",
  "il6",
]);

/**
 * Cuenta contradicciones multisistémicas: ejes inmunes elevados con
 * cortisol bajo (hipocortisolismo paradójico), o catecolaminas altas
 * con HRV alta (contradicción simpática/parasimpática).
 */
function countMultisystemContradictions(discordances: Discordance[]): number {
  const byKey = new Map<string, Discordance>();
  for (const d of discordances) byKey.set(d.key, d);

  let n = 0;
  const cortisol = byKey.get("cortisol_am");
  const il6 = byKey.get("il6");
  const crp = byKey.get("crp");
  const tnf = byKey.get("tnf_alpha");
  const cats = byKey.get("catecholamines");
  const sdnn = byKey.get("sdnn_hrv");

  // Hipocortisolismo paradójico
  if (
    cortisol &&
    cortisol.severity !== "concordant" &&
    cortisol.direction === "below_expected" &&
    ((il6 &&
      il6.severity !== "concordant" &&
      il6.direction === "above_expected") ||
      (crp &&
        crp.severity !== "concordant" &&
        crp.direction === "above_expected") ||
      (tnf &&
        tnf.severity !== "concordant" &&
        tnf.direction === "above_expected"))
  ) {
    n += 2; // fuerte señal de tipo 3
  }

  // Simpático alto + HRV alta (contradicción)
  if (
    cats &&
    cats.severity !== "concordant" &&
    cats.direction === "above_expected" &&
    sdnn &&
    sdnn.severity !== "concordant" &&
    sdnn.direction === "above_expected"
  ) {
    n += 1;
  }

  return n;
}

export function classifyAllostaticLoad(
  sensationResult: SensationPosteriorResult,
  discordances: Discordance[],
  observedZ: Partial<Record<string, number>>,
): AllostaticLoadResult {
  const entropy = sensationResult.entropy_bits;
  const topP = sensationResult.posterior[0]?.posterior ?? 0;
  const strong = discordances.filter((d) => d.severity === "strong").length;
  const moderate = discordances.filter((d) => d.severity === "moderate").length;
  const contradictions = countMultisystemContradictions(discordances);

  const biomarkers = Object.entries(observedZ)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([k, v]) => ({
      key: k,
      z: v as number,
      within_juster_set: JUSTER_SET.has(k),
    }));

  // ── Heurística de clasificación ──
  let type: AllostaticLoadType;
  let confidence: number;
  let rationale_es: string;
  let rationale_en: string;

  if (contradictions >= 2) {
    type = 3;
    confidence = Math.min(0.6 + contradictions * 0.1, 0.95);
    rationale_es = `Desregulación multisistémica: se detectan ${contradictions} contradicciones entre ejes (p. ej., hipocortisolismo paradójico con inflamación). Patrón tipo 3 McEwen: respuesta primaria colapsada con hiperactivación contra-regulatoria.`;
    rationale_en = `Multisystem dysregulation: ${contradictions} contradictions between axes (e.g., paradoxical hypocortisolism with inflammation). McEwen type 3 pattern: collapsed primary response with contra-regulatory hyperactivation.`;
  } else if (topP >= 0.45 && entropy <= 3.2 && strong + moderate >= 2) {
    type = 2;
    confidence = Math.min(0.5 + topP + (strong + moderate) * 0.05, 0.95);
    rationale_es = `Señal que no se apaga: el posterior de sensación está concentrado (${(topP * 100).toFixed(0)}%, entropía ${entropy.toFixed(2)} bits) y la cascada de esa sensación explica elevaciones sostenidas en los labs (${strong} discordancias fuertes, ${moderate} moderadas). Patrón tipo 2 McEwen — el núcleo clínico BV4.`;
    rationale_en = `Signal that does not turn off: sensation posterior is concentrated (${(topP * 100).toFixed(0)}%, entropy ${entropy.toFixed(2)} bits) and its cascade explains sustained lab elevations (${strong} strong discordances, ${moderate} moderate). McEwen type 2 pattern — the BV4 clinical core.`;
  } else if (entropy >= 3.5 && strong + moderate >= 2) {
    type = 1;
    confidence = 0.5 + Math.min(0.3, (strong + moderate) * 0.05);
    rationale_es = `Activación frecuente: el posterior de sensación está disperso (entropía ${entropy.toFixed(2)} bits) y hay múltiples elevaciones moderadas en los labs. Patrón tipo 1 McEwen: varias sensaciones rotando sin que el cuerpo alcance recuperación entre activaciones.`;
    rationale_en = `Frequent activation: sensation posterior is dispersed (entropy ${entropy.toFixed(2)} bits) with multiple moderate lab elevations. McEwen type 1 pattern: several sensations rotating without recovery time between activations.`;
  } else {
    // Default: tipo 2 débil (asumimos núcleo BV4 salvo señal contraria)
    type = 2;
    confidence = 0.35;
    rationale_es = `Evidencia limitada — el tipo de carga alostática no se puede clasificar con alta confianza. Se asume tipo 2 como hipótesis inicial (núcleo BV4: una señal que no se apaga), pero faltan datos para confirmar.`;
    rationale_en = `Limited evidence — allostatic load type cannot be classified with high confidence. Type 2 is assumed as initial hypothesis (BV4 core: one signal that does not turn off), but data is insufficient to confirm.`;
  }

  return {
    version: "allostatic-load-v0.3",
    type,
    type_label_es:
      type === 1
        ? "Tipo 1 — Activación frecuente"
        : type === 2
          ? "Tipo 2 — Señal que no se apaga"
          : "Tipo 3 — Desregulación multisistémica",
    type_label_en:
      type === 1
        ? "Type 1 — Frequent activation"
        : type === 2
          ? "Type 2 — Signal that does not turn off"
          : "Type 3 — Multisystem dysregulation",
    confidence,
    rationale_es,
    rationale_en,
    biomarkers_counted: biomarkers,
    metrics: {
      sensation_entropy_bits: entropy,
      sensation_top_posterior: topP,
      strong_discordances: strong,
      moderate_discordances: moderate,
      multisystem_contradictions: contradictions,
    },
  };
}
