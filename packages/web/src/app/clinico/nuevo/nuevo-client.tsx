"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ALL_LAB_KEYS, LAB_REFERENCE, type LabKey } from "@/lib/math/labs-zscore";
import {
  ALL_SENSATION_IDS,
  SENSATIONS,
  type BodyZone,
  type SensationId,
} from "@/lib/math/sensations";
import { IMPRINT_NAMES, type NarrativeMark } from "@/lib/math/imprint-bayes";

type LabValues = Partial<Record<LabKey, number>>;

type ClassifyResponse = {
  ok: boolean;
  error?: string;
  pipeline: string;
  declared: {
    primary: { id: SensationId; number: number; name_es: string; name_en: string; weight: number };
    secondary: {
      id: SensationId;
      number: number;
      name_es: string;
      name_en: string;
      weight: number;
    } | null;
  };
  inputs_trace: {
    labs_provided: string[];
    labs_zscored: string[];
    reported_body_zones: BodyZone[];
    transcript_chars: number;
    narrative_used: boolean;
  };
  narrative: {
    marks: Record<string, { score: number; quote: string }>;
    suggested_sensations: Array<{ id: SensationId; score: number; quote: string }>;
    usage: { input: number; output: number; cached: number | null } | null;
  } | null;
  layer_cascade: {
    version: string;
    markers: Record<
      string,
      {
        key: string;
        expected_z: number;
        expected_sd_z: number;
        expected_raw: number | null;
        ci68_raw: [number, number] | null;
        unit: string | null;
        components: Array<{
          sensation_id: SensationId;
          sensation_name_es: string;
          posterior_weight: number;
          contribution_z: number;
        }>;
      }
    >;
  };
  layer_discordances: Array<{
    key: string;
    observed_raw: number;
    observed_z: number;
    expected_z: number;
    expected_sd_z: number;
    observed_z_deviation: number;
    direction: "concordant" | "above_expected" | "below_expected";
    severity: "concordant" | "mild" | "moderate" | "strong";
    note_es: string;
    note_en: string;
  }>;
  layer_imprint: {
    version: string;
    posterior: Array<{
      id: keyof typeof IMPRINT_NAMES;
      name_es: string;
      name_en: string;
      posterior: number;
      log_lik_sensations: number;
      log_lik_marks: number;
    }>;
    dominant: keyof typeof IMPRINT_NAMES;
    top_gap: number;
    entropy_bits: number;
  };
  layer_allostatic: {
    type: 1 | 2 | 3;
    type_label_es: string;
    type_label_en: string;
    confidence: number;
    rationale_es: string;
    rationale_en: string;
  };
};

const LAB_SYSTEMS: Array<{
  id: string;
  label_es: string;
  label_en: string;
  keys: LabKey[];
}> = [
  {
    id: "hpa",
    label_es: "Eje HPA",
    label_en: "HPA axis",
    keys: ["cortisol_am", "cortisol_pm", "car", "dhea_s"],
  },
  {
    id: "metabolic",
    label_es: "Metabolismo",
    label_en: "Metabolic",
    keys: [
      "hba1c",
      "homa_ir",
      "fasting_glucose",
      "fasting_insulin",
      "triglycerides",
      "hdl",
      "ldl",
      "leptin",
      "ghrelin",
    ],
  },
  {
    id: "inflammation",
    label_es: "Inflamación",
    label_en: "Inflammation",
    keys: ["crp", "il6", "tnf_alpha", "fibrinogen"],
  },
  {
    id: "thyroid",
    label_es: "Tiroides",
    label_en: "Thyroid",
    keys: ["tsh", "t3_free", "t4_free"],
  },
  {
    id: "micronutrients",
    label_es: "Micronutrientes",
    label_en: "Micronutrients",
    keys: ["ferritin", "vitamin_d", "b12", "homocysteine"],
  },
  {
    id: "autonomic",
    label_es: "Autonómico",
    label_en: "Autonomic",
    keys: ["sdnn_hrv", "rmssd_hrv", "lf_hf_ratio", "catecholamines"],
  },
  {
    id: "body_comp",
    label_es: "Composición corporal",
    label_en: "Body composition",
    keys: ["visceral_fat", "lean_mass_pct", "body_water_pct"],
  },
  {
    id: "hormonal",
    label_es: "Hormonal",
    label_en: "Hormonal",
    keys: ["testosterone", "estradiol", "aldosterone"],
  },
];

const ALL_BODY_ZONES: BodyZone[] = [
  "ocular",
  "oral_jaw",
  "cervical_throat",
  "thoracic_chest",
  "dorsal_back",
  "diaphragm_epigastric",
  "abdominal",
  "hepatobiliary",
  "pelvic_genital",
  "skin_face",
  "articular_skeletal",
  "renal_lumbar",
  "peripheral_extremities",
  "global_depletion",
  "cardiovascular",
];

const ZONE_LABEL: Record<BodyZone, { es: string; en: string }> = {
  ocular: { es: "Ocular / frente", en: "Ocular / forehead" },
  oral_jaw: { es: "Mandíbula / boca", en: "Jaw / mouth" },
  cervical_throat: { es: "Cuello / garganta", en: "Neck / throat" },
  thoracic_chest: { es: "Pecho / torácico", en: "Chest / thoracic" },
  dorsal_back: { es: "Espalda media / dorsal", en: "Mid / dorsal back" },
  diaphragm_epigastric: { es: "Diafragma / epigastrio", en: "Diaphragm / epigastrium" },
  abdominal: { es: "Abdomen", en: "Abdomen" },
  hepatobiliary: { es: "Hipocondrio derecho / hígado", en: "Right hypochondrium / liver" },
  pelvic_genital: { es: "Pelvis / genital", en: "Pelvis / genital" },
  skin_face: { es: "Piel / cara", en: "Skin / face" },
  articular_skeletal: { es: "Articulaciones / huesos", en: "Joints / bones" },
  renal_lumbar: { es: "Renal / lumbar", en: "Renal / lumbar" },
  peripheral_extremities: { es: "Extremidades / periferia", en: "Extremities / periphery" },
  global_depletion: { es: "Depleción global", en: "Global depletion" },
  cardiovascular: { es: "Cardiovascular", en: "Cardiovascular" },
};

export default function NuevoClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [caseId, setCaseId] = useState("");
  const [primarySensation, setPrimarySensation] = useState<SensationId | "">(
    "",
  );
  const [secondarySensation, setSecondarySensation] = useState<SensationId | "">(
    "",
  );
  const [primaryWeight, setPrimaryWeight] = useState<number>(0.7);
  const [labs, setLabs] = useState<LabValues>({});
  const [zones, setZones] = useState<Set<BodyZone>>(new Set());
  const [transcript, setTranscript] = useState("");
  const [openSystems, setOpenSystems] = useState<Record<string, boolean>>({
    hpa: true,
    metabolic: true,
    inflammation: false,
    thyroid: false,
    micronutrients: false,
    autonomic: false,
    body_comp: false,
    hormonal: false,
  });
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<ClassifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const L =
    locale === "es"
      ? {
          step1: "Paso 1 · Identificador anonimizado",
          caseHint: "Alias no identificable. Sin nombres, fechas, clínica.",
          caseIdLabel: "ID del caso",
          step2: "Paso 2 · Sensación activa (la aporta el clínico)",
          sensationHint:
            "El clínico identifica la sensación por test muscular + escucha somática. El sistema calcula cascada, discordancias, impronta y carga alostática a partir de esta declaración.",
          primaryLabel: "Sensación primaria",
          secondaryLabel: "Sensación secundaria (opcional)",
          weightLabel: "Peso de la primaria",
          selectPlaceholder: "— Selecciona —",
          step3: "Paso 3 · Labs",
          labsHint:
            "Introduce los valores que tengas. Se compararán contra la firma esperada de las sensaciones declaradas.",
          step4: "Paso 4 · Localización corporal (descriptivo)",
          zonesHint:
            "¿Dónde ubica el paciente la sensación? Se registra para el expediente — no entra al cálculo de inferencia.",
          step5: "Paso 5 · Narrativa clínica",
          transcriptHint:
            "Pega transcripto anonimizado o notas. Sonnet 4.6 puntuará las 13 marcas discriminativas y propondrá sensaciones candidatas como segunda opinión (no reemplaza tu juicio).",
          run: "Correr pipeline BV4",
          running: "Corriendo pipeline…",
          noPrimary: "Selecciona una sensación primaria antes de correr.",
          declaredTitle: "Sensaciones declaradas",
          layerCascadeTitle: "Cascada bioquímica esperada",
          layerCascadeSub:
            "Mezcla ponderada de las cascadas de las sensaciones declaradas",
          layerDiscordancesTitle: "Discordancias labs vs esperado",
          layerImprintTitle: "Posterior sobre improntas",
          layerImprintSub:
            "Bayes condicional sobre las sensaciones declaradas + marcas narrativas",
          layerAllostaticTitle: "Carga alostática (McEwen)",
          narrativeTitle: "Lectura de Sonnet (segunda opinión)",
          suggestedSensationsTitle:
            "Sensaciones candidatas que Sonnet detectó en el transcript",
          suggestedHint:
            "Si Sonnet sugiere una sensación que tú no habías considerado, revisa — pero la decisión final es tuya.",
          marksTitle: "Marcas narrativas discriminativas",
          dominant: "Dominante",
          expected: "Esperado",
          observed: "Observado",
          deviation: "Desviación",
          confidence: "Confianza",
          topGap: "Distancia 1ª–2ª",
          entropy: "Entropía (bits)",
        }
      : {
          step1: "Step 1 · Anonymised identifier",
          caseHint: "Non-identifying alias. No names, dates, clinic.",
          caseIdLabel: "Case ID",
          step2: "Step 2 · Active sensation (clinician-provided)",
          sensationHint:
            "The clinician identifies the sensation via muscle test + somatic listening. The system computes cascade, discordances, imprint and allostatic load from this declaration.",
          primaryLabel: "Primary sensation",
          secondaryLabel: "Secondary sensation (optional)",
          weightLabel: "Primary weight",
          selectPlaceholder: "— Select —",
          step3: "Step 3 · Labs",
          labsHint:
            "Enter whichever values you have. They'll be compared against the predicted signature of the declared sensations.",
          step4: "Step 4 · Body location (descriptive)",
          zonesHint:
            "Where does the patient locate the sensation? Stored for the record — does not enter the inference.",
          step5: "Step 5 · Clinical narrative",
          transcriptHint:
            "Paste anonymised transcript or notes. Sonnet 4.6 will score the 13 discriminative marks and suggest candidate sensations as second opinion (does not replace your judgement).",
          run: "Run BV4 pipeline",
          running: "Running pipeline…",
          noPrimary: "Select a primary sensation before running.",
          declaredTitle: "Declared sensations",
          layerCascadeTitle: "Expected biochemical cascade",
          layerCascadeSub:
            "Weighted mixture of cascades from the declared sensations",
          layerDiscordancesTitle: "Labs vs expected discordances",
          layerImprintTitle: "Posterior over imprints",
          layerImprintSub:
            "Conditional Bayes on declared sensations + narrative marks",
          layerAllostaticTitle: "Allostatic load (McEwen)",
          narrativeTitle: "Sonnet's read (second opinion)",
          suggestedSensationsTitle:
            "Candidate sensations Sonnet detected in transcript",
          suggestedHint:
            "If Sonnet suggests a sensation you hadn't considered, review — but the final call is yours.",
          marksTitle: "Discriminative narrative marks",
          dominant: "Dominant",
          expected: "Expected",
          observed: "Observed",
          deviation: "Deviation",
          confidence: "Confidence",
          topGap: "1st–2nd gap",
          entropy: "Entropy (bits)",
        };

  const toggleSystem = (id: string) =>
    setOpenSystems((p) => ({ ...p, [id]: !p[id] }));

  const toggleZone = (z: BodyZone) => {
    setZones((prev) => {
      const next = new Set(prev);
      if (next.has(z)) next.delete(z);
      else next.add(z);
      return next;
    });
  };

  const canRun = primarySensation !== "";

  const run = useCallback(async () => {
    if (!canRun) {
      setError(L.noPrimary);
      return;
    }
    setRunning(true);
    setError(null);
    setResponse(null);
    try {
      const payload: Record<string, unknown> = {
        primary_sensation: primarySensation,
        primary_weight: primaryWeight,
        labs,
        reported_body_zones: Array.from(zones),
        locale,
      };
      if (secondarySensation && secondarySensation !== primarySensation) {
        payload.secondary_sensation = secondarySensation;
      }
      if (transcript.trim().length > 0) {
        payload.transcript = transcript.trim();
      }
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await res.json()) as ClassifyResponse;
      if (!res.ok || !j.ok) {
        setError(j.error ?? `status ${res.status}`);
        return;
      }
      setResponse(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [
    canRun,
    primarySensation,
    secondarySensation,
    primaryWeight,
    labs,
    zones,
    transcript,
    locale,
    L.noPrimary,
  ]);

  // All sensations sorted by number for the dropdown
  const sensationOptions = useMemo(
    () =>
      ALL_SENSATION_IDS.map((id) => ({
        id,
        number: SENSATIONS[id].number,
        label: locale === "es" ? SENSATIONS[id].name_es : SENSATIONS[id].name_en,
        signal:
          locale === "es"
            ? SENSATIONS[id].primitive_signal_es
            : SENSATIONS[id].primitive_signal_en,
      })),
    [locale],
  );

  const nonConcordantDisc = useMemo(
    () =>
      response?.layer_discordances.filter((d) => d.severity !== "concordant") ??
      [],
    [response],
  );

  return (
    <>
      <section className="mt-4 grid grid-cols-12 gap-6">
        {/* ─── Input column ───────────────────────────────── */}
        <div className="col-span-12 lg:col-span-6 space-y-5">
          {/* Step 1 */}
          <div className="border border-rule bg-paper-raised px-5 py-4">
            <p className="eyebrow eyebrow-accent">{L.step1}</p>
            <p className="mt-1.5 text-[11px] text-ink-mute">{L.caseHint}</p>
            <label className="block mt-3">
              <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                {L.caseIdLabel}
              </span>
              <input
                type="text"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="A-042"
                className="mt-1 w-full border border-rule bg-paper px-3 py-2 text-[13px] tabular text-ink focus:border-accent outline-none"
              />
            </label>
          </div>

          {/* Step 2 — Sensation (declared) */}
          <div className="border-2 border-ink bg-paper-raised px-5 py-4">
            <p className="eyebrow eyebrow-accent">{L.step2}</p>
            <p className="mt-1.5 text-[11px] text-ink-mute max-w-[60ch] leading-snug">
              {L.sensationHint}
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                  {L.primaryLabel} *
                </span>
                <select
                  value={primarySensation}
                  onChange={(e) =>
                    setPrimarySensation(e.target.value as SensationId)
                  }
                  className="border border-rule bg-paper px-2 py-1.5 text-[12.5px] text-ink focus:border-accent outline-none"
                >
                  <option value="">{L.selectPlaceholder}</option>
                  {sensationOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.number} — {o.label}
                    </option>
                  ))}
                </select>
                {primarySensation && (
                  <span className="text-[10.5px] text-ink-quiet italic leading-snug">
                    {sensationOptions.find((o) => o.id === primarySensation)?.signal}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                  {L.secondaryLabel}
                </span>
                <select
                  value={secondarySensation}
                  onChange={(e) =>
                    setSecondarySensation(e.target.value as SensationId)
                  }
                  className="border border-rule bg-paper px-2 py-1.5 text-[12.5px] text-ink focus:border-accent outline-none"
                >
                  <option value="">{L.selectPlaceholder}</option>
                  {sensationOptions
                    .filter((o) => o.id !== primarySensation)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.number} — {o.label}
                      </option>
                    ))}
                </select>
                {secondarySensation && (
                  <span className="text-[10.5px] text-ink-quiet italic leading-snug">
                    {
                      sensationOptions.find((o) => o.id === secondarySensation)
                        ?.signal
                    }
                  </span>
                )}
              </label>
            </div>
            {secondarySensation && (
              <label className="flex items-center gap-3 mt-4">
                <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute whitespace-nowrap">
                  {L.weightLabel}
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={primaryWeight}
                  onChange={(e) => setPrimaryWeight(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="tabular text-[11.5px] text-accent w-[80px] text-right">
                  {(primaryWeight * 100).toFixed(0)}% /{" "}
                  {((1 - primaryWeight) * 100).toFixed(0)}%
                </span>
              </label>
            )}
          </div>

          {/* Step 3 — Labs */}
          <div className="border border-rule bg-paper-raised">
            <div className="px-5 py-4 border-b border-rule flex items-baseline justify-between gap-3">
              <div>
                <p className="eyebrow eyebrow-accent">{L.step3}</p>
                <p className="mt-1 text-[11px] text-ink-mute">{L.labsHint}</p>
              </div>
              <span className="tabular text-[10.5px] text-accent">
                {Object.keys(labs).length} / {ALL_LAB_KEYS.length}
              </span>
            </div>
            <ul className="divide-y divide-rule">
              {LAB_SYSTEMS.map((sys) => {
                const isOpen = openSystems[sys.id] ?? false;
                const filled = sys.keys.filter(
                  (k) => typeof labs[k] === "number",
                ).length;
                return (
                  <li key={sys.id}>
                    <button
                      onClick={() => toggleSystem(sys.id)}
                      className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-paper-soft"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="text-[10px] tabular text-ink-mute w-4">
                          {isOpen ? "−" : "+"}
                        </span>
                        <span className="editorial text-[13.5px] text-ink">
                          {locale === "es" ? sys.label_es : sys.label_en}
                        </span>
                      </span>
                      <span className="tabular text-[10.5px] text-ink-mute">
                        {filled} / {sys.keys.length}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {sys.keys.map((k) => {
                          const ref = LAB_REFERENCE[k];
                          return (
                            <label key={k} className="flex flex-col gap-0.5">
                              <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                                {k}{" "}
                                {ref?.unit && (
                                  <span className="text-ink-mute/70">
                                    {ref.unit}
                                  </span>
                                )}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                value={(labs[k] ?? "") as number | ""}
                                placeholder={
                                  ref ? String(Math.round(ref.mean * 100) / 100) : ""
                                }
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setLabs((prev) => {
                                    const next = { ...prev };
                                    if (raw === "") delete next[k];
                                    else next[k] = Number(raw);
                                    return next;
                                  });
                                }}
                                className="border border-rule bg-paper px-2 py-1 text-[12.5px] tabular text-ink focus:border-accent outline-none"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Step 4 — Body location (descriptive) */}
          <div className="border border-rule bg-paper-raised px-5 py-4">
            <p className="eyebrow">{L.step4}</p>
            <p className="mt-1 text-[11px] text-ink-mute max-w-[60ch]">
              {L.zonesHint}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_BODY_ZONES.map((z) => {
                const isOn = zones.has(z);
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => toggleZone(z)}
                    className={`px-2.5 py-1 text-[10.5px] tabular tracking-wide transition-colors ${
                      isOn
                        ? "bg-ink text-paper"
                        : "border border-rule text-ink-mute hover:border-ink"
                    }`}
                  >
                    {locale === "es" ? ZONE_LABEL[z].es : ZONE_LABEL[z].en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 5 — Transcript */}
          <div className="border border-rule bg-paper-raised px-5 py-4">
            <p className="eyebrow eyebrow-accent">{L.step5}</p>
            <p className="mt-1 text-[11px] text-ink-mute max-w-[60ch]">
              {L.transcriptHint}
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="mt-3 w-full h-[200px] border border-rule bg-paper px-3 py-2 text-[13px] text-ink-soft focus:border-accent outline-none leading-[1.55] resize-y"
              placeholder={
                locale === "es"
                  ? "Pega transcript ya anonimizado…"
                  : "Paste anonymised transcript…"
              }
            />
            <p className="mt-1.5 text-[10px] tabular text-ink-mute">
              {transcript.trim().length} chars
            </p>
          </div>

          <button
            onClick={run}
            disabled={running || !canRun}
            className="inline-flex items-center gap-3 bg-accent text-paper px-5 py-3 text-[13px] tracking-wide hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? L.running : L.run}
            <span className="inline-block w-6 h-px bg-paper" />
          </button>

          {error && (
            <div className="border border-danger bg-paper-raised px-4 py-3 text-[12.5px] text-danger">
              {error}
            </div>
          )}
        </div>

        {/* ─── Output column ──────────────────────────────── */}
        <div className="col-span-12 lg:col-span-6 space-y-5">
          {!response ? (
            <div className="border border-rule bg-paper-soft px-5 py-6 text-[12px] italic text-ink-mute leading-snug">
              {locale === "es"
                ? "Al correr: el sistema toma la sensación que declaraste, mezcla las cascadas esperadas (si hay secundaria), calcula discordancias contra los labs, infiere impronta condicional, y clasifica carga alostática tipo McEwen. Sonnet entra sólo para marcas narrativas y segunda opinión de sensación."
                : "On run: the system takes your declared sensation, mixes expected cascades (if secondary given), computes discordances vs labs, infers conditional imprint, and classifies McEwen allostatic load. Sonnet only scores narrative marks and provides second-opinion sensations."}
            </div>
          ) : (
            <>
              {/* Declared sensations banner */}
              <div className="border-2 border-accent bg-paper-raised px-5 py-4">
                <p className="eyebrow eyebrow-accent">{L.declaredTitle}</p>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <div>
                    <span className="tabular text-[10px] tracking-wide uppercase text-ink-mute">
                      Primaria
                    </span>
                    <p className="editorial text-[16px] text-ink">
                      #{response.declared.primary.number}{" "}
                      {locale === "es"
                        ? response.declared.primary.name_es
                        : response.declared.primary.name_en}{" "}
                      <span className="tabular text-[12px] text-accent">
                        {(response.declared.primary.weight * 100).toFixed(0)}%
                      </span>
                    </p>
                  </div>
                  {response.declared.secondary && (
                    <div>
                      <span className="tabular text-[10px] tracking-wide uppercase text-ink-mute">
                        Secundaria
                      </span>
                      <p className="editorial text-[16px] text-ink">
                        #{response.declared.secondary.number}{" "}
                        {locale === "es"
                          ? response.declared.secondary.name_es
                          : response.declared.secondary.name_en}{" "}
                        <span className="tabular text-[12px] text-ink-quiet">
                          {(response.declared.secondary.weight * 100).toFixed(0)}%
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cascade expected */}
              <div className="border border-rule bg-paper-raised px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="eyebrow eyebrow-accent">{L.layerCascadeTitle}</p>
                    <p className="mt-1 text-[10.5px] text-ink-mute">
                      {L.layerCascadeSub}
                    </p>
                  </div>
                  <span className="tabular text-[9.5px] text-ink-mute">
                    {response.layer_cascade.version}
                  </span>
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  {Object.values(response.layer_cascade.markers)
                    .filter((m) => Math.abs(m.expected_z) > 0.3)
                    .sort(
                      (a, b) =>
                        Math.abs(b.expected_z) - Math.abs(a.expected_z),
                    )
                    .slice(0, 14)
                    .map((m) => {
                      const dir =
                        m.expected_z > 0 ? "↑" : m.expected_z < 0 ? "↓" : "=";
                      return (
                        <li key={m.key} className="flex items-baseline justify-between gap-2">
                          <span className="tabular text-ink">{m.key}</span>
                          <span className="tabular text-ink-quiet">
                            {dir} z {m.expected_z.toFixed(2)}±
                            {m.expected_sd_z.toFixed(2)}
                            {m.expected_raw !== null && m.unit && (
                              <>
                                {" "}
                                ({m.expected_raw.toFixed(2)} {m.unit})
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>

              {/* Discordances */}
              <div className="border border-rule bg-paper-raised px-5 py-4">
                <p className="eyebrow eyebrow-accent">{L.layerDiscordancesTitle}</p>
                {response.layer_discordances.length === 0 ? (
                  <p className="mt-3 text-[11.5px] italic text-ink-mute">
                    {locale === "es"
                      ? "Sin labs para comparar."
                      : "No labs to compare."}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {response.layer_discordances.map((d) => {
                      const color =
                        d.severity === "strong"
                          ? "border-danger bg-danger/5"
                          : d.severity === "moderate"
                            ? "border-accent bg-accent/5"
                            : d.severity === "mild"
                              ? "border-rule"
                              : "border-rule opacity-60";
                      return (
                        <li
                          key={d.key}
                          className={`border px-3 py-2 text-[11.5px] ${color}`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="tabular font-medium text-ink">
                              {d.key}
                            </span>
                            <span className="tabular text-[10.5px] text-ink-quiet">
                              {L.observed} {d.observed_raw.toFixed(2)} · z{" "}
                              {d.observed_z.toFixed(2)} · {L.expected} z{" "}
                              {d.expected_z.toFixed(2)}±
                              {d.expected_sd_z.toFixed(2)} ·{" "}
                              {d.observed_z_deviation >= 0 ? "+" : ""}
                              {d.observed_z_deviation.toFixed(2)}σ
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-ink-quiet leading-snug">
                            {locale === "es" ? d.note_es : d.note_en}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Imprint */}
              <div className="border border-rule bg-paper-raised px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="eyebrow eyebrow-accent">{L.layerImprintTitle}</p>
                    <p className="mt-1 text-[10.5px] text-ink-mute">
                      {L.layerImprintSub}
                    </p>
                  </div>
                  <span className="tabular text-[9.5px] text-ink-mute">
                    {response.layer_imprint.version}
                  </span>
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {response.layer_imprint.posterior.slice(0, 8).map((ip) => {
                    const pct = ip.posterior * 100;
                    const isDom = ip.id === response.layer_imprint.dominant;
                    return (
                      <li key={ip.id} className="text-[11.5px]">
                        <div className="flex items-baseline justify-between">
                          <span className={isDom ? "text-ink" : "text-ink-quiet"}>
                            {ip.id} · {ip.name_es}
                          </span>
                          <span className="tabular text-accent">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-0.5 h-[3px] bg-paper-soft overflow-hidden">
                          <div
                            className={
                              isDom ? "h-full bg-accent" : "h-full bg-ink-quiet"
                            }
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 grid grid-cols-2 gap-x-4 text-[10.5px] tabular">
                  <div>
                    <span className="text-ink-mute">{L.topGap}</span>{" "}
                    <span className="text-ink">
                      {response.layer_imprint.top_gap.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-mute">{L.entropy}</span>{" "}
                    <span className="text-ink">
                      {response.layer_imprint.entropy_bits.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Allostatic load */}
              <div
                className={`border-2 px-5 py-4 bg-paper-raised ${
                  response.layer_allostatic.type === 3
                    ? "border-danger"
                    : "border-ink"
                }`}
              >
                <p className="eyebrow eyebrow-accent">{L.layerAllostaticTitle}</p>
                <p className="mt-3 editorial text-[16px] text-ink">
                  {locale === "es"
                    ? response.layer_allostatic.type_label_es
                    : response.layer_allostatic.type_label_en}
                </p>
                <p className="mt-2 text-[11px] tabular text-ink-quiet">
                  {L.confidence}:{" "}
                  {(response.layer_allostatic.confidence * 100).toFixed(0)}%
                </p>
                <p className="mt-3 text-[12px] text-ink-soft leading-relaxed">
                  {locale === "es"
                    ? response.layer_allostatic.rationale_es
                    : response.layer_allostatic.rationale_en}
                </p>
              </div>

              {/* Narrative — second opinion */}
              {response.narrative && (
                <div className="border border-rule bg-paper-raised px-5 py-4">
                  <p className="eyebrow">{L.narrativeTitle}</p>
                  <p className="mt-1 text-[10.5px] text-ink-mute">
                    Sonnet 4.6 · {response.narrative.usage?.input ?? 0} in /{" "}
                    {response.narrative.usage?.output ?? 0} out
                    {response.narrative.usage?.cached
                      ? ` · ${response.narrative.usage.cached} cached`
                      : ""}
                  </p>

                  {response.narrative.suggested_sensations.length > 0 && (
                    <div className="mt-4">
                      <p className="eyebrow eyebrow-accent">
                        {L.suggestedSensationsTitle}
                      </p>
                      <p className="mt-1 text-[10.5px] italic text-ink-mute">
                        {L.suggestedHint}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {response.narrative.suggested_sensations.map((s) => {
                          const matchesPrimary = s.id === primarySensation;
                          const matchesSecondary = s.id === secondarySensation;
                          const matchLabel = matchesPrimary
                            ? "✓ primaria"
                            : matchesSecondary
                              ? "✓ secundaria"
                              : "";
                          return (
                            <li key={s.id}>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="tabular text-[11px] text-ink">
                                  #{SENSATIONS[s.id].number}{" "}
                                  {locale === "es"
                                    ? SENSATIONS[s.id].name_es
                                    : SENSATIONS[s.id].name_en}
                                </span>
                                <span className="tabular text-[10.5px]">
                                  {matchLabel && (
                                    <span className="text-accent mr-2">
                                      {matchLabel}
                                    </span>
                                  )}
                                  <span className="text-ink-quiet">
                                    {s.score.toFixed(2)}
                                  </span>
                                </span>
                              </div>
                              {s.quote && (
                                <blockquote className="mt-0.5 border-l-2 border-rule pl-3 text-[11px] italic text-ink-quiet leading-snug">
                                  &ldquo;{s.quote}&rdquo;
                                </blockquote>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="eyebrow">{L.marksTitle}</p>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(response.narrative.marks)
                        .filter(([, v]) => v.score >= 0.3)
                        .sort((a, b) => b[1].score - a[1].score)
                        .slice(0, 6)
                        .map(([mark, v]) => (
                          <li key={mark} className="text-[11px]">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="tabular text-ink-quiet">{mark}</span>
                              <span className="tabular text-accent">
                                {v.score.toFixed(2)}
                              </span>
                            </div>
                            {v.quote && !v.quote.startsWith("(") && (
                              <blockquote className="mt-0.5 border-l-2 border-rule pl-3 text-[10.5px] italic text-ink-quiet leading-snug">
                                &ldquo;{v.quote}&rdquo;
                              </blockquote>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-rule pt-8 text-[13px]">
        <Link
          href={locale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Caso ejemplo" : "Example case"}
          </p>
          <p className="mt-2 editorial text-[15px] text-ink">
            {locale === "es"
              ? "Sesión guiada sintética →"
              : "Guided synthetic session →"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/paciente?lang=es" : "/paciente"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Otra vista" : "Other view"}
          </p>
          <p className="mt-2 editorial text-[15px] text-ink">
            {locale === "es" ? "Vista paciente →" : "Patient view →"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/?lang=es" : "/"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Regresar" : "Back"}</p>
          <p className="mt-2 editorial text-[15px] text-ink">
            {locale === "es" ? "Inferentia ↗" : "Inferentia ↗"}
          </p>
        </Link>
      </section>
    </>
  );
}
