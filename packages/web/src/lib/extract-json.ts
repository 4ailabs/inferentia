/**
 * Robust JSON extractor for LLM responses.
 *
 * Handles:
 *  - Plain JSON responses.
 *  - JSON wrapped in markdown code fences.
 *  - Preamble text before the JSON (e.g., "Here is the JSON:").
 *  - Trailing commentary after the JSON.
 *  - Prefilled opening "{" when the model is steered to start with a brace.
 *
 * Returns the first balanced top-level JSON object found, or null.
 */
export function extractJsonObject(raw: string): string | null {
  if (!raw) return null;

  // Strip markdown code fences anywhere in the string
  let s = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  // If the model emitted a preamble like "Here is the JSON:", find the first {
  const firstBrace = s.indexOf("{");
  if (firstBrace === -1) return null;
  s = s.slice(firstBrace);

  // Walk the string and track brace depth honoring strings and escapes
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return s.slice(0, i + 1);
      }
    }
  }
  // Unbalanced — return what we have and let JSON.parse throw a clearer error
  return s;
}
