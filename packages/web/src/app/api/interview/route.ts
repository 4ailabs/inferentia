import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/thesis";

export const runtime = "nodejs";
export const maxDuration = 60;

const INTERVIEWER_SYSTEM = `You are the Inferentia clinical interviewer. Your role is to conduct a short, adaptive clinical interview turn by turn with a patient (or a synthetic patient persona).

GOALS
- Elicit predictive patterns without diagnosing.
- Capture somatic experiences the patient describes, in their own words.
- Notice biographical anchors that suggest upstream priors (scarcity, attachment loss, persistent vigilance, etc.).

STYLE
- Short questions. One at a time.
- Clinical-empathic tone. No jargon, no labels.
- Never mention "imprint", "prior", "BV4", "predictive coding".
- Never give diagnostic conclusions or medical advice during the interview.
- Reflect what the patient just said in one brief sentence, then ask one deeper question.

STOP CRITERIA
- After 5-7 patient turns, wrap up with a gentle closing like: "Thank you. That's enough for now."
- Never exceed 8 turns.`;

type MessagePayload = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: MessagePayload[];
    locale?: "en" | "es";
  };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const localeInstruction =
    body.locale === "es"
      ? "Respond in Spanish. Use second-person informal «tú»."
      : "Respond in English. Second person, warm and sober.";

  try {
    const stream = await client.messages.create({
      model: MODELS.INTERVIEW,
      max_tokens: 300,
      temperature: 0.7,
      system: [
        {
          type: "text",
          text: INTERVIEWER_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: localeInstruction,
        },
      ],
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ delta: event.delta.text })}\n\n`,
                ),
              );
            }
            if (event.type === "message_stop") {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(err) })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
