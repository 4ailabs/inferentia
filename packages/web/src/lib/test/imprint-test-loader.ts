/**
 * Loader del banco de ítems del Test de Improntas BV4.
 *
 * IMPORTANTE — PRIVACIDAD:
 * El contenido del banco (los ítems literales) es IP del Dr. Ojeda Ríos.
 * Vive en disco local: /Users/miguel/Claude_hackathon/improntas_test/data/
 * NO se importa como módulo en el bundle. Se carga en tiempo de ejecución
 * desde el filesystem (runtime nodejs), solo en dev local.
 *
 * En producción, el endpoint que usa este loader devuelve 404. El test
 * solo está disponible cuando NODE_ENV === "development".
 */

import fs from "node:fs";
import path from "node:path";

export type LikertItem = { id: string; text: string };

export type ChecklistBlock = {
  prompt: string;
  items: string[];
};

export type ImprintDefinition = {
  id: string;
  name_es: string;
  name_en: string;
  mechanism_es: string;
  items: {
    A: LikertItem[];
    B: LikertItem[];
    C_checklist: ChecklistBlock;
    D: LikertItem[];
    E: LikertItem;
    R: LikertItem;
  };
};

export type ImprintBank = {
  version: string;
  generated: string;
  source: string;
  scoring: {
    weights: { A: number; B: number; C: number; D: number; E: number; R: number };
    thresholds: { probable: number; strong: number; coactivation_gap: number };
    likert_range: [number, number];
    zero_means: string;
  };
  imprints: ImprintDefinition[];
};

const PRIVATE_PATH =
  "/Users/miguel/Claude_hackathon/improntas_test/data/imprint-test-v2.json";

let cache: ImprintBank | null = null;

export function isTestAvailable(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    return fs.existsSync(PRIVATE_PATH);
  } catch {
    return false;
  }
}

export function loadImprintBank(): ImprintBank {
  if (cache) return cache;
  if (!isTestAvailable()) {
    throw new Error(
      "Imprint test bank not available. Requires NODE_ENV=development and local file.",
    );
  }
  const raw = fs.readFileSync(path.resolve(PRIVATE_PATH), "utf8");
  const parsed = JSON.parse(raw) as ImprintBank;
  cache = parsed;
  return parsed;
}
