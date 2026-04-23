import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/thesis";
import {
  ClinicalPosteriorSchema,
  IntakeSchema,
  countLabs,
  type Intake,
} from "@/lib/clinical-schema";
import { extractJsonObject } from "@/lib/extract-json";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * /api/analyze — Sonnet 4.6 reads the interview transcript AND the
 * structured intake (labs, diagnoses, medications, red flags), then
 * returns either:
 *   - a ClinicalPosterior with active priors, imprint posterior,
 *     recommended labs, SNPs, modulators, and lab-vs-prediction
 *     discordances, OR
 *   - a Referral if red flags fire or the objective picture forbids
 *     safe imprint inference (e.g., untreated severe hypothyroidism).
 *
 * The response is validated against AnalyzeResultSchema.
 */

const ANALYST_SYSTEM = `You are Inferentia's clinical analyst. You receive:
 1. A short clinical interview transcript.
 2. An intake: demographics, labs (optional), active diagnoses, chronic medications, red-flag answers.

Inferentia is a CLINICIAN-FACING tool, not direct-to-consumer. The clinician is in the loop and makes all intervention decisions. Your job is to produce the richest useful reading of the patient's system — never to refuse. Safety concerns are communicated as a graded signal (safety_priority), not as a refusal.

## Output shape

Return a single JSON object. No prose. No markdown fences. First character "{", last "}". Shape:

{
  "kind": "posterior",
  "patient_id": "string",
  "summary_en": "one-sentence neutral summary in English",
  "summary_es": "one-sentence neutral summary in Spanish",
  "active_priors": [
    {
      "id": "short_snake_case_slug",
      "label": "human-readable label",
      "strength": 0.0 to 1.0,
      "evidence": [
        {"quote": "verbatim patient quote", "reasoning": "1 sentence why this supports the prior"}
      ]
    }
  ],
  "imprint_posterior": [
    {"id": "i1", "name": "Desacople", "posterior": 0.0 to 1.0, "rationale": "one sentence"},
    {"id": "i4", "name": "Fijación Externa", "posterior": 0.0 to 1.0, "rationale": "one sentence"},
    {"id": "i7", "name": "Hibernación", "posterior": 0.0 to 1.0, "rationale": "one sentence"},
    {"id": "i8", "name": "Reserva", "posterior": 0.0 to 1.0, "rationale": "one sentence"}
  ],
  "dominant_imprint": "i1|i4|i7|i8",
  "confidence": 0.0 to 1.0,
  "had_objective_data": true|false,
  "recommended_labs": [{"marker": "HbA1c", "reason": "short clinical reason"}],
  "recommended_snps": [{"rsid": "rs9939609", "gene": "FTO", "reason": "short reason"}],
  "modulators": [{"name": "Ashwagandha", "target": "HPA axis rigidity", "mechanism": "cortisol rhythm restoration"}],
  "discordances": [
    {"marker": "HbA1c", "measured": 6.1, "expected_low": 5.6, "expected_high": 6.5, "direction": "concordant", "clinical_note": "sits within expected i8 range"}
  ],
  "soft_flags": ["short clinical caveat the clinician should be aware of"],
  "free_energy_delta_estimate": 0.0 to 1.0,
  "safety_priority": "none" | "elevated" | "critical",
  "safety_rationale": "short explanation, only when elevated or critical"
}

## Safety grading — ALWAYS infer posterior; grade the safety context

You must ALWAYS produce a posterior. Never refuse. The safety_priority field tells the clinician how to weigh the reading.

Use "critical" only when the transcript or intake discloses:
- Active suicidal ideation with plan or explicit intent (NOT historical mentions, NOT past episodes now resolved, NOT ACE disclosures like "my father died when I was 7").
- Active psychosis impairing reality testing during the interview (disorganised speech, explicit reference to hallucinations that the patient treats as real and threatening).
- Medical instability disclosed mid-interview (fainting during the call, chest pain right now, seizure, etc.).

Use "elevated" when:
- intake.red_flags.recent_major_loss_under_6_weeks === true (recent grief modulates the signature; clinician should weigh).
- intake.red_flags.active_eating_disorder === true (ED work takes precedence but imprint reading is still informative).
- intake.red_flags.substance_dependence === true.
- intake.red_flags.unmanaged_medical_condition === true.
- labs.tsh > 10 (severe untreated hypothyroidism — the metabolic signature is dominated by thyroid state).
- The patient's narrative mentions a condition that substantially confounds inference.

Use "none" in every other case, including:
- Historical biographical events (childhood loss, past trauma, ACE disclosures). These are EVIDENCE for the posterior, not safety triggers.
- Treated diagnoses (diabetes on metformin, hypothyroid on T4, depression on SSRI stable). These become soft_flags, not safety_priority.
- intake.red_flags.suicidal_ideation_past_month === true by itself without active plan/intent in the transcript — this becomes an "elevated" caveat: the clinician should re-assess, but imprint inference is still clinically useful.

safety_rationale is REQUIRED when safety_priority is "elevated" or "critical", and MUST be omitted when "none".

## Soft flags are for context, not safety

Use soft_flags to help the clinician interpret the posterior:
- "Lab panel missing — confidence bounded" when had_objective_data is false.
- "Diabetes on pharmacotherapy — metabolic signature modulated by treatment" when metformin or equivalent is in chronic_medications.
- "SSRI on board — serotonergic tone confounds cortisol and interoceptive readings" when ssri_snri is in chronic_medications.
- "Posterior weakly separated (top-vs-second gap < 0.2) — consider a follow-up interview" if applicable.
- "Very short transcript — inference provisional".

## had_objective_data

- Set to true when at least 3 labs are present in the intake.
- When false, bound confidence at 0.65 and emit the lab-missing soft_flag.

## BV4 candidate patterns

- i1 Desacople — dissociation, sudden-impact prior, hypervigilance, peripheral coldness.
- i4 Fijación Externa — externalised anger, rumination on agent, hepatobiliary tags.
- i7 Hibernación — energy conservation, dorsal-vagal collapse, hypersomnia, low-normal labs.
- i8 Reserva — scarcity anticipation, PANIC-GRIEF circuit, nocturnal hyperphagia, inability to rest.

The four imprint_posterior values MUST sum to 1.00 ± 0.05.

## active_priors

Extract 3-6 active priors. Each with at least one verbatim patient quote as evidence. Strength is your confidence 0-1. Labels are short human phrases in the language of the interview.

## Labs reasoning

- Set had_objective_data=true if at least 3 labs are present in the intake, else false.
- If had_objective_data=false, bound confidence ≤ 0.65 and add soft_flag "lab panel missing — confidence bounded".
- If labs are present, compute discordance for each available marker: given the dominant imprint's signature, does the measured value fall within the expected range? Use these rough expected ranges for each imprint (the bands are intentionally wide):
  - i1: cortisol_morning 16–25 μg/dL, SDNN 18–38 ms, HbA1c 5.3–6.3, HDL 38–48.
  - i4: cortisol_morning 15–24, SDNN 22–42, HbA1c 5.3–6.0, TG 150–220.
  - i7: cortisol_morning 6–12, SDNN 28–60, HbA1c 4.8–5.6, TSH 2.5–6.0.
  - i8: cortisol_morning 17–25, SDNN 25–40, HbA1c 5.6–6.5, HOMA-IR 2.2–3.8, HDL 36–46, TG 130–200.
- Mark "above_expected" / "below_expected" / "concordant" for each marker. Emit a short clinical_note.
- If a lab value is far outside the expected band for ALL four imprints (e.g., TSH 12), emit a soft_flag pointing to the confound rather than absorbing it.

## Modulators

Choose 3-5 molecular interventions grounded in the dominant imprint's mechanism. Prefer: Ashwagandha, Mg-glycinate, myo-inositol, berberine, omega-3 EPA/DHA, curcumin, L-theanine, NAC, rhodiola. Respect any chronic_medications listed (e.g., if on SSRIs, flag caution with 5-HTP).

## SNPs

Recommend 3-5 nutrigenomic SNPs based on dominant imprint:
- i1 → FKBP5 rs1360780, COMT rs4680 Met/Met, BDNF rs6265.
- i4 → MAOA-uVNTR, COMT rs4680 Val/Val, DRD4 rs1800955.
- i7 → PPARGC1A rs8192678, DIO2 rs225014, FKBP5.
- i8 → FTO rs9939609, MC4R rs17782313, LEPR rs1137101, OXTR rs53576.

## Soft flags

Use soft_flags to warn the clinician about: lab panel missing, medication that may confound signature, comorbid diagnosis that may confound signature, posterior not strongly separated (top-vs-second gap < 0.2), interview that was very short.

Remember: return ONLY the JSON object. The first character must be "{" and the last "}". No markdown fences, no preamble.`;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    transcript: Array<{ role: "user" | "assistant"; content: string }>;
    intake?: Partial<Intake>;
    patient_id?: string;
  };

  // Validate intake on entry so we catch obviously malformed data early.
  let intake: Intake | null = null;
  if (body.intake) {
    const intakeResult = IntakeSchema.safeParse({
      patient_id: body.patient_id ?? body.intake.patient_id ?? "unknown",
      ...body.intake,
      red_flags: body.intake.red_flags ?? {
        suicidal_ideation_past_month: false,
        active_eating_disorder: false,
        recent_major_loss_under_6_weeks: false,
        unmanaged_medical_condition: false,
        substance_dependence: false,
      },
    });
    if (intakeResult.success) intake = intakeResult.data;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const transcriptText = body.transcript
    .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
    .join("\n\n");

  const intakeBlock = intake
    ? `INTAKE (structured):\n${JSON.stringify(intake, null, 2)}\n\nLabs count: ${countLabs(intake.labs)}`
    : "INTAKE: none provided";

  const userPrompt = `patient_id: ${body.patient_id ?? intake?.patient_id ?? "unknown"}

${intakeBlock}

TRANSCRIPT:
${transcriptText}

Return the JSON object now.`;

  try {
    const response = await client.messages.create({
      model: MODELS.SUBAGENT,
      max_tokens: 6000,
      temperature: 0.4,
      // Sonnet 4.6 accepts assistant prefill but we keep this route in lock-step
      // with /api/render (Opus 4.7 rejects it). The robust extractJsonObject()
      // walker handles any preamble or fencing.
      system: [
        {
          type: "text",
          text: ANALYST_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const raw = responseText;

    const cleaned = extractJsonObject(raw);
    if (!cleaned) {
      return Response.json(
        {
          error: "JSON extraction failed",
          raw: raw.slice(0, 1200),
        },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      return Response.json(
        {
          error: "JSON parse failed",
          detail: err instanceof Error ? err.message : String(err),
          raw: cleaned.slice(0, 1500),
          stop_reason: response.stop_reason,
        },
        { status: 502 },
      );
    }

    const validated = ClinicalPosteriorSchema.safeParse(parsed);
    if (!validated.success) {
      return Response.json(
        {
          error: "Schema validation failed",
          issues: validated.error.issues.slice(0, 10),
          raw: parsed,
        },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cached: response.usage.cache_read_input_tokens,
      },
      posterior: validated.data,
    });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
