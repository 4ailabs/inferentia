"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PredictiveBodyMap } from "@/components/predictive-body-map";
import type { ImprintId } from "@/lib/math/sensations";

const IMPRINT_NAMES_ES: Record<string, string> = {
  i1: "Invasión",
  i2: "Escasez",
  i3: "Carga",
  i4: "Traición",
  i5: "Exposición",
  i6: "Confusión",
  i7: "Aplastamiento",
  i8: "Reserva",
  i9: "Abandono",
  i10: "Rechazo",
  i11: "Fracaso",
  i12: "Pérdida",
  i13: "Aniquilación",
};

type MathOutput = {
  global_metrics: {
    rigid_nodes_count: number;
    weighted_rigidity_mean: number;
    burden_pct: number;
  };
  allostatic_load: { type: 1 | 2 | 3 | "indeterminate"; confidence: number };
  weakest_flexibility: string;
  primary_leverage: string;
  secondary_leverage?: string | null;
  free_energy_released_pct: number;
  baseline_burden_pct?: number;
  clinical_strategy: string;
  leverage_top3?: Array<{ component: string; score: number; rationale?: string }>;
  imprint_id?: string | null;
  horizon_weeks?: number;
  nodes?: Record<string, { rigidity: number; reversibility?: string }>;
};

type NutriCandidate = {
  id: string;
  name: string;
  class: string;
  mechanism: string;
  evidence: "A" | "B" | "C" | "D";
  bv4_alignment?: string | null;
};

type NutriOutput = {
  primary_candidates: NutriCandidate[];
  secondary_candidates: Array<{ id: string; name: string }>;
};

type FinalSynthesis = {
  executive_summary?: string;
  diagnostic_layers?: Record<string, string>;
  predictive_analysis?: {
    system_burden_pct?: number;
    primary_leverage?: string;
    expected_gain_pct?: number;
    horizon_weeks?: number;
  };
  intervention_plan?: {
    level_0_prior_work?: string;
    level_1_molecular_primary?: Array<{
      id: string;
      dose?: string;
      timing?: string;
      rationale?: string;
      evidence_level?: string;
    }>;
    level_2_molecular_secondary?: Array<{ id: string; rationale?: string }>;
    level_3_food_first?: string[];
    sequencing?: Record<string, string>;
    contraindications_resolved?: string[];
  };
  monitoring?: {
    biomarkers_to_repeat_8w?: string[];
    flexibility_components_to_reassess?: string[];
    red_flags?: string[];
  };
  salutogenic_narrative_for_patient?: string;
  confidence?: "high" | "moderate" | "low";
  confidence_rationale?: string;
};

// ── Ana synthetic patient preset ─────────────────────────────
const ANA_PRESET = {
  clinician_notes: `CHIEF COMPLAINT
Chronic fatigue of 6 years' evolution, with progressive difficulty in weight loss despite supervised diet and exercise.

HISTORY OF PRESENT ILLNESS
34-year-old professional woman. Reports persistent morning fatigue, nocturnal anxiety with 3-4 a.m. awakenings, abdominal bloating, and fluid retention. Intermittently elevated fasting glucose despite controlled diet.

PAST HISTORY
— Non-pathological: fragmented sleep. High self-demand; reports "not allowing herself to stop."
— Family history: father with type 2 diabetes diagnosed at age 58.
— Psychobiographical: prolonged maternal separation at age 3 due to maternal hospitalization.

PHYSICAL EXAM
Weight 68 kg · BMI 26.2 · Waist 92 cm · BP 128/82 mmHg · Reduced HRV. Mild peripheral fluid retention.

INITIAL CLINICAL IMPRESSION
Early metabolic syndrome on a background of chronic sympathetic hyperactivation. Pattern compatible with sustained defensive reserve.`,
  labs: {
    cortisol_am: 22,
    hba1c: 6.1,
    fasting_glucose: 108,
    fasting_insulin: 14,
    homa_ir: 3.2,
    triglycerides: 165,
    hdl: 38,
    ldl: 128,
    crp: 4.2,
    il6: 3.1,
    alt: 42,
    ggt: 48,
    systolic_bp: 128,
    diastolic_bp: 82,
    hrv_sdnn: 28,
    waist_circumference_cm: 92,
    bmi: 28.4,
    vitamin_d_25oh: 22,
    homocysteine: 11.5,
  },
  context: {
    age: 34,
    sex: "F" as const,
    duration_years_chronic: 6,
    medications: [],
    family_cmd_history: true,
    allergies: [],
    pregnancy: false,
    known_snps: ["rs174547"],
  },
  imprint_hint: "i8 Reserve (primary) with i2 Scarcity (secondary)",
  sensation_hint: "Abandonment + Vulnerability",
};

// ── Roberto synthetic patient preset (52yo M, i3 Burden, hepatic metabolic syndrome) ──
const ROBERTO_PRESET = {
  clinician_notes: `CHIEF COMPLAINT
Disabling morning fatigue and progressive irritability of 3 years' evolution. Recent fatty liver on ultrasound; elevated blood pressure readings in last visits.

HISTORY OF PRESENT ILLNESS
52-year-old male executive. Sustained weight gain over the last decade (+14 kg). Reports persistent daytime fatigue despite sleep, growing irritability, and difficulty disconnecting. Describes bodily sensation as "a sack of sand I carry all day."

PAST HISTORY
— Non-pathological: 5-6 h/night non-restorative sleep. Evening wine consumption 3-4 glasses/day to "turn off the head." Occupational sedentarism.
— Family history: father deceased from myocardial infarction at age 58.
— Psychobiographical: sole-provider role (family breadwinner, two university-age children, dependent mother in his care). Low delegation. Self-imposed obligation to resolve.

PHYSICAL EXAM
Weight 94 kg · BMI 31.2 · Waist 108 cm · BP 148/94 mmHg · Reduced HRV. Marked visceral adiposity.

INITIAL CLINICAL IMPRESSION
Established metabolic syndrome with hepatic steatosis and recent hypertension. Clinical pattern compatible with sustained chronic burden without discharge alternation.`,
  labs: {
    cortisol_am: 19,
    hba1c: 6.4,
    fasting_glucose: 116,
    fasting_insulin: 18,
    homa_ir: 5.2,
    triglycerides: 248,
    hdl: 32,
    ldl: 152,
    total_cholesterol: 234,
    crp: 5.8,
    il6: 4.2,
    alt: 68,
    ast: 52,
    ggt: 94,
    alkaline_phosphatase: 112,
    systolic_bp: 148,
    diastolic_bp: 94,
    hrv_sdnn: 22,
    waist_circumference_cm: 108,
    bmi: 31.2,
    vitamin_d_25oh: 18,
    homocysteine: 13.8,
    ferritin: 380,
  },
  context: {
    age: 52,
    sex: "M" as const,
    duration_years_chronic: 12,
    medications: [],
    family_cmd_history: true,
    allergies: [],
    pregnancy: false,
    known_snps: [],
  },
  imprint_hint: "i3 Burden (primary) with i8 Reserve (secondary)",
  sensation_hint: "Powerlessness + Frustration",
};

// ── Lucía · 28F, i1 Decoupling — dysautonomia without metabolic syndrome ──
const LUCIA_PRESET = {
  clinician_notes: `CHIEF COMPLAINT
Panic-like episodes, persistent tachycardia, and a pervasive feeling of "not being fully present" for the past 4 years.

HISTORY OF PRESENT ILLNESS
28-year-old graphic designer. Reports dissociative episodes during routine commute, exaggerated startle response, intolerance to crowded spaces. Sleep initiation delayed by 60-90 min; frequent 4 a.m. awakenings. Cold extremities throughout the day. No weight changes.

PAST HISTORY
— Non-pathological: vegetarian diet, moderate exercise, non-smoker.
— Family history: unremarkable.
— Psychobiographical: high-impact motor vehicle accident at age 19 (passenger, driver injured). Brief therapy at the time; no structured trauma work. Marks the onset of current symptomatology.

PHYSICAL EXAM
Weight 58 kg · BMI 21.4 · Waist 71 cm · BP 112/78 mmHg · Resting HR 88 bpm · Markedly reduced HRV (SDNN 22). Cold hands on examination.

INITIAL CLINICAL IMPRESSION
Autonomic dysregulation without established metabolic syndrome. Pattern compatible with post-traumatic predictive fragmentation — the organism maintains defensive sympathetic tone without metabolic decompensation.`,
  labs: {
    cortisol_am: 24,
    cortisol_pm: 14,
    hba1c: 5.3,
    fasting_glucose: 88,
    fasting_insulin: 6,
    homa_ir: 1.3,
    triglycerides: 82,
    hdl: 64,
    ldl: 98,
    total_cholesterol: 178,
    crp: 0.8,
    il6: 1.1,
    alt: 18,
    ast: 20,
    ggt: 14,
    systolic_bp: 112,
    diastolic_bp: 78,
    hrv_sdnn: 22,
    waist_circumference_cm: 71,
    bmi: 21.4,
    vitamin_d_25oh: 26,
    homocysteine: 9.2,
  },
  context: {
    age: 28,
    sex: "F" as const,
    duration_years_chronic: 9,
    medications: [],
    family_cmd_history: false,
    allergies: [],
    pregnancy: false,
    known_snps: ["rs4680"], // COMT Val158Met — slow catecholamine clearance
  },
  imprint_hint: "i1 Decoupling (primary)",
  sensation_hint: "Fragmentation + Hypervigilance",
};

// ── Carmen · 48F, i13 Encapsulation — hypothyroidism + fibromyalgia after loss ──
const CARMEN_PRESET = {
  clinician_notes: `CHIEF COMPLAINT
Disabling diffuse body pain, cognitive fog, and unresponsive fatigue of 8 years' evolution. Diagnosed Hashimoto's hypothyroidism 6 years ago, currently on levothyroxine 75 mcg/day.

HISTORY OF PRESENT ILLNESS
48-year-old woman, elementary school teacher on leave. Reports widespread muscular pain with multiple tender points (clinical fibromyalgia criteria met), non-restorative sleep with 8-9 h in bed. Cognitive slowing. Emotional flatness; "nothing reaches me." Resistant weight gain despite TSH in range under levothyroxine.

PAST HISTORY
— Personal: Hashimoto's hypothyroidism (2020), fibromyalgia (clinical, 2021).
— Family history: mother with rheumatoid arthritis, father with coronary disease.
— Psychobiographical: loss of 14-year-old son to accident 8 years ago. Did not accept grief therapy. Since then: emotional shutdown, social withdrawal, progressive somatic deterioration. Correlation between the loss and symptom onset is clinically unequivocal.

PHYSICAL EXAM
Weight 78 kg · BMI 29.1 · Waist 98 cm · BP 132/84 mmHg · HR 62 · HRV SDNN 30. Multiple tender points on bilateral upper trapezius, greater trochanter, medial knee. Dry skin, thinning lateral eyebrows.

INITIAL CLINICAL IMPRESSION
Chronic autoimmune-inflammatory syndrome (Hashimoto's + fibromyalgia) on a background of unprocessed complex grief. Pattern compatible with defensive cardiac-center encapsulation: the organism sealed the affective core after catastrophic loss and has sustained the defensive state for nearly a decade.`,
  labs: {
    cortisol_am: 14,
    cortisol_pm: 8,
    hba1c: 5.9,
    fasting_glucose: 101,
    fasting_insulin: 11,
    homa_ir: 2.7,
    triglycerides: 188,
    hdl: 44,
    ldl: 134,
    total_cholesterol: 216,
    crp: 5.4,
    il6: 3.8,
    alt: 32,
    ast: 28,
    ggt: 34,
    tsh: 3.2,
    t3_free: 2.6,
    t4_free: 1.0,
    systolic_bp: 132,
    diastolic_bp: 84,
    hrv_sdnn: 30,
    waist_circumference_cm: 98,
    bmi: 29.1,
    vitamin_d_25oh: 16,
    homocysteine: 12.8,
    ferritin: 42,
  },
  context: {
    age: 48,
    sex: "F" as const,
    duration_years_chronic: 8,
    medications: ["levothyroxine 75 mcg"],
    family_cmd_history: true,
    allergies: [],
    pregnancy: false,
    known_snps: ["rs1801133"], // MTHFR C677T — compromised folate methylation
  },
  imprint_hint: "i13 Encapsulation (primary)",
  sensation_hint: "Grief + Emotional shutdown",
};

export default function InferentiaClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [labsRaw, setLabsRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [imprintHint, setImprintHint] = useState("");
  const [sensationHint, setSensationHint] = useState("");
  const [ageStr, setAgeStr] = useState("34");
  const [sex, setSex] = useState<"F" | "M">("F");
  const [durationStr, setDurationStr] = useState("0");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agent outputs
  const [mathOut, setMathOut] = useState<MathOutput | null>(null);
  const [dbInfo, setDbInfo] = useState<{ count: number; source: string } | null>(null);
  const [nutriOut, setNutriOut] = useState<NutriOutput | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [thinkingChunks, setThinkingChunks] = useState<string[]>([]);
  const [textBuf, setTextBuf] = useState("");
  const [finalSynth, setFinalSynth] = useState<FinalSynthesis | null>(null);
  const [usage, setUsage] = useState<{ input: number; output: number; cached: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const imprintFromHint = useMemo<ImprintId | null>(() => {
    const m = imprintHint.match(/i(\d{1,2})/i);
    if (!m) return null;
    const n = Number(m[1]);
    if (n < 1 || n > 13) return null;
    return `i${n}` as ImprintId;
  }, [imprintHint]);

  const bodyMapStrength = useMemo(() => {
    if (!mathOut) return imprintFromHint ? 0.5 : 0;
    // Usar weighted rigidity como proxy de intensidad del prior
    return Math.min(1, mathOut.global_metrics.weighted_rigidity_mean + 0.3);
  }, [mathOut, imprintFromHint]);

  const L =
    locale === "es"
      ? {
          title: "Orchestrator Inferentia",
          sub: "3 agentes Opus 4.7 + matemática auditable. El Metabolic Mathematician calcula el estado del sistema (22 nodos, flexibilidad, apalancamiento, energía libre). El Nutrigenomic Advisor selecciona moléculas con mecanismo documentado sobre los nodos rígidos — con dosis, forma y ajuste por SNPs. El Orchestrator sintetiza todo en un protocolo clínico con trabajo del prior, moléculas, alimentos y monitoreo.",
          hero: "Cada número es cálculo. Cada molécula tiene evidencia. Cada decisión clínica es trazable.",
          load: "Cargar Ana (demo)",
          run: "Iniciar orquestación",
          running: "Orquestando (Opus 4.7 · extended thinking)…",
          stop: "Detener",
          notesLabel: "Notas clínicas",
          labsLabel: "Labs (JSON)",
          ageLabel: "Edad",
          sexLabel: "Sexo",
          durationLabel: "Años cronicidad",
          imprintLabel: "Impronta hipótesis",
          sensationLabel: "Sensación declarada",
          mathPanel: "Metabolic Mathematician",
          nutriPanel: "Nutrigenomic Advisor",
          synthPanel: "Orchestrator · Síntesis Opus 4.7",
          thinkingPanel: "Pensamiento interno (extended thinking)",
          waitingMath: "Pendiente — cálculo del estado del sistema",
          waitingNutri: "Pendiente — selección de moduladores",
          waitingSynth: "Pendiente — síntesis de los 3 análisis",
          execSummary: "Resumen ejecutivo",
          diagLayers: "Capas diagnósticas",
          predAnalysis: "Análisis predictivo",
          plan: "Plan de intervención",
          level0: "Nivel 0 · trabajo del prior (clínico)",
          level1: "Nivel 1 · moduladores primarios",
          level2: "Nivel 2 · moduladores secundarios",
          level3: "Nivel 3 · food-first",
          sequencing: "Secuenciación temporal",
          monitoring: "Monitoreo",
          patientNarrative: "Narrativa salutogénica (paciente)",
          confidence: "Confianza",
          usage: "Uso de tokens",
        }
      : {
          title: "Inferentia Orchestrator",
          sub: "3 Opus 4.7 agents + auditable math. The Metabolic Mathematician computes system state (22 nodes, flexibility, leverage, free energy). The Nutrigenomic Advisor selects molecules with documented mechanism on the rigid nodes — with dose, form, and SNP adjustment. The Orchestrator synthesizes into a clinical protocol with prior-work, molecules, food, and monitoring.",
          hero: "Every number is computation. Every molecule has evidence. Every clinical decision is traceable.",
          load: "Load Ana (demo)",
          run: "Start orchestration",
          running: "Orchestrating (Opus 4.7 · extended thinking)…",
          stop: "Stop",
          notesLabel: "Clinical notes",
          labsLabel: "Labs (JSON)",
          ageLabel: "Age",
          sexLabel: "Sex",
          durationLabel: "Years chronic",
          imprintLabel: "Imprint hypothesis",
          sensationLabel: "Declared sensation",
          mathPanel: "Metabolic Mathematician",
          nutriPanel: "Nutrigenomic Advisor",
          synthPanel: "Orchestrator · Opus 4.7 synthesis",
          thinkingPanel: "Internal thinking (extended thinking)",
          waitingMath: "Waiting — system state computation",
          waitingNutri: "Waiting — modulator selection",
          waitingSynth: "Waiting — synthesis of the 3 analyses",
          execSummary: "Executive summary",
          diagLayers: "Diagnostic layers",
          predAnalysis: "Predictive analysis",
          plan: "Intervention plan",
          level0: "Level 0 · prior work (clinician)",
          level1: "Level 1 · primary modulators",
          level2: "Level 2 · secondary modulators",
          level3: "Level 3 · food-first",
          sequencing: "Temporal sequencing",
          monitoring: "Monitoring",
          patientNarrative: "Salutogenic narrative (patient)",
          confidence: "Confidence",
          usage: "Token usage",
        };

  const loadPreset = useCallback(
    (
      preset:
        | typeof ANA_PRESET
        | typeof ROBERTO_PRESET
        | typeof LUCIA_PRESET
        | typeof CARMEN_PRESET,
    ) => {
      setNotes(preset.clinician_notes);
      setLabsRaw(JSON.stringify(preset.labs, null, 2));
      setAgeStr(String(preset.context.age));
      setSex(preset.context.sex);
      setDurationStr(String(preset.context.duration_years_chronic));
      setImprintHint(preset.imprint_hint);
      setSensationHint(preset.sensation_hint);
    },
    [],
  );
  const loadAna = useCallback(() => loadPreset(ANA_PRESET), [loadPreset]);
  const loadRoberto = useCallback(
    () => loadPreset(ROBERTO_PRESET),
    [loadPreset],
  );
  const loadLucia = useCallback(() => loadPreset(LUCIA_PRESET), [loadPreset]);
  const loadCarmen = useCallback(() => loadPreset(CARMEN_PRESET), [loadPreset]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const [sentAt, setSentAt] = useState<number | null>(null);
  const sendToPatient = useCallback(() => {
    if (!finalSynth) return;
    const snapshot = {
      savedAt: Date.now(),
      caseLabel: imprintHint || undefined,
      imprintId: imprintFromHint,
      imprintName: imprintFromHint
        ? IMPRINT_NAMES_ES[imprintFromHint] ?? imprintFromHint.toUpperCase()
        : undefined,
      primaryLeverage:
        finalSynth.predictive_analysis?.primary_leverage ?? mathOut?.primary_leverage,
      freeEnergyReleasedPct:
        finalSynth.predictive_analysis?.expected_gain_pct ??
        mathOut?.free_energy_released_pct,
      horizonWeeks: finalSynth.predictive_analysis?.horizon_weeks ?? 12,
      narrative: finalSynth.salutogenic_narrative_for_patient,
      level1Primary: finalSynth.intervention_plan?.level_1_molecular_primary,
      foodFirst: finalSynth.intervention_plan?.level_3_food_first,
      monitoringBiomarkers: finalSynth.monitoring?.biomarkers_to_repeat_8w,
      sequencing: finalSynth.intervention_plan?.sequencing,
      confidence: finalSynth.confidence,
    };
    try {
      localStorage.setItem("inferentia:last-orchestration", JSON.stringify(snapshot));
      setSentAt(snapshot.savedAt);
    } catch {
      // quota exceeded — raro pero posible
    }
  }, [finalSynth, imprintFromHint, imprintHint, mathOut]);

  const run = useCallback(async () => {
    if (running) return;

    // Rate-limit suave: una orquestación cada 5 min por sesión del navegador.
    // Opus 4.7 extended thinking cuesta ~$2-4 USD por corrida; el jurado puede
    // explorar sin agotar el presupuesto del autor. Saltarse esto requiere
    // abrir el panel del autor (no existe, es intencional).
    try {
      const lastRunStr = localStorage.getItem("inferentia:last-run-ts");
      if (lastRunStr) {
        const elapsed = Date.now() - Number(lastRunStr);
        const windowMs = 5 * 60 * 1000;
        if (elapsed < windowMs) {
          const waitSec = Math.ceil((windowMs - elapsed) / 1000);
          setError(
            locale === "es"
              ? `Rate-limit local: espera ${Math.ceil(waitSec / 60)} min antes de otra orquestación (protege el presupuesto del demo).`
              : `Local rate-limit: wait ${Math.ceil(waitSec / 60)} min before another orchestration (protects demo budget).`,
          );
          return;
        }
      }
      localStorage.setItem("inferentia:last-run-ts", String(Date.now()));
    } catch {
      // localStorage no disponible: permitir la corrida
    }

    setRunning(true);
    setError(null);
    setMathOut(null);
    setNutriOut(null);
    setDbInfo(null);
    setPhase(null);
    setThinkingChunks([]);
    setTextBuf("");
    setFinalSynth(null);
    setUsage(null);

    let labs: Record<string, number> = {};
    if (labsRaw.trim()) {
      try {
        labs = JSON.parse(labsRaw);
      } catch {
        setError("Labs JSON inválido");
        setRunning(false);
        return;
      }
    }

    const age = Number(ageStr) || 34;
    const duration = Number(durationStr) || 0;

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clinician_notes: notes || undefined,
          labs,
          context: {
            age,
            sex,
            duration_years_chronic: duration,
            medications: [],
            family_cmd_history: false,
            allergies: [],
            pregnancy: false,
            known_snps: [],
          },
          imprint_hint: imprintHint || undefined,
          sensation_hint: sensationHint || undefined,
          locale,
        }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        setError(`HTTP ${res.status}`);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          const lines = chunk.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) data += line.slice(6);
          }
          if (!data) continue;
          try {
            const payload = JSON.parse(data);
            if (event === "phase") setPhase(`${payload.phase} · ${payload.name}`);
            else if (event === "math_output") setMathOut(payload as MathOutput);
            else if (event === "db_loaded") setDbInfo(payload);
            else if (event === "nutri_output") setNutriOut(payload as NutriOutput);
            else if (event === "thinking") {
              setThinkingChunks((p) => [...p, payload.text]);
            } else if (event === "text") {
              accText += payload.text;
              setTextBuf(accText);
              const m = accText.match(/```json\s*([\s\S]*?)```/);
              if (m) {
                try {
                  const parsed = JSON.parse(m[1]) as FinalSynthesis;
                  setFinalSynth(parsed);
                } catch {
                  // still streaming
                }
              }
            } else if (event === "done") {
              setUsage(payload.usage);
            } else if (event === "error") {
              setError(payload.message);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [running, labsRaw, notes, ageStr, sex, durationStr, imprintHint, sensationHint, locale]);

  return (
    <>
      <section className="mb-8 flex items-end justify-between gap-6 border-b border-rule pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">
            {locale === "es" ? "Clínico · Orchestrator" : "Clinician · Orchestrator"}
          </p>
          <h1
            className="mt-3 editorial text-[28px] md:text-[36px] leading-[1.05] text-ink tracking-[-0.02em]"
            style={{ fontVariationSettings: '"SOFT" 30, "opsz" 72' }}
          >
            {locale === "es" ? "Ejecutar una sesión clínica" : "Run a clinical session"}
          </h1>
        </div>
        <p className="hidden md:block font-mono text-[10px] tracking-[0.14em] uppercase text-ink-mute shrink-0">
          {locale === "es" ? "Prototipo · uso supervisado" : "Prototype · supervised use"}
        </p>
      </section>

      <section className="grid grid-cols-12 gap-6">
        {/* ── Input column ──────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="border border-ink bg-paper-raised px-5 py-5 space-y-5">
            {/* ── Presets · 4 synthetic cases covering different defensive patterns ── */}
            <div>
              <p className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-ink-mute mb-2.5">
                {locale === "es" ? "Cargar caso sintético" : "Load synthetic case"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PresetButton
                  onClick={loadAna}
                  code="34F · i8"
                  name="Ana"
                  tag={locale === "es" ? "Reserva" : "Reserve"}
                />
                <PresetButton
                  onClick={loadRoberto}
                  code="52M · i3"
                  name="Roberto"
                  tag={locale === "es" ? "Carga" : "Burden"}
                />
                <PresetButton
                  onClick={loadLucia}
                  code="28F · i1"
                  name="Lucía"
                  tag={locale === "es" ? "Desacople" : "Decoupling"}
                />
                <PresetButton
                  onClick={loadCarmen}
                  code="48F · i13"
                  name="Carmen"
                  tag={locale === "es" ? "Encapsulamiento" : "Encapsulation"}
                />
              </div>
              <p className="mt-2 font-mono text-[9px] tracking-[0.1em] text-ink-mute leading-[1.5]">
                {locale === "es"
                  ? "4 patrones distintos · fisiologías distintas · biografías distintas"
                  : "4 distinct patterns · distinct physiologies · distinct biographies"}
              </p>
            </div>

            {/* ── Demographics · 3 campos con label encima ── */}
            <div className="border-t border-rule pt-5">
              <p className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-ink-mute mb-2.5">
                {locale === "es" ? "Paciente" : "Patient"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <label className="block min-w-0">
                  <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-mute">
                    {locale === "es" ? "Edad" : "Age"}
                  </span>
                  <input
                    type="text"
                    value={ageStr}
                    onChange={(e) => setAgeStr(e.target.value)}
                    className="mt-1 w-full border border-rule bg-paper px-2 py-1.5 text-[13px] tabular text-ink focus:border-accent outline-none"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-mute">
                    {locale === "es" ? "Sexo" : "Sex"}
                  </span>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as "F" | "M")}
                    className="mt-1 w-full border border-rule bg-paper px-2 py-1.5 text-[13px] tabular text-ink focus:border-accent outline-none"
                  >
                    <option value="F">F</option>
                    <option value="M">M</option>
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-mute">
                    {locale === "es" ? "Años" : "Years"}
                  </span>
                  <input
                    type="text"
                    value={durationStr}
                    onChange={(e) => setDurationStr(e.target.value)}
                    className="mt-1 w-full border border-rule bg-paper px-2 py-1.5 text-[13px] tabular text-ink focus:border-accent outline-none"
                    aria-label={locale === "es" ? "Años de cronicidad" : "Years chronic"}
                  />
                </label>
              </div>
              <p className="mt-1.5 font-mono text-[9px] tracking-[0.1em] text-ink-mute">
                {locale === "es" ? "Años = duración del cuadro crónico" : "Years = duration of chronic condition"}
              </p>
            </div>

            {/* ── Clinical notes · always visible ── */}
            <div className="border-t border-rule pt-5">
              <label className="block">
                <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-ink-mute">
                  {L.notesLabel}
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={notes ? 12 : 4}
                  placeholder={locale === "es"
                    ? "Motivo de consulta, historia, antecedentes, exploración…"
                    : "Chief complaint, history, past history, exam…"}
                  className="mt-2 w-full border border-rule bg-paper px-3 py-2 text-[12.5px] text-ink-soft focus:border-accent outline-none resize-y font-mono leading-[1.55]"
                />
              </label>
            </div>

            {/* ── Clinical hypothesis · collapsible ── */}
            <details className="border-t border-rule pt-5 group" open>
              <summary className="cursor-pointer flex items-center justify-between list-none">
                <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-ink-mute">
                  {locale === "es" ? "Hipótesis clínica (opcional)" : "Clinical hypothesis (optional)"}
                </span>
                <span className="font-mono text-[9.5px] text-ink-mute group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-[10px] tabular uppercase text-ink-mute">
                    {L.imprintLabel}
                  </span>
                  <input
                    type="text"
                    value={imprintHint}
                    onChange={(e) => setImprintHint(e.target.value)}
                    placeholder="e.g. i8 Reserve"
                    className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-[12.5px] text-ink focus:border-accent outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] tabular uppercase text-ink-mute">
                    {L.sensationLabel}
                  </span>
                  <input
                    type="text"
                    value={sensationHint}
                    onChange={(e) => setSensationHint(e.target.value)}
                    placeholder="e.g. Abandonment + Vulnerability"
                    className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-[12.5px] text-ink focus:border-accent outline-none"
                  />
                </label>
              </div>
            </details>

            {/* ── Labs · collapsible technical ── */}
            <details className="border-t border-rule pt-5 group">
              <summary className="cursor-pointer flex items-center justify-between list-none">
                <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-ink-mute">
                  {locale === "es" ? "Laboratorios (JSON · avanzado)" : "Labs (JSON · advanced)"}
                </span>
                <span className="font-mono text-[9.5px] text-ink-mute group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <p className="mt-2 text-[11px] italic text-ink-quiet leading-snug">
                {locale === "es"
                  ? "Los presets ya cargan los labs. Edita aquí solo si quieres probar tu propio caso."
                  : "Presets already load labs. Edit here only to try your own case."}
              </p>
              <textarea
                value={labsRaw}
                onChange={(e) => setLabsRaw(e.target.value)}
                rows={8}
                className="mt-2 w-full border border-rule bg-paper px-3 py-2 text-[11.5px] tabular text-ink-soft focus:border-accent outline-none resize-y"
              />
            </details>

            {/* ── Primary CTA ── */}
            <div className="border-t border-rule pt-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={run}
                  disabled={running}
                  className="inline-flex items-center gap-3 bg-ink text-paper px-5 py-3 font-mono text-[11.5px] tracking-[0.16em] uppercase hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? L.running : L.run}
                  <span className="inline-block w-6 h-px bg-paper" />
                </button>
                {running && (
                  <button
                    onClick={stop}
                    className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-ink-mute hover:text-danger transition-colors"
                  >
                    {L.stop}
                  </button>
                )}
              </div>

              {phase && (
                <div className="mt-3 font-mono text-[10px] tabular tracking-[0.18em] uppercase text-accent">
                  ▸ {phase}
                </div>
              )}
              {error && (
                <div className="mt-3 border border-danger bg-paper-raised px-3 py-2.5">
                  <p className="tabular text-[9.5px] tracking-[0.18em] uppercase text-danger">
                    {humanErrorTitle(error, locale)}
                  </p>
                  <p className="mt-1 text-[12px] text-danger leading-snug">
                    {humanErrorMessage(error, locale)}
                  </p>
                </div>
              )}
              {usage && (
                <div className="mt-3 font-mono text-[10px] tabular text-ink-mute">
                  {L.usage}: {usage.input} in · {usage.output} out · {usage.cached} cached
                </div>
              )}
            </div>
          </div>

          {imprintFromHint && (
            <PredictiveBodyMap
              imprintId={imprintFromHint}
              imprintName={IMPRINT_NAMES_ES[imprintFromHint] ?? imprintFromHint.toUpperCase()}
              strength={bodyMapStrength}
              nodes={mathOut?.nodes}
              priors={
                mathOut
                  ? [
                      {
                        label:
                          locale === "es"
                            ? `${imprintFromHint.toUpperCase()} · ${IMPRINT_NAMES_ES[imprintFromHint] ?? ""}`
                            : imprintFromHint.toUpperCase(),
                        strength: bodyMapStrength,
                      },
                      {
                        label:
                          locale === "es"
                            ? `Apalancamiento · ${humanize(mathOut.primary_leverage)}`
                            : `Leverage · ${humanize(mathOut.primary_leverage)}`,
                        strength: 0.85,
                      },
                      {
                        label:
                          locale === "es"
                            ? `Alostasis tipo ${mathOut.allostatic_load.type}`
                            : `Allostatic type ${mathOut.allostatic_load.type}`,
                        strength: 0.7,
                      },
                    ]
                  : [
                      {
                        label:
                          locale === "es"
                            ? `${imprintFromHint.toUpperCase()} · ${IMPRINT_NAMES_ES[imprintFromHint] ?? ""}`
                            : imprintFromHint.toUpperCase(),
                        strength: 0.5,
                      },
                    ]
              }
              locale={locale}
            />
          )}

          <div className="text-[11px] text-ink-mute border-l-2 border-rule pl-3 leading-snug">
            {locale === "es"
              ? "Prototipo de asistencia clínica. Validación formal pendiente. No sustituye juicio profesional."
              : "Clinical-assist prototype. Formal validation pending. Does not replace professional judgement."}
          </div>
        </div>

        {/* ── Agent output column ────────────────────────── */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          {/* PANEL 1 — Math */}
          <AgentPanel
            title={L.mathPanel}
            status={mathOut ? "complete" : running ? "running" : "idle"}
            minH="md"
            collapsible
            locale={locale}
            summary={
              mathOut
                ? `${(mathOut.global_metrics.weighted_rigidity_mean * 100).toFixed(1)}% rigidity · ${mathOut.global_metrics.rigid_nodes_count}/22 rigid · ${locale === "es" ? "Tipo" : "Type"} ${mathOut.allostatic_load.type} · ΔF −${mathOut.free_energy_released_pct.toFixed(1)}% · leverage: ${humanize(mathOut.primary_leverage)}`
                : undefined
            }
            tagline={
              locale === "es"
                ? "22 nodos · flexibilidad 8D · leverage · free energy"
                : "22 nodes · 8D flexibility · leverage · free energy"
            }
          >
            {!mathOut && (
              <p className="text-[12px] italic text-ink-mute">{L.waitingMath}</p>
            )}
            {mathOut && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                <Metric
                  label={locale === "es" ? "Rigidez media" : "Mean rigidity"}
                  value={`${(mathOut.global_metrics.weighted_rigidity_mean * 100).toFixed(1)}%`}
                />
                <Metric
                  label={locale === "es" ? "Nodos rígidos" : "Rigid nodes"}
                  value={`${mathOut.global_metrics.rigid_nodes_count}/22`}
                />
                <Metric
                  label={locale === "es" ? "Carga alostática" : "Allostatic load"}
                  value={`${locale === "es" ? "Tipo" : "Type"} ${mathOut.allostatic_load.type}`}
                />
                <Metric
                  label={locale === "es" ? "ΔFree energy" : "ΔFree energy"}
                  value={`${mathOut.free_energy_released_pct.toFixed(1)}%`}
                  accent
                />
                <Metric
                  label={locale === "es" ? "Componente débil" : "Weakest"}
                  value={humanize(mathOut.weakest_flexibility)}
                />
                <Metric
                  label={locale === "es" ? "Apalancamiento primario" : "Primary leverage"}
                  value={humanize(mathOut.primary_leverage)}
                  accent
                />
                <div className="col-span-2 md:col-span-4 mt-1 text-[11.5px] italic text-ink-quiet leading-snug border-l-2 border-accent pl-3">
                  {mathOut.clinical_strategy}
                </div>
              </div>
            )}

            {/* ── Bloque: Predicción contrafactual ─────────────── */}
            {mathOut && (
              <div className="mt-5 pt-4 border-t border-rule">
                <p className="eyebrow eyebrow-accent">
                  {locale === "es"
                    ? "Predicción contrafactual"
                    : "Counterfactual prediction"}
                </p>
                <p className="mt-2 text-[10.5px] tabular tracking-wide uppercase text-ink-mute">
                  {locale === "es"
                    ? `Si se trabaja ${humanize(mathOut.primary_leverage)} durante ${mathOut.horizon_weeks ?? 12} semanas`
                    : `If ${humanize(mathOut.primary_leverage)} is worked for ${mathOut.horizon_weeks ?? 12} weeks`}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="tabular text-[9.5px] uppercase text-ink-mute">
                      {locale === "es" ? "Carga actual" : "Current burden"}
                    </p>
                    <p className="editorial text-[22px] text-ink-quiet mt-0.5">
                      {mathOut.baseline_burden_pct != null
                        ? `${mathOut.baseline_burden_pct.toFixed(1)}%`
                        : `${(mathOut.global_metrics.weighted_rigidity_mean * 100).toFixed(1)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="tabular text-[9.5px] uppercase text-accent">
                      {locale === "es"
                        ? `Proyección ${mathOut.horizon_weeks ?? 12}sem`
                        : `Projection ${mathOut.horizon_weeks ?? 12}wk`}
                    </p>
                    <p className="editorial text-[22px] text-accent mt-0.5">
                      −{mathOut.free_energy_released_pct.toFixed(1)}%
                      <span className="text-[11px] tabular text-ink-mute ml-2">
                        {locale === "es" ? "de carga liberada" : "load released"}
                      </span>
                    </p>
                  </div>
                </div>

                {mathOut.leverage_top3 && mathOut.leverage_top3.length > 0 && (
                  <div className="mt-4">
                    <p className="tabular text-[9.5px] uppercase text-ink-mute">
                      {locale === "es"
                        ? `Ranking de apalancamiento${
                            mathOut.imprint_id
                              ? ` (alineado con ${mathOut.imprint_id.toUpperCase()})`
                              : ""
                          }`
                        : `Leverage ranking${
                            mathOut.imprint_id
                              ? ` (aligned with ${mathOut.imprint_id.toUpperCase()})`
                              : ""
                          }`}
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {mathOut.leverage_top3.map((p, i) => (
                        <li key={p.component} className="text-[12px]">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={
                                i === 0
                                  ? "editorial text-[13px] text-ink"
                                  : "editorial text-[12.5px] text-ink-quiet"
                              }
                            >
                              {i + 1}. {humanize(p.component)}
                            </span>
                            <span className="tabular text-[10.5px] text-accent">
                              {p.score.toFixed(2)}
                            </span>
                          </div>
                          {p.rationale && (
                            <p className="text-[11px] italic text-ink-mute leading-snug mt-0.5">
                              {p.rationale}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-4 text-[10.5px] italic text-ink-mute leading-snug border-l-2 border-rule pl-2">
                  {locale === "es"
                    ? "Predicción contrafactual del motor. Asume adherencia completa al apalancamiento primario y ninguna mejora paralela del prior. Techo real más alto si se trabaja la impronta en sesión clínica."
                    : "Counterfactual prediction by the engine. Assumes full adherence to primary leverage and no parallel prior work. Real ceiling higher if imprint work runs in parallel in clinical session."}
                </p>
              </div>
            )}
          </AgentPanel>

          {/* PANEL 2 — Nutrigenomic */}
          <AgentPanel
            title={L.nutriPanel}
            status={nutriOut ? "complete" : mathOut ? "running" : "idle"}
            minH="md"
            collapsible
            locale={locale}
            summary={
              nutriOut && nutriOut.primary_candidates.length > 0
                ? `${nutriOut.primary_candidates.length} ${locale === "es" ? "candidatos primarios" : "primary candidates"}: ${nutriOut.primary_candidates.slice(0, 3).map((m) => m.name).join(" · ")}…`
                : undefined
            }
            tagline={
              dbInfo
                ? `${dbInfo.count} ${locale === "es" ? "moduladores" : "modulators"} · ${dbInfo.source}`
                : locale === "es"
                ? "Moléculas con mecanismo documentado · dosis, forma y ajuste por SNPs"
                : "Molecules with documented mechanism · dose, form, SNP adjustment"
            }
          >
            {!nutriOut && (
              <p className="text-[12px] italic text-ink-mute">{L.waitingNutri}</p>
            )}
            {nutriOut && (
              <div className="space-y-3">
                <div>
                  <p className="eyebrow">
                    {locale === "es" ? "Candidatos primarios" : "Primary candidates"}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {nutriOut.primary_candidates.slice(0, 5).map((m) => (
                      <li
                        key={m.id}
                        className="border-l-2 border-accent pl-3 py-0.5"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="editorial text-[13.5px] text-ink">
                            {m.name}
                          </span>
                          <span className="tabular text-[10px] text-ink-mute">
                            evidence {m.evidence}
                          </span>
                        </div>
                        <p className="text-[11px] tabular text-ink-mute">
                          {m.class}
                        </p>
                        <p className="text-[11.5px] text-ink-soft italic leading-snug mt-0.5">
                          {m.mechanism}
                        </p>
                        {m.bv4_alignment && mathOut?.imprint_id && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 border border-accent px-1.5 py-0.5">
                            <span className="tabular text-[9px] tracking-[0.12em] uppercase text-accent">
                              {mathOut.imprint_id.toUpperCase()} ·
                            </span>
                            <span className="text-[10.5px] italic text-accent">
                              {m.bv4_alignment}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {nutriOut.secondary_candidates.length > 0 && (
                  <div>
                    <p className="eyebrow">
                      {locale === "es" ? "Secundarios" : "Secondary"}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-quiet">
                      {nutriOut.secondary_candidates.map((m) => m.name).join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </AgentPanel>

          {/* PANEL 3 — Thinking stream */}
          {thinkingChunks.length > 0 && (
            <AgentPanel
              title={L.thinkingPanel}
              status={finalSynth ? "complete" : "running"}
              tagline={locale === "es" ? "Opus 4.7 · razonamiento interno" : "Opus 4.7 · internal reasoning"}
              compact
              collapsible
              locale={locale}
              summary={
                finalSynth
                  ? `${thinkingChunks.length} ${locale === "es" ? "fragmentos de razonamiento" : "reasoning fragments"}`
                  : undefined
              }
            >
              <div className="max-h-[220px] overflow-y-auto space-y-2">
                {thinkingChunks.map((t, i) => (
                  <p
                    key={i}
                    className="text-[11.5px] italic text-ink-quiet leading-snug whitespace-pre-wrap border-l-2 border-accent/40 pl-3"
                  >
                    {t}
                  </p>
                ))}
              </div>
            </AgentPanel>
          )}

          {/* PANEL 4 — Final synthesis */}
          <AgentPanel
            title={L.synthPanel}
            status={finalSynth ? "complete" : textBuf ? "running" : "idle"}
            minH="lg"
            tagline={
              locale === "es"
                ? "Impronta + prior-work + moduladores + secuenciación + monitoreo"
                : "Imprint + prior-work + modulators + sequencing + monitoring"
            }
            featured
          >
            {!finalSynth && !textBuf && (
              <p className="text-[12px] italic text-ink-mute">{L.waitingSynth}</p>
            )}
            {!finalSynth && textBuf && (
              <div className="text-[12.5px] text-ink-soft leading-[1.55] whitespace-pre-wrap max-h-[380px] overflow-y-auto">
                {textBuf}
              </div>
            )}
            {finalSynth && (
              <>
                <FinalSynthesisView synth={finalSynth} L={L} locale={locale} />
                <div className="mt-5 pt-4 border-t border-rule flex items-center justify-between gap-3">
                  <button
                    onClick={sendToPatient}
                    className="inline-flex items-center gap-3 border-2 border-ink bg-paper text-ink px-4 py-2 text-[12.5px] tabular tracking-wide hover:bg-ink hover:text-paper transition-colors"
                  >
                    {locale === "es"
                      ? "→ Enviar lectura al paciente"
                      : "→ Send reading to patient"}
                  </button>
                  {sentAt && (
                    <Link
                      href={
                        locale === "es"
                          ? "/paciente/inferentia?lang=es"
                          : "/paciente/inferentia"
                      }
                      target="_blank"
                      className="text-[11.5px] text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
                    >
                      {locale === "es"
                        ? `Enviado ${new Date(sentAt).toLocaleTimeString("es-MX")} · abrir vista paciente ↗`
                        : `Sent ${new Date(sentAt).toLocaleTimeString("en-US")} · open patient view ↗`}
                    </Link>
                  )}
                </div>
              </>
            )}
          </AgentPanel>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-rule pt-6 text-[13px]">
        <Link
          href={locale === "es" ? "/clinico/reasoner?lang=es" : "/clinico/reasoner"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Clinical Reasoner" : "Clinical Reasoner"}
          </p>
          <p className="mt-2 editorial text-[15px] text-ink">
            /clinico/reasoner →
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Sesión guiada" : "Guided session"}
          </p>
          <p className="mt-2 editorial text-[15px] text-ink">/clinico/sesion →</p>
        </Link>
        <Link
          href={locale === "es" ? "/?lang=es" : "/"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Portada" : "Cover"}</p>
          <p className="mt-2 editorial text-[15px] text-ink">← Inferentia</p>
        </Link>
      </section>

      {/* ── Sticky action bar — visible when synthesis is ready ── */}
      {finalSynth && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink bg-paper/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[1480px] px-6 md:px-10 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-accent shrink-0">
                {locale === "es" ? "Síntesis lista" : "Synthesis ready"}
              </span>
              <span className="hidden sm:inline text-[11.5px] italic text-ink-quiet truncate">
                {locale === "es"
                  ? "El paciente puede recibir su lectura humana ahora."
                  : "The patient can receive their human reading now."}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {sentAt ? (
                <Link
                  href={locale === "es" ? "/paciente/inferentia?lang=es" : "/paciente/inferentia"}
                  target="_blank"
                  className="inline-flex items-center gap-2 h-9 px-4 bg-accent text-paper font-mono text-[11px] tracking-[0.14em] uppercase hover:bg-accent-deep transition-colors"
                >
                  {locale === "es" ? "Abrir vista paciente" : "Open patient view"}
                  <span>↗</span>
                </Link>
              ) : (
                <button
                  onClick={sendToPatient}
                  className="inline-flex items-center gap-2 h-9 px-4 bg-ink text-paper font-mono text-[11px] tracking-[0.14em] uppercase hover:bg-accent transition-colors"
                >
                  <span>→</span>
                  {locale === "es" ? "Enviar al paciente" : "Send to patient"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer to avoid sticky bar covering last content */}
      {finalSynth && <div className="h-14" />}
    </>
  );
}

function AgentPanel({
  title,
  tagline,
  status,
  featured,
  compact,
  minH,
  collapsible,
  summary,
  locale,
  children,
}: {
  title: string;
  tagline: string;
  status: "idle" | "running" | "complete";
  featured?: boolean;
  compact?: boolean;
  minH?: "sm" | "md" | "lg";
  /** If true, panel auto-collapses when status becomes "complete". */
  collapsible?: boolean;
  /** One-line summary shown in collapsed state (e.g. "Rigidity 39.8% · Type 3"). */
  summary?: string;
  locale?: "en" | "es";
  children: React.ReactNode;
}) {
  // Auto-collapse logic: manual toggle overrides auto-collapse.
  // - null = not manually set (follow auto)
  // - true = manually expanded
  // - false = manually collapsed
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const autoCollapsed = collapsible && status === "complete";
  const isExpanded =
    manualExpanded !== null ? manualExpanded : !autoCollapsed;

  const borderClass = featured
    ? "border-2 border-ink"
    : status === "complete"
    ? "border border-ink"
    : "border border-rule";
  const padClass = compact ? "px-5 py-3" : "px-5 py-4";
  const minHeightClass = isExpanded
    ? minH === "lg"
      ? "min-h-[360px]"
      : minH === "md"
      ? "min-h-[220px]"
      : "min-h-[140px]"
    : "";

  return (
    <div className={`${borderClass} bg-paper-raised ${padClass} ${minHeightClass}`}>
      <div
        className={`flex items-baseline justify-between gap-3 ${
          isExpanded ? "border-b border-rule pb-2 mb-3" : ""
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className="eyebrow eyebrow-accent">{title}</p>
          <p className="text-[10.5px] tabular tracking-wide uppercase text-ink-mute mt-0.5 truncate">
            {isExpanded || !summary ? tagline : summary}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={status} />
          {collapsible && status === "complete" && (
            <button
              onClick={() =>
                setManualExpanded(manualExpanded === null ? !autoCollapsed : !manualExpanded)
              }
              className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-mute hover:text-ink transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded
                ? locale === "es" ? "Contraer ↑" : "Collapse ↑"
                : locale === "es" ? "Expandir ↓" : "Expand ↓"}
            </button>
          )}
        </div>
      </div>
      {isExpanded && children}
    </div>
  );
}

function StatusBadge({ status }: { status: "idle" | "running" | "complete" }) {
  if (status === "idle")
    return (
      <span className="tabular text-[9.5px] tracking-[0.18em] uppercase text-ink-mute">
        ○ idle
      </span>
    );
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1.5 tabular text-[9.5px] tracking-[0.18em] uppercase text-accent">
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        running
      </span>
    );
  return (
    <span className="tabular text-[9.5px] tracking-[0.18em] uppercase text-accent">
      ✓ complete
    </span>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="tabular text-[9.5px] tracking-[0.14em] uppercase text-ink-mute">
        {label}
      </p>
      <p
        className={`editorial mt-0.5 text-[16px] ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}

function FinalSynthesisView({
  synth,
  L,
  locale,
}: {
  synth: FinalSynthesis;
  L: {
    execSummary: string;
    diagLayers: string;
    predAnalysis: string;
    plan: string;
    level0: string;
    level1: string;
    level2: string;
    level3: string;
    sequencing: string;
    monitoring: string;
    patientNarrative: string;
    confidence: string;
  };
  locale: "en" | "es";
}) {
  return (
    <div className="space-y-5">
      {synth.executive_summary && (
        <div>
          <p className="eyebrow">{L.execSummary}</p>
          <p className="mt-1.5 text-[13.5px] text-ink-soft italic leading-[1.55]">
            {synth.executive_summary}
          </p>
        </div>
      )}

      {synth.diagnostic_layers && (
        <div>
          <p className="eyebrow">{L.diagLayers}</p>
          <dl className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
            {Object.entries(synth.diagnostic_layers).map(([k, v]) => (
              <div key={k} className="border-l-2 border-rule pl-2">
                <dt className="tabular text-[9.5px] uppercase text-ink-mute">
                  {k.replace(/_/g, " ")}
                </dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {synth.predictive_analysis && (
        <div className="border border-rule bg-paper px-4 py-3">
          <p className="eyebrow">{L.predAnalysis}</p>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
            {synth.predictive_analysis.system_burden_pct != null && (
              <Metric
                label={locale === "es" ? "Carga sistémica" : "System burden"}
                value={`${synth.predictive_analysis.system_burden_pct.toFixed(1)}%`}
              />
            )}
            {synth.predictive_analysis.primary_leverage && (
              <Metric
                label={locale === "es" ? "Apalancamiento" : "Leverage"}
                value={synth.predictive_analysis.primary_leverage}
                accent
              />
            )}
            {synth.predictive_analysis.expected_gain_pct != null && (
              <Metric
                label={locale === "es" ? "Ganancia esperada" : "Expected gain"}
                value={`${synth.predictive_analysis.expected_gain_pct.toFixed(1)}%`}
                accent
              />
            )}
            {synth.predictive_analysis.horizon_weeks != null && (
              <Metric
                label={locale === "es" ? "Horizonte" : "Horizon"}
                value={`${synth.predictive_analysis.horizon_weeks} wk`}
              />
            )}
          </div>
        </div>
      )}

      {synth.intervention_plan && (
        <div>
          <p className="eyebrow">{L.plan}</p>
          <div className="mt-2 space-y-3">
            {synth.intervention_plan.level_0_prior_work && (
              <div className="border-l-2 border-accent pl-3">
                <p className="tabular text-[9.5px] uppercase text-accent">
                  {L.level0}
                </p>
                <p className="text-[12.5px] text-ink-soft italic leading-snug mt-0.5">
                  {synth.intervention_plan.level_0_prior_work}
                </p>
              </div>
            )}
            {synth.intervention_plan.level_1_molecular_primary &&
              synth.intervention_plan.level_1_molecular_primary.length > 0 && (
                <div>
                  <p className="tabular text-[9.5px] uppercase text-ink-mute">
                    {L.level1}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {synth.intervention_plan.level_1_molecular_primary.map((m) => (
                      <li key={m.id} className="text-[12px] text-ink-soft">
                        <span className="editorial text-[13px] text-ink">
                          {m.id}
                        </span>
                        {m.dose ? ` · ${m.dose}` : ""}
                        {m.timing ? ` · ${m.timing}` : ""}
                        {m.evidence_level ? (
                          <span className="tabular text-[10px] text-ink-mute ml-2">
                            [{m.evidence_level}]
                          </span>
                        ) : null}
                        {m.rationale && (
                          <p className="text-[11.5px] italic text-ink-quiet leading-snug mt-0.5">
                            {m.rationale}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {synth.intervention_plan.level_2_molecular_secondary &&
              synth.intervention_plan.level_2_molecular_secondary.length > 0 && (
                <div>
                  <p className="tabular text-[9.5px] uppercase text-ink-mute">
                    {L.level2}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-quiet">
                    {synth.intervention_plan.level_2_molecular_secondary
                      .map((m) => m.id)
                      .join(" · ")}
                  </p>
                </div>
              )}
            {synth.intervention_plan.level_3_food_first &&
              synth.intervention_plan.level_3_food_first.length > 0 && (
                <div>
                  <p className="tabular text-[9.5px] uppercase text-ink-mute">
                    {L.level3}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    {synth.intervention_plan.level_3_food_first.join(" · ")}
                  </p>
                </div>
              )}
            {synth.intervention_plan.sequencing && (
              <div className="border border-rule bg-paper px-3 py-2">
                <p className="tabular text-[9.5px] uppercase text-ink-mute">
                  {L.sequencing}
                </p>
                <dl className="mt-1 text-[12px] space-y-1">
                  {Object.entries(synth.intervention_plan.sequencing).map(
                    ([k, v]) => (
                      <div key={k}>
                        <dt className="tabular text-[10px] text-accent inline">
                          {k.replace(/_/g, " ")}:
                        </dt>{" "}
                        <dd className="inline text-ink-soft">{v}</dd>
                      </div>
                    ),
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      )}

      {synth.monitoring && (
        <div>
          <p className="eyebrow">{L.monitoring}</p>
          <div className="mt-2 text-[12px] text-ink-soft space-y-1">
            {synth.monitoring.biomarkers_to_repeat_8w && (
              <p>
                <span className="tabular text-[10px] text-ink-mute uppercase">
                  {locale === "es" ? "biomarcadores 8w" : "biomarkers 8w"}:
                </span>{" "}
                {synth.monitoring.biomarkers_to_repeat_8w.join(" · ")}
              </p>
            )}
            {synth.monitoring.flexibility_components_to_reassess && (
              <p>
                <span className="tabular text-[10px] text-ink-mute uppercase">
                  {locale === "es" ? "reevaluar" : "reassess"}:
                </span>{" "}
                {synth.monitoring.flexibility_components_to_reassess.join(" · ")}
              </p>
            )}
            {synth.monitoring.red_flags && synth.monitoring.red_flags.length > 0 && (
              <p>
                <span className="tabular text-[10px] text-danger uppercase">
                  red flags:
                </span>{" "}
                {synth.monitoring.red_flags.join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}

      {synth.salutogenic_narrative_for_patient && (
        <div className="border-l-2 border-accent pl-3 py-1">
          <p className="eyebrow eyebrow-accent">{L.patientNarrative}</p>
          <p className="mt-1.5 text-[13.5px] editorial-italic text-ink leading-[1.55]">
            &ldquo;{synth.salutogenic_narrative_for_patient}&rdquo;
          </p>
        </div>
      )}

      {synth.confidence && (
        <div className="flex items-baseline justify-between text-[11.5px] border-t border-rule pt-2">
          <span className="text-ink-mute">
            {L.confidence}:{" "}
            <span className="tabular text-accent">{synth.confidence}</span>
          </span>
          {synth.confidence_rationale && (
            <span className="text-ink-mute italic max-w-[60%] text-right">
              {synth.confidence_rationale}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Traductor de errores crudos a mensajes humanos ─────────────
function humanErrorTitle(raw: string, locale: "en" | "es"): string {
  const l = raw.toLowerCase();
  if (l.includes("authentication") || l.includes("invalid x-api") || l.includes("401"))
    return locale === "es" ? "Configuración del servidor" : "Server configuration";
  if (l.includes("rate") || l.includes("429"))
    return locale === "es" ? "Demasiadas peticiones" : "Too many requests";
  if (l.includes("overloaded") || l.includes("529") || l.includes("503"))
    return locale === "es" ? "Servicio saturado" : "Service overloaded";
  if (l.includes("400") || l.includes("invalid body") || l.includes("invalid request"))
    return locale === "es" ? "Datos de entrada" : "Input data";
  if (l.includes("aborterror") || l.includes("network"))
    return locale === "es" ? "Conexión interrumpida" : "Connection interrupted";
  if (l.includes("labs json"))
    return locale === "es" ? "Labs JSON inválido" : "Invalid labs JSON";
  return locale === "es" ? "Error inesperado" : "Unexpected error";
}

function humanErrorMessage(raw: string, locale: "en" | "es"): string {
  const l = raw.toLowerCase();
  if (l.includes("authentication") || l.includes("invalid x-api") || l.includes("401"))
    return locale === "es"
      ? "La clave de Anthropic no está configurada o es inválida en el servidor. Pide al autor que verifique ANTHROPIC_API_KEY en .env.local."
      : "The Anthropic API key is missing or invalid on the server. Ask the author to verify ANTHROPIC_API_KEY in .env.local.";
  if (l.includes("rate") || l.includes("429"))
    return locale === "es"
      ? "El servicio de Claude está limitando tráfico temporalmente. Espera ~30 segundos y reintenta."
      : "Claude is rate-limiting temporarily. Wait ~30 seconds and retry.";
  if (l.includes("overloaded") || l.includes("529") || l.includes("503"))
    return locale === "es"
      ? "Claude está saturado en este momento. Reintenta en 1-2 minutos."
      : "Claude is overloaded right now. Retry in 1-2 minutes.";
  if (l.includes("400") || l.includes("invalid body"))
    return locale === "es"
      ? "El caso no pasó validación. Revisa que los labs sean JSON válido y que edad/sexo estén completos."
      : "The case failed validation. Check that labs are valid JSON and that age/sex are filled.";
  if (l.includes("aborterror") || l.includes("network"))
    return locale === "es"
      ? "La conexión con el servidor se perdió. Reintenta cuando tengas red estable."
      : "Connection to the server was lost. Retry on a stable network.";
  if (l.includes("labs json"))
    return locale === "es"
      ? "El JSON de labs tiene un error de sintaxis. Revisa comillas y comas."
      : "The labs JSON has a syntax error. Check quotes and commas.";
  // Fallback: mostrar el mensaje crudo pero acortado
  const short = raw.length > 240 ? raw.slice(0, 240) + "…" : raw;
  return short;
}

// ── Compact preset button (used by the Load synthetic case row) ───
function PresetButton({
  onClick,
  code,
  name,
  tag,
}: {
  onClick: () => void;
  code: string;
  name: string;
  tag: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group border border-ink bg-paper px-3 py-2.5 text-left hover:bg-ink hover:text-paper transition-colors"
    >
      <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-mute group-hover:text-paper/70">
        {code}
      </p>
      <p className="mt-0.5 editorial text-[14px] text-ink group-hover:text-paper leading-tight">
        {name}
      </p>
      <p className="mt-0.5 font-mono text-[8.5px] tracking-[0.12em] uppercase text-accent group-hover:text-paper/80">
        {tag}
      </p>
    </button>
  );
}

// ── Humanize snake_case identifiers to Title Case ─────────────
// "inflammation_control" → "Inflammation control"
// "predictive_agency" → "Predictive agency"
function humanize(id: string | undefined | null): string {
  if (!id) return "—";
  const spaced = id.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
