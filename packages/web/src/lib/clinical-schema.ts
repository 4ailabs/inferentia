import { z } from "zod";

/**
 * Intake schema — structured data the patient or clinician enters
 * before the interview starts. Every field is optional; missing fields
 * lower the confidence of downstream inference and are flagged in the
 * clinician view.
 */

export const LabsSchema = z.object({
  hba1c: z.number().min(0).max(20).optional(),
  homa_ir: z.number().min(0).max(30).optional(),
  fasting_glucose: z.number().min(0).max(600).optional(),
  triglycerides: z.number().min(0).max(2000).optional(),
  hdl: z.number().min(0).max(200).optional(),
  ldl: z.number().min(0).max(500).optional(),
  cortisol_morning: z.number().min(0).max(60).optional(),
  tsh: z.number().min(0).max(200).optional(),
  vitamin_d: z.number().min(0).max(200).optional(),
  crp: z.number().min(0).max(100).optional(),
  ferritin: z.number().min(0).max(2000).optional(),
  sdnn_hrv: z.number().min(0).max(300).optional(),
});

export type Labs = z.infer<typeof LabsSchema>;

// These flags are boolean answers to the 5 red-flag screening questions.
// If any is true, /api/analyze must refuse to infer imprints and return
// a referral recommendation instead.
export const RedFlagsSchema = z.object({
  suicidal_ideation_past_month: z.boolean().default(false),
  active_eating_disorder: z.boolean().default(false),
  recent_major_loss_under_6_weeks: z.boolean().default(false),
  unmanaged_medical_condition: z.boolean().default(false),
  substance_dependence: z.boolean().default(false),
});

export type RedFlags = z.infer<typeof RedFlagsSchema>;

export const ActiveDiagnosisSchema = z.enum([
  "diabetes_treated",
  "hypothyroidism",
  "autoimmune",
  "cardiovascular",
  "cancer_history",
  "depression_treated",
  "anxiety_treated",
  "other",
]);

export const ChronicMedicationSchema = z.enum([
  "corticosteroids",
  "antipsychotics",
  "beta_blockers",
  "ssri_snri",
  "metformin",
  "thyroid_hormone",
  "oral_contraceptive",
  "hrt",
  "other",
]);

export const IntakeSchema = z.object({
  patient_id: z.string(),
  age: z.number().int().min(12).max(110).optional(),
  sex: z.enum(["F", "M", "other"]).optional(),
  labs: LabsSchema.default({}),
  active_diagnoses: z.array(ActiveDiagnosisSchema).default([]),
  chronic_medications: z.array(ChronicMedicationSchema).default([]),
  red_flags: RedFlagsSchema,
  notes: z.string().max(1000).optional(),
});

export type Intake = z.infer<typeof IntakeSchema>;

/**
 * Clinical posterior schema — the canonical JSON returned by the
 * /api/analyze skill. Every downstream view (patient render, clinician
 * render, network activation) consumes this schema.
 */

export const PriorSchema = z.object({
  id: z.string(),
  label: z.string(),
  strength: z.number().min(0).max(1),
  evidence: z
    .array(
      z.object({
        quote: z.string(),
        reasoning: z.string(),
      }),
    )
    .min(1)
    .max(4),
});

export const ImprintPosteriorSchema = z.object({
  id: z.enum(["i1", "i4", "i7", "i8"]),
  name: z.string(),
  posterior: z.number().min(0).max(1),
  rationale: z.string(),
});

export const RecommendedTestSchema = z.object({
  marker: z.string(),
  reason: z.string(),
});

export const RecommendedSnpSchema = z.object({
  rsid: z.string(),
  gene: z.string(),
  reason: z.string(),
});

export const ModulatorSchema = z.object({
  name: z.string(),
  target: z.string(),
  mechanism: z.string(),
});

/**
 * Discordance — a single measured biomarker vs the range the dominant
 * imprint's signature would predict. Flagged when the patient value lies
 * outside the expected range; these drive the "⚠ discordancia" badges
 * in the clinician view.
 */
export const DiscordanceSchema = z.object({
  marker: z.string(),
  measured: z.number(),
  expected_low: z.number(),
  expected_high: z.number(),
  direction: z.enum(["above_expected", "below_expected", "concordant"]),
  clinical_note: z.string(),
});

export type Discordance = z.infer<typeof DiscordanceSchema>;

/**
 * When red flags fire or labs contradict safe imprint inference, the
 * analyzer refuses to produce a full posterior and returns a referral
 * recommendation instead.
 */
export const ReferralSchema = z.object({
  kind: z.enum(["referral"]),
  reason_en: z.string(),
  reason_es: z.string(),
  suggested_next_steps_en: z.array(z.string()).min(1).max(5),
  suggested_next_steps_es: z.array(z.string()).min(1).max(5),
  triggered_flags: z.array(z.string()).min(1),
});

export type Referral = z.infer<typeof ReferralSchema>;

export const ClinicalPosteriorSchema = z.object({
  kind: z.enum(["posterior"]).default("posterior"),
  patient_id: z.string(),
  summary_en: z.string(),
  summary_es: z.string(),
  active_priors: z.array(PriorSchema).min(2).max(6),
  imprint_posterior: z
    .array(ImprintPosteriorSchema)
    .length(4)
    .refine(
      (arr) => {
        const sum = arr.reduce((s, x) => s + x.posterior, 0);
        return Math.abs(sum - 1.0) <= 0.06;
      },
      {
        message: "imprint_posterior values must sum to 1.0 ± 0.06",
      },
    ),
  dominant_imprint: z.enum(["i1", "i4", "i7", "i8"]),
  confidence: z.number().min(0).max(1),
  /**
   * Boolean: lab panel was meaningfully informative (at least 3 labs
   * present). When false the confidence is bounded and clinician view
   * shows a "labs missing" caveat.
   */
  had_objective_data: z.boolean(),
  recommended_labs: z.array(RecommendedTestSchema).max(6),
  recommended_snps: z.array(RecommendedSnpSchema).max(5),
  modulators: z.array(ModulatorSchema).max(5),
  discordances: z.array(DiscordanceSchema).max(8).default([]),
  soft_flags: z.array(z.string()).max(6).default([]),
  free_energy_delta_estimate: z
    .number()
    .min(0)
    .max(1)
    .describe("Estimated reduction in free energy, 0..1"),
});

export type ClinicalPosterior = z.infer<typeof ClinicalPosteriorSchema>;

/**
 * Either a full clinical posterior, or a referral when red flags fire
 * or the data prohibits safe inference.
 */
export const AnalyzeResultSchema = z.discriminatedUnion("kind", [
  ClinicalPosteriorSchema,
  ReferralSchema,
]);
export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;

/**
 * Utility: compute how informative the intake is. Used by the analyzer
 * to set `had_objective_data` and bound confidence accordingly.
 */
export function countLabs(labs: Labs | undefined): number {
  if (!labs) return 0;
  return Object.values(labs).filter((v) => typeof v === "number").length;
}

/**
 * Dual render schema — what Opus 4.7 produces from the posterior.
 * Two rewrites: one for the patient (accessible, second-person),
 * one for the clinician (technical, third-person).
 */

export const PatientViewSchema = z.object({
  headline: z.string().describe("One-sentence narrative of the system state"),
  body_paragraphs: z.array(z.string()).min(2).max(4),
  invitation: z
    .string()
    .describe("A one-line invitation to explore further with the clinician"),
  modulators_summary: z
    .array(
      z.object({
        name: z.string(),
        plain_benefit: z.string(),
      }),
    )
    .max(5),
});

export const ClinicianViewSchema = z.object({
  clinical_summary: z.string(),
  active_priors_technical: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      strength: z.number(),
      clinical_meaning: z.string(),
    }),
  ),
  differential: z
    .string()
    .describe("Differential considerations for the clinician"),
  lab_panel: z.array(
    z.object({
      marker: z.string(),
      rationale: z.string(),
    }),
  ),
  genetic_panel: z.array(
    z.object({
      rsid: z.string(),
      gene: z.string(),
      clinical_action: z.string(),
    }),
  ),
  protocol: z.array(
    z.object({
      molecule: z.string(),
      target_node: z.string(),
      dosage_comment: z.string(),
    }),
  ),
  flags: z
    .array(z.string())
    .describe("Safety flags / things to double-check"),
});

export const DualRenderSchema = z.object({
  patient: PatientViewSchema,
  clinician: ClinicianViewSchema,
});

export type PatientView = z.infer<typeof PatientViewSchema>;
export type ClinicianView = z.infer<typeof ClinicianViewSchema>;
export type DualRender = z.infer<typeof DualRenderSchema>;
