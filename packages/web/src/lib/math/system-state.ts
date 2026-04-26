/**
 * System State — mapa multicapa del estado metabólico del paciente
 *
 * Derivado de:
 *   - Van Ommen / TNO / NuGO: Phenotypic flexibility network
 *   - McEwen: allostatic load types 1/2/3
 *   - Friston/Stephan: active inference on homeostasis
 *   - Lemche 2016: metabolic syndrome epigenetic programming
 *   - Mehrhof Fleming Nord 2025: interoceptive energy allostasis
 *
 * Cada nodo del mapa de flexibilidad fenotípica es una variable de
 * estado con dos cualidades:
 *   1. Rigidity (0-1): cuán lejos está el nodo de su estado flexible.
 *      0 = completamente flexible; 1 = rígido/comprometido.
 *   2. Reversibility: "reversible" | "borderline" | "irreversible".
 *      El gradiente amarillo→azul de las imágenes.
 *
 * La rigidez se calcula desde biomarcadores observables. La
 * reversibilidad combina rigidez + cronicidad + edad + marcadores
 * estructurales.
 *
 * AUDITABILIDAD: cada score deriva de una fórmula documentada que
 * cita la literatura. Ningún número lo inventa el LLM.
 */

// ──────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────

export type Reversibility = "healthy" | "reversible" | "borderline" | "irreversible";

export type NodeId =
  // ── Nodos de flexibilidad (reversibles en general) ──
  | "visceral_adiposity"
  | "adipose_inflammation"
  | "systemic_inflammation"
  | "ectopic_lipid_overload"
  | "fatty_liver"
  | "hepatic_IR"
  | "adipose_IR"
  | "systemic_IR"
  | "muscle_metabolic_inflexibility"
  | "dyslipidemia"
  | "high_glucose"
  | "high_cholesterol"
  | "LDL_elevated"
  | "endothelial_inflammation"
  | "gut_inflammation"
  | "hepatic_inflammation"
  // ── Nodos de transición (borderline) ──
  | "glucose_toxicity"
  | "beta_cell_failure"
  // ── Nodos irreversibles (daño estructural) ──
  | "microvascular_damage"
  | "atherosclerosis"
  | "hypertension_structural"
  | "fibrosis_hepatic";

export type NodeCategory = "risk_factor" | "pathology_reversible" | "pathology_irreversible";

export type LabInput = Partial<{
  // HPA
  cortisol_am: number; // μg/dL
  cortisol_pm: number;
  dhea_s: number;
  // Metabólicos
  hba1c: number; // %
  fasting_glucose: number; // mg/dL
  fasting_insulin: number; // μU/mL
  homa_ir: number;
  triglycerides: number; // mg/dL
  hdl: number; // mg/dL
  ldl: number;
  total_cholesterol: number;
  leptin: number; // ng/mL
  adiponectin: number; // μg/mL
  // Inflamatorios
  crp: number; // mg/L (hs-CRP)
  il6: number; // pg/mL
  tnf_alpha: number;
  fibrinogen: number; // mg/dL
  // Hepáticos
  alt: number; // U/L
  ast: number;
  ggt: number;
  alkaline_phosphatase: number;
  bilirubin_total: number;
  // Renales
  creatinine: number; // mg/dL
  bun: number;
  // Tiroideos
  tsh: number;
  t3_free: number;
  t4_free: number;
  // Endoteliales / cardiovasculares
  systolic_bp: number; // mmHg
  diastolic_bp: number;
  hrv_sdnn: number; // ms
  // Composición corporal
  waist_circumference_cm: number;
  waist_hip_ratio: number;
  visceral_fat_index: number; // Tanita-like 1-59
  bmi: number;
  body_fat_pct: number;
  // Micronutrientes (para contextualizar capacidad regulatoria)
  vitamin_d_25oh: number; // ng/mL
  b12: number;
  ferritin: number;
  homocysteine: number; // μmol/L
  // Gut
  calprotectin_fecal: number;
  zonulin: number;
}>;

export type ClinicalContext = {
  age: number;
  sex: "F" | "M";
  /** Años con presentación clínica activa */
  duration_years_chronic: number;
  /** Historia de uso de medicamentos relevantes (insulina, metformina, estatinas, corticoides) */
  medications: string[];
  /** Historia familiar cardiometabólica */
  family_cmd_history: boolean;
};

export type NodeState = {
  id: NodeId;
  category: NodeCategory;
  /** 0-1, cuán alejado del estado flexible */
  rigidity: number;
  /** healthy | reversible | borderline | irreversible */
  reversibility: Reversibility;
  /** Qué labs entraron al cálculo */
  inputs_used: Array<keyof LabInput>;
  /** Qué labs faltan y bajarían la incertidumbre */
  inputs_missing: Array<keyof LabInput>;
  /** Desglose del score (para auditoría) */
  contributions: Array<{ factor: string; value: number; weight: number }>;
  /** Nota clínica breve */
  note: string;
};

export type SystemState = {
  version: string;
  nodes: Record<NodeId, NodeState>;
  global_metrics: {
    /** Cuenta de nodos rígidos (rigidity > 0.5) */
    rigid_nodes_count: number;
    /** Cuenta de nodos irreversibles */
    irreversible_nodes_count: number;
    /** Rigidez promedio ponderada por categoría */
    weighted_rigidity_mean: number;
    /** Cobertura diagnóstica: labs disponibles / labs deseables */
    diagnostic_coverage: number;
  };
  allostatic_load_hint: {
    /** Heurística tipo McEwen basada en patrón de rigidez */
    type: 1 | 2 | 3 | "indeterminate";
    rationale: string;
  };
};

// ──────────────────────────────────────────────────────────────
// Helpers: normalización y scoring
// ──────────────────────────────────────────────────────────────

/**
 * Normaliza un valor a [0,1] usando anclas clínicas.
 * @param value valor observado
 * @param optimal valor considerado óptimo (rigidity = 0)
 * @param critical valor considerado crítico (rigidity = 1)
 * @param direction "higher_is_rigid" o "lower_is_rigid"
 */
function score(
  value: number | undefined,
  optimal: number,
  critical: number,
  direction: "higher_is_rigid" | "lower_is_rigid" = "higher_is_rigid",
): number | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  const ratio =
    direction === "higher_is_rigid"
      ? (value - optimal) / (critical - optimal)
      : (optimal - value) / (optimal - critical);
  return Math.max(0, Math.min(1, ratio));
}

/**
 * Promedio ponderado ignorando entradas null.
 */
function weightedMean(
  parts: Array<{ value: number | null; weight: number }>,
): { mean: number; used: number; total: number } {
  const valid = parts.filter((p) => p.value !== null);
  const sumW = valid.reduce((s, p) => s + p.weight, 0);
  if (sumW === 0) return { mean: 0, used: 0, total: parts.length };
  const weighted =
    valid.reduce((s, p) => s + (p.value as number) * p.weight, 0) / sumW;
  const totalW = parts.reduce((s, p) => s + p.weight, 0);
  const coverage = sumW / totalW;
  // Evita que un solo lab secundario alto haga que el nodo parezca 100% rígido
  // cuando los inputs principales están ausentes. Atenuamos por cobertura cuando < 50%.
  const attenuated = coverage < 0.5 ? weighted * coverage * 2 : weighted;
  return { mean: attenuated, used: valid.length, total: parts.length };
}

/**
 * Clasifica reversibilidad combinando rigidez + cronicidad + edad +
 * categoría del nodo. Regla base:
 *   - rigidity < 0.3: healthy
 *   - rigidity 0.3-0.6 + duración < 5 años: reversible
 *   - rigidity 0.6-0.8 O duración 5-10 años: borderline
 *   - rigidity > 0.8 O duración > 10 años O nodo estructural: irreversible
 */
function classifyReversibility(
  rigidity: number,
  category: NodeCategory,
  ctx: ClinicalContext,
): Reversibility {
  if (category === "pathology_irreversible") {
    return rigidity < 0.2 ? "borderline" : "irreversible";
  }
  if (rigidity < 0.3) return "healthy";
  const ageFactor = ctx.age > 65 ? 0.15 : ctx.age > 50 ? 0.08 : 0;
  const durationFactor = ctx.duration_years_chronic >= 10 ? 0.2 : ctx.duration_years_chronic >= 5 ? 0.1 : 0;
  const adjusted = rigidity + ageFactor + durationFactor;
  if (adjusted < 0.55) return "reversible";
  if (adjusted < 0.8) return "borderline";
  return "irreversible";
}

// ──────────────────────────────────────────────────────────────
// Cálculo por nodo
// ──────────────────────────────────────────────────────────────

/**
 * Cada función toma labs + contexto y produce un NodeState.
 * Las fórmulas derivan de rangos clínicos estándar + literatura.
 */

function nodeVisceralAdiposity(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    {
      name: "waist_hip_ratio",
      value: score(
        labs.waist_hip_ratio,
        ctx.sex === "F" ? 0.78 : 0.9,
        ctx.sex === "F" ? 0.9 : 1.05,
      ),
      weight: 0.3,
    },
    {
      name: "visceral_fat_index",
      value: score(labs.visceral_fat_index, 6, 15),
      weight: 0.3,
    },
    {
      name: "waist_circumference_cm",
      value: score(
        labs.waist_circumference_cm,
        ctx.sex === "F" ? 80 : 94,
        ctx.sex === "F" ? 102 : 110,
      ),
      weight: 0.2,
    },
    {
      name: "leptin",
      value: score(labs.leptin, 8, 40),
      weight: 0.2,
    },
  ];
  const { mean } = weightedMean(
    parts.map((p) => ({ value: p.value, weight: p.weight })),
  );
  const reversibility = classifyReversibility(mean, "risk_factor", ctx);
  const inputsUsed = parts
    .filter((p) => p.value !== null)
    .map((p) => p.name as keyof LabInput);
  const inputsMissing = parts
    .filter((p) => p.value === null)
    .map((p) => p.name as keyof LabInput);
  return {
    id: "visceral_adiposity",
    category: "risk_factor",
    rigidity: mean,
    reversibility,
    inputs_used: inputsUsed,
    inputs_missing: inputsMissing,
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean < 0.3
        ? "Depósito visceral dentro de rango saludable."
        : mean < 0.6
          ? "Adiposidad visceral elevada, modulable con intervención nutricional + reducción de cortisol."
          : "Acumulación visceral marcada. Riesgo cardiometabólico elevado. Intervención prioritaria.",
  };
}

function nodeAdiposeInflammation(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "crp", value: score(labs.crp, 0.5, 3.0), weight: 0.3 },
    { name: "il6", value: score(labs.il6, 1.0, 4.0), weight: 0.3 },
    { name: "tnf_alpha", value: score(labs.tnf_alpha, 1.5, 5.0), weight: 0.2 },
    { name: "adiponectin", value: score(labs.adiponectin, 10, 3, "lower_is_rigid"), weight: 0.2 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "adipose_inflammation",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Inflamación adiposa activa — candidato a modulación con Ω-3, quercetina, Zn/Se."
        : mean > 0.3
          ? "Inflamación subclínica. Vigilancia y modulación anti-inflamatoria temprana."
          : "Tejido adiposo en estado metabólicamente sano.",
  };
}

function nodeSystemicInflammation(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "crp", value: score(labs.crp, 0.5, 3.0), weight: 0.35 },
    { name: "il6", value: score(labs.il6, 1.0, 4.0), weight: 0.25 },
    { name: "fibrinogen", value: score(labs.fibrinogen, 250, 450), weight: 0.2 },
    { name: "ferritin", value: score(labs.ferritin, 100, 300), weight: 0.2 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "systemic_inflammation",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Inflamación sistémica elevada. Investigar fuente (metabólica vs autoinmune vs crónica infecciosa)."
        : "Perfil inflamatorio dentro de rango o leve.",
  };
}

function nodeHepaticIR(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "homa_ir", value: score(labs.homa_ir, 1.5, 4.0), weight: 0.4 },
    { name: "fasting_glucose", value: score(labs.fasting_glucose, 90, 126), weight: 0.25 },
    { name: "fasting_insulin", value: score(labs.fasting_insulin, 6, 15), weight: 0.2 },
    { name: "triglycerides", value: score(labs.triglycerides, 100, 200), weight: 0.15 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "hepatic_IR",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Resistencia insulínica hepática marcada. Candidato a berberina, carnitina, colina, bajo índice glucémico."
        : "Sensibilidad hepática a insulina preservada o con tensión leve.",
  };
}

function nodeAdiposeIR(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "homa_ir", value: score(labs.homa_ir, 1.5, 4.0), weight: 0.4 },
    { name: "hdl", value: score(labs.hdl, ctx.sex === "F" ? 55 : 45, ctx.sex === "F" ? 35 : 28, "lower_is_rigid"), weight: 0.25 },
    { name: "triglycerides", value: score(labs.triglycerides, 100, 200), weight: 0.2 },
    { name: "adiponectin", value: score(labs.adiponectin, 10, 3, "lower_is_rigid"), weight: 0.15 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "adipose_IR",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Tejido adiposo con IR: desregulación de lipólisis/lipogénesis, flujo ectópico probable."
        : "Adipocito con sensibilidad insulínica razonable.",
  };
}

function nodeSystemicIR(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "homa_ir", value: score(labs.homa_ir, 1.5, 4.0), weight: 0.35 },
    { name: "hba1c", value: score(labs.hba1c, 5.3, 6.5), weight: 0.3 },
    { name: "fasting_glucose", value: score(labs.fasting_glucose, 90, 126), weight: 0.2 },
    { name: "fasting_insulin", value: score(labs.fasting_insulin, 6, 15), weight: 0.15 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "systemic_IR",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Resistencia insulínica sistémica: músculo, hígado, adiposo en disfunción conjunta."
        : "Homeostasis glucémica preservada.",
  };
}

function nodeFattyLiver(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "alt", value: score(labs.alt, 25, 60), weight: 0.3 },
    { name: "ggt", value: score(labs.ggt, 30, 80), weight: 0.25 },
    { name: "triglycerides", value: score(labs.triglycerides, 100, 200), weight: 0.2 },
    { name: "homa_ir", value: score(labs.homa_ir, 1.5, 4.0), weight: 0.15 },
    { name: "ast", value: score(labs.ast, 25, 60), weight: 0.1 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "fatty_liver",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Esteatosis hepática probable. Candidato a colina, carnitina, polifenoles específicos, bajo fructosa."
        : "Perfil hepático aceptable.",
  };
}

function nodeDyslipidemia(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "triglycerides", value: score(labs.triglycerides, 100, 200), weight: 0.3 },
    {
      name: "hdl",
      value: score(labs.hdl, ctx.sex === "F" ? 55 : 45, ctx.sex === "F" ? 35 : 28, "lower_is_rigid"),
      weight: 0.3,
    },
    { name: "total_cholesterol", value: score(labs.total_cholesterol, 180, 240), weight: 0.2 },
    { name: "ldl", value: score(labs.ldl, 100, 160), weight: 0.2 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "dyslipidemia",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Patrón dislipémico. Priorizar estanoles/fibra, Ω-3, reducir índice glucémico."
        : "Perfil lipídico dentro de rango aceptable.",
  };
}

function nodeHighGlucose(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "hba1c", value: score(labs.hba1c, 5.3, 6.5), weight: 0.55 },
    { name: "fasting_glucose", value: score(labs.fasting_glucose, 90, 126), weight: 0.45 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "high_glucose",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.7
        ? "Hiperglucemia franca. Considerar antocianinas, epicatequinas, berberina, bajo GI."
        : mean > 0.4
          ? "Prediabetes. Ventana de reversibilidad amplia."
          : "Homeostasis glucémica preservada.",
  };
}

function nodeHighCholesterol(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "total_cholesterol", value: score(labs.total_cholesterol, 180, 240), weight: 0.5 },
    { name: "ldl", value: score(labs.ldl, 100, 160), weight: 0.5 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "high_cholesterol",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Colesterol elevado. Evaluar patrón (LDL-pattern A vs B), estanoles, soya, fibra soluble."
        : "Colesterol en rango aceptable.",
  };
}

function nodeLDLElevated(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [{ name: "ldl", value: score(labs.ldl, 100, 160), weight: 1 }];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "LDL_elevated",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note: "LDL elevado: evaluar patrón de partículas y carga total aterogénica.",
  };
}

function nodeMuscleInflexibility(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "homa_ir", value: score(labs.homa_ir, 1.5, 4.0), weight: 0.4 },
    { name: "triglycerides", value: score(labs.triglycerides, 100, 200), weight: 0.2 },
    {
      name: "hdl",
      value: score(labs.hdl, ctx.sex === "F" ? 55 : 45, ctx.sex === "F" ? 35 : 28, "lower_is_rigid"),
      weight: 0.2,
    },
    { name: "fasting_insulin", value: score(labs.fasting_insulin, 6, 15), weight: 0.2 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "muscle_metabolic_inflexibility",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Músculo metabólicamente inflexible (bajo switch CHO↔FA). Modulación con L-carnitina, epicatequinas, ejercicio de intervalos."
        : "Músculo conserva capacidad de switching metabólico.",
  };
}

function nodeEctopicLipidOverload(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "triglycerides", value: score(labs.triglycerides, 100, 200), weight: 0.35 },
    { name: "alt", value: score(labs.alt, 25, 60), weight: 0.25 },
    { name: "waist_circumference_cm", value: score(labs.waist_circumference_cm, ctx.sex === "F" ? 80 : 94, ctx.sex === "F" ? 102 : 110), weight: 0.2 },
    { name: "homa_ir", value: score(labs.homa_ir, 1.5, 4.0), weight: 0.2 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "ectopic_lipid_overload",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Sobrecarga ectópica (hígado, músculo, páncreas). Reducir flujo de FFA: bajo fructosa, Ω-3, carnitina."
        : "Distribución lipídica dentro de compartimentos fisiológicos.",
  };
}

function nodeEndothelialInflammation(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "crp", value: score(labs.crp, 0.5, 3.0), weight: 0.3 },
    { name: "ldl", value: score(labs.ldl, 100, 160), weight: 0.25 },
    { name: "systolic_bp", value: score(labs.systolic_bp, 120, 140), weight: 0.25 },
    { name: "homocysteine", value: score(labs.homocysteine, 8, 15), weight: 0.2 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "endothelial_inflammation",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Endotelio reactivo. Ω-3 EPA/DHA, polifenoles, control homocisteína (folato metilado, B12, B6)."
        : "Endotelio dentro de rango funcional.",
  };
}

function nodeGutInflammation(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "calprotectin_fecal", value: score(labs.calprotectin_fecal, 50, 200), weight: 0.5 },
    { name: "zonulin", value: score(labs.zonulin, 30, 90), weight: 0.3 },
    { name: "crp", value: score(labs.crp, 0.5, 3.0), weight: 0.2 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "gut_inflammation",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Actividad inflamatoria intestinal. Investigar barrera, butirato, polifenoles, Ω-3, eliminar gatillos."
        : "Perfil intestinal estable.",
  };
}

function nodeHepaticInflammation(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "alt", value: score(labs.alt, 25, 60), weight: 0.35 },
    { name: "ast", value: score(labs.ast, 25, 60), weight: 0.25 },
    { name: "ggt", value: score(labs.ggt, 30, 80), weight: 0.25 },
    { name: "crp", value: score(labs.crp, 0.5, 3.0), weight: 0.15 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "hepatic_inflammation",
    category: "risk_factor",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "risk_factor", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? "Hepatocito en estrés. Antocianinas, silimarina, colina, NAC. Evaluar hacia fibrosis (FIB-4, elastografía)."
        : "Hepatocito en buen estado.",
  };
}

function nodeGlucoseToxicity(labs: LabInput, ctx: ClinicalContext): NodeState {
  // Borderline: combinación de hiperglucemia + duración larga
  const parts = [
    { name: "hba1c", value: score(labs.hba1c, 6.5, 8.5), weight: 0.6 },
    { name: "fasting_glucose", value: score(labs.fasting_glucose, 126, 180), weight: 0.4 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "glucose_toxicity",
    category: "pathology_reversible",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "pathology_reversible", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.5
        ? "Glucotoxicidad: estrés sobre β-célula y endotelio. Ventana de rescate crítica."
        : "No hay glucotoxicidad activa.",
  };
}

function nodeBetaCellFailure(labs: LabInput, ctx: ClinicalContext): NodeState {
  // HOMA-B sería ideal; aproximamos con glucemia/insulina
  const insulinLow =
    labs.fasting_insulin !== undefined && labs.fasting_glucose !== undefined
      ? labs.fasting_glucose > 126 && labs.fasting_insulin < 8
        ? 0.8
        : null
      : null;
  const parts = [
    { name: "hba1c", value: score(labs.hba1c, 7.5, 10), weight: 0.5 },
    { name: "fasting_insulin_vs_glucose", value: insulinLow, weight: 0.5 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "beta_cell_failure",
    category: "pathology_reversible",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "pathology_reversible", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.5
        ? "Disfunción de célula β: pérdida progresiva de respuesta. Ventana estrecha para preservar."
        : "Célula β con respuesta preservada.",
  };
}

function nodeMicrovascularDamage(labs: LabInput, ctx: ClinicalContext): NodeState {
  const yearsDiabetes = ctx.duration_years_chronic; // aproximación
  const parts = [
    { name: "hba1c_duration", value: labs.hba1c !== undefined && labs.hba1c > 7 ? Math.min(1, yearsDiabetes / 10) : null, weight: 0.6 },
    { name: "hypertension", value: labs.systolic_bp !== undefined && labs.systolic_bp > 140 ? 0.7 : null, weight: 0.4 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "microvascular_damage",
    category: "pathology_irreversible",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "pathology_irreversible", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: ["hba1c", "systolic_bp"].filter((k) => labs[k as keyof LabInput] === undefined) as Array<keyof LabInput>,
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.3
        ? "Riesgo microvascular activo (retinopatía, nefropatía, neuropatía). Estabilizar, no prometer reversión."
        : "Sin marcadores de daño microvascular aún.",
  };
}

function nodeAtherosclerosis(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "ldl", value: score(labs.ldl, 100, 190), weight: 0.3 },
    {
      name: "hdl",
      value: score(labs.hdl, ctx.sex === "F" ? 55 : 45, ctx.sex === "F" ? 35 : 28, "lower_is_rigid"),
      weight: 0.2,
    },
    { name: "systolic_bp", value: score(labs.systolic_bp, 120, 160), weight: 0.2 },
    { name: "crp", value: score(labs.crp, 0.5, 3.0), weight: 0.15 },
    { name: "age_factor", value: Math.min(1, Math.max(0, (ctx.age - 40) / 40)), weight: 0.15 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "atherosclerosis",
    category: "pathology_irreversible",
    rigidity: mean,
    reversibility: classifyReversibility(mean, "pathology_irreversible", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.4
        ? "Arquitectura vascular con carga aterogénica. Intervención para estabilizar placa."
        : "Riesgo aterogénico manejable.",
  };
}

function nodeHypertensionStructural(labs: LabInput, ctx: ClinicalContext): NodeState {
  const parts = [
    { name: "systolic_bp", value: score(labs.systolic_bp, 120, 160), weight: 0.5 },
    { name: "diastolic_bp", value: score(labs.diastolic_bp, 80, 100), weight: 0.3 },
    { name: "duration_factor", value: Math.min(1, ctx.duration_years_chronic / 10), weight: 0.2 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  const category: NodeCategory =
    ctx.duration_years_chronic >= 10 ? "pathology_irreversible" : "pathology_reversible";
  return {
    id: "hypertension_structural",
    category,
    rigidity: mean,
    reversibility: classifyReversibility(mean, category, ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: parts.filter((p) => p.value === null).map((p) => p.name as keyof LabInput),
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.6
        ? category === "pathology_irreversible"
          ? "HTA estructural. Remodelado arterial probable. Control estricto, no reversión completa."
          : "HTA aún reversible. Magnesio, potasio, Ω-3, control de cortisol."
        : "PA en rango.",
  };
}

function nodeFibrosisHepatic(labs: LabInput, ctx: ClinicalContext): NodeState {
  // FIB-4 simplificado: edad * AST / (plaquetas * √ALT). Aproximamos desde labs disponibles.
  const agePenalty = ctx.age > 50 ? 0.2 : 0;
  const parts = [
    { name: "ast_alt_ratio", value: labs.alt !== undefined && labs.ast !== undefined && labs.alt > 0 ? Math.min(1, (labs.ast / labs.alt - 1) / 2 + agePenalty) : null, weight: 0.4 },
    { name: "ggt", value: score(labs.ggt, 50, 150), weight: 0.3 },
    { name: "alkaline_phosphatase", value: score(labs.alkaline_phosphatase, 100, 200), weight: 0.3 },
  ];
  const { mean } = weightedMean(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return {
    id: "fibrosis_hepatic",
    category: "pathology_irreversible",
    rigidity: Math.max(0, mean),
    reversibility: classifyReversibility(Math.max(0, mean), "pathology_irreversible", ctx),
    inputs_used: parts.filter((p) => p.value !== null).map((p) => p.name as keyof LabInput),
    inputs_missing: ["alt", "ast", "ggt", "alkaline_phosphatase"].filter(
      (k) => labs[k as keyof LabInput] === undefined,
    ) as Array<keyof LabInput>,
    contributions: parts
      .filter((p) => p.value !== null)
      .map((p) => ({ factor: p.name, value: p.value as number, weight: p.weight })),
    note:
      mean > 0.4
        ? "Señal de remodelado fibrótico. Confirmar con FIB-4 real + elastografía. Estabilizar con Ω-3, NAC, silimarina."
        : "Sin señales fibróticas estructurales en labs básicos.",
  };
}

// ──────────────────────────────────────────────────────────────
// Orquestador
// ──────────────────────────────────────────────────────────────

export function computeSystemState(
  labs: LabInput,
  ctx: ClinicalContext,
): SystemState {
  const nodes: Record<NodeId, NodeState> = {
    visceral_adiposity: nodeVisceralAdiposity(labs, ctx),
    adipose_inflammation: nodeAdiposeInflammation(labs, ctx),
    systemic_inflammation: nodeSystemicInflammation(labs, ctx),
    ectopic_lipid_overload: nodeEctopicLipidOverload(labs, ctx),
    fatty_liver: nodeFattyLiver(labs, ctx),
    hepatic_IR: nodeHepaticIR(labs, ctx),
    adipose_IR: nodeAdiposeIR(labs, ctx),
    systemic_IR: nodeSystemicIR(labs, ctx),
    muscle_metabolic_inflexibility: nodeMuscleInflexibility(labs, ctx),
    dyslipidemia: nodeDyslipidemia(labs, ctx),
    high_glucose: nodeHighGlucose(labs, ctx),
    high_cholesterol: nodeHighCholesterol(labs, ctx),
    LDL_elevated: nodeLDLElevated(labs, ctx),
    endothelial_inflammation: nodeEndothelialInflammation(labs, ctx),
    gut_inflammation: nodeGutInflammation(labs, ctx),
    hepatic_inflammation: nodeHepaticInflammation(labs, ctx),
    glucose_toxicity: nodeGlucoseToxicity(labs, ctx),
    beta_cell_failure: nodeBetaCellFailure(labs, ctx),
    microvascular_damage: nodeMicrovascularDamage(labs, ctx),
    atherosclerosis: nodeAtherosclerosis(labs, ctx),
    hypertension_structural: nodeHypertensionStructural(labs, ctx),
    fibrosis_hepatic: nodeFibrosisHepatic(labs, ctx),
  };

  // Métricas globales
  const nodesArray = Object.values(nodes);
  const rigid = nodesArray.filter((n) => n.rigidity > 0.5).length;
  const irreversible = nodesArray.filter((n) => n.reversibility === "irreversible").length;

  // Ponderación por categoría (irreversibles cuentan más)
  const categoryWeights: Record<NodeCategory, number> = {
    risk_factor: 1,
    pathology_reversible: 1.5,
    pathology_irreversible: 2.5,
  };
  const weightedSum = nodesArray.reduce(
    (s, n) => s + n.rigidity * categoryWeights[n.category],
    0,
  );
  const weightSum = nodesArray.reduce((s, n) => s + categoryWeights[n.category], 0);
  const weightedRigidityMean = weightedSum / weightSum;

  // Cobertura diagnóstica
  const totalExpectedInputs = nodesArray.reduce(
    (s, n) => s + n.inputs_used.length + n.inputs_missing.length,
    0,
  );
  const actualInputs = nodesArray.reduce((s, n) => s + n.inputs_used.length, 0);
  const diagnosticCoverage = totalExpectedInputs > 0 ? actualInputs / totalExpectedInputs : 0;

  // Heurística tipo McEwen
  const allostaticLoadHint = inferAllostaticLoadType(nodes);

  return {
    version: "system-state-v1.0",
    nodes,
    global_metrics: {
      rigid_nodes_count: rigid,
      irreversible_nodes_count: irreversible,
      weighted_rigidity_mean: weightedRigidityMean,
      diagnostic_coverage: diagnosticCoverage,
    },
    allostatic_load_hint: allostaticLoadHint,
  };
}

function inferAllostaticLoadType(
  nodes: Record<NodeId, NodeState>,
): SystemState["allostatic_load_hint"] {
  const inflammation = nodes.systemic_inflammation.rigidity;
  const ir = nodes.systemic_IR.rigidity;
  const vascularCount =
    (nodes.endothelial_inflammation.rigidity > 0.5 ? 1 : 0) +
    (nodes.atherosclerosis.rigidity > 0.4 ? 1 : 0) +
    (nodes.hypertension_structural.rigidity > 0.5 ? 1 : 0);
  const rigid = Object.values(nodes).filter((n) => n.rigidity > 0.5).length;

  // Tipo 3: desregulación multisistémica
  if (rigid >= 7 && inflammation > 0.5 && ir > 0.5 && vascularCount >= 2) {
    return {
      type: 3,
      rationale:
        "Múltiples sistemas comprometidos simultáneamente (inflamación + IR + vascular). Patrón de carga alostática tipo 3: desregulación generalizada (McEwen).",
    };
  }
  // Tipo 2: activación sostenida
  if (rigid >= 4 && (inflammation > 0.5 || ir > 0.5)) {
    return {
      type: 2,
      rationale:
        "Activación sostenida del eje metabólico con falla en apagar respuestas compensatorias. Tipo 2: respuesta crónica prolongada (McEwen).",
    };
  }
  // Tipo 1: activación frecuente
  if (rigid >= 2) {
    return {
      type: 1,
      rationale:
        "Activación repetida con recuperación parcial. Tipo 1: ventana amplia para intervención salutogénica.",
    };
  }
  return {
    type: "indeterminate",
    rationale: "Perfil metabólicamente estable o datos insuficientes para clasificar.",
  };
}
