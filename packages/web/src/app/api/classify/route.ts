import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELS } from "@/lib/thesis";
import { extractJsonObject } from "@/lib/extract-json";
import {
  NARRATIVE_KEYS,
  computeImprintPosterior,
  type FeatureKey,
  type FeatureVector,
} from "@/lib/math/gmm-imprint";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * /api/classify — tool call real del pipeline.
 *
 * Pipeline:
 *   1) Sonnet 4.6 narrative extractor → 12 escalas [0,1] con quote verbatim.
 *   2) Clasificador GMM Bayesiano (Node puro, cerrado analítico) →
 *      posterior auditable sobre i1/i4/i7/i8 con log-likelihoods,
 *      entropía en bits y cobertura de features.
 *
 * Cada número es trazable hasta los parámetros μ, σ de IMPRINT_PARAMS
 * en lib/math/gmm-imprint.ts. Nada lo inventa el LLM.
 */

const NARRATIVE_DIMENSIONS = [
  {
    key: "hypervigilance",
    gloss:
      "constant alertness, scanning for threat, inability to relax, fragmented alert-state sleep",
  },
  {
    key: "dorsal_collapse",
    gloss:
      "dorsal-vagal shutdown — hypersomnia, low baseline energy, deflated, freeze, giving up",
  },
  {
    key: "scarcity_anticipation",
    gloss:
      "anticipation of not-enough — over-preparing, inability to rest because something could still go wrong, stockpiling",
  },
  {
    key: "externalised_anger",
    gloss:
      "anger consistently placed on an external agent (person, institution, body part); outward blaming tone",
  },
  {
    key: "rumination_agent",
    gloss:
      "intrusive repetitive thinking about a specific agent (person who wronged them, decision, scene); loops without resolution",
  },
  {
    key: "hepatobiliary_tag",
    gloss:
      "somatic language around right-upper-quadrant, bile, 'bitter', 'cannot digest this', chronic hepatobiliary complaints",
  },
  {
    key: "peripheral_coldness",
    gloss:
      "cold hands, cold feet, peripheral vasoconstriction experience, dissociation from periphery",
  },
  {
    key: "nocturnal_hyperphagia",
    gloss:
      "eating late at night, can't-sleep-without-eating, waking to eat, snack-stockpiling before bed",
  },
  {
    key: "inability_to_rest",
    gloss:
      "genuine inability to stop doing things, guilt when resting, always a pending task, over-preparation for tomorrow",
  },
  {
    key: "panic_grief_tonality",
    gloss:
      "Panksepp PANIC-GRIEF circuit — separation-anxiety flavour, loss-anticipation, child-lost quality to the distress",
  },
  {
    key: "dissociation_sudden_impact",
    gloss:
      "narrative of being 'hit' suddenly (trauma, accident, news), prior of sudden impact still active, hypervigilant-startle pattern",
  },
  {
    key: "interoceptive_suppression",
    gloss:
      "not noticing hunger/fullness/tension until extreme; body signals arrive as emergencies; disconnection from body",
  },
] as const;

type NarrativeKey = (typeof NARRATIVE_DIMENSIONS)[number]["key"];

const NARRATIVE_EXTRACTOR_SYSTEM = `You are Inferentia's narrative feature extractor. You receive a clinical interview transcript or clinician notes (any length, any language). Your sole job is to score TWELVE [0,1] narrative dimensions that feed the Bayesian GMM imprint classifier.

These are NOT diagnoses. They are observable narrative dimensions grounded in what the patient actually says (or what the clinician has recorded they said). Base each score on concrete utterances — never on your interpretation of "what the patient really means".

## Dimensions (all scored 0.0–1.0)

${NARRATIVE_DIMENSIONS.map((d, i) => `${i + 1}. **${d.key}** — ${d.gloss}.`).join("\n")}

Scoring rule:
- 0.0–0.2: absent or barely hinted.
- 0.3–0.5: present but not central.
- 0.6–0.8: clearly expressed, recurring.
- 0.9–1.0: pervasive, dominant narrative.

If a dimension is not present in the transcript at all, set value to 0.1 and quote to "(no direct narrative observed)".

## Output shape — return ONLY this JSON object

{
${NARRATIVE_DIMENSIONS.map((d) => `  "${d.key}": {"value": 0.0..1.0, "quote": "verbatim utterance or '(no direct narrative observed)'"}`).join(",\n")}
}

OUTPUT CONTRACT: the first character must be "{" and the last "}". No prose, no markdown fences, no preamble, no commentary after.`;

// Build the Zod schema for the 12-dim narrative output dynamically.
const narrativeShape = Object.fromEntries(
  NARRATIVE_DIMENSIONS.map((d) => [
    d.key,
    z.object({ value: z.number().min(0).max(1), quote: z.string() }),
  ]),
) as Record<
  NarrativeKey,
  z.ZodObject<{ value: z.ZodNumber; quote: z.ZodString }>
>;
const NarrativeFeaturesSchema = z.object(narrativeShape);
type NarrativeFeatures = z.infer<typeof NarrativeFeaturesSchema>;

const LabsInputSchema = z
  .object({
    // HPA
    cortisol_am: z.number().positive().optional(),
    cortisol_pm: z.number().positive().optional(),
    car: z.number().optional(),
    // Metabolic
    hba1c: z.number().positive().optional(),
    homa_ir: z.number().positive().optional(),
    fasting_glucose: z.number().positive().optional(),
    fasting_insulin: z.number().positive().optional(),
    triglycerides: z.number().positive().optional(),
    hdl: z.number().positive().optional(),
    ldl: z.number().positive().optional(),
    leptin: z.number().positive().optional(),
    // Inflammation
    crp: z.number().nonnegative().optional(),
    il6: z.number().nonnegative().optional(),
    // Thyroid
    tsh: z.number().nonnegative().optional(),
    t3_free: z.number().positive().optional(),
    t4_free: z.number().positive().optional(),
    // Micronutrients
    ferritin: z.number().nonnegative().optional(),
    vitamin_d: z.number().nonnegative().optional(),
    b12: z.number().nonnegative().optional(),
    homocysteine: z.number().nonnegative().optional(),
    // Autonomic
    sdnn_hrv: z.number().positive().optional(),
    rmssd_hrv: z.number().positive().optional(),
    lf_hf_ratio: z.number().positive().optional(),
    // Body composition
    visceral_fat: z.number().nonnegative().optional(),
    lean_mass_pct: z.number().positive().optional(),
    body_water_pct: z.number().positive().optional(),
  })
  .partial();

const NarrativeOverrideSchema = z
  .object(
    Object.fromEntries(
      NARRATIVE_DIMENSIONS.map((d) => [d.key, z.number().min(0).max(1).optional()]),
    ) as Record<NarrativeKey, z.ZodOptional<z.ZodNumber>>,
  )
  .partial();

const BodySchema = z.object({
  transcript: z.string().min(1).max(50_000).optional(),
  labs: LabsInputSchema.default({}),
  narrative_features_override: NarrativeOverrideSchema.optional(),
  locale: z.enum(["en", "es"]).default("en"),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // ─────────────────────────────────── 1) Narrative feature extraction
  let narrative: NarrativeFeatures | null = null;
  let narrativeUsage: {
    input: number;
    output: number;
    cached: number | null;
  } | null = null;

  if (body.transcript) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userPrompt = `TRANSCRIPT / CLINICAL NOTES:\n\n${body.transcript}\n\nScore the twelve narrative dimensions now. JSON only.`;
    const response = await client.messages.create({
      model: MODELS.SUBAGENT,
      max_tokens: 2000,
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
    const parsedNarr = NarrativeFeaturesSchema.safeParse(JSON.parse(cleaned));
    if (!parsedNarr.success) {
      return Response.json(
        {
          error: "Narrative extractor schema mismatch",
          issues: parsedNarr.error.issues.slice(0, 10),
        },
        { status: 502 },
      );
    }
    narrative = parsedNarr.data;
    narrativeUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cached: response.usage.cache_read_input_tokens ?? null,
    };
  }

  // ─────────────────────────────────── 2) Build unified feature vector
  const features: FeatureVector = { ...body.labs };
  const overrides = body.narrative_features_override ?? {};

  for (const key of NARRATIVE_KEYS) {
    const nkey = key as NarrativeKey;
    if (typeof overrides[nkey] === "number") {
      features[key] = overrides[nkey]!;
    } else if (narrative) {
      features[key] = narrative[nkey].value;
    }
  }

  // ─────────────────────────────────── 3) GMM Bayesian posterior
  const posterior = computeImprintPosterior(features);

  const quotes = narrative
    ? Object.fromEntries(
        NARRATIVE_DIMENSIONS.map((d) => [d.key, narrative![d.key].quote]),
      )
    : null;

  return Response.json({
    ok: true,
    tool: "compute_imprint_posterior",
    model_version: posterior.version,
    trace: {
      input_features: features,
      input_features_count: Object.keys(features).length,
      features_used: posterior.features_used,
      features_missing: posterior.features_missing,
    },
    narrative_extraction: narrative
      ? { used: true, quotes, usage: narrativeUsage }
      : { used: false, quotes: null, usage: null },
    posterior,
  });
}
