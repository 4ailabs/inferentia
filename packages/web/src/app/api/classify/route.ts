import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELS } from "@/lib/thesis";
import { extractJsonObject } from "@/lib/extract-json";
import {
  ALL_SENSATION_IDS,
  SENSATIONS,
  type SensationId,
  type BodyZone,
} from "@/lib/math/sensations";
import {
  ALL_LAB_KEYS,
  labsToZscores,
  type LabKey,
} from "@/lib/math/labs-zscore";
import {
  computeImprintPosteriorFromSensations,
  MARK_TO_IMPRINT,
  type NarrativeMark,
} from "@/lib/math/imprint-bayes";
import {
  predictCascade,
  computeDiscordances,
} from "@/lib/math/cascade-predictor";
import { classifyAllostaticLoad } from "@/lib/math/allostatic-load";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * /api/classify — pipeline clínico BV4.
 *
 * CAMBIO ARQUITECTÓNICO (2026-04-22 noche):
 * La sensación no se INFIERE — la DECLARA el clínico. En sesión real
 * la sensación se identifica por test muscular + escucha somática;
 * el sistema respeta eso. El pipeline trabaja AGUAS ABAJO de esa
 * declaración:
 *
 *   Input del clínico:
 *     - sensación primaria (obligatoria)
 *     - sensación secundaria (opcional)
 *     - peso de la primaria (default 0.7; el resto va a secundaria)
 *     - labs
 *     - zonas corporales donde el paciente la ubica (descriptivo)
 *     - transcript narrativo
 *
 *   Pipeline matemático:
 *     Capa A: predictCascade — firma bioquímica esperada (mezcla
 *             de las 2 sensaciones declaradas, ponderada por el peso)
 *     Capa B: computeDiscordances — labs observados vs firma predicha
 *     Capa C: imprint Bayes — P(impronta | sensaciones declaradas +
 *             marcas narrativas detectadas por Sonnet)
 *     Capa D: classifyAllostaticLoad — tipo 1/2/3 McEwen
 *
 *   Sonnet entra sólo para:
 *     - puntuar las 13 marcas discriminativas (entrada a Capa C)
 *     - opcional: proponer sensaciones CANDIDATAS como segunda
 *       opinión (pero la decisión la mantiene el clínico)
 */

const BODY_ZONES: BodyZone[] = [
  "ocular",
  "oral_jaw",
  "cervical_throat",
  "thoracic_chest",
  "dorsal_back",
  "diaphragm_epigastric",
  "abdominal",
  "hepatobiliary",
  "pelvic_genital",
  "skin_face",
  "articular_skeletal",
  "renal_lumbar",
  "peripheral_extremities",
  "global_depletion",
  "cardiovascular",
];

const ALL_MARKS: NarrativeMark[] = Object.keys(
  MARK_TO_IMPRINT,
) as NarrativeMark[];

// ─── Sonnet system prompt: 13 marcas + sugerencia de sensaciones
const NARRATIVE_EXTRACTOR_SYSTEM = `You are Inferentia's narrative extractor. You read a clinical interview transcript or clinician notes and return two things:

PART A — Score the 13 discriminative narrative marks (0.0–1.0 each, with verbatim quote). Each mark points toward a specific BV4 imprint (Cap 7 differential diagnoses):

- sudden_impact_no_agent: sudden impact without identifiable agent (accident, abrupt loss). → i1 Decoupling
- betrayal_from_trusted: harm from a trusted figure with exposed back. → i2 Armoring
- chronic_insufficiency_shame: "I'm not enough", internalised insufficiency, shrinking posture. → i3 Retraction
- rumination_on_agent: sustained rumination on a specific agent, demand for justice. → i4 External Fixation
- expression_blocked_or_ignored: expression blocked by prohibition OR exhaustion because no one receives. → i5 Compression
- humiliation_internalised: internalised humiliation/toxic shame, "I am the error". → i6 Camouflage
- global_shutdown_no_energy: global shutdown, no energy to try, hypersomnia. → i7 Hibernation
- scarcity_accumulation: scarcity anticipation, compulsive accumulation. → i8 Reserve
- identity_dissolution_without_other: identity dissolves without the other. → i9 Confluence
- loyalty_to_symptom_or_lost_person: symptom maintained out of loyalty. → i10 Binding
- carrying_not_mine_grief: carrying something not one's own, grief without identifiable loss. → i11 Superposition
- territorial_loss_no_home: territorial loss, "I don't belong anywhere". → i12 Uprooting
- heart_sealed_after_impact: heart sealed after an impact, cannot open again. → i13 Encapsulation

PART B — Suggest up to 3 candidate sensations from the 20 BV4 canon (second opinion for the clinician — NOT the final decision). Each candidate includes id, score (0..1), and verbatim quote.

The 20 sensations (pick from these):
${ALL_SENSATION_IDS.map((id) => {
  const s = SENSATIONS[id];
  return `- ${id} (#${s.number} ${s.name_en}): ${s.primitive_signal_en}`;
}).join("\n")}

## OUTPUT — single JSON object, no prose, no fences

{
  "marks": {
    "sudden_impact_no_agent": {"score": 0.0..1.0, "quote": "verbatim or ''"},
    ... (all 13 marks)
  },
  "suggested_sensations": [
    {"id": "s1_abandono", "score": 0.0..1.0, "quote": "verbatim or ''"},
    ... (up to 3)
  ]
}

Scoring rule: 0.0–0.2 absent, 0.3–0.5 present not central, 0.6–0.8 clearly expressed, 0.9–1.0 pervasive. For marks not present, score 0.1 and quote "(no direct narrative)".

First character "{". Last character "}". No commentary before or after.`;

const BodyZoneSchema = z.enum([
  "ocular",
  "oral_jaw",
  "cervical_throat",
  "thoracic_chest",
  "dorsal_back",
  "diaphragm_epigastric",
  "abdominal",
  "hepatobiliary",
  "pelvic_genital",
  "skin_face",
  "articular_skeletal",
  "renal_lumbar",
  "peripheral_extremities",
  "global_depletion",
  "cardiovascular",
]);

const SensationIdSchema = z.enum(ALL_SENSATION_IDS as [SensationId, ...SensationId[]]);

const markShape = Object.fromEntries(
  ALL_MARKS.map((m) => [
    m,
    z.object({ score: z.number().min(0).max(1), quote: z.string() }),
  ]),
) as Record<
  NarrativeMark,
  z.ZodObject<{ score: z.ZodNumber; quote: z.ZodString }>
>;

const NarrativeOutputSchema = z.object({
  marks: z.object(markShape),
  suggested_sensations: z
    .array(
      z.object({
        id: SensationIdSchema,
        score: z.number().min(0).max(1),
        quote: z.string(),
      }),
    )
    .max(5)
    .default([]),
});

const labsShape = Object.fromEntries(
  ALL_LAB_KEYS.map((k) => [k, z.number().optional()]),
) as Record<LabKey, z.ZodOptional<z.ZodNumber>>;

const BodySchema = z.object({
  /** Sensación primaria declarada por el clínico. Obligatoria. */
  primary_sensation: SensationIdSchema,
  /** Sensación secundaria, opcional. */
  secondary_sensation: SensationIdSchema.optional(),
  /** Peso de la primaria en [0.5, 1.0]. El resto va a secundaria. */
  primary_weight: z.number().min(0.5).max(1.0).default(0.7),
  /** Labs crudos (el endpoint los convierte a z-score internamente). */
  labs: z.object(labsShape).partial().default({}),
  /** Zonas que el paciente reporta — descriptivo, no entra al cálculo. */
  reported_body_zones: z.array(BodyZoneSchema).default([]),
  /** Transcript opcional — si está, Sonnet puntúa marcas + sugiere sensaciones. */
  transcript: z.string().min(1).max(80_000).optional(),
  locale: z.enum(["en", "es"]).default("en"),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // ── 0) Labs crudos → z-scores
  const labsRaw = body.labs as Partial<Record<LabKey, number>>;
  const labZ = labsToZscores(labsRaw);

  // ── 1) Construir el posterior "declarado" sobre sensaciones
  //       (no es inferencia — es la declaración del clínico
  //       representada como distribución sobre las 20)
  const primaryW = Math.min(Math.max(body.primary_weight, 0.5), 1.0);
  const secondaryW = body.secondary_sensation ? 1 - primaryW : 0;

  const declaredPosterior: Array<{ id: SensationId; posterior: number }> = [];
  declaredPosterior.push({
    id: body.primary_sensation,
    posterior: body.secondary_sensation ? primaryW : 1.0,
  });
  if (body.secondary_sensation) {
    declaredPosterior.push({
      id: body.secondary_sensation,
      posterior: secondaryW,
    });
  }

  // ── 2) Narrative extractor (Sonnet) — solo si hay transcript
  let narrativeMarks: Partial<Record<NarrativeMark, number>> = {};
  let markQuotes: Partial<
    Record<NarrativeMark, { score: number; quote: string }>
  > = {};
  let suggestedSensations: Array<{
    id: SensationId;
    score: number;
    quote: string;
  }> = [];
  let narrativeUsage: {
    input: number;
    output: number;
    cached: number | null;
  } | null = null;

  if (body.transcript) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userPrompt = `TRANSCRIPT / CLINICAL NOTES:\n\n${body.transcript}\n\nScore the 13 marks and suggest up to 3 candidate sensations. JSON only.`;
    const response = await client.messages.create({
      model: MODELS.SUBAGENT,
      max_tokens: 3000,
      temperature: 0.15,
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
        {
          error: "Narrative extractor returned no JSON",
          raw: raw.slice(0, 1200),
        },
        { status: 502 },
      );
    }
    const parsedNarr = NarrativeOutputSchema.safeParse(JSON.parse(cleaned));
    if (!parsedNarr.success) {
      return Response.json(
        {
          error: "Narrative extractor schema mismatch",
          issues: parsedNarr.error.issues.slice(0, 10),
        },
        { status: 502 },
      );
    }
    markQuotes = parsedNarr.data.marks;
    narrativeMarks = Object.fromEntries(
      (Object.entries(parsedNarr.data.marks) as Array<
        [NarrativeMark, { score: number; quote: string }]
      >).map(([k, v]) => [k, v.score]),
    ) as Partial<Record<NarrativeMark, number>>;
    suggestedSensations = parsedNarr.data.suggested_sensations;
    narrativeUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cached: response.usage.cache_read_input_tokens ?? null,
    };
  }

  // ── 3) Capa B — Impronta condicionada a las sensaciones declaradas
  const imprintResult = computeImprintPosteriorFromSensations({
    sensation_posterior: declaredPosterior,
    narrative_marks: narrativeMarks,
  });

  // ── 4) Capa A — Cascada esperada (mezcla ponderada de las 2 sensaciones)
  const cascadePrediction = predictCascade(declaredPosterior);

  // ── 5) Capa B — Discordancias observado vs esperado
  const discordances = computeDiscordances(labZ, labsRaw, cascadePrediction);

  // ── 6) Capa D — Carga alostática
  //        Construimos un pseudo-resultado con entropía calculada desde
  //        el peso declarado (no desde inferencia) y posterior top.
  const declaredEntropyBits = computeEntropyBits(declaredPosterior);
  const allostaticInput = {
    version: "declared-sensation-v0.4",
    posterior: declaredPosterior.map((e) => ({
      id: e.id,
      number: SENSATIONS[e.id].number,
      name_es: SENSATIONS[e.id].name_es,
      name_en: SENSATIONS[e.id].name_en,
      posterior: e.posterior,
      breakdown: {
        from_labs: 0,
        from_zones: 0,
        from_narrative: 0,
        total_log_lik: 0,
      },
    })),
    dominant: body.primary_sensation,
    top_gap: body.secondary_sensation ? primaryW - secondaryW : 1.0,
    entropy_bits: declaredEntropyBits,
    prior: {} as Record<SensationId, number>,
    inputs_summary: {
      labs_used: Object.keys(labZ),
      labs_missing_from_any_cascade: [],
      zones_reported: body.reported_body_zones,
      narratives_provided: [] as SensationId[],
    },
  };
  const allostaticLoad = classifyAllostaticLoad(
    allostaticInput,
    discordances,
    labZ,
  );

  return Response.json({
    ok: true,
    pipeline: "bv4-declared-sensation-v0.4",
    versions: {
      imprint: imprintResult.version,
      cascade: cascadePrediction.version,
      allostatic: allostaticLoad.version,
    },
    declared: {
      primary: {
        id: body.primary_sensation,
        number: SENSATIONS[body.primary_sensation].number,
        name_es: SENSATIONS[body.primary_sensation].name_es,
        name_en: SENSATIONS[body.primary_sensation].name_en,
        weight: body.secondary_sensation ? primaryW : 1.0,
      },
      secondary: body.secondary_sensation
        ? {
            id: body.secondary_sensation,
            number: SENSATIONS[body.secondary_sensation].number,
            name_es: SENSATIONS[body.secondary_sensation].name_es,
            name_en: SENSATIONS[body.secondary_sensation].name_en,
            weight: secondaryW,
          }
        : null,
    },
    inputs_trace: {
      labs_provided: Object.keys(labsRaw),
      labs_zscored: Object.keys(labZ),
      reported_body_zones: body.reported_body_zones,
      transcript_chars: body.transcript?.length ?? 0,
      narrative_used: !!body.transcript,
    },
    narrative: body.transcript
      ? {
          marks: markQuotes,
          suggested_sensations: suggestedSensations,
          usage: narrativeUsage,
        }
      : null,
    layer_cascade: cascadePrediction,
    layer_discordances: discordances,
    layer_imprint: imprintResult,
    layer_allostatic: allostaticLoad,
  });
}

function computeEntropyBits(
  posterior: Array<{ id: SensationId; posterior: number }>,
): number {
  return -posterior.reduce((s, e) => {
    const p = e.posterior;
    return s + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);
}
