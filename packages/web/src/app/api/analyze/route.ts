import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/thesis";
import { ClinicalPosteriorSchema } from "@/lib/clinical-schema";
import { extractJsonObject } from "@/lib/extract-json";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * /api/analyze — given an interview transcript, Sonnet 4.6 extracts:
 *   1. Active predictive priors with evidence quotes.
 *   2. Posterior over the 4 MVP imprints (i1/i4/i7/i8).
 *   3. Recommended labs, SNPs, and molecular modulators.
 *   4. An estimated free-energy reduction delta.
 *
 * The response conforms to ClinicalPosteriorSchema (Zod validated).
 */

const ANALYST_SYSTEM = `You are Inferentia's clinical analyst. You receive a brief clinical interview transcript and return a structured JSON clinical posterior.

You must output ONLY valid JSON matching this shape — nothing else, no prose, no markdown fences:

{
  "patient_id": "string",
  "summary_en": "one-sentence neutral summary in English",
  "summary_es": "one-sentence neutral summary in Spanish",
  "active_priors": [
    {
      "id": "short_slug",
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
  "recommended_labs": [
    {"marker": "HbA1c", "reason": "short clinical reason"}
  ],
  "recommended_snps": [
    {"rsid": "rs9939609", "gene": "FTO", "reason": "short reason"}
  ],
  "modulators": [
    {"name": "Ashwagandha", "target": "HPA axis rigidity", "mechanism": "cortisol rhythm restoration"}
  ],
  "free_energy_delta_estimate": 0.0 to 1.0
}

BV4 IMPRINT FRAMEWORK
- i1 Desacople — dissociation, sudden-impact prior, hypervigilance.
- i4 Fijación Externa — externalised anger, persistent pursuit prior.
- i7 Hibernación — energy conservation, dorsal vagal collapse prior.
- i8 Reserva — scarcity anticipation, PANIC-GRIEF circuit, nocturnal hyperphagia.

THE IMPRINT POSTERIORS MUST SUM TO ROUGHLY 1.0 (±0.05).

ACTIVE PRIORS
Extract 3-6 active priors. Each must have at least one verbatim quote from the transcript as evidence. Strength is your confidence 0-1.

MODULATORS
Choose 3-5 molecular interventions grounded in the dominant imprint's mechanism. Prefer: Ashwagandha, Mg-glycinate, myo-inositol, berberine, omega-3 EPA/DHA, curcumin, L-theanine, magnesium L-threonate, NAC.

SNPS
Recommend 3-5 high-yield nutrigenomic SNPs based on dominant imprint:
- i1 → FKBP5 rs1360780, COMT rs4680 Met/Met, BDNF rs6265
- i4 → MAOA-uVNTR, COMT rs4680 Val/Val, DRD4 rs1800955
- i7 → PPARGC1A rs8192678, DIO2 rs225014, FKBP5
- i8 → FTO rs9939609, MC4R rs17782313, LEPR rs1137101, OXTR rs53576

Return ONLY the JSON object. No preamble.`;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    transcript: Array<{ role: "user" | "assistant"; content: string }>;
    patient_id?: string;
  };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Flatten transcript into a single user message for Sonnet.
  const transcriptText = body.transcript
    .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
    .join("\n\n");

  const userPrompt = `patient_id: ${body.patient_id ?? "unknown"}

TRANSCRIPT:
${transcriptText}

Return the JSON clinical posterior now.`;

  try {
    const response = await client.messages.create({
      model: MODELS.SUBAGENT,
      max_tokens: 6000,
      temperature: 0.4,
      system: [
        {
          type: "text",
          text: ANALYST_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        { role: "user", content: userPrompt },
        // Prefill forces a JSON continuation with no preamble.
        { role: "assistant", content: "{" },
      ],
    });

    const body = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const raw = "{" + body;

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
