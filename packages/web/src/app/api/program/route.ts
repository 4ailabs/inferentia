import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/thesis";
import {
  NutritionalProgramSchema,
  type ClinicalPosterior,
} from "@/lib/clinical-schema";
import { extractJsonObject } from "@/lib/extract-json";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * /api/program — Sonnet 4.6 takes the ClinicalPosterior and produces a
 * Nutritional Program grounded in the dominant imprint. The four imprint
 * signatures (i1, i4, i7, i8) are baked into the system prompt so every
 * call stays within the canonical BV4 vocabulary instead of inventing.
 *
 * Output 4 of the MVP: "Programa Nutricional Salutogénico".
 * The clinician view is editable/signable. The patient view shows the
 * signed final version. Signature state is held client-side in
 * sessionStorage for the hackathon — fase 2 becomes a real audit log.
 */

const PROGRAM_SYSTEM = `You are Inferentia's nutritional program composer. You receive a ClinicalPosterior (dominant imprint, active priors, discordances, soft flags, recommended modulators) and return a NutritionalProgram object aligned to the dominant imprint's metabolic signature.

Inferentia is a CLINICIAN-FACING tool. This program is a draft the clinician will read, edit, and sign. The patient sees the signed version.

## Output shape — return ONLY this JSON object

{
  "patient_id": "string",
  "imprint_id": "i1|i4|i7|i8",
  "imprint_name": "Desacople|Fijación Externa|Hibernación|Reserva",
  "headline": "one-sentence patient-register headline of the program",
  "foods_emphasise": [
    {"name": "string", "why": "one sentence clinical reason", "when": "optional timing"}
  ],
  "foods_reduce": [
    {"name": "string", "why": "one sentence reason"}
  ],
  "rhythms": [
    {"title": "short title", "instruction": "one-sentence actionable instruction in patient register"}
  ],
  "flexibility_experiments": [
    {"title": "string", "prompt": "gentle experiment that exposes a predictive rigidity", "duration_days": 7}
  ],
  "molecular_rationale": [
    {"target_node": "HPA axis rigidity", "molecules": ["Ashwagandha", "Mg-glycinate"], "mechanism": "short clinician-register mechanism"}
  ],
  "clinician_notes": "1–3 sentence note for the clinician",
  "cautions": ["interaction or contraindication to double-check"],
  "signed_by": null,
  "signed_at": null
}

## Imprint-anchored rules (DO NOT invent outside these signatures)

### i1 — Desacople
- Metabolic signature: high morning cortisol, peripheral coldness, hypervigilance, fragmented HRV, mild insulin resistance.
- Emphasise: complex carbs in breakfast (oats, whole grain), magnesium-rich greens, slow-digesting protein, warm cooked foods.
- Reduce: caffeine after noon, alcohol, raw cold diets.
- Rhythms: breakfast within 60 min of waking, warm evening meal, no screen during dinner.
- Flexibility experiments: eat with one sensory anchor (slow chewing, naming flavours) to re-couple interoception.
- Molecules: Ashwagandha, Mg-glycinate, L-theanine, omega-3 EPA/DHA.
- Target nodes: HPA axis rigidity, interoceptive signal, peripheral vasoconstriction.

### i4 — Fijación Externa
- Metabolic signature: externalised anger, rumination, hepatobiliary load, elevated TG, sympathetic tone.
- Emphasise: cruciferous vegetables, bitter greens, liver-supportive foods (beetroot, artichoke), omega-3 rich fish.
- Reduce: alcohol, fried foods, excess red meat, stimulants that amplify sympathetic tone.
- Rhythms: longer eating window, structured mealtimes to reduce rumination-driven snacking.
- Flexibility experiments: "eat without blaming food" — a 5-day practice of neutral descriptive journaling.
- Molecules: NAC, Curcumin, Mg-glycinate, Rhodiola (careful with comorbid anxiety).
- Target nodes: hepatobiliary detox, sympathetic reactivity, rumination loop.

### i7 — Hibernación
- Metabolic signature: dorsal-vagal collapse, low morning cortisol, hypersomnia, low-normal thyroid, energy conservation.
- Emphasise: protein-forward breakfast, iodine-containing foods (seaweed, fish), B12, warming spices, frequent small meals.
- Reduce: very low-calorie patterns, long fasting windows, cold raw diets.
- Rhythms: anchor breakfast within 45 min of waking, gentle movement before meals, bright morning light exposure.
- Flexibility experiments: "one new texture per week" to re-engage predictive curiosity.
- Molecules: Rhodiola, PQQ, CoQ10, omega-3 EPA/DHA, tyrosine (clinician discretion).
- Target nodes: dorsal-vagal tone, mitochondrial output, thyroid-mediated energy.

### i8 — Reserva
- Metabolic signature: scarcity anticipation, nocturnal hyperphagia, inability to rest, PANIC-GRIEF circuit active, mild insulin resistance, HOMA-IR elevated, HbA1c upper-normal.
- Emphasise: satiating protein + fibre at every meal, slow-release carbohydrates (legumes, whole grains), evening tryptophan-rich foods (turkey, oats), anti-inflammatory fats.
- Reduce: late-night refined carbs, sugary drinks, skipping breakfast (reinforces scarcity prior).
- Rhythms: regular 3-meal structure, stop eating 3h before bed, hand-on-belly meal opener to slow pacing.
- Flexibility experiments: "eat without rehearsing tomorrow" — a week of meals without planning the next day.
- Molecules: Myo-inositol, Berberine, Mg-glycinate, Ashwagandha, omega-3 EPA/DHA.
- Target nodes: insulin sensitivity, PANIC-GRIEF circuit, nocturnal cortisol.

## Rules for composing the program

1. Anchor EVERYTHING in the dominant imprint's signature. Mix in 1-2 modifiers from active priors only if they are clearly present.
2. Respect the ClinicalPosterior's modulators list — reuse molecules the analyzer already flagged before adding new ones.
3. If a chronic_medication appears in the posterior's soft_flags, add a caution (e.g., SSRI + 5-HTP, thyroid hormone + iodine load).
4. If safety_priority is "elevated" or "critical", prefix clinician_notes with a warning: "Safety priority <level> flagged by analyzer. Program is draft-only; clinician must weigh before dispensing."
5. Language: respect the locale instruction the user sends. Default English.
6. Tone: patient-register fields (headline, rhythm instructions, experiment prompts) are warm, second-person, no jargon. Clinician-register fields (molecular_rationale.mechanism, clinician_notes, cautions) are precise and technical.
7. Use active verbs. Avoid "should", "must". Prefer "your body responds to…", "try…", "notice…".

## OUTPUT CONTRACT — EXTREMELY IMPORTANT

Return the JSON object and nothing else. The very first character must be "{" and the very last "}". No markdown code fences. No preamble such as "Here is the JSON:". No trailing commentary. signed_by and signed_at MUST be null in your output — the clinician signs client-side.`;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    posterior: ClinicalPosterior;
    locale?: "en" | "es";
  };

  const locale = body.locale ?? "en";
  const languageInstruction =
    locale === "es"
      ? "\n\nReturn ALL text fields in SPANISH. Spanish tone, Spanish register."
      : "\n\nReturn ALL text fields in ENGLISH.";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userPrompt = `Clinical posterior:

${JSON.stringify(body.posterior, null, 2)}

Produce the NutritionalProgram JSON now.${languageInstruction}`;

  try {
    const response = await client.messages.create({
      model: MODELS.SUBAGENT,
      max_tokens: 4000,
      temperature: 0.4,
      system: [
        {
          type: "text",
          text: PROGRAM_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const cleaned = extractJsonObject(responseText);
    if (!cleaned) {
      return Response.json(
        { error: "JSON extraction failed", raw: responseText.slice(0, 1200) },
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
        },
        { status: 502 },
      );
    }

    const validated = NutritionalProgramSchema.safeParse(parsed);
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
      program: validated.data,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
