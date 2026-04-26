import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELS } from "@/lib/thesis";
import { renderTreatiseContext } from "@/lib/reasoner/treatise-excerpts";
import {
  computeImprintPosteriorFromSensations,
  type NarrativeMark,
} from "@/lib/math/imprint-bayes";
import {
  predictCascade,
  computeDiscordances,
} from "@/lib/math/cascade-predictor";
import { labsToZscores, type LabKey } from "@/lib/math/labs-zscore";
import { ALL_SENSATION_IDS, type SensationId } from "@/lib/math/sensations";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * /api/reasoner — el HERO técnico de Inferentia.
 *
 * Opus 4.7 orquesta el razonamiento clínico completo:
 * - Extended thinking habilitado (budget 12k tokens) → Opus piensa
 *   antes de responder.
 * - Contexto del Tratado BV4 cargado y cacheado (~8k tokens de
 *   extractos canónicos de las 13 improntas).
 * - Tool use en loop: Opus llama funciones matemáticas reales y
 *   lee el resultado antes de concluir.
 * - Streaming SSE: el cliente ve thinking + tool calls + hipótesis
 *   final en vivo.
 *
 * Producto final: hipótesis de impronta top-3 con evidencia verbatim
 * citada + recomendación clínica + diferencial pendiente si aplica.
 */

const BodySchema = z.object({
  case_id: z.string().optional(),
  clinician_notes: z.string().max(20000).optional(),
  transcript: z.string().max(40000).optional(),
  labs: z.record(z.string(), z.number()).default({}),
  declared_imprint_hint: z.string().optional(),
  declared_sensation_hint: z.string().optional(),
  locale: z.enum(["en", "es"]).default("en"),
});

// ──────────────────────────────────────────────────────────────
// Tool definitions — Opus puede llamarlas
// ──────────────────────────────────────────────────────────────

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "compute_imprint_posterior",
    description:
      "Run the closed-form Bayesian classifier over the 13 BV4 imprints given a posterior over sensations and/or narrative marks. Returns posterior probabilities, entropy, and the discriminative contribution of sensations vs marks. Use this when you need a numerical baseline for your hypothesis.",
    input_schema: {
      type: "object" as const,
      properties: {
        sensation_posterior: {
          type: "array",
          description:
            "Array of {id, posterior} over the 20 sensations. Optional.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                enum: ALL_SENSATION_IDS,
                description: "Canonical sensation id (s1_abandono, s2_agresion, ...). Must match exactly — do not invent English names.",
              },
              posterior: { type: "number" },
            },
            required: ["id", "posterior"],
          },
        },
        narrative_marks: {
          type: "object",
          description:
            "Mapping of narrative mark names to [0,1] scores. Optional.",
          additionalProperties: { type: "number" },
        },
      },
    },
  },
  {
    name: "predict_cascade_signature",
    description:
      "Given a posterior over sensations, compute the expected biochemical cascade signature (z-scores and raw values) across 30+ lab axes. Returns predicted mean + SD + CI per marker. Use to compare against observed labs.",
    input_schema: {
      type: "object" as const,
      properties: {
        sensation_posterior: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                enum: ALL_SENSATION_IDS,
                description: "Canonical sensation id (s1_abandono, s2_agresion, ...). Must match exactly — do not invent English names.",
              },
              posterior: { type: "number" },
            },
            required: ["id", "posterior"],
          },
        },
      },
      required: ["sensation_posterior"],
    },
  },
  {
    name: "compute_discordances",
    description:
      "Given observed labs (raw values) and a predicted cascade, compute per-axis discordances (observed vs expected) with severity (concordant/mild/moderate/strong). Use to identify where the observed clinical picture diverges from what the hypothesis predicts.",
    input_schema: {
      type: "object" as const,
      properties: {
        observed_labs_raw: {
          type: "object",
          additionalProperties: { type: "number" },
        },
        sensation_posterior: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                enum: ALL_SENSATION_IDS,
                description: "Canonical sensation id (s1_abandono, s2_agresion, ...). Must match exactly — do not invent English names.",
              },
              posterior: { type: "number" },
            },
            required: ["id", "posterior"],
          },
        },
      },
      required: ["observed_labs_raw", "sensation_posterior"],
    },
  },
];

// ──────────────────────────────────────────────────────────────
// Tool handlers — ejecutan la matemática real
// ──────────────────────────────────────────────────────────────

function handleTool(
  name: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (name === "compute_imprint_posterior") {
    const sensationPosterior = Array.isArray(input.sensation_posterior)
      ? (input.sensation_posterior as Array<{ id: string; posterior: number }>)
      : [];
    const marks = (input.narrative_marks ?? {}) as Partial<
      Record<NarrativeMark, number>
    >;
    const result = computeImprintPosteriorFromSensations({
      sensation_posterior: sensationPosterior as Array<{
        id: SensationId;
        posterior: number;
      }>,
      narrative_marks: marks,
    });
    return {
      dominant: result.dominant,
      top_gap: Number(result.top_gap.toFixed(3)),
      entropy_bits: Number(result.entropy_bits.toFixed(3)),
      top5: result.posterior.slice(0, 5).map((e) => ({
        id: e.id,
        name: e.name_es,
        posterior: Number(e.posterior.toFixed(3)),
        log_lik_sensations: Number(e.log_lik_sensations.toFixed(2)),
        log_lik_marks: Number(e.log_lik_marks.toFixed(2)),
      })),
      version: result.version,
    };
  }
  if (name === "predict_cascade_signature") {
    const sp = (input.sensation_posterior ?? []) as Array<{
      id: SensationId;
      posterior: number;
    }>;
    const pred = predictCascade(sp);
    // Compactar output para el contexto
    const markers = Object.fromEntries(
      Object.entries(pred.markers)
        .filter(([, m]) => Math.abs((m as { expected_z: number }).expected_z) > 0.3)
        .map(([k, m]) => {
          const mm = m as {
            expected_z: number;
            expected_sd_z: number;
            expected_raw: number | null;
            unit: string | null;
          };
          return [
            k,
            {
              expected_z: Number(mm.expected_z.toFixed(2)),
              sd_z: Number(mm.expected_sd_z.toFixed(2)),
              expected_raw: mm.expected_raw !== null ? Number(mm.expected_raw.toFixed(2)) : null,
              unit: mm.unit,
            },
          ];
        }),
    );
    return { version: pred.version, markers };
  }
  if (name === "compute_discordances") {
    const labsRaw = (input.observed_labs_raw ?? {}) as Partial<
      Record<LabKey, number>
    >;
    const labZ = labsToZscores(labsRaw);
    const sp = (input.sensation_posterior ?? []) as Array<{
      id: SensationId;
      posterior: number;
    }>;
    const pred = predictCascade(sp);
    const disc = computeDiscordances(labZ, labsRaw, pred);
    return {
      count: disc.length,
      non_concordant: disc.filter((d) => d.severity !== "concordant").length,
      items: disc.slice(0, 10).map((d) => ({
        key: d.key,
        observed_raw: Number(d.observed_raw.toFixed(2)),
        observed_z: Number(d.observed_z.toFixed(2)),
        expected_z: Number(d.expected_z.toFixed(2)),
        deviation_sigma: Number(d.observed_z_deviation.toFixed(2)),
        direction: d.direction,
        severity: d.severity,
      })),
    };
  }
  return { error: `unknown tool: ${name}` };
}

// ──────────────────────────────────────────────────────────────
// System prompt — cargado con el Tratado como contexto cacheado
// ──────────────────────────────────────────────────────────────

function buildSystemBlocks(locale: "en" | "es"): Anthropic.Messages.TextBlockParam[] {
  const rolePrompt =
    locale === "es"
      ? `Eres el Reasoner Clínico de Inferentia, un asistente diagnóstico agéntico entrenado en el marco Active Inference + el Tratado BV4 del Dr. Miguel Ojeda Rios.

Tu tarea: dado un caso clínico (narrativa, labs, observaciones del clínico), producir una hipótesis de impronta activa con evidencia citada.

**Método**:
1. Piensa profundo. Usa el Tratado cargado abajo como referencia canónica. Usa extended thinking para razonar sobre diferenciales antes de responder.
2. Extrae las sensaciones activas probables del caso. Usa compute_imprint_posterior para obtener un baseline numérico.
3. Si tienes labs, llama a predict_cascade_signature sobre las sensaciones probables y después compute_discordances para ver concordancia observado-vs-predicho.
4. Integra los resultados numéricos con la narrativa clínica. Cita fragmentos verbatim del caso que apoyan tu hipótesis.
5. Identifica el top-3 de improntas probables con probabilidad estimada.
6. Si hay coactivación (dos improntas con probabilidad similar), propón una pregunta diferencial del Tratado que discrimine.

**Output final**: debe ser JSON válido con esta estructura:
{
  "top3": [{"imprint_id": "i8", "name": "Reserva", "probability": 0.62, "rationale": "..."}],
  "evidence_citations": [{"imprint_id": "i8", "excerpt_from_case": "verbatim", "treatise_reference": "shock originario tipo separación temprana"}],
  "differential_question": {"between": ["i8", "i2"], "question": "...", "from_treatise": "Cap 7.4 vs 7.10"},
  "confidence": "high|moderate|low",
  "confidence_rationale": "por qué esta confianza",
  "tool_calls_used": ["compute_imprint_posterior", "..."],
  "next_clinical_step_es": "...",
  "next_clinical_step_en": "..."
}

Antes del JSON final, escribe tu razonamiento clínico completo en formato libre. Cierra con el JSON delimitado por \`\`\`json y \`\`\`.`
      : `You are Inferentia's Clinical Reasoner, an agentic diagnostic assistant trained in Active Inference + Dr. Miguel Ojeda Rios's BV4 Treatise framework.

Your task: given a clinical case (narrative, labs, clinician observations), produce a hypothesis of active imprint with cited evidence.

**Method**:
1. Think deep. Use the Treatise loaded below as canonical reference. Use extended thinking to reason over differentials before answering.
2. Extract probable active sensations from the case. Call compute_imprint_posterior for a numerical baseline.
3. If labs available, call predict_cascade_signature on probable sensations and then compute_discordances to check observed-vs-predicted fit.
4. Integrate numerical results with clinical narrative. Cite verbatim excerpts from the case supporting your hypothesis.
5. Identify top-3 probable imprints with estimated probability.
6. If coactivation (two imprints with similar probability), propose a differential question from the Treatise that discriminates.

**Final output**: valid JSON with this structure:
{
  "top3": [{"imprint_id": "i8", "name": "Reserve", "probability": 0.62, "rationale": "..."}],
  "evidence_citations": [{"imprint_id": "i8", "excerpt_from_case": "verbatim", "treatise_reference": "shock type: early separation"}],
  "differential_question": {"between": ["i8", "i2"], "question": "...", "from_treatise": "Ch 7.4 vs 7.10"},
  "confidence": "high|moderate|low",
  "confidence_rationale": "why",
  "tool_calls_used": ["compute_imprint_posterior", "..."],
  "next_clinical_step_es": "...",
  "next_clinical_step_en": "..."
}

Before the final JSON, write your full clinical reasoning in free form. Close with the JSON delimited by \`\`\`json and \`\`\`.`;

  return [
    {
      type: "text",
      text: rolePrompt,
    },
    {
      type: "text",
      text: renderTreatiseContext(),
      cache_control: { type: "ephemeral" },
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// Main handler — streams SSE
// ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const userMessage = buildUserMessage(body);
  const systemBlocks = buildSystemBlocks(body.locale);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      try {
        send("start", { case_id: body.case_id ?? null });

        // Loop agentic — Opus llama tools, recibe resultado, sigue
        // razonando, hasta stop_reason === "end_turn".
        const messages: Anthropic.Messages.MessageParam[] = [
          { role: "user", content: userMessage },
        ];

        let iteration = 0;
        const MAX_ITERATIONS = 6;
        let finalUsage: {
          input: number;
          output: number;
          cached: number;
        } = { input: 0, output: 0, cached: 0 };

        while (iteration < MAX_ITERATIONS) {
          iteration++;
          send("iteration", { n: iteration });

          const response = await client.messages.create({
            model: MODELS.ORCHESTRATOR,
            max_tokens: 16000,
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            system: systemBlocks,
            tools: TOOLS,
            messages,
          });

          finalUsage = {
            input: finalUsage.input + (response.usage.input_tokens ?? 0),
            output: finalUsage.output + (response.usage.output_tokens ?? 0),
            cached:
              finalUsage.cached +
              (response.usage.cache_read_input_tokens ?? 0),
          };

          // Emitir cada bloque
          const assistantBlocks: Anthropic.Messages.ContentBlock[] = [];
          for (const block of response.content) {
            assistantBlocks.push(block);
            if (block.type === "thinking") {
              send("thinking", { text: block.thinking });
            } else if (block.type === "text") {
              send("text", { text: block.text });
            } else if (block.type === "tool_use") {
              send("tool_use", {
                id: block.id,
                name: block.name,
                input: block.input,
              });
            }
          }

          // Agregar la respuesta del assistant a messages
          messages.push({ role: "assistant", content: assistantBlocks });

          if (response.stop_reason === "tool_use") {
            // Ejecutar tools y añadir resultados
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
            for (const block of response.content) {
              if (block.type !== "tool_use") continue;
              const result = handleTool(
                block.name,
                block.input as Record<string, unknown>,
              );
              send("tool_result", {
                tool_use_id: block.id,
                name: block.name,
                result,
              });
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            }
            messages.push({ role: "user", content: toolResults });
            continue; // siguiente iteración
          }

          // stop_reason !== "tool_use": terminó
          send("done", {
            stop_reason: response.stop_reason,
            usage: finalUsage,
            iterations: iteration,
          });
          break;
        }

        if (iteration >= MAX_ITERATIONS) {
          send("max_iterations", { iterations: iteration });
        }

        controller.close();
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : String(err),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function buildUserMessage(body: z.infer<typeof BodySchema>): string {
  const parts: string[] = [];
  parts.push("# Caso clínico a analizar");
  parts.push("");
  if (body.case_id) parts.push(`**Case ID**: ${body.case_id}`);
  if (body.declared_imprint_hint)
    parts.push(
      `**Hipótesis del clínico (a contrastar, no a aceptar ciegamente)**: ${body.declared_imprint_hint}`,
    );
  if (body.declared_sensation_hint)
    parts.push(
      `**Sensación declarada por el clínico**: ${body.declared_sensation_hint}`,
    );
  if (body.clinician_notes) {
    parts.push("\n## Notas del clínico\n");
    parts.push(body.clinician_notes);
  }
  if (body.transcript) {
    parts.push("\n## Transcripción del paciente\n");
    parts.push(body.transcript);
  }
  if (Object.keys(body.labs).length > 0) {
    parts.push("\n## Labs observados (valores crudos)\n");
    parts.push("```json");
    parts.push(JSON.stringify(body.labs, null, 2));
    parts.push("```");
  }
  parts.push(
    "\n\nAnaliza el caso. Razona. Llama las tools que necesites. Produce la hipótesis final con JSON al final.",
  );
  return parts.join("\n");
}
