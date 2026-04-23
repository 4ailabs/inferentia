import { z } from "zod";

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

export const ClinicalPosteriorSchema = z.object({
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
        message:
          "imprint_posterior values must sum to 1.0 ± 0.06",
      },
    ),
  dominant_imprint: z.enum(["i1", "i4", "i7", "i8"]),
  confidence: z.number().min(0).max(1),
  recommended_labs: z.array(RecommendedTestSchema).max(6),
  recommended_snps: z.array(RecommendedSnpSchema).max(5),
  modulators: z.array(ModulatorSchema).max(5),
  free_energy_delta_estimate: z
    .number()
    .min(0)
    .max(1)
    .describe("Estimated reduction in free energy, 0..1"),
});

export type ClinicalPosterior = z.infer<typeof ClinicalPosteriorSchema>;

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
