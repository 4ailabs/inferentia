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
 * Safety priority — a graded signal to the clinician, not a refusal.
 *
 * The system ALWAYS produces a posterior (Inferentia is a clinician-
 * facing tool, not direct-to-consumer). safety_priority communicates
 * context the clinician should weigh before intervening nutritionally
 * or with molecules:
 *
 * - "none": no safety concern detected.
 * - "elevated": caveat-level — condition modulates the signature or
 *   warrants confirmation before acting (e.g., TSH > 10, untreated
 *   severe hypothyroid; substance dependence without treatment;
 *   recent major loss <6 weeks). The posterior is still useful; act
 *   carefully.
 * - "critical": active suicidal ideation with plan/intent, active
 *   psychosis impairing the validity of the interview, or a medical
 *   instability disclosed mid-interview. Intervention in the imprint
 *   layer should be deferred until safety is addressed. The posterior
 *   is still returned — the clinician sees it and decides.
 */
export const SafetyPrioritySchema = z.enum(["none", "elevated", "critical"]);
export type SafetyPriority = z.infer<typeof SafetyPrioritySchema>;

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
  /** Safety signal to the clinician — graded, not blocking. */
  safety_priority: SafetyPrioritySchema.default("none"),
  /** Short explanation shown when safety_priority is elevated/critical. */
  safety_rationale: z.string().optional(),
});

export type ClinicalPosterior = z.infer<typeof ClinicalPosteriorSchema>;

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

/**
 * Nutritional Program — Output 4 del MVP.
 * El clínico ve borrador editable + racional molecular; el paciente ve
 * la versión firmada con alimentos, ritmos y experimentos de flexibilidad.
 * "Salutogénico" = orientado a expandir el cono cognitivo, no a prohibir.
 */

const FoodEmphasiseSchema = z.object({
  name: z.string(),
  why: z.string().describe("One sentence — why this food for this imprint"),
  when: z
    .string()
    .optional()
    .describe("Optional timing guidance (breakfast, post-training, evening)"),
});

const FoodReduceSchema = z.object({
  name: z.string(),
  why: z.string(),
});

const RhythmSchema = z.object({
  title: z.string().describe("e.g., 'Eating window 10h'"),
  instruction: z
    .string()
    .describe("One-sentence actionable instruction in the patient register"),
});

const FlexibilityExperimentSchema = z.object({
  title: z.string(),
  prompt: z
    .string()
    .describe(
      "A gentle experiment the patient tries to expose a predictive rigidity (e.g., eat without screen for 3 days, savoury vs sweet breakfast)",
    ),
  duration_days: z.number().int().min(1).max(28).default(7),
});

const MolecularRationaleSchema = z.object({
  target_node: z
    .string()
    .describe("Node in the factor graph this rationale addresses"),
  molecules: z.array(z.string()).min(1).max(4),
  mechanism: z.string().describe("Short mechanism — clinician register"),
});

export const NutritionalProgramSchema = z.object({
  patient_id: z.string(),
  imprint_id: z.enum(["i1", "i4", "i7", "i8"]),
  imprint_name: z.string(),
  headline: z
    .string()
    .describe("One-sentence patient-register headline for the program"),
  foods_emphasise: z.array(FoodEmphasiseSchema).min(3).max(8),
  foods_reduce: z.array(FoodReduceSchema).min(1).max(6),
  rhythms: z.array(RhythmSchema).min(2).max(5),
  flexibility_experiments: z.array(FlexibilityExperimentSchema).min(1).max(4),
  molecular_rationale: z.array(MolecularRationaleSchema).min(2).max(5),
  clinician_notes: z
    .string()
    .describe("Short editable note for the clinician, 1–3 sentences"),
  cautions: z
    .array(z.string())
    .max(5)
    .default([])
    .describe("Interactions, contraindications, things to double-check"),
  /**
   * Signature state — hackathon MVP keeps this client-side in
   * sessionStorage. In fase 2 this becomes a real audit log.
   */
  signed_by: z.string().nullable().default(null),
  signed_at: z.string().nullable().default(null),
});

export type NutritionalProgram = z.infer<typeof NutritionalProgramSchema>;

/**
 * Agency Panel — Output 5 del MVP. Outcome primario del sistema.
 *
 * Ocho ítems Likert 1–5 distribuidos en tres dimensiones:
 *  - mastery (4): versión breve de Pearlin Mastery Scale (dominio público).
 *  - interoception (2): ítems propios (MAIA está bajo licencia — no se copia).
 *  - perceived_options (2): ítems propios sobre cono cognitivo.
 *
 * Pre = estimación del sistema al cierre de la entrevista.
 * Post = proyección del sistema asumiendo el programa firmado adoptado
 *        durante ~8 semanas. En fase 2 este será medición real longitudinal.
 *
 * Cada ítem lleva justificación (por qué el sistema estima ese valor)
 * para auditabilidad clínica.
 */

export const AgencyDimensionSchema = z.enum([
  "mastery",
  "interoception",
  "perceived_options",
]);
export type AgencyDimension = z.infer<typeof AgencyDimensionSchema>;

export const AgencyItemSchema = z.object({
  id: z.string(),
  dimension: AgencyDimensionSchema,
  prompt: z.string().describe("Short item wording, patient register"),
  pre: z.number().min(1).max(5),
  post: z.number().min(1).max(5),
  rationale_pre: z
    .string()
    .describe("One sentence — why the system estimates this pre value"),
  rationale_post: z
    .string()
    .describe("One sentence — why the system projects this post value"),
});

export const AgencyPanelSchema = z.object({
  patient_id: z.string(),
  imprint_id: z.enum(["i1", "i4", "i7", "i8"]),
  items: z.array(AgencyItemSchema).length(8),
  summary_en: z
    .string()
    .describe("One-sentence neutral summary of the pre/post shift in English"),
  summary_es: z
    .string()
    .describe("One-sentence neutral summary of the pre/post shift in Spanish"),
  /**
   * Delta per dimension (post - pre averaged over items in each dimension).
   * Computed client-side, not LLM-generated, to avoid arithmetic drift.
   * Kept in schema for persistence convenience.
   */
  horizon_weeks: z
    .number()
    .int()
    .min(2)
    .max(24)
    .default(8)
    .describe("Projection horizon the post column assumes"),
});

export type AgencyItem = z.infer<typeof AgencyItemSchema>;
export type AgencyPanel = z.infer<typeof AgencyPanelSchema>;
