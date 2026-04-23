import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/thesis";
import {
  AgencyPanelSchema,
  type ClinicalPosterior,
  type NutritionalProgram,
} from "@/lib/clinical-schema";
import { extractJsonObject } from "@/lib/extract-json";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * /api/agency — Sonnet 4.6 composes the Pre/Post Agency Panel.
 *
 * Output 5 of the MVP. This is the system's OUTCOME PRIMARY: a short,
 * clinician-readable panel showing where the patient is now (pre) and
 * where the system projects they could be at `horizon_weeks` if the
 * signed nutritional program is adopted. Fase 2 replaces the projection
 * with real longitudinal measurement.
 *
 * Items are drawn from three dimensions:
 *  - mastery (4): brief Pearlin Mastery (public domain)
 *  - interoception (2): original items (MAIA is licensed — not copied)
 *  - perceived_options (2): original items on cognitive cone width
 */

const AGENCY_SYSTEM = `You are Inferentia's agency-panel composer. You receive:
  1. A ClinicalPosterior (dominant imprint, priors, safety signal).
  2. An optional NutritionalProgram (if signed, this is the intervention whose 8-week effect you project in the post column).

You produce a 8-item Pre/Post panel on a 1–5 Likert scale. The pre column estimates the patient's current state based on the posterior. The post column projects where the patient could be after roughly 8 weeks of consistently adopting the signed program. The projection must be modest and clinically plausible — not marketing.

## Output shape — return ONLY this JSON object

{
  "patient_id": "string",
  "imprint_id": "i1|i4|i7|i8",
  "items": [
    {
      "id": "m1",
      "dimension": "mastery|interoception|perceived_options",
      "prompt": "short patient-register item",
      "pre": 1-5,
      "post": 1-5,
      "rationale_pre": "one-sentence reason",
      "rationale_post": "one-sentence reason"
    }
    // exactly 8 items
  ],
  "summary_en": "one-sentence neutral English summary of pre → post shift",
  "summary_es": "one-sentence neutral Spanish summary of pre → post shift",
  "horizon_weeks": 8
}

## Canonical items (use these IDs and prompts — do not invent)

Mastery (brief Pearlin Mastery, public domain) — 4 items, dimension "mastery":
  - m1 "I can do just about anything I really set my mind to."
  - m2 "I have little control over the things that happen to me." (reverse-scored — higher pre = MORE agreement with the reverse statement, meaning LESS mastery; when you report pre/post, report the non-reversed anchor so higher is always better)
  - m3 "What happens to me in the future mostly depends on me."
  - m4 "There is little I can do to change many of the important things in my life." (reverse-scored, same rule)

For m2 and m4: after reversing, express the prompt as the positive anchor when writing to "prompt" (e.g., m2 → "I feel I have meaningful control over what happens to me."). Higher score = more agency. Always.

Interoception (original items, not MAIA) — 2 items, dimension "interoception":
  - io1 "I notice hunger and fullness signals before they become urgent."
  - io2 "When I am stressed I can feel where the tension shows up in my body."

Perceived options (original items, cognitive cone) — 2 items, dimension "perceived_options":
  - po1 "When a situation goes wrong, I can picture more than one way to respond."
  - po2 "I can rest without feeling I should be doing something else."

## Pre estimation rules (by dominant imprint)

These are starting anchors; adjust 0–1 point up or down based on specific evidence in the posterior's active_priors.

- i1 Desacople: mastery 2.5, interoception 1.5–2, perceived_options 2.5. Hypervigilance preserves mastery illusion but degrades interoception and options.
- i4 Fijación Externa: mastery 2, interoception 3, perceived_options 2. External-blame loop lowers mastery and options; interoception paradoxically preserved.
- i7 Hibernación: mastery 2, interoception 2.5, perceived_options 2. Dorsal-vagal state dampens all three without a single dominant drop.
- i8 Reserva: mastery 2.5–3, interoception 2, perceived_options 1.5–2. Scarcity prior lets the patient act but collapses perceived options; interoception suppressed by nocturnal hyperphagia loop.

If safety_priority is "critical", cap ALL pre values at 2.

## Post projection rules

- The post column assumes roughly 8 weeks of adopting the signed program.
- Expect a modest shift: post - pre between 0.5 and 1.5 per item on average.
- NEVER project a post value of 5 unless pre was already 4+.
- NEVER project post below pre (the projection is optimistic but truthful; if no mechanism to improve, keep equal).
- Interoception items shift LAST and SMALLEST (rebuilding body trust is slow).
- Perceived_options shift FIRST and LARGEST when nutritional program is adopted (flexibility experiments expand the cone).
- If no signed program is present, bound post-pre at 0.5 max (intention alone is weak).

## Summary rules

- One sentence. Neutral. No hype, no promises, no numbers.
- Spanish summary: natural Spanish, not a direct translation.
- Example ES: "El sistema proyecta mayor apertura en opciones percibidas y una recuperación gradual de la señal interoceptiva."
- Example EN: "The system projects wider perceived options and a gradual recovery of interoceptive signal."

## OUTPUT CONTRACT — EXTREMELY IMPORTANT

Return the JSON object and nothing else. First character "{", last "}". No markdown fences, no preamble. Exactly 8 items. horizon_weeks is 8 unless the user instruction overrides.`;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    posterior: ClinicalPosterior;
    program?: NutritionalProgram | null;
    locale?: "en" | "es";
  };

  const locale = body.locale ?? "en";
  const languageInstruction =
    locale === "es"
      ? "\n\nWrite 'prompt' and 'rationale' fields in SPANISH. summary_es is Spanish, summary_en is English always."
      : "\n\nWrite 'prompt' and 'rationale' fields in ENGLISH. summary_en is English, summary_es is Spanish always.";

  const programBlock = body.program
    ? `\n\nSIGNED PROGRAM (intervention to project):\n${JSON.stringify(body.program, null, 2)}`
    : "\n\nNO SIGNED PROGRAM — projection must be bounded (post - pre ≤ 0.5 per item).";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userPrompt = `Clinical posterior:

${JSON.stringify(body.posterior, null, 2)}${programBlock}

Produce the AgencyPanel JSON now.${languageInstruction}`;

  try {
    const response = await client.messages.create({
      model: MODELS.SUBAGENT,
      max_tokens: 3000,
      temperature: 0.3,
      system: [
        {
          type: "text",
          text: AGENCY_SYSTEM,
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

    const validated = AgencyPanelSchema.safeParse(parsed);
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
      panel: validated.data,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
