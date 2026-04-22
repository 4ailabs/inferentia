import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { MODELS } from "@/lib/thesis";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Health endpoint. Exercises the full Opus 4.7 path with prompt caching
 * so we verify in production that:
 * 1. The API key is wired.
 * 2. The Anthropic provider is reachable.
 * 3. Prompt caching infrastructure responds correctly.
 * 4. Model routing to claude-opus-4-7 resolves.
 *
 * Returns model version, cache hit counters, and thesis recall as a
 * sanity check that the orchestrator's system prompt is loaded.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    // Cacheable system prompt simulating the stable block of a real orchestrator
    // call. In production this would be ~30k tokens (thesis + imprint signatures +
    // network graph). We attach it via `messages` with providerOptions so AI SDK v6
    // forwards the Anthropic cacheControl marker correctly.
    const { text, usage, providerMetadata } = await generateText({
      model: anthropic(MODELS.ORCHESTRATOR),
      messages: [
        {
          role: "system",
          content:
            'You are the Inferentia orchestrator. Acknowledge the request by returning strictly the JSON {"status":"alive","thesis":"predictive organism"}. No other text. No markdown fences.',
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { role: "user", content: "Health check." },
      ],
    });

    return Response.json({
      ok: true,
      elapsed_ms: Date.now() - startedAt,
      model: MODELS.ORCHESTRATOR,
      response: text.trim(),
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: (usage as { cachedInputTokens?: number })
          .cachedInputTokens,
      },
      providerMetadata: providerMetadata?.anthropic,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        ok: false,
        elapsed_ms: Date.now() - startedAt,
        error: message,
      },
      { status: 500 },
    );
  }
}
