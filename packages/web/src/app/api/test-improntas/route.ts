/**
 * Endpoint privado del Test de Improntas BV4.
 * Solo disponible en development (NODE_ENV=development).
 * En producción devuelve 404.
 */

import {
  isTestAvailable,
  loadImprintBank,
  type ImprintBank,
} from "@/lib/test/imprint-test-loader";
import {
  runTest,
  type ItemResponses,
} from "@/lib/test/imprint-test-engine";

export const runtime = "nodejs";

function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function GET() {
  if (!isTestAvailable()) return notFound();
  const bank: ImprintBank = loadImprintBank();
  return Response.json({ bank });
}

export async function POST(req: Request) {
  if (!isTestAvailable()) return notFound();
  const bank = loadImprintBank();
  const body = (await req.json()) as { responses: ItemResponses };
  if (!body.responses) {
    return Response.json({ error: "Missing responses" }, { status: 400 });
  }
  const result = runTest(bank, body.responses);
  return Response.json({ ok: true, result });
}
