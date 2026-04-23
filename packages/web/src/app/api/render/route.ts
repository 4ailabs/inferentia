import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/thesis";
import { DualRenderSchema, type ClinicalPosterior } from "@/lib/clinical-schema";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * /api/render — Opus 4.7 transforms the clinical posterior into TWO
 * parallel renders: one for the patient, one for the clinician.
 *
 * This is the most creative use of Opus in the app: the same JSON is
 * reframed in two registers with radically different language and depth.
 * No duplicated reasoning — a single prompt returns both views.
 */

const RENDERER_SYSTEM = `You are Inferentia's dual renderer. You receive a clinical posterior (active priors, imprint probabilities, lab/SNP recommendations, molecular modulators) and produce TWO parallel rewrites of it:

1. patient view — warm, second-person, zero jargon, zero labels, zero technical terms. Uses the patient's own language patterns where helpful. Validates the body's intelligence. Never names the imprint. Never diagnoses. Never prescribes directly — invites a conversation with the clinician.

2. clinician view — precise, third-person, technical but not pedantic. Uses imprint terminology (i1, i4, i7, i8), clinical biomarkers, and molecular mechanisms freely. Includes differential considerations and safety flags.

Return ONLY valid JSON. No markdown, no preamble. Shape:

{
  "patient": {
    "headline": "one-sentence warm narrative of what the system is doing",
    "body_paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
    "invitation": "one line inviting a conversation with the clinician",
    "modulators_summary": [
      {"name": "Ashwagandha", "plain_benefit": "helps your system find rest again"}
    ]
  },
  "clinician": {
    "clinical_summary": "2-3 sentence technical summary",
    "active_priors_technical": [
      {"id": "scarcity_prediction", "label": "Scarcity prediction", "strength": 0.85, "clinical_meaning": "clinical interpretation"}
    ],
    "differential": "1-2 sentences of differential considerations",
    "lab_panel": [
      {"marker": "HbA1c", "rationale": "why this test next"}
    ],
    "genetic_panel": [
      {"rsid": "rs9939609", "gene": "FTO", "clinical_action": "what to do if positive"}
    ],
    "protocol": [
      {"molecule": "Ashwagandha", "target_node": "HPA axis rigidity", "dosage_comment": "typical range + caveats"}
    ],
    "flags": ["safety consideration 1", "safety consideration 2"]
  }
}

STYLE RULES

patient view:
- Second person informal.
- "your body" not "the body".
- No "prior", "imprint", "Bayesian", "posterior", "allostatic".
- Frame it as a body story — what the system has learned to anticipate, what is repeating, what can be interrupted.
- 2-3 short paragraphs max, each ~2-4 sentences.

clinician view:
- Third person, clinical.
- Use imprint code + name the first time (e.g., "i8 Reserva").
- Specify mechanism where relevant.
- Include differential considerations (what else could look like this).
- Flag anything that a responsible clinician would double-check (labs to rule out organic causes, interactions, etc.).`;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    posterior: ClinicalPosterior;
    locale?: "en" | "es";
  };

  const locale = body.locale ?? "en";
  const languageInstruction =
    locale === "es"
      ? "\n\nReturn ALL text fields in SPANISH. Spanish language, Spanish tone."
      : "\n\nReturn ALL text fields in ENGLISH.";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userPrompt = `Clinical posterior:

${JSON.stringify(body.posterior, null, 2)}

Produce the dual render JSON now.${languageInstruction}`;

  try {
    const response = await client.messages.create({
      model: MODELS.ORCHESTRATOR,
      max_tokens: 3000,
      temperature: 0.5,
      system: [
        {
          type: "text",
          text: RENDERER_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      return Response.json(
        {
          error: "JSON parse failed",
          detail: err instanceof Error ? err.message : String(err),
          raw: cleaned.slice(0, 1200),
        },
        { status: 502 },
      );
    }

    const validated = DualRenderSchema.safeParse(parsed);
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
      render: validated.data,
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
