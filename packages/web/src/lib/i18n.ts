/**
 * Lightweight i18n — no library, no runtime overhead.
 *
 * Two languages only: English (default, for international judges) and
 * Spanish (author's original voice). The locale is held in a URL param
 * (?lang=es) so the server can render the correct copy per request
 * without client-side hydration mismatch.
 *
 * BV4 terminology (Desacople, Reserva, etc.) stays in Spanish in both
 * locales — proper names, not translated.
 */

export type Locale = "en" | "es";

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(x: unknown): x is Locale {
  return x === "en" || x === "es";
}

/**
 * Resolve locale from Next.js searchParams (already awaited).
 * Falls back to DEFAULT_LOCALE when absent or invalid.
 */
export function resolveLocale(search: Record<string, string | string[] | undefined>): Locale {
  const raw = search.lang;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export function oppositeLocale(l: Locale): Locale {
  return l === "en" ? "es" : "en";
}

export function localeLabel(l: Locale): string {
  return l === "en" ? "English" : "Español";
}

export function localeShort(l: Locale): string {
  return l === "en" ? "EN" : "ES";
}

// -------------------------------------------------------------------
// Copy bundles
// -------------------------------------------------------------------

type Dict = {
  meta: {
    title: string;
    description: string;
  };
  masthead: {
    running_head: string;
    edition: string;
    nav: {
      network: string;
      source: string;
      method: string;
    };
    stack_badge: string;
  };
  hero: {
    eyebrow_abstract: string;
    abstract_body: string;
    aside: Array<{ dt: string; dd: string }>;
    thesis_eyebrow: string;
    thesis_line_1: string;
    thesis_line_2: string;
    thesis_line_3_italic: string;
    drop_cap_body: string;
    outcome_eyebrow: string;
    outcome_line: string;
    outcome_body: string;
    cta_primary: string;
    cta_secondary: string;
  };
  figure_i: {
    eyebrow: string;
    eyebrow_caption: string;
    caption: string;
  };
  layers: Array<{
    num: string;
    tag: string;
    title: string;
    body: string;
    meta: string;
  }>;
  method: {
    section_number: string;
    heading: string;
    lead: string;
    items: Array<{
      tag: string;
      label: string;
      body: string;
      cite: string;
    }>;
  };
  colophon: {
    section_number: string;
    eyebrow: string;
    status_label: string;
    status_body: string;
    attribution_label: string;
    attribution_body: string;
    license_label: string;
    license_body_pre: string;
    license_body_link: string;
    license_body_post: string;
  };
  footer: {
    left: string;
    center_italic: string;
    right: string;
  };
  network: {
    meta_title: string;
    eyebrow_figure: string;
    stats: { nodes: string; edges: string; imprints: string };
    hero_title_a: string;
    hero_title_b_italic: string;
    hero_body: string;
    patient_label: string;
    patient_ana: string;
    patient_none: string;
    narrative_caption: string;
    tiered_eyebrow: string;
    atlas_eyebrow: string;
    atlas_caption: string;
    view_tiered: string;
    view_atlas: string;
    legend: {
      title: string;
      promotes: string;
      inhibits: string;
      modulates: string;
      imprint: string;
    };
    caption: string;
    category_index: {
      eyebrow: string;
      eyebrow_caption: string;
      nodes_suffix: string;
      categories: Array<{ slug: string; label: string; numeral: string }>;
    };
    attribution: {
      eyebrow: string;
      body_pre: string;
      body_link: string;
      body_post: string;
    };
    explore_link: string;
  };
};

export const EN: Dict = {
  meta: {
    title: "Inferentia · Clinical active inference",
    description:
      "An ill person is an organism executing predictions. Inferentia identifies the active instructions and computes which interventions expand the frontier the pattern contracted.",
  },
  masthead: {
    running_head: "Inferentia",
    edition: "Vol. 00 · Prototype edition · MMXXVI",
    nav: {
      network: "Network",
      source: "Source",
      method: "Method",
    },
    stack_badge: "Built with Opus 4.7",
  },
  hero: {
    eyebrow_abstract: "Abstract · 2026-04-22",
    abstract_body:
      "A computational clinical model that represents the patient as a system in execution, integrating active inference and multivariate Bayesian classification over six co-present layers.",
    aside: [
      { dt: "Framework", dd: "Active inference" },
      { dt: "Engine", dd: "Bayesian GMM" },
      { dt: "Nodes", dd: "33" },
      { dt: "Edges", dd: "61" },
      { dt: "Imprints", dd: "04 / 13" },
      { dt: "Version", dd: "v0.1" },
    ],
    thesis_eyebrow: "Thesis · Primary statement",
    thesis_line_1: "An ill person",
    thesis_line_2: "is an organism",
    thesis_line_3_italic: "executing predictions.",
    drop_cap_body:
      "Across its four cognitive levels — cellular bioelectric, organic homeostasis, somatic unconscious, explicit consciousness — the organism continuously executes a survival program. Altered biomarkers, chronic symptoms, and metabolic rigidity are the signature of instructions the organism keeps executing, not memories it consults. Inferentia identifies those active instructions and computes which interventions expand the frontier the pattern contracted.",
    outcome_eyebrow: "Primary outcome",
    outcome_line: "The organism can do more.",
    outcome_body:
      "Measured as cognitive cone expansion and phenotypic flexibility recovered against perturbation.",
    cta_primary: "Explore the network",
    cta_secondary: "Read the method ↓",
  },
  figure_i: {
    eyebrow: "Figure i",
    eyebrow_caption: "Six co-present layers of reading",
    caption:
      "The six layers operate simultaneously. Inferentia infers the active state in each and composes the systemic reading the clinician receives. Intervention targets the layers with the highest regulatory leverage for that specific patient.",
  },
  layers: [
    {
      num: "01",
      tag: "Layer i",
      title: "Predictive imprints",
      body: "Survival instructions the organism keeps executing in the absence of the original threat. Priors crystallised in the somatic unconscious.",
      meta: "bv4 · i1 · i4 · i7 · i8",
    },
    {
      num: "02",
      tag: "Layer ii",
      title: "Nutritional substrate",
      body: "Cofactors and micronutrients that condition the system's regulatory capacity across the four scalar cognitive levels.",
      meta: "Mg · B12 · D3 · Zn · Se",
    },
    {
      num: "03",
      tag: "Layer iii",
      title: "Toxic load and excesses",
      body: "Disruptors that force homeostasis: heavy metals, pharmacological iatrogeny, chronic excess of sugar and alcohol.",
      meta: "heavy metals · xenobiotics",
    },
    {
      num: "04",
      tag: "Layer iv",
      title: "Available agency",
      body: "The system's capacity to revise its priors and self-regulate. Locus of control, interoception, narrative coherence.",
      meta: "locus · maia · soc",
    },
    {
      num: "05",
      tag: "Layer v",
      title: "Amplifying genetics",
      body: "Likely polymorphisms inferred from phenotype without genetic testing. Prioritised for focused panel recommendations.",
      meta: "fto · mc4r · fkbp5 · comt",
    },
    {
      num: "06",
      tag: "Layer vi",
      title: "Observable signature",
      body: "Biomarkers, heart rate variability, body composition, and symptoms. The clinical evidence the model reconstructs.",
      meta: "hba1c · hdl · hrv · homa-ir",
    },
  ],
  method: {
    section_number: "§ ii",
    heading: "Method.",
    lead: "A computational stack that combines active inference with multivariate Bayesian classification over structured clinical signatures.",
    items: [
      {
        tag: "§ ii.a",
        label: "Theoretical framework",
        body: "Active inference as governing principle. The organism minimises expected free energy; chronic pathology reflects rigid priors resistant to update.",
        cite: "Friston 2010",
      },
      {
        tag: "§ ii.b",
        label: "Scalar cognition",
        body: "TAME framework operationalised across four levels (bioelectric · homeostatic · somatic · conscious). Interventions act at the appropriate scale.",
        cite: "Levin 2019",
      },
      {
        tag: "§ ii.c",
        label: "Phenotypic flexibility",
        body: "Capacity to respond to perturbations and return to equilibrium. The system's primary metric, replacing isolated biomarker normalisation.",
        cite: "van Ommen 2017",
      },
      {
        tag: "§ ii.d",
        label: "Bayesian classification",
        body: "Multivariate GMM over structured clinical signatures. The posterior returns a distribution over imprints with uncertainty propagation.",
        cite: "NumPyro · HMC",
      },
      {
        tag: "§ ii.e",
        label: "Agentic architecture",
        body: "Opus 4.7 orchestrator with composable skills for interview, prior extraction, mathematical computation, and dual clinical rendering (patient · clinician).",
        cite: "Claude Agent SDK",
      },
    ],
  },
  colophon: {
    section_number: "§ iii",
    eyebrow: "Colophon",
    status_label: "Status",
    status_body:
      "Research prototype. Not a medical device. Not a substitute for clinical consultation. Formal validation planned for phase ii, post-hackathon.",
    attribution_label: "Attribution",
    attribution_body:
      "Network data is an original synthesis inspired by van Ommen's systems flexibility; the imprint layer is this project's contribution. All citations in the repository.",
    license_label: "License",
    license_body_pre: "MIT. Code, clinical signatures, and network open to scrutiny. See ",
    license_body_link: "repository",
    license_body_post: ".",
  },
  footer: {
    left: "Inferentia · v0.1 · 2026",
    center_italic: "Organism · Prediction · Frontier",
    right: "Cerebral Valley × Anthropic",
  },
  network: {
    meta_title: "Figure ii — The flexibility network · Inferentia",
    eyebrow_figure: "Figure ii · The flexibility network",
    stats: {
      nodes: "Nodes",
      edges: "Edges",
      imprints: "Imprints",
    },
    hero_title_a: "Physiopathological map",
    hero_title_b_italic: "with upstream predictive imprints.",
    hero_body:
      "An original synthesis that integrates van Ommen's systems flexibility model with the bv4 imprint taxonomy as the upstream predictive layer. The cascade reads left to right: imprints → neuroendocrine · autonomic → gut · metabolic → hepatic · inflammatory → pathology. Operational hypothesis: expanding phenotypic flexibility reduces the count of chronically activated nodes.",
    patient_label: "Active patient",
    patient_ana: "Ana — i8 Reserva",
    patient_none: "Neutral atlas",
    narrative_caption:
      "Ana's system predicts scarcity. That prior rigidifies her HPA axis, dysregulates autonomic tone, and disrupts her gut. The cascade surfaces as pre-diabetes and cardiovascular risk. Four molecules break the cascade at four points.",
    tiered_eyebrow: "Causal cascade — four tiers",
    atlas_eyebrow: "Full atlas — 33 nodes",
    atlas_caption:
      "Fig. ii.b · Full physiopathological atlas. Every active and latent node of the network, laid out by category. Useful for inspection; the tiered view above is the clinical reading.",
    view_tiered: "Cascade",
    view_atlas: "Atlas",
    legend: {
      title: "Legend",
      promotes: "Promotes",
      inhibits: "Inhibits",
      modulates: "Modulates",
      imprint: "Imprint node (accented)",
    },
    caption:
      "Fig. ii · Patient 001, i8 Reserva — 21 active nodes / 33. Cortisol rigidity drives the cascade upstream. Prescribed modulators tagged beside their target nodes.",
    category_index: {
      eyebrow: "§ iii",
      eyebrow_caption: "Category index",
      nodes_suffix: "nodes",
      categories: [
        { slug: "imprint", label: "Imprint", numeral: "i" },
        { slug: "neuroendocrine", label: "Neuroendocrine", numeral: "ii" },
        { slug: "autonomic", label: "Autonomic", numeral: "iii" },
        { slug: "gut", label: "Gut", numeral: "iv" },
        { slug: "metabolic", label: "Metabolic", numeral: "v" },
        { slug: "hepatic", label: "Hepatic", numeral: "vi" },
        { slug: "inflammatory", label: "Inflammatory", numeral: "vii" },
        { slug: "pathology", label: "Pathology", numeral: "viii" },
      ],
    },
    attribution: {
      eyebrow: "Attribution",
      body_pre:
        "Conceptual framework inspired by Ben van Ommen's systems flexibility model (ILSI NA EB 2017). Imprint taxonomy and clinical synthesis proprietary to Dr. Miguel Ojeda Rios (BV4). Node and edge data derived from public biomedical literature — see ",
      body_link: "full attribution document",
      body_post: ".",
    },
    explore_link: "Explore the full interactive graph →",
  },
};

export const ES: Dict = {
  meta: {
    title: "Inferentia · Inferencia activa clínica",
    description:
      "Una persona enferma es un organismo ejecutando predicciones. Inferentia identifica las instrucciones activas y calcula qué intervenciones expanden la frontera que el patrón contrajo.",
  },
  masthead: {
    running_head: "Inferentia",
    edition: "Vol. 00 · Edición prototipo · MMXXVI",
    nav: {
      network: "Red",
      source: "Código",
      method: "Método",
    },
    stack_badge: "Hecho con Opus 4.7",
  },
  hero: {
    eyebrow_abstract: "Resumen · 22 abr 2026",
    abstract_body:
      "Modelo clínico computacional que representa al paciente como sistema en ejecución, integrando inferencia activa y clasificación bayesiana multivariada sobre seis capas co-presentes.",
    aside: [
      { dt: "Marco", dd: "Inferencia activa" },
      { dt: "Motor", dd: "GMM bayesiana" },
      { dt: "Nodos", dd: "33" },
      { dt: "Aristas", dd: "61" },
      { dt: "Improntas", dd: "04 / 13" },
      { dt: "Versión", dd: "v0.1" },
    ],
    thesis_eyebrow: "Tesis · Enunciado primario",
    thesis_line_1: "Una persona enferma",
    thesis_line_2: "es un organismo",
    thesis_line_3_italic: "ejecutando predicciones.",
    drop_cap_body:
      "En sus cuatro niveles cognitivos — bioeléctrico celular, homeostasis orgánica, inconsciente somático y consciencia explícita — el organismo ejecuta continuamente un programa de supervivencia. Biomarcadores alterados, síntomas crónicos y rigidez metabólica son la signatura de instrucciones que el organismo sigue ejecutando, no recuerdos que consulta. Inferentia identifica esas instrucciones activas y calcula qué intervenciones expanden la frontera que el patrón contrajo.",
    outcome_eyebrow: "Outcome primario",
    outcome_line: "El organismo puede más.",
    outcome_body:
      "Medido como expansión del cono cognitivo y flexibilidad fenotípica recuperada ante perturbaciones.",
    cta_primary: "Explorar la red",
    cta_secondary: "Leer el método ↓",
  },
  figure_i: {
    eyebrow: "Figura i",
    eyebrow_caption: "Seis capas co-presentes de lectura",
    caption:
      "Las seis capas operan simultáneamente. Inferentia infiere el estado activo en cada una y compone la lectura sistémica que el clínico recibe. La intervención se dirige a las capas con mayor palanca regulatoria en ese paciente.",
  },
  layers: [
    {
      num: "01",
      tag: "Capa i",
      title: "Improntas predictivas",
      body: "Instrucciones de supervivencia que el organismo sigue ejecutando en ausencia de la amenaza original. Priors cristalizados en el inconsciente somático.",
      meta: "bv4 · i1 · i4 · i7 · i8",
    },
    {
      num: "02",
      tag: "Capa ii",
      title: "Sustrato nutricional",
      body: "Cofactores y micronutrientes que condicionan la capacidad regulatoria del sistema en los cuatro niveles cognitivos escalares.",
      meta: "Mg · B12 · D3 · Zn · Se",
    },
    {
      num: "03",
      tag: "Capa iii",
      title: "Carga tóxica y excesos",
      body: "Disruptores que fuerzan la homeostasis: metales pesados, iatrogenia farmacológica, exceso crónico de azúcar y alcohol.",
      meta: "metales pesados · xenobióticos",
    },
    {
      num: "04",
      tag: "Capa iv",
      title: "Agencia disponible",
      body: "Capacidad del sistema para revisar sus priors y auto-regular. Locus de control, interocepción, coherencia narrativa.",
      meta: "locus · maia · soc",
    },
    {
      num: "05",
      tag: "Capa v",
      title: "Genética amplificadora",
      body: "Polimorfismos probables inferidos desde fenotipo sin test genético. Priorización para paneles focalizados.",
      meta: "fto · mc4r · fkbp5 · comt",
    },
    {
      num: "06",
      tag: "Capa vi",
      title: "Signatura observable",
      body: "Biomarcadores, variabilidad cardíaca, composición corporal y síntomas. La evidencia clínica que el modelo reconstruye.",
      meta: "hba1c · hdl · hrv · homa-ir",
    },
  ],
  method: {
    section_number: "§ ii",
    heading: "Método.",
    lead: "Stack computacional que combina inferencia activa con clasificación bayesiana multivariada sobre firmas clínicas estructuradas.",
    items: [
      {
        tag: "§ ii.a",
        label: "Marco teórico",
        body: "Inferencia activa como principio rector. El organismo minimiza energía libre esperada; la patología crónica refleja priors rígidos resistentes a la actualización.",
        cite: "Friston 2010",
      },
      {
        tag: "§ ii.b",
        label: "Cognición escalar",
        body: "Marco TAME operacionalizado en cuatro niveles (bioeléctrico · homeostático · somático · consciente). Las intervenciones actúan en la escala correspondiente.",
        cite: "Levin 2019",
      },
      {
        tag: "§ ii.c",
        label: "Flexibilidad fenotípica",
        body: "Capacidad de responder a perturbaciones y volver al equilibrio. Métrica primaria del sistema, reemplaza la normalización puntual del biomarcador.",
        cite: "van Ommen 2017",
      },
      {
        tag: "§ ii.d",
        label: "Clasificación bayesiana",
        body: "GMM multivariada sobre firmas clínicas estructuradas. El posterior devuelve distribución sobre improntas con propagación de incertidumbre.",
        cite: "NumPyro · HMC",
      },
      {
        tag: "§ ii.e",
        label: "Arquitectura agéntica",
        body: "Orquestador Opus 4.7 con skills componibles para entrevista, extracción de priors, cálculo matemático y composición clínica dual (paciente · profesional).",
        cite: "Claude Agent SDK",
      },
    ],
  },
  colophon: {
    section_number: "§ iii",
    eyebrow: "Colofón",
    status_label: "Estado",
    status_body:
      "Prototipo de investigación. No es dispositivo médico. No sustituye consulta clínica. Validación formal planificada para fase ii, post-hackathon.",
    attribution_label: "Atribución",
    attribution_body:
      "La red es síntesis original inspirada por la flexibilidad de sistemas de van Ommen; la capa de improntas es aportación del proyecto. Todas las citas en el repositorio.",
    license_label: "Licencia",
    license_body_pre: "MIT. Código, firmas clínicas y red abiertos al escrutinio. Ver ",
    license_body_link: "repositorio",
    license_body_post: ".",
  },
  footer: {
    left: "Inferentia · v0.1 · 2026",
    center_italic: "Organismo · Predicción · Frontera",
    right: "Cerebral Valley × Anthropic",
  },
  network: {
    meta_title: "Figura ii — La red de flexibilidad · Inferentia",
    eyebrow_figure: "Figura ii · La red de flexibilidad",
    stats: {
      nodes: "Nodos",
      edges: "Aristas",
      imprints: "Improntas",
    },
    hero_title_a: "Mapa fisiopatológico",
    hero_title_b_italic: "con improntas predictivas upstream.",
    hero_body:
      "Síntesis original que integra la flexibilidad de sistemas de van Ommen con la taxonomía bv4 de improntas como capa predictiva upstream. La cascada se lee de izquierda a derecha: improntas → neuroendocrino · autonómico → intestinal · metabólico → hepático · inflamatorio → patología. Hipótesis operativa: expandir flexibilidad fenotípica reduce el número de nodos crónicamente activados.",
    patient_label: "Paciente activo",
    patient_ana: "Ana — i8 Reserva",
    patient_none: "Atlas neutro",
    narrative_caption:
      "El sistema de Ana predice escasez. Ese prior rigidiza su eje HPA, desregula el tono autonómico y altera el intestino. La cascada se manifiesta como pre-diabetes y riesgo cardiovascular. Cuatro moléculas interrumpen la cascada en cuatro puntos.",
    tiered_eyebrow: "Cascada causal — cuatro tiers",
    atlas_eyebrow: "Atlas completo — 33 nodos",
    atlas_caption:
      "Fig. ii.b · Atlas fisiopatológico completo. Todos los nodos activos y latentes de la red, organizados por categoría. Útil para inspección; la vista de cascada superior es la lectura clínica.",
    view_tiered: "Cascada",
    view_atlas: "Atlas",
    legend: {
      title: "Leyenda",
      promotes: "Promueve",
      inhibits: "Inhibe",
      modulates: "Modula",
      imprint: "Nodo impronta (acento)",
    },
    caption:
      "Fig. ii · Paciente 001, i8 Reserva — 21 nodos activos / 33. La rigidez del cortisol dirige la cascada upstream. Los moduladores prescritos se rotulan junto a su nodo objetivo.",
    category_index: {
      eyebrow: "§ iii",
      eyebrow_caption: "Índice de categorías",
      nodes_suffix: "nodos",
      categories: [
        { slug: "imprint", label: "Impronta", numeral: "i" },
        { slug: "neuroendocrine", label: "Neuroendocrino", numeral: "ii" },
        { slug: "autonomic", label: "Autonómico", numeral: "iii" },
        { slug: "gut", label: "Intestinal", numeral: "iv" },
        { slug: "metabolic", label: "Metabólico", numeral: "v" },
        { slug: "hepatic", label: "Hepático", numeral: "vi" },
        { slug: "inflammatory", label: "Inflamatorio", numeral: "vii" },
        { slug: "pathology", label: "Patología", numeral: "viii" },
      ],
    },
    attribution: {
      eyebrow: "Atribución",
      body_pre:
        "Marco conceptual inspirado en el modelo de flexibilidad de sistemas de Ben van Ommen (ILSI NA EB 2017). Taxonomía de improntas y síntesis clínica propiedad del Dr. Miguel Ojeda Rios (BV4). Datos de nodos y aristas derivados de literatura biomédica pública — ver ",
      body_link: "documento completo de atribución",
      body_post: ".",
    },
    explore_link: "Explorar el grafo interactivo completo →",
  },
};

export function getDict(l: Locale): Dict {
  return l === "es" ? ES : EN;
}

/**
 * Build a URL that switches locale while preserving path and other query params.
 * Used by the toggle component so ?patient=ana (etc) survives the locale change.
 */
export function localeSwitchHref(
  pathname: string,
  targetLocale: Locale,
  currentSearch: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(currentSearch)) {
    if (k === "lang") continue;
    if (Array.isArray(v)) {
      for (const val of v) if (val) params.append(k, val);
    } else if (v) {
      params.append(k, v);
    }
  }
  if (targetLocale !== DEFAULT_LOCALE) {
    params.set("lang", targetLocale);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
