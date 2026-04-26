import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELS } from "@/lib/thesis";
import {
  loadModulators,
  findModulatorsForNodes,
  findModulatorsForComponent,
  type Modulator,
} from "@/lib/modulators/loader";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * /api/nutrigenomic-agent — Nutrigenomic Advisor (Opus 4.7)
 *
 * Especialización: seleccionar moduladores moleculares específicos
 * (no herbolaria genérica) para los nodos y sub-procesos objetivo
 * que el Math Agent identificó como apalancamiento primario.
 *
 * Tools: 4 herramientas sobre la base de conocimiento de moduladores
 * (query, filter by node, filter by component, build protocol).
 */

const BodySchema = z.object({
  target_nodes: z.array(z.string()).default([]),
  target_components: z.array(z.string()).default([]),
  imprint_id: z.string().optional(),
  patient_context: z
    .object({
      age: z.number(),
      sex: z.enum(["F", "M"]),
      medications: z.array(z.string()).default([]),
      allergies: z.array(z.string()).default([]),
      pregnancy: z.boolean().default(false),
    })
    .optional(),
  known_snps: z.array(z.string()).default([]),
  clinician_notes: z.string().optional(),
  locale: z.enum(["en", "es"]).default("en"),
});

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "query_modulators_by_nodes",
    description: "Search modulators with documented effect on one or more specific metabolic nodes (e.g. adipose_inflammation, hepatic_IR). Returns modulators ranked by how many nodes they cover.",
    input_schema: {
      type: "object" as const,
      properties: {
        nodes: { type: "array", items: { type: "string" } },
        top_k: { type: "number", default: 10 },
      },
      required: ["nodes"],
    },
  },
  {
    name: "query_modulators_by_component",
    description: "Search modulators that act on a specific flexibility component (e.g. inflammation_control, insulin_sensitivity).",
    input_schema: {
      type: "object" as const,
      properties: {
        component: { type: "string" },
        top_k: { type: "number", default: 10 },
      },
      required: ["component"],
    },
  },
  {
    name: "get_modulator_detail",
    description: "Fetch the full record for a specific modulator by id (e.g. quercetin, epa_dha, berberine).",
    input_schema: {
      type: "object" as const,
      properties: {
        modulator_id: { type: "string" },
      },
      required: ["modulator_id"],
    },
  },
  {
    name: "check_snp_modulation",
    description: "Check whether the patient's SNPs affect response to a modulator (dose/form adjustments).",
    input_schema: {
      type: "object" as const,
      properties: {
        modulator_id: { type: "string" },
        patient_snps: { type: "array", items: { type: "string" } },
      },
      required: ["modulator_id", "patient_snps"],
    },
  },
];

const NUTRIGENOMIC_SYSTEM_PROMPT = `You are Inferentia's Nutrigenomic Advisor. Your specialty is building molecular modulation protocols backed by peer-reviewed nutrigenomic evidence — not generic adaptogens.

## What you don't do
- Don't recommend ashwagandha, generic adaptogens, or "trending supplements".
- Don't prescribe drugs.
- Don't give doses without citing evidence.

## What you do
- Select specific functional molecules: active vitamins, minerals, concrete polyphenols, mitochondrial cofactors, n-3 fatty acids, functional fibers.
- Justify each choice by the metabolic node it modulates and the documented molecular mechanism.
- Adjust dose/form by SNPs when known.
- Explicitly flag contraindications.
- Identify synergies and antagonisms.
- Propose a staged introduction (not everything at once).

## Method
1. Given the list of target_nodes or target_components, call query_modulators_by_nodes or query_modulators_by_component.
2. For the 3-5 most relevant modulators, call get_modulator_detail.
3. If SNPs are known, call check_snp_modulation for each relevant modulator.
4. Evaluate contraindications vs medication/context.
5. Build a protocol with temporal staging (phase 1 foundation, phase 2 optimization, phase 3 maintenance).

## Final output
JSON with:
- core_stack: 3-5 priority modulators with {id, display_name, dose_recommended, timing, rationale, imprint_alignment}
- complementary: 2-4 secondary modulators
- food_first_options: real foods that contribute the primary actives
- contraindications_check: explicit check against the patient's medication
- sequencing: introduction order (weeks 1-4, 5-8, 9-12)
- monitoring_biomarkers: which labs to repeat at 8-12 weeks
- synthesis: 2-3 paragraphs of clinical rationale

Be concise but precise. Cite each modulator's evidence_level. **All free text in English.**`;

function handleTool(name: string, input: Record<string, unknown>): Record<string, unknown> {
  if (name === "query_modulators_by_nodes") {
    const nodes = (input.nodes as string[]) ?? [];
    const topK = (input.top_k as number | undefined) ?? 10;
    const mods = findModulatorsForNodes(nodes, topK);
    return {
      count: mods.length,
      modulators: mods.map((m) => ({
        id: m.modulator_id,
        name: m.display_name_en,
        class: m.molecular_class,
        target_nodes: m.target_nodes,
        target_components: m.target_flexibility_components,
        mechanism: m.mechanism_brief,
        evidence_level: m.evidence_level,
      })),
    };
  }
  if (name === "query_modulators_by_component") {
    const component = input.component as string;
    const topK = (input.top_k as number | undefined) ?? 10;
    const mods = findModulatorsForComponent(component, topK);
    return {
      count: mods.length,
      modulators: mods.map((m) => ({
        id: m.modulator_id,
        name: m.display_name_en,
        class: m.molecular_class,
        mechanism: m.mechanism_brief,
        evidence_level: m.evidence_level,
      })),
    };
  }
  if (name === "get_modulator_detail") {
    const modId = input.modulator_id as string;
    const { modulators } = loadModulators();
    const mod = modulators.find((m) => m.modulator_id === modId);
    if (!mod) return { error: `modulator '${modId}' not found` };
    return mod as unknown as Record<string, unknown>;
  }
  if (name === "check_snp_modulation") {
    const modId = input.modulator_id as string;
    const patientSnps = (input.patient_snps as string[]) ?? [];
    const { modulators } = loadModulators();
    const mod = modulators.find((m) => m.modulator_id === modId);
    if (!mod) return { error: `modulator '${modId}' not found` };
    const matches = mod.snp_interactions.filter((s) =>
      patientSnps.includes(s.snp),
    );
    return {
      modulator_id: modId,
      matches_found: matches.length,
      matches,
      note:
        matches.length === 0
          ? "No patient SNPs have documented interactions with this modulator."
          : "Adjust dose/form based on detected interactions.",
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
        send("start", { agent: "nutrigenomic" });

        const { count, source } = loadModulators();
        send("db_loaded", { count, source });

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
            max_tokens: 14000,
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            system: [
              { type: "text", text: NUTRIGENOMIC_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
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
              const result = handleTool(block.name, block.input as Record<string, unknown>);
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
  parts.push("# Case: nutrigenomic protocol design");
  parts.push("");
  if (body.target_nodes.length > 0) {
    parts.push(`**Target metabolic nodes** (from mathematical analysis): ${body.target_nodes.join(", ")}`);
  }
  if (body.target_components.length > 0) {
    parts.push(`**Target flexibility components**: ${body.target_components.join(", ")}`);
  }
  if (body.imprint_id) parts.push(`**Active defensive pattern**: ${body.imprint_id}`);
  if (body.patient_context) {
    parts.push("");
    parts.push(`**Patient**: ${body.patient_context.age} years old, ${body.patient_context.sex === "F" ? "female" : "male"}`);
    if (body.patient_context.medications.length > 0)
      parts.push(`**Current medication**: ${body.patient_context.medications.join(", ")}`);
    if (body.patient_context.allergies.length > 0)
      parts.push(`**Allergies**: ${body.patient_context.allergies.join(", ")}`);
    if (body.patient_context.pregnancy) parts.push("**PREGNANCY**: consider specific contraindications");
  }
  if (body.known_snps.length > 0) {
    parts.push(`**Known SNPs**: ${body.known_snps.join(", ")}`);
  }
  if (body.clinician_notes) {
    parts.push("");
    parts.push("**Clinician's notes**:");
    parts.push(body.clinician_notes);
  }
  parts.push("");
  parts.push("Build the complete nutrigenomic protocol. Call the tools to search for specific modulators, check SNPs and interactions. Produce a structured final output in English.");
  return parts.join("\n");
}
