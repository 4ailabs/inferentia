import { z } from "zod";
import {
  computeSystemState,
  type LabInput,
  type ClinicalContext,
} from "@/lib/math/system-state";
import {
  computeFlexibilityIndex,
  type PredictiveAgencyInput,
} from "@/lib/math/flexibility-index";
import {
  findLeveragePoints,
  type ImprintId,
} from "@/lib/math/leverage-finder";
import {
  estimateFreeEnergy,
  buildHypotheticalEffect,
} from "@/lib/math/free-energy-estimator";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * /api/system-state — cálculo matemático completo del estado del sistema.
 *
 * Dado labs + contexto clínico + impronta (opcional), devuelve:
 *   - System State (20+ nodos con rigidez + reversibilidad)
 *   - Flexibility Index (PFF 8 sub-procesos)
 *   - Leverage Points (prioridades de intervención)
 *   - Free Energy Estimate (hipotético: qué liberaría intervenir en el punto primario)
 *
 * Esto es 100% cálculo auditable. Ningún número lo produce un LLM.
 */

const LabInputSchema = z
  .object({
    cortisol_am: z.number().optional(),
    cortisol_pm: z.number().optional(),
    dhea_s: z.number().optional(),
    hba1c: z.number().optional(),
    fasting_glucose: z.number().optional(),
    fasting_insulin: z.number().optional(),
    homa_ir: z.number().optional(),
    triglycerides: z.number().optional(),
    hdl: z.number().optional(),
    ldl: z.number().optional(),
    total_cholesterol: z.number().optional(),
    leptin: z.number().optional(),
    adiponectin: z.number().optional(),
    crp: z.number().optional(),
    il6: z.number().optional(),
    tnf_alpha: z.number().optional(),
    fibrinogen: z.number().optional(),
    alt: z.number().optional(),
    ast: z.number().optional(),
    ggt: z.number().optional(),
    alkaline_phosphatase: z.number().optional(),
    bilirubin_total: z.number().optional(),
    creatinine: z.number().optional(),
    bun: z.number().optional(),
    tsh: z.number().optional(),
    t3_free: z.number().optional(),
    t4_free: z.number().optional(),
    systolic_bp: z.number().optional(),
    diastolic_bp: z.number().optional(),
    hrv_sdnn: z.number().optional(),
    waist_circumference_cm: z.number().optional(),
    waist_hip_ratio: z.number().optional(),
    visceral_fat_index: z.number().optional(),
    bmi: z.number().optional(),
    body_fat_pct: z.number().optional(),
    vitamin_d_25oh: z.number().optional(),
    b12: z.number().optional(),
    ferritin: z.number().optional(),
    homocysteine: z.number().optional(),
    calprotectin_fecal: z.number().optional(),
    zonulin: z.number().optional(),
  })
  .partial();

const ClinicalContextSchema = z.object({
  age: z.number().int().min(0).max(120),
  sex: z.enum(["F", "M"]),
  duration_years_chronic: z.number().min(0).max(80).default(0),
  medications: z.array(z.string()).default([]),
  family_cmd_history: z.boolean().default(false),
});

const PredictiveAgencyInputSchema = z
  .object({
    imprint_strength: z.number().min(0).max(1).optional(),
    agency_score: z.number().min(0).max(1).optional(),
    allostatic_load_type: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal("indeterminate")])
      .optional(),
  })
  .optional();

const BodySchema = z.object({
  labs: LabInputSchema.default({}),
  context: ClinicalContextSchema,
  imprint_id: z
    .enum(["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10", "i11", "i12", "i13"])
    .optional(),
  predictive_input: PredictiveAgencyInputSchema,
  /** Si true, calcula ganancia hipotética intervinendo el apalancamiento primario */
  compute_hypothetical_gain: z.boolean().default(true),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }
  const { labs, context, imprint_id, predictive_input, compute_hypothetical_gain } = parsed.data;

  try {
    // 1. System State
    const systemState = computeSystemState(labs as LabInput, context as ClinicalContext);

    // 2. Flexibility Index
    const flexIndex = computeFlexibilityIndex(systemState, predictive_input as PredictiveAgencyInput | undefined);

    // 3. Leverage
    const leverage = findLeveragePoints(flexIndex, systemState, imprint_id as ImprintId | null ?? null);

    // 4. Free Energy estimate hypothetical
    let freeEnergyEstimate = null;
    if (compute_hypothetical_gain) {
      // Qué nodos tocaría el apalancamiento primario
      const primary = flexIndex.components[leverage.primary_target];
      const targetNodes = (primary.contributing_nodes as Array<
        keyof typeof systemState.nodes
      >) ?? [];
      if (targetNodes.length > 0) {
        const hypotheticalEffect = buildHypotheticalEffect(
          targetNodes as Array<keyof typeof systemState.nodes>,
          0.5, // 50% de reducción de rigidez en 12 semanas (optimista-realista)
          12,
        );
        freeEnergyEstimate = estimateFreeEnergy(systemState, hypotheticalEffect);
      }
    }

    return Response.json({
      ok: true,
      system_state: systemState,
      flexibility_index: flexIndex,
      leverage: leverage,
      hypothetical_gain: freeEnergyEstimate,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
