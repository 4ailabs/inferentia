# @inferentia/web

Next.js 16 frontend for Inferentia. Renders the landing page, the flexibility
network canvas, and hosts the AI SDK endpoints that route to Opus 4.7 / Sonnet
4.6 / Haiku 4.5.

## Stack

- Next.js 16 + Turbopack + App Router.
- AI SDK v6 (`ai`) with `@ai-sdk/anthropic` provider.
- shadcn/ui (slate, new-york) + Tailwind v4.
- React Flow (`@xyflow/react`) for the flexibility network.
- Zod for structured outputs.

## Routes

- `/` — landing with the official thesis and the six-layer overview.
- `/network` — interactive physiopathological graph (33 nodes, 61 edges).
- `/api/health` — Opus 4.7 heartbeat with prompt caching enabled. Returns
  model, latency, token usage (including cached input tokens), and a sanity
  JSON from the orchestrator.

## Dev

```bash
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
pnpm dev
```

Hit `http://localhost:3000` for the landing, `http://localhost:3000/network`
for the graph, and `curl http://localhost:3000/api/health` for the orchestrator
check.

## Model routing

Models are listed in `src/lib/thesis.ts`:

- `claude-opus-4-7` — orchestrator, clinical synthesis, output transformation.
- `claude-sonnet-4-6` — specialized subagents (prior extraction, classification).
- `claude-haiku-4-5-20251001` — patient-facing turn-by-turn interview.
