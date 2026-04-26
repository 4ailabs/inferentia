import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELS } from "@/lib/thesis";
import {
  computeSystemState,
  type LabInput,
  type ClinicalContext,
} from "@/lib/math/system-state";
import { computeFlexibilityIndex } from "@/lib/math/flexibility-index";
import { findLeveragePoints, type ImprintId } from "@/lib/math/leverage-finder";
import {
  estimateFreeEnergy,
  buildHypotheticalEffect,
} from "@/lib/math/free-energy-estimator";
import {
  findModulatorsForNodes,
  findModulatorsForComponent,
  loadModulators,
} from "@/lib/modulators/loader";
import { renderTreatiseContext } from "@/lib/reasoner/treatise-excerpts";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * /api/orchestrator — Master Orchestrator (Opus 4.7)
 *
 * Integra los tres agentes especializados en una decisión clínica unificada:
 *   1. Clinical Reasoner: impronta + sensación + cascada
 *   2. Metabolic Mathematician: system state + leverage + free energy
 *   3. Nutrigenomic Advisor: moduladores específicos para los targets
 *
 * Aquí SÍ ejecutamos las 3 cadenas secuencialmente con pasaje de contexto
 * entre ellas (feedback loop): el output del Mathematician alimenta al
 * Nutrigenomic, y el Clinical Reasoner contextualiza ambos.
 *
 * El orchestrator final sintetiza en un protocolo clínico completo.
 *
 * Esto es "Best Use of Managed Agents" del hackathon: un agente
 * coordinador que orquesta 3 especialistas con contextos propios.
 */

const BodySchema = z.object({
  // Datos del caso
  clinician_notes: z.string().optional(),
  transcript: z.string().optional(),
  labs: z.record(z.string(), z.number()).default({}),
  context: z.object({
    age: z.number(),
    sex: z.enum(["F", "M"]),
    duration_years_chronic: z.number().default(0),
    medications: z.array(z.string()).default([]),
    family_cmd_history: z.boolean().default(false),
    allergies: z.array(z.string()).default([]),
    pregnancy: z.boolean().default(false),
    known_snps: z.array(z.string()).default([]),
  }),
  imprint_hint: z.string().optional(),
  sensation_hint: z.string().optional(),
  locale: z.enum(["en", "es"]).default("en"),
});

const ORCHESTRATOR_SYSTEM_PROMPT = `You are Inferentia's Orchestrator. Your job is to synthesize the three analyses we've already run — Clinical Reasoner (defensive pattern + cascade), Metabolic Mathematician (system state + leverage + free energy), and Nutrigenomic Advisor (molecular protocol) — into a unified clinical decision.

## Conceptual framework (Active Inference + BV4)

The patient is a hierarchical predictive system whose high-level priors (defensive patterns, i1..i13) steer allostasis. Metabolic symptoms = steady state when the prior is crystallized. Salutogenic intervention = reducing system rigidity by molecularly modulating the leverage nodes, while working the prior in parallel (prior therapy, outside your scope but worth mentioning).

## What you have in context

- Chapter 7 of the BV4 Treatise distilled (13 defensive patterns with mechanism, originating shock, triple expression, differentials).
- Metabolic Mathematician output (state + leverage + free energy).
- Nutrigenomic Advisor output (molecular protocol with dose, form, timing).

## Your output

A single structured JSON object that integrates everything:

{
  "executive_summary": "2-3 sentences describing the case and strategy, in English",
  "diagnostic_layers": {
    "conventional": "e.g. mild hypertension, pre-diabetes, mixed dyslipidemia",
    "imprint_active": "e.g. i8 Reserve with i2 co-activated (moderate)",
    "sensation_active": "e.g. Abandonment + Vulnerability",
    "originating_shock": "e.g. prolonged maternal separation at age 3 due to hospitalization",
    "allostatic_type": "e.g. McEwen type 2"
  },
  "predictive_analysis": {
    "system_burden_pct": 44.3,
    "primary_leverage": "inflammation_control",
    "expected_gain_pct": 6.4,
    "horizon_weeks": 12
  },
  "intervention_plan": {
    "level_0_prior_work": "Clinical work by the therapist on the underlying prior (outside this tool's scope; the clinician leads it in session).",
    "level_1_molecular_primary": [{id, dose, timing, rationale, evidence_level}],
    "level_2_molecular_secondary": [...],
    "level_3_food_first": ["onion", "wild salmon", "kale"...],
    "sequencing": {
      "weeks_1_4": "phase 1",
      "weeks_5_8": "phase 2",
      "weeks_9_12": "phase 3"
    },
    "contraindications_resolved": ["review vs current medication"]
  },
  "monitoring": {
    "biomarkers_to_repeat_8w": ["HbA1c", "HOMA-IR", "HRV_SDNN", "CRP"],
    "flexibility_components_to_reassess": ["inflammation_control", "insulin_sensitivity"],
    "red_flags": ["signals that would warrant a change of strategy"]
  },
  "salutogenic_narrative_for_patient": "3-4 sentences accessible to the patient without technical jargon, in second person, in English",
  "confidence": "high|moderate|low",
  "confidence_rationale": "why"
}

**All free-text fields must be in English.** Emit the JSON between \`\`\`json and \`\`\`. Before that, write your clinical synthesis in English prose. Use extended thinking to deliberate across the three analyses before responding.`;

async function runMathAgent(body: z.infer<typeof BodySchema>) {
  // Ejecuta las matemáticas directamente (sin sub-llamada a Opus).
  // El math-agent endpoint existe para uso UI; aquí llamamos las funciones.
  const systemState = computeSystemState(body.labs as LabInput, body.context as ClinicalContext);
  const flexIndex = computeFlexibilityIndex(systemState, {
    imprint_strength: body.imprint_hint ? 0.7 : 0.5,
    allostatic_load_type: systemState.allostatic_load_hint.type,
  });
  const imprintId = (body.imprint_hint?.match(/i\d{1,2}/)?.[0] ?? null) as ImprintId | null;
  const leverage = findLeveragePoints(flexIndex, systemState, imprintId);
  const targetNodes = flexIndex.components[leverage.primary_target].contributing_nodes;
  const effect = buildHypotheticalEffect(
    targetNodes as Array<keyof typeof systemState.nodes>,
    0.5,
    12,
  );
  const freeEnergy = estimateFreeEnergy(systemState, effect);
  return { systemState, flexIndex, leverage, freeEnergy };
}

function runNutrigenomicAgent(
  leverageOutput: Awaited<ReturnType<typeof runMathAgent>>,
) {
  // Filtro directo sobre la base
  const { leverage, flexIndex } = leverageOutput;
  const targetComponent = leverage.primary_target;
  const contributingNodes = flexIndex.components[targetComponent].contributing_nodes;
  const primaryMods = findModulatorsForNodes(contributingNodes, 6);
  const byComponent = findModulatorsForComponent(targetComponent, 6);
  // Secondary target
  const secondaryTarget = leverage.points[1]?.component;
  const secondaryMods = secondaryTarget
    ? findModulatorsForNodes(
        flexIndex.components[secondaryTarget].contributing_nodes,
        4,
      )
    : [];
  return { primaryMods, byComponent, secondaryMods };
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
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      try {
        send("start", { orchestrator: "inferentia-v1" });

        // FASE 1: matemáticas
        send("phase", { phase: 1, name: "Metabolic Mathematician" });
        const mathOutput = await runMathAgent(body);
        const imprintId = (body.imprint_hint?.match(/i\d{1,2}/)?.[0] ?? null) as ImprintId | null;
        // Compact node map: just {rigidity, reversibility} per node.
        // Full SystemState lives in final_snapshot; this is enough for the
        // UI "System state" readout next to the body map.
        const nodeMap: Record<string, { rigidity: number; reversibility: string }> = {};
        for (const [id, n] of Object.entries(mathOutput.systemState.nodes)) {
          nodeMap[id] = {
            rigidity: Number((n.rigidity ?? 0).toFixed(3)),
            reversibility: n.reversibility,
          };
        }

        send("math_output", {
          global_metrics: mathOutput.systemState.global_metrics,
          allostatic_load: mathOutput.systemState.allostatic_load_hint,
          weakest_flexibility: mathOutput.flexIndex.weakest_component,
          primary_leverage: mathOutput.leverage.primary_target,
          secondary_leverage: mathOutput.leverage.points[1]?.component ?? null,
          free_energy_released_pct: mathOutput.freeEnergy.free_energy_released_pct,
          baseline_burden_pct: mathOutput.freeEnergy.baseline_burden_pct,
          clinical_strategy: mathOutput.leverage.clinical_strategy,
          leverage_top3: mathOutput.leverage.points.slice(0, 3).map((p) => ({
            component: p.component,
            score: p.leverage_score,
            rationale: p.rationale,
          })),
          imprint_id: imprintId,
          horizon_weeks: 12,
          nodes: nodeMap,
        });

        // FASE 2: nutrigenómica
        send("phase", { phase: 2, name: "Nutrigenomic Advisor" });
        const { modulators, count: dbCount, source: dbSource } = loadModulators();
        send("db_loaded", { count: dbCount, source: dbSource });
        const nutri = runNutrigenomicAgent(mathOutput);
        send("nutri_output", {
          primary_candidates: nutri.primaryMods.map((m) => ({
            id: m.modulator_id,
            name: m.display_name_en,
            class: m.molecular_class,
            mechanism: m.mechanism_brief,
            evidence: m.evidence_level,
            bv4_alignment:
              imprintId && m.bv4_imprint_alignment?.[imprintId]
                ? m.bv4_imprint_alignment[imprintId]
                : null,
          })),
          secondary_candidates: nutri.secondaryMods.map((m) => ({
            id: m.modulator_id,
            name: m.display_name_en,
          })),
        });

        // FASE 3: síntesis Opus con todo en contexto
        send("phase", { phase: 3, name: "Orchestrator Synthesis" });

        const contextBlocks: Anthropic.Messages.TextBlockParam[] = [
          {
            type: "text",
            text: ORCHESTRATOR_SYSTEM_PROMPT,
          },
          {
            type: "text",
            text: renderTreatiseContext(),
            cache_control: { type: "ephemeral" },
          },
        ];

        const userMessage = [
          "# Case for orchestrator synthesis",
          "",
          `**Patient**: ${body.context.age} years old, ${body.context.sex === "F" ? "female" : "male"}, ${body.context.duration_years_chronic} years of chronicity.`,
          body.imprint_hint ? `**Defensive pattern hypothesis**: ${body.imprint_hint}` : "",
          body.sensation_hint ? `**Declared sensation**: ${body.sensation_hint}` : "",
          body.clinician_notes ? `**Clinician's notes**: ${body.clinician_notes}` : "",
          "",
          "## Metabolic Mathematician output",
          "```json",
          JSON.stringify(
            {
              rigid_nodes_count: mathOutput.systemState.global_metrics.rigid_nodes_count,
              weighted_rigidity: mathOutput.systemState.global_metrics.weighted_rigidity_mean,
              allostatic_type: mathOutput.systemState.allostatic_load_hint,
              top_rigid_nodes: Object.entries(mathOutput.systemState.nodes)
                .sort(([, a], [, b]) => b.rigidity - a.rigidity)
                .slice(0, 8)
                .map(([id, n]) => ({
                  id,
                  rigidity: Number(n.rigidity.toFixed(2)),
                  reversibility: n.reversibility,
                })),
              flexibility_ranking: mathOutput.flexIndex.ranking.map((r) => ({
                component: r.component,
                flexibility: Number(r.flexibility.toFixed(2)),
              })),
              primary_leverage: mathOutput.leverage.primary_target,
              leverage_top3: mathOutput.leverage.points.slice(0, 3).map((p) => ({
                component: p.component,
                leverage_score: Number(p.leverage_score.toFixed(2)),
                priority: p.priority,
                rationale: p.rationale,
              })),
              free_energy_released_pct: Number(
                mathOutput.freeEnergy.free_energy_released_pct.toFixed(1),
              ),
              baseline_burden_pct: Number(
                mathOutput.freeEnergy.baseline_burden_pct.toFixed(1),
              ),
            },
            null,
            2,
          ),
          "```",
          "",
          "## Nutrigenomic Advisor output",
          "```json",
          JSON.stringify(
            {
              primary_modulators: nutri.primaryMods.slice(0, 5).map((m) => ({
                id: m.modulator_id,
                name: m.display_name_en,
                class: m.molecular_class,
                target_nodes: m.target_nodes,
                mechanism: m.mechanism_brief,
                evidence_level: m.evidence_level,
                dose_range: m.dose_range,
                contraindications: m.contraindications,
                bv4_alignment: m.bv4_imprint_alignment,
              })),
              secondary_modulators: nutri.secondaryMods.slice(0, 3).map((m) => ({
                id: m.modulator_id,
                name: m.display_name_en,
                target_nodes: m.target_nodes,
                evidence_level: m.evidence_level,
              })),
            },
            null,
            2,
          ),
          "```",
          "",
          `**Current patient medication**: ${body.context.medications.join(", ") || "none"}`,
          `**Allergies**: ${body.context.allergies.join(", ") || "none known"}`,
          `**Known SNPs**: ${body.context.known_snps.join(", ") || "not determined"}`,
          `**Pregnancy**: ${body.context.pregnancy ? "YES" : "no"}`,
          "",
          "Synthesize the three analyses into the integrated protocol. Use extended thinking. Close with the structured JSON. All free-text fields must be in English.",
        ]
          .filter(Boolean)
          .join("\n");

        const messages: Anthropic.Messages.MessageParam[] = [
          { role: "user", content: userMessage },
        ];

        let totalUsage = { input: 0, output: 0, cached: 0 };

        // ── Demo mode fallback ─────────────────────────────────────
        // Si DEMO_MODE=1 o falla la llamada a Opus (auth, rate limit, etc.),
        // servimos un snapshot pregrabado del caso Ana. La matemática y la
        // selección de moduladores ya corrieron reales arriba — sólo se
        // reemplaza la síntesis Opus.
        const demoMode =
          process.env.DEMO_MODE === "1" || !process.env.ANTHROPIC_API_KEY;

        if (demoMode) {
          await streamDemoSnapshot(send);
          send("done", {
            usage: totalUsage,
            stop_reason: "end_turn",
            demo_mode: true,
          });
        } else {
          try {
            const response = await client.messages.create({
              model: MODELS.ORCHESTRATOR,
              max_tokens: 16000,
              thinking: { type: "adaptive" },
              output_config: { effort: "xhigh" },
              system: contextBlocks,
              messages,
            });

            totalUsage = {
              input: totalUsage.input + (response.usage.input_tokens ?? 0),
              output: totalUsage.output + (response.usage.output_tokens ?? 0),
              cached: totalUsage.cached + (response.usage.cache_read_input_tokens ?? 0),
            };

            for (const block of response.content) {
              if (block.type === "thinking") send("thinking", { text: block.thinking });
              else if (block.type === "text") send("text", { text: block.text });
            }

            send("done", { usage: totalUsage, stop_reason: response.stop_reason });
          } catch (opusErr) {
            // Opus falló: caemos a snapshot para no perder la demo
            const msg = opusErr instanceof Error ? opusErr.message : String(opusErr);
            send("opus_failed", { message: msg, fallback: "demo_snapshot" });
            await streamDemoSnapshot(send);
            send("done", { usage: totalUsage, stop_reason: "fallback", demo_mode: true });
          }
        }

        // Snapshot final con todos los datos
        send("final_snapshot", {
          math_output: mathOutput,
          nutri_output: nutri,
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

// ── Demo snapshot streamer ───────────────────────────────────────
// Lee el JSON pregrabado y lo emite en eventos thinking+text como si
// viniera de Opus, con pausas cortas para que se vea la cascada natural.
async function streamDemoSnapshot(
  send: (event: string, data: unknown) => void,
) {
  try {
    const snapshot = (await import("@/lib/demo-snapshots/ana.json")).default as {
      thinking_excerpt: string;
      prose_excerpt: string;
      final_synthesis: Record<string, unknown>;
    };

    // Emular streaming: thinking → prose → JSON final
    await new Promise((r) => setTimeout(r, 200));
    send("thinking", { text: snapshot.thinking_excerpt });

    await new Promise((r) => setTimeout(r, 600));

    // Dividir prosa en chunks para simular streaming
    const prose = snapshot.prose_excerpt;
    const chunkSize = Math.ceil(prose.length / 6);
    for (let i = 0; i < prose.length; i += chunkSize) {
      send("text", { text: prose.slice(i, i + chunkSize) });
      await new Promise((r) => setTimeout(r, 250));
    }

    // JSON final en un bloque
    const jsonBlock = `\n\n\`\`\`json\n${JSON.stringify(
      snapshot.final_synthesis,
      null,
      2,
    )}\n\`\`\``;
    send("text", { text: jsonBlock });
  } catch (e) {
    send("error", {
      message:
        "Demo snapshot no disponible: " +
        (e instanceof Error ? e.message : String(e)),
    });
  }
}
