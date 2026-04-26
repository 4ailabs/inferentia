/**
 * Modulator Database Loader
 *
 * Carga la base de conocimiento de moduladores moleculares del
 * archivo JSON construido por investigación agéntica.
 *
 * Si el archivo no existe aún, devuelve un placeholder con 3
 * moduladores ejemplo para que el endpoint pueda funcionar en
 * desarrollo antes de que la investigación termine.
 */

import fs from "node:fs";
import path from "node:path";

export type Modulator = {
  modulator_id: string;
  display_name_es: string;
  display_name_en: string;
  molecular_class: string;
  target_nodes: string[];
  target_flexibility_components: string[];
  mechanism_brief: string;
  mechanism_detailed?: string;
  pathway_genes: string[];
  snp_interactions: Array<{ snp: string; gene: string; effect: string }>;
  food_sources_mg_per_100g?: Record<string, number>;
  dose_range: {
    low?: number;
    therapeutic?: number;
    high?: number;
    max_safe?: number;
    unit: string;
    timing?: string;
  };
  forms_bioavailability?: {
    preferred?: string;
    poor?: string;
    note?: string;
  };
  contraindications: string[];
  synergies?: string[];
  antagonisms?: string[];
  evidence_level: "A" | "B" | "C" | "D";
  evidence_notes?: string;
  key_references: string[];
  bv4_imprint_alignment?: Record<string, string>;
};

const DB_PATH = path.resolve(
  process.cwd(),
  "src/lib/modulators/modulators-db.json",
);

const PLACEHOLDER: Modulator[] = [
  {
    modulator_id: "quercetin",
    display_name_es: "Quercetina",
    display_name_en: "Quercetin",
    molecular_class: "flavonol",
    target_nodes: [
      "adipose_inflammation",
      "endothelial_inflammation",
      "systemic_inflammation",
    ],
    target_flexibility_components: ["inflammation_control"],
    mechanism_brief:
      "Inhibidor de NLRP3, modulador NF-κB, estabilizador de mastocitos; induce Nrf2.",
    pathway_genes: ["NFKB1", "NLRP3", "PPARG", "SIRT1", "NFE2L2"],
    snp_interactions: [],
    food_sources_mg_per_100g: {
      capers: 180,
      onions_red: 20,
      kale: 23,
      apples_with_skin: 4.4,
    },
    dose_range: {
      low: 100,
      therapeutic: 500,
      high: 1000,
      unit: "mg/day",
      timing: "con comida grasa",
    },
    contraindications: ["anticoagulantes (warfarina)", "ciclosporina"],
    evidence_level: "B",
    key_references: ["Li et al. 2016", "Shi et al. 2019"],
    bv4_imprint_alignment: { i8: "favorable", i4: "favorable" },
  },
  {
    modulator_id: "epa_dha",
    display_name_es: "EPA + DHA (omega-3)",
    display_name_en: "EPA + DHA (omega-3)",
    molecular_class: "ácido graso n-3 de cadena larga",
    target_nodes: [
      "systemic_inflammation",
      "endothelial_inflammation",
      "hepatic_inflammation",
      "muscle_metabolic_inflexibility",
    ],
    target_flexibility_components: [
      "inflammation_control",
      "fatty_acid_oxidation",
      "autonomic_flexibility",
    ],
    mechanism_brief:
      "Sustrato de resolvinas, protectinas, maresinas; desplaza ratio n-6/n-3 hacia resolución inflamatoria. Mejora HRV, reduce TG.",
    pathway_genes: ["PPARA", "PPARG", "NFKB1", "FADS1", "FADS2"],
    snp_interactions: [
      {
        snp: "rs174547",
        gene: "FADS1",
        effect:
          "portadores homocigotos del alelo menor convierten ALA→EPA ineficientemente; priorizar EPA/DHA directamente en lugar de precursores vegetales",
      },
    ],
    food_sources_mg_per_100g: {
      sardines: 1500,
      salmon_wild: 1000,
      mackerel: 2500,
      anchovies: 1700,
    },
    dose_range: {
      low: 1000,
      therapeutic: 2000,
      high: 4000,
      max_safe: 5000,
      unit: "mg EPA+DHA/day",
      timing: "con comida grasa",
    },
    contraindications: [
      "anticoagulantes a dosis altas",
      "peri-quirúrgico (suspender 7d antes)",
    ],
    evidence_level: "A",
    key_references: [
      "Calder 2017, Biochem Soc Trans",
      "GISSI-Prevenzione 1999",
      "REDUCE-IT 2019, NEJM",
    ],
    bv4_imprint_alignment: {
      i1: "favorable (estabiliza autonómico)",
      i4: "favorable (reduce catecolaminas)",
      i8: "favorable (perfil lipídico)",
      i7: "favorable (mitocondrial)",
    },
  },
  {
    modulator_id: "berberine",
    display_name_es: "Berberina",
    display_name_en: "Berberine",
    molecular_class: "alcaloide isoquinolínico",
    target_nodes: [
      "systemic_IR",
      "hepatic_IR",
      "high_glucose",
      "dyslipidemia",
    ],
    target_flexibility_components: [
      "insulin_sensitivity",
      "lipid_distribution",
    ],
    mechanism_brief:
      "Activa AMPK, suprime gluconeogénesis hepática, mejora captación GLUT4, modula microbiota.",
    pathway_genes: ["PRKAA1", "PRKAA2", "SREBF1", "PPARG", "SLC2A4"],
    snp_interactions: [],
    dose_range: {
      low: 500,
      therapeutic: 1500,
      high: 2000,
      unit: "mg/day dividido",
      timing: "con comidas principales",
    },
    contraindications: [
      "embarazo (categoría C)",
      "hipoglucemiantes (riesgo aditivo)",
      "ciclosporina",
    ],
    synergies: ["silymarin", "alpha_lipoic_acid"],
    evidence_level: "A",
    key_references: [
      "Yin et al. 2008, Metabolism",
      "Dong et al. 2013, Evid Based Complement Altern Med (meta-análisis)",
    ],
    bv4_imprint_alignment: {
      i8: "favorable (escasez metabólica)",
      i7: "cauteloso (baja energía de base)",
    },
  },
];

let cache: Modulator[] | null = null;

export function loadModulators(): {
  modulators: Modulator[];
  source: "file" | "placeholder";
  count: number;
} {
  if (cache) return { modulators: cache, source: "file", count: cache.length };
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      const parsed = JSON.parse(raw) as Modulator[];
      cache = parsed;
      return { modulators: parsed, source: "file", count: parsed.length };
    }
  } catch {
    // fall through to placeholder
  }
  return { modulators: PLACEHOLDER, source: "placeholder", count: PLACEHOLDER.length };
}

/**
 * Filtra moduladores por nodos metabólicos objetivo.
 */
export function findModulatorsForNodes(
  targetNodes: string[],
  topK: number = 10,
): Modulator[] {
  const { modulators } = loadModulators();
  const scored = modulators.map((m) => {
    const matches = m.target_nodes.filter((n) => targetNodes.includes(n)).length;
    return { mod: m, score: matches };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.mod);
}

/**
 * Filtra por componente de flexibilidad.
 */
export function findModulatorsForComponent(
  component: string,
  topK: number = 10,
): Modulator[] {
  const { modulators } = loadModulators();
  return modulators
    .filter((m) => m.target_flexibility_components.includes(component))
    .slice(0, topK);
}
