import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELS } from "@/lib/thesis";
import { extractJsonObject } from "@/lib/extract-json";
import {
  computeSystemState,
  type LabInput,
  type ClinicalContext,
} from "@/lib/math/system-state";
import {
  computeFlexibilityIndex,
  type PredictiveAgencyInput,
} from "@/lib/math/flexibility-index";
import {
  findLeveragePoints,
  type ImprintId,
} from "@/lib/math/leverage-finder";
import {
  estimateFreeEnergy,
  buildHypotheticalEffect,
} from "@/lib/math/free-energy-estimator";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * /api/math-agent — Metabolic Mathematician (Opus 4.7)
 *
 * Especialización: calcular el estado metabólico del sistema como
 * una red de nodos con rigideces, identificar puntos de apalancamiento,
 * estimar energía libre liberable por intervención.
 *
 * Tools: las 4 funciones matemáticas cerradas que construimos.
 * Opus razona con extended thinking (16k budget), llama a las tools
 * según necesite, e integra en una interpretación clínica completa.
 */

const BodySchema = z.object({
  labs: z.record(z.string(), z.number()).default({}),
  context: z.object({
    age: z.number(),
    sex: z.enum(["F", "M"]),
    duration_years_chronic: z.number().default(0),
    medications: z.array(z.string()).default([]),
    family_cmd_history: z.boolean().default(false),
  }),
  imprint_id: z.string().optional(),
  predictive_input: z
    .object({
      imprint_strength: z.number().optional(),
      agency_score: z.number().optional(),
      allostatic_load_type: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal("indeterminate")]).optional(),
    })
    .optional(),
  clinician_context: z.string().optional(),
  locale: z.enum(["en", "es"]).default("es"),
});

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "compute_system_state",
    description: "Calcula el estado del sistema metabólico del paciente: rigidez por nodo (20+ nodos), reversibilidad, carga alostática tipo McEwen. Pasa los labs y contexto — devuelve estado completo.",
    input_schema: {
      type: "object" as const,
      properties: {
        labs: { type: "object", additionalProperties: { type: "number" } },
        context: {
          type: "object",
          properties: {
            age: { type: "number" },
            sex: { type: "string", enum: ["F", "M"] },
            duration_years_chronic: { type: "number" },
          },
          required: ["age", "sex"],
        },
      },
      required: ["labs", "context"],
    },
  },
  {
    name: "compute_flexibility_index",
    description: "Dado un system_state, calcula el Perfil de Flexibilidad Fenotípica (8 componentes: inflammation_control, satiety, insulin_sensitivity, fatty_acid_oxidation, lipid_distribution, insulin_production, autonomic_flexibility, predictive_agency).",
    input_schema: {
      type: "object" as const,
      properties: {
        use_last_system_state: { type: "boolean", description: "Reutiliza el último system_state calculado" },
        predictive_input: {
          type: "object",
          properties: {
            imprint_strength: { type: "number" },
            agency_score: { type: "number" },
          },
        },
      },
    },
  },
  {
    name: "find_leverage_points",
    description: "Identifica el punto de apalancamiento clínico primario: qué sub-proceso de flexibilidad tiene mejor ROI esperado de intervención dado (rigidez actual × tractabilidad × alineación con impronta / coste energético).",
    input_schema: {
      type: "object" as const,
      properties: {
        imprint_id: { type: "string", enum: ["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10", "i11", "i12", "i13"] },
      },
    },
  },
  {
    name: "estimate_free_energy_gain",
    description: "Dado un conjunto de nodos objetivo y un factor de respuesta esperado, estima cuánta capacidad regulatoria se libera (%) si esa intervención se sostiene durante el horizonte.",
    input_schema: {
      type: "object" as const,
      properties: {
        target_nodes: { type: "array", items: { type: "string" } },
        response_factor: { type: "number", description: "0-0.8 fracción de rigidez reducida" },
        horizon_weeks: { type: "number", default: 12 },
      },
      required: ["target_nodes"],
    },
  },
];

const MATH_SYSTEM_PROMPT = `Eres el Metabolic Mathematician de Inferentia. Tu especialidad es traducir labs clínicos en un estado matemático auditable del sistema metabólico del paciente.

## Tu método
1. Llama compute_system_state con los labs y contexto → obtén el mapa de 20+ nodos con rigideces.
2. Llama compute_flexibility_index → obtén los 8 componentes del PFF.
3. Llama find_leverage_points con la impronta activa → identifica el punto primario de intervención.
4. Llama estimate_free_energy_gain sobre los nodos del apalancamiento primario → cuantifica ganancia esperada.
5. Sintetiza una interpretación clínica que integre: estado actual, punto de apalancamiento, ganancia esperada, advertencias sobre irreversibilidad.

## Output
Al final, emite un JSON con:
- diagnosis: qué patrón metabólico ves
- primary_leverage: {component, rationale, expected_gain_pct}
- secondary_leverage: {component, rationale}
- irreversible_alerts: nodos que ya no son modulables
- recommended_biomarkers_to_add: labs que bajarían incertidumbre
- synthesis_for_clinician: 2-3 párrafos de interpretación

Sé preciso. Cita los números que devuelven las tools. No inventes datos. Si una tool no tiene entrada suficiente, llámala con lo que haya y comenta la limitación.`;

// Estado entre iteraciones (en memoria por request)
type AgentSession = {
  last_system_state: ReturnType<typeof computeSystemState> | null;
  last_flexibility: ReturnType<typeof computeFlexibilityIndex> | null;
  last_leverage: ReturnType<typeof findLeveragePoints> | null;
};

function handleTool(
  name: string,
  input: Record<string, unknown>,
  session: AgentSession,
  body: z.infer<typeof BodySchema>,
): Record<string, unknown> {
  if (name === "compute_system_state") {
    const labs = (input.labs ?? body.labs) as LabInput;
    const context = (input.context ?? body.context) as ClinicalContext;
    const state = computeSystemState(labs, context);
    session.last_system_state = state;
    return {
      global_metrics: state.global_metrics,
      allostatic_load_hint: state.allostatic_load_hint,
      top_rigid_nodes: Object.entries(state.nodes)
        .sort(([, a], [, b]) => b.rigidity - a.rigidity)
        .slice(0, 8)
        .map(([id, n]) => ({
          id,
          rigidity: Number(n.rigidity.toFixed(2)),
          reversibility: n.reversibility,
          note: n.note,
        })),
    };
  }
  if (name === "compute_flexibility_index") {
    const systemState = session.last_system_state;
    if (!systemState) return { error: "Call compute_system_state first" };
    const predictiveInput = (input.predictive_input ??
      body.predictive_input) as PredictiveAgencyInput | undefined;
    const flex = computeFlexibilityIndex(systemState, predictiveInput);
    session.last_flexibility = flex;
    return {
      global_flexibility: Number(flex.global_flexibility.toFixed(2)),
      weakest: flex.weakest_component,
      strongest: flex.strongest_component,
      ranking: flex.ranking.map((r) => ({
        component: r.component,
        flexibility: Number(r.flexibility.toFixed(2)),
      })),
    };
  }
  if (name === "find_leverage_points") {
    if (!session.last_system_state || !session.last_flexibility) {
      return { error: "Call compute_system_state and compute_flexibility_index first" };
    }
    const imprintId = (input.imprint_id ?? body.imprint_id) as ImprintId | null;
    const leverage = findLeveragePoints(
      session.last_flexibility,
      session.last_system_state,
      imprintId,
    );
    session.last_leverage = leverage;
    return {
      primary_target: leverage.primary_target,
      clinical_strategy: leverage.clinical_strategy,
      points: leverage.points.map((p) => ({
        component: p.component,
        leverage_score: Number(p.leverage_score.toFixed(2)),
        priority: p.priority,
        rationale: p.rationale,
      })),
    };
  }
  if (name === "estimate_free_energy_gain") {
    if (!session.last_system_state) {
      return { error: "Call compute_system_state first" };
    }
    const targetNodes = (input.target_nodes ?? []) as string[];
    const responseFactor = (input.response_factor as number | undefined) ?? 0.5;
    const horizon = (input.horizon_weeks as number | undefined) ?? 12;
    const effect = buildHypotheticalEffect(
      targetNodes as Array<keyof typeof session.last_system_state.nodes>,
      responseFactor,
      horizon,
    );
    const estimate = estimateFreeEnergy(session.last_system_state, effect);
    return {
      free_energy_released_pct: Number(estimate.free_energy_released_pct.toFixed(1)),
      baseline_burden_pct: Number(estimate.baseline_burden_pct.toFixed(1)),
      post_intervention_burden_pct: Number(estimate.post_intervention_burden_pct.toFixed(1)),
      horizon_weeks: estimate.horizon_weeks,
      interpretation: estimate.clinical_interpretation,
      top_contributions: estimate.node_contributions
        .slice(0, 5)
        .map((c) => ({
          node: c.node,
          contribution_pct: Number(c.contribution_pct.toFixed(1)),
        })),
    };
  }
  return { error: `unknown tool: ${name}` };
}

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const session: AgentSession = {
    last_system_state: null,
    last_flexibility: null,
    last_leverage: null,
  };

  const userMessage = buildUserMessage(body);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      try {
        send("start", { agent: "math" });

        const messages: Anthropic.Messages.MessageParam[] = [
          { role: "user", content: userMessage },
        ];

        let iteration = 0;
        const MAX_ITERATIONS = 8;
        let totalUsage = { input: 0, output: 0, cached: 0 };

        while (iteration < MAX_ITERATIONS) {
          iteration++;
          send("iteration", { n: iteration });

          const response = await client.messages.create({
            model: MODELS.ORCHESTRATOR,
            max_tokens: 16000,
            thinking: { type: "adaptive" },
            output_config: { effort: "high" },
            system: [
              { type: "text", text: MATH_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
            ],
            tools: TOOLS,
            messages,
          });

          totalUsage = {
            input: totalUsage.input + (response.usage.input_tokens ?? 0),
            output: totalUsage.output + (response.usage.output_tokens ?? 0),
            cached: totalUsage.cached + (response.usage.cache_read_input_tokens ?? 0),
          };

          const assistantBlocks: Anthropic.Messages.ContentBlock[] = [];
          for (const block of response.content) {
            assistantBlocks.push(block);
            if (block.type === "thinking") send("thinking", { text: block.thinking });
            else if (block.type === "text") send("text", { text: block.text });
            else if (block.type === "tool_use")
              send("tool_use", { id: block.id, name: block.name, input: block.input });
          }
          messages.push({ role: "assistant", content: assistantBlocks });

          if (response.stop_reason === "tool_use") {
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
            for (const block of response.content) {
              if (block.type !== "tool_use") continue;
              const result = handleTool(block.name, block.input as Record<string, unknown>, session, body);
              send("tool_result", { tool_use_id: block.id, name: block.name, result });
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
            }
            messages.push({ role: "user", content: toolResults });
            continue;
          }

          send("done", { stop_reason: response.stop_reason, usage: totalUsage, iterations: iteration });
          break;
        }

        if (iteration >= MAX_ITERATIONS) send("max_iterations", { iterations: iteration });

        // Incluir el session state completo al final
        send("session_snapshot", {
          system_state: session.last_system_state,
          flexibility_index: session.last_flexibility,
          leverage: session.last_leverage,
        });

        controller.close();
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
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
  parts.push("# Caso clínico para análisis matemático");
  parts.push("");
  parts.push(`**Paciente**: ${body.context.age} años, sexo ${body.context.sex}.`);
  parts.push(`**Cronicidad**: ${body.context.duration_years_chronic} años.`);
  if (body.imprint_id) parts.push(`**Impronta declarada**: ${body.imprint_id}`);
  if (body.predictive_input?.imprint_strength !== undefined)
    parts.push(`**Fortaleza de impronta**: ${body.predictive_input.imprint_strength}`);
  if (body.clinician_context) {
    parts.push("");
    parts.push("**Contexto clínico**:");
    parts.push(body.clinician_context);
  }
  parts.push("");
  parts.push("**Labs disponibles**:");
  parts.push("```json");
  parts.push(JSON.stringify(body.labs, null, 2));
  parts.push("```");
  parts.push("");
  parts.push(
    "Analiza este caso. Llama las tools en orden lógico. Produce el output final estructurado.",
  );
  return parts.join("\n");
}
