import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELS } from "@/lib/thesis";
import { extractJsonObject } from "@/lib/extract-json";
import {
  computeImprintPosterior,
  type FeatureKey,
  type FeatureVector,
} from "@/lib/math/gmm-imprint";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * /api/classify — Tool call real en el pipeline de Inferentia.
 *
 * Este endpoint hace DOS cosas:
 *  1. Llama a Sonnet 4.6 como "narrative feature extractor" para
 *     puntuar tres escalas [0,1] desde el transcript:
 *       hypervigilance, dorsal_collapse, scarcity_anticipation.
 *     Sonnet devuelve JSON estricto, sin prosa.
 *  2. Corre el clasificador GMM Bayesiano sobre el vector unificado
 *     (labs objetivos + narrativas extraídas). Cada número del
 *     posterior es matemática auditable, no estimación del LLM.
 *
 * El resultado devuelve un `trace` explícito que el frontend
 * renderiza como "tool call visible" — el clínico ve qué entró al
 * cálculo, qué salió, y en qué versión del modelo.
 */

const NARRATIVE_EXTRACTOR_SYSTEM = `You are Inferentia's narrative feature extractor. You receive a clinical interview transcript (any length, any language). Your sole job is to score three [0,1] narrative dimensions that feed the imprint classifier:

- hypervigilance: how strongly the patient narrates a state of constant alertness, scanning for threat, inability to relax, fragmented sleep from alertness. 0 = absent; 1 = pervasive.
- dorsal_collapse: how strongly the patient narrates dorsal-vagal shutdown — hypersomnia, low baseline energy, feeling "deflated", giving up, freeze. 0 = absent; 1 = pervasive.
- scarcity_anticipation: how strongly the patient narrates anticipation of not-enough — nocturnal hyperphagia, inability to rest because something could still go wrong, PANIC-GRIEF tonality, over-preparing. 0 = absent; 1 = pervasive.

These are NOT diagnoses. They are observable narrative dimensions. Base the score on concrete patient utterances, not on your interpretation of what the patient "really means".

## Output shape — return ONLY this JSON object

{
  "hypervigilance": {"value": 0.0..1.0, "quote": "one verbatim utterance supporting the score"},
  "dorsal_collapse": {"value": 0.0..1.0, "quote": "one verbatim utterance supporting the score"},
  "scarcity_anticipation": {"value": 0.0..1.0, "quote": "one verbatim utterance supporting the score"}
}

If a dimension is not present in the transcript at all, set value to 0.1 and quote to "(no direct narrative observed)".

OUTPUT CONTRACT: the first character must be "{" and the last "}". No prose, no markdown fences, no preamble.`;

const NarrativeFeaturesSchema = z.object({
  hypervigilance: z.object({ value: z.number().min(0).max(1), quote: z.string() }),
  dorsal_collapse: z.object({ value: z.number().min(0).max(1), quote: z.string() }),
  scarcity_anticipation: z.object({
    value: z.number().min(0).max(1),
    quote: z.string(),
  }),
});

const LabsInputSchema = z
  .object({
    cortisol_morning: z.number().positive().optional(),
    sdnn_hrv: z.number().positive().optional(),
    hba1c: z.number().positive().optional(),
    homa_ir: z.number().positive().optional(),
    hdl: z.number().positive().optional(),
  })
  .partial();

const BodySchema = z.object({
  transcript: z.string().min(1).max(50_000).optional(),
  labs: LabsInputSchema.default({}),
  /**
   * Cuando el frontend ya tiene los 3 features narrativos computados,
   * puede enviarlos directamente y saltar la llamada a Sonnet.
   */
  narrative_features_override: z
    .object({
      hypervigilance: z.number().min(0).max(1).optional(),
      dorsal_collapse: z.number().min(0).max(1).optional(),
      scarcity_anticipation: z.number().min(0).max(1).optional(),
    })
    .optional(),
  locale: z.enum(["en", "es"]).default("en"),
});

export async function POST(req: Request) {
  const parsedBody = BodySchema.safeParse(await req.json());
  if (!parsedBody.success) {
    return Response.json(
      { error: "Invalid body", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }
  const body = parsedBody.data;

  // ─────────────────────────────────── 1) Narrative feature extraction
  let narrative:
    | z.infer<typeof NarrativeFeaturesSchema>
    | null = null;

  let narrativeUsage: {
    input: number;
    output: number;
    cached: number | null;
  } | null = null;

  if (body.transcript && !body.narrative_features_override) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userPrompt = `TRANSCRIPT:\n\n${body.transcript}\n\nScore the three narrative dimensions now. JSON only.`;
    const response = await client.messages.create({
      model: MODELS.SUBAGENT,
      max_tokens: 800,
      temperature: 0.2,
      system: [
        {
          type: "text",
          text: NARRATIVE_EXTRACTOR_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });
    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const cleaned = extractJsonObject(raw);
    if (!cleaned) {
      return Response.json(
        { error: "Narrative extractor returned no JSON", raw: raw.slice(0, 1200) },
        { status: 502 },
      );
    }
    const parsedNarrative = NarrativeFeaturesSchema.safeParse(JSON.parse(cleaned));
    if (!parsedNarrative.success) {
      return Response.json(
        {
          error: "Narrative extractor schema mismatch",
          issues: parsedNarrative.error.issues,
        },
        { status: 502 },
      );
    }
    narrative = parsedNarrative.data;
    narrativeUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cached: response.usage.cache_read_input_tokens ?? null,
    };
  }

  // ─────────────────────────────────── 2) Build unified feature vector
  const features: FeatureVector = { ...body.labs };
  const overrides = body.narrative_features_override ?? {};
  if (typeof overrides.hypervigilance === "number")
    features.hypervigilance = overrides.hypervigilance;
  else if (narrative) features.hypervigilance = narrative.hypervigilance.value;
  if (typeof overrides.dorsal_collapse === "number")
    features.dorsal_collapse = overrides.dorsal_collapse;
  else if (narrative) features.dorsal_collapse = narrative.dorsal_collapse.value;
  if (typeof overrides.scarcity_anticipation === "number")
    features.scarcity_anticipation = overrides.scarcity_anticipation;
  else if (narrative)
    features.scarcity_anticipation = narrative.scarcity_anticipation.value;

  // ─────────────────────────────────── 3) GMM Bayesian posterior
  const posterior = computeImprintPosterior(features);

  const providedKeys = Object.keys(features) as FeatureKey[];

  return Response.json({
    ok: true,
    tool: "compute_imprint_posterior",
    model_version: posterior.version,
    trace: {
      input_features: features,
      input_features_count: providedKeys.length,
      features_used: posterior.features_used,
      features_missing: posterior.features_missing,
    },
    narrative_extraction: narrative
      ? {
          used: true,
          quotes: {
            hypervigilance: narrative.hypervigilance.quote,
            dorsal_collapse: narrative.dorsal_collapse.quote,
            scarcity_anticipation: narrative.scarcity_anticipation.quote,
          },
          usage: narrativeUsage,
        }
      : { used: false, quotes: null, usage: null },
    posterior,
  });
}
