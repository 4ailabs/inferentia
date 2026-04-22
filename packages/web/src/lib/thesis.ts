/**
 * Claude model IDs used across Inferentia.
 *
 * Distribution rationale:
 * - Opus 4.7 → orchestrator, clinical synthesis, output transformation (high cost, deep reasoning).
 * - Sonnet 4.6 → specialized subagents (prior extraction, imprint classification).
 * - Haiku 4.5 → turn-by-turn interview with patient (low latency, low cost).
 */
export const MODELS = {
  ORCHESTRATOR: "claude-opus-4-7",
  SUBAGENT: "claude-sonnet-4-6",
  INTERVIEW: "claude-haiku-4-5-20251001",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
