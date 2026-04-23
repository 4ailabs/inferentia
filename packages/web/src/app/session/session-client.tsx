"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PATIENT_ANA_PROFILE,
  type PrescriptedTurn,
} from "@/lib/patient-ana";
import type {
  AnalyzeResult,
  ClinicalPosterior,
  Intake,
  Labs,
  Referral,
} from "@/lib/clinical-schema";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  phase?: "A" | "B" | "C" | "D";
};

type Stage =
  | "intake"
  | "interviewing"
  | "analyzing"
  | "ready_posterior"
  | "ready_referral"
  | "rendering"
  | "error";

type LabKey = keyof Labs;
const LAB_FIELDS: Array<{ key: LabKey; label: string; unit: string; step: string }> = [
  { key: "hba1c", label: "HbA1c", unit: "%", step: "0.1" },
  { key: "homa_ir", label: "HOMA-IR", unit: "", step: "0.1" },
  { key: "fasting_glucose", label: "Fasting glucose", unit: "mg/dL", step: "1" },
  { key: "triglycerides", label: "Triglycerides", unit: "mg/dL", step: "1" },
  { key: "hdl", label: "HDL", unit: "mg/dL", step: "1" },
  { key: "cortisol_morning", label: "Cortisol (AM)", unit: "μg/dL", step: "0.1" },
  { key: "tsh", label: "TSH", unit: "mIU/L", step: "0.1" },
  { key: "vitamin_d", label: "Vitamin D", unit: "ng/mL", step: "0.1" },
  { key: "crp", label: "CRP", unit: "mg/L", step: "0.1" },
  { key: "sdnn_hrv", label: "HRV SDNN", unit: "ms", step: "1" },
];

const RED_FLAG_QUESTIONS_EN = [
  {
    key: "suicidal_ideation_past_month" as const,
    q: "In the past month, any thoughts of harming yourself or being better off dead?",
  },
  {
    key: "active_eating_disorder" as const,
    q: "Is your relationship with food currently dangerous (severe restriction, purging, binging)?",
  },
  {
    key: "recent_major_loss_under_6_weeks" as const,
    q: "Any major loss in the last 6 weeks?",
  },
  {
    key: "unmanaged_medical_condition" as const,
    q: "Any hospitalisation, seizure, or unmanaged medical condition in the last 6 months?",
  },
  {
    key: "substance_dependence" as const,
    q: "Any substance (alcohol, drugs, medications) you feel unable to stop?",
  },
];

const RED_FLAG_QUESTIONS_ES = [
  {
    key: "suicidal_ideation_past_month" as const,
    q: "En el último mes, ¿algún pensamiento de hacerte daño o de estar mejor muerta?",
  },
  {
    key: "active_eating_disorder" as const,
    q: "¿Tu relación con la comida es actualmente peligrosa (restricción severa, purgas, atracones)?",
  },
  {
    key: "recent_major_loss_under_6_weeks" as const,
    q: "¿Alguna pérdida importante en las últimas 6 semanas?",
  },
  {
    key: "unmanaged_medical_condition" as const,
    q: "¿Alguna hospitalización, crisis o condición sin tratar en los últimos 6 meses?",
  },
  {
    key: "substance_dependence" as const,
    q: "¿Alguna sustancia (alcohol, drogas, medicación) que sientes que no puedes parar?",
  },
];

export default function SessionClient({
  locale,
  scriptedTurns,
}: {
  locale: "en" | "es";
  scriptedTurns: PrescriptedTurn[];
}) {
  const router = useRouter();

  const L = useMemo(
    () =>
      locale === "es"
        ? {
            intakeTitle: "Ingreso clínico",
            intakeLead:
              "Datos objetivos del paciente antes de la entrevista. Todos los campos son opcionales; cuantos más completes, mayor será la confianza del posterior.",
            labsSection: "Análisis de laboratorio",
            labsEmpty: "Ningún lab cargado — la confianza se limita",
            redFlagsSection: "Tamizaje de seguridad",
            redFlagsLead:
              "Cinco preguntas Sí/No. Si cualquiera es Sí, el sistema no infiere impronta y sugiere derivación.",
            loadPreset: "Cargar preset Ana (demo)",
            proceed: "Comenzar entrevista →",
            playNext: "Siguiente turno",
            analyze: "Sintetizar con Sonnet 4.6",
            analyzing: "Sintetizando…",
            render: "Componer vistas con Opus 4.7",
            rendering: "Componiendo…",
            priorsTitle: "Priors activos inferidos",
            imprintsTitle: "Posterior sobre improntas",
            dominantLabel: "Dominante",
            waitingLabel: "Esperando entrevista…",
            reset: "Reiniciar",
            demoNote: "Modo demo — turnos pre-grabados con paciente sintética.",
            error: "Algo salió mal.",
            freeEnergy: "Δ energía libre estimada",
            labsMissing: "Panel de labs incompleto — confianza acotada",
            referralTitle: "Derivación recomendada",
            referralHint:
              "El tamizaje detectó señales que requieren atención profesional antes de inferir improntas.",
            viewReferral: "Ver recomendación",
            yes: "Sí",
            no: "No",
          }
        : {
            intakeTitle: "Clinical intake",
            intakeLead:
              "Objective patient data before the interview. All fields optional; the more you fill, the higher the posterior confidence.",
            labsSection: "Laboratory panel",
            labsEmpty: "No labs loaded — confidence will be bounded",
            redFlagsSection: "Safety screening",
            redFlagsLead:
              "Five yes/no questions. Any Yes triggers a referral instead of an imprint posterior.",
            loadPreset: "Load Ana preset (demo)",
            proceed: "Start interview →",
            playNext: "Next turn",
            analyze: "Synthesise with Sonnet 4.6",
            analyzing: "Synthesising…",
            render: "Compose views with Opus 4.7",
            rendering: "Composing…",
            priorsTitle: "Active priors inferred",
            imprintsTitle: "Posterior over imprints",
            dominantLabel: "Dominant",
            waitingLabel: "Waiting for interview…",
            reset: "Reset",
            demoNote: "Demo mode — pre-recorded turns with a synthetic patient.",
            error: "Something went wrong.",
            freeEnergy: "Est. free-energy Δ",
            labsMissing: "Lab panel missing — confidence bounded",
            referralTitle: "Referral recommended",
            referralHint:
              "Triage surfaced signals that need professional attention before imprint inference.",
            viewReferral: "See recommendation",
            yes: "Yes",
            no: "No",
          },
    [locale],
  );

  const redFlagQs = locale === "es" ? RED_FLAG_QUESTIONS_ES : RED_FLAG_QUESTIONS_EN;

  // ─────────────────────────────────── Intake state
  const [labs, setLabs] = useState<Labs>({});
  const [redFlags, setRedFlags] = useState<Intake["red_flags"]>({
    suicidal_ideation_past_month: false,
    active_eating_disorder: false,
    recent_major_loss_under_6_weeks: false,
    unmanaged_medical_condition: false,
    substance_dependence: false,
  });

  // ─────────────────────────────────── Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextTurnIdx, setNextTurnIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("intake");
  const [posterior, setPosterior] = useState<ClinicalPosterior | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAnaPreset = useCallback(() => {
    setLabs(PATIENT_ANA_PROFILE.intake.labs as Labs);
    setRedFlags(PATIENT_ANA_PROFILE.intake.red_flags);
  }, []);

  const startInterview = useCallback(() => {
    // Seed with first assistant turn (Phase A framing)
    const first = scriptedTurns[0];
    if (first) {
      setMessages([
        {
          id: "seed",
          role: first.role,
          content: first.content,
          phase: first.phase,
        },
      ]);
    }
    setNextTurnIdx(1);
    setStage("interviewing");
  }, [scriptedTurns]);

  const playNextTurn = useCallback(() => {
    if (nextTurnIdx >= scriptedTurns.length) return;
    const next = scriptedTurns[nextTurnIdx];
    setMessages((prev) => [
      ...prev,
      {
        id: `t-${nextTurnIdx}`,
        role: next.role,
        content: next.content,
        phase: next.phase,
      },
    ]);
    setNextTurnIdx((i) => i + 1);
  }, [nextTurnIdx, scriptedTurns]);

  const reset = useCallback(() => {
    setMessages([]);
    setNextTurnIdx(0);
    setStage("intake");
    setPosterior(null);
    setReferral(null);
    setErrorMsg(null);
  }, []);

  const runAnalyze = useCallback(async () => {
    setStage("analyzing");
    setErrorMsg(null);
    try {
      const intakePayload: Partial<Intake> = {
        patient_id: "ana",
        age: PATIENT_ANA_PROFILE.age,
        sex: PATIENT_ANA_PROFILE.sex as "F",
        labs,
        active_diagnoses: [],
        chronic_medications: [],
        red_flags: redFlags,
      };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patient_id: "ana",
          intake: intakePayload,
          transcript: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErrorMsg(j.error ?? `status ${res.status}`);
        setStage("error");
        return;
      }
      const result = j.result as AnalyzeResult;
      if (result.kind === "referral") {
        setReferral(result);
        setStage("ready_referral");
      } else {
        setPosterior(result);
        setStage("ready_posterior");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage("error");
    }
  }, [messages, labs, redFlags]);

  const runRender = useCallback(async () => {
    if (!posterior) return;
    setErrorMsg(null);
    setStage("rendering");
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ posterior, locale }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErrorMsg(j.error ?? `status ${res.status}`);
        setStage("error");
        return;
      }
      sessionStorage.setItem(
        "inferentia:last_session",
        JSON.stringify({ posterior, render: j.render, locale }),
      );
      router.push(`/session/result${locale === "es" ? "?lang=es" : ""}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage("error");
    }
  }, [posterior, locale, router]);

  const labsCount = Object.values(labs).filter((v) => typeof v === "number").length;
  const transcriptDone = nextTurnIdx >= scriptedTurns.length;

  // ─────────────────────────────────── INTAKE SCREEN
  if (stage === "intake") {
    return (
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-8 border border-ink bg-paper-raised">
          <header className="px-6 py-5 border-b border-rule">
            <p className="eyebrow eyebrow-accent">Step 1 · {L.intakeTitle}</p>
            <h2 className="mt-2 editorial text-[22px] leading-tight text-ink">
              {PATIENT_ANA_PROFILE.name},{" "}
              <span className="editorial-italic text-ink-quiet">
                {PATIENT_ANA_PROFILE.age}
              </span>
            </h2>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-soft max-w-[60ch]">
              {L.intakeLead}
            </p>
          </header>

          {/* Labs */}
          <div className="px-6 py-5 border-b border-rule">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">{L.labsSection}</p>
              <p className="tabular text-[10.5px] text-ink-mute">
                {labsCount} / {LAB_FIELDS.length}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-3">
              {LAB_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-[10.5px] tabular tracking-wide uppercase text-ink-mute">
                    {f.label} <span className="text-ink-mute/70">{f.unit}</span>
                  </span>
                  <input
                    type="number"
                    step={f.step}
                    inputMode="decimal"
                    value={(labs[f.key] ?? "") as number | ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setLabs((prev) => {
                        const copy = { ...prev };
                        if (raw === "") delete copy[f.key];
                        else copy[f.key] = Number(raw);
                        return copy;
                      });
                    }}
                    className="border border-rule bg-paper px-3 py-1.5 text-[13px] tabular text-ink focus:border-accent outline-none"
                    placeholder="—"
                  />
                </label>
              ))}
            </div>
            {labsCount < 3 && (
              <p className="mt-3 text-[11px] italic text-ink-mute">
                {L.labsEmpty}
              </p>
            )}
          </div>

          {/* Red flags */}
          <div className="px-6 py-5">
            <p className="eyebrow">{L.redFlagsSection}</p>
            <p className="mt-2 text-[11.5px] text-ink-mute max-w-[60ch]">
              {L.redFlagsLead}
            </p>
            <ul className="mt-4 space-y-3">
              {redFlagQs.map((rf) => (
                <li
                  key={rf.key}
                  className="grid grid-cols-12 items-start gap-4 py-2 border-b border-rule last:border-b-0"
                >
                  <p className="col-span-9 text-[12.5px] text-ink-soft leading-snug">
                    {rf.q}
                  </p>
                  <div className="col-span-3 flex justify-end gap-2">
                    {([true, false] as const).map((val) => {
                      const isActive = redFlags[rf.key] === val;
                      return (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() =>
                            setRedFlags((prev) => ({ ...prev, [rf.key]: val }))
                          }
                          className={`px-3 py-1 text-[10.5px] tabular tracking-wide uppercase transition-colors ${
                            isActive
                              ? val
                                ? "bg-danger text-paper"
                                : "bg-ink text-paper"
                              : "border border-rule text-ink-mute hover:border-ink"
                          }`}
                        >
                          {val ? L.yes : L.no}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <footer className="px-6 py-4 border-t border-rule flex items-center justify-between gap-4 bg-paper-soft">
            <button
              onClick={loadAnaPreset}
              className="text-[11px] text-accent underline decoration-rule underline-offset-4 decoration-1 hover:decoration-accent"
            >
              {L.loadPreset}
            </button>
            <button
              onClick={startInterview}
              className="inline-flex items-center gap-2 bg-accent text-paper px-4 py-2 text-[12px] tracking-wide hover:bg-accent-deep transition-colors"
            >
              {L.proceed}
            </button>
          </footer>
        </section>

        <aside className="col-span-12 lg:col-span-4 space-y-5">
          <div className="border border-rule bg-paper-raised px-5 py-4">
            <p className="eyebrow eyebrow-accent">Step 1 → 2 → 3</p>
            <ol className="mt-4 space-y-3 text-[12px] text-ink-soft leading-relaxed">
              <li>
                <span className="editorial text-[14px] text-ink">Intake</span>{" "}
                · labs + red-flag screening.
              </li>
              <li>
                <span className="editorial text-[14px] text-ink">Interview</span>{" "}
                · 4 adaptive phases with Haiku 4.5.
              </li>
              <li>
                <span className="editorial text-[14px] text-ink">Synthesis</span>{" "}
                · Sonnet 4.6 posterior · Opus 4.7 renders.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    );
  }

  // ─────────────────────────────────── INTERVIEW + SYNTHESIS
  return (
    <div className="grid grid-cols-12 gap-6">
      <section className="col-span-12 lg:col-span-7 border border-ink bg-paper-raised">
        <header className="flex items-start justify-between gap-4 px-6 py-4 border-b border-rule">
          <div>
            <p className="eyebrow">Step 2 · {PATIENT_ANA_PROFILE.name}, {PATIENT_ANA_PROFILE.age}</p>
            <p className="mt-1 text-[11.5px] text-ink-soft max-w-[50ch]">
              {locale === "es"
                ? PATIENT_ANA_PROFILE.chief_complaint_es
                : PATIENT_ANA_PROFILE.chief_complaint_en}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-2 border border-rule px-2 py-1 text-[10px] tabular tracking-[0.18em] uppercase text-ink-mute">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              demo
            </span>
            <button
              onClick={reset}
              className="text-[11px] text-ink-mute hover:text-ink transition-colors underline decoration-rule underline-offset-4 decoration-1"
            >
              {L.reset}
            </button>
          </div>
        </header>

        <div className="h-[460px] overflow-y-auto px-6 py-5 space-y-4 bg-paper-soft">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[82%] ${
                m.role === "assistant" ? "mr-auto" : "ml-auto"
              }`}
            >
              <div
                className={`px-4 py-3 text-[13.5px] leading-[1.55] ${
                  m.role === "assistant"
                    ? "bg-paper-raised border border-rule text-ink-soft"
                    : "bg-paper border border-accent/30 text-ink"
                }`}
                style={{ borderRadius: 2 }}
              >
                <p>{m.content}</p>
              </div>
              <p className="mt-1 text-[10px] tabular tracking-[0.14em] uppercase text-ink-mute flex items-center gap-2">
                {m.role === "assistant" ? "Haiku 4.5" : "Ana"}
                {m.phase && (
                  <span className="text-accent">· Phase {m.phase}</span>
                )}
              </p>
            </div>
          ))}
        </div>

        <footer className="px-6 py-4 border-t border-rule flex items-center justify-between gap-4 bg-paper-raised">
          <p className="text-[11px] text-ink-mute max-w-[44ch]">{L.demoNote}</p>
          {!transcriptDone ? (
            <button
              onClick={playNextTurn}
              className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-[12px] tracking-wide hover:bg-accent-deep transition-colors"
            >
              {L.playNext}
              <span className="inline-block w-5 h-px bg-paper" />
            </button>
          ) : stage === "ready_posterior" || stage === "rendering" ? (
            <button
              onClick={runRender}
              disabled={stage === "rendering"}
              className="inline-flex items-center gap-2 bg-accent text-paper px-4 py-2 text-[12px] tracking-wide hover:bg-accent-deep transition-colors disabled:opacity-60"
            >
              {stage === "rendering" ? L.rendering : L.render}
              <span className="inline-block w-5 h-px bg-paper" />
            </button>
          ) : stage === "ready_referral" ? (
            <span className="tabular text-[10.5px] tracking-[0.18em] uppercase text-danger">
              {L.referralTitle}
            </span>
          ) : (
            <button
              onClick={runAnalyze}
              disabled={stage === "analyzing"}
              className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-[12px] tracking-wide hover:bg-accent-deep transition-colors disabled:opacity-60"
            >
              {stage === "analyzing" ? L.analyzing : L.analyze}
              <span className="inline-block w-5 h-px bg-paper" />
            </button>
          )}
        </footer>
      </section>

      {/* RIGHT panel */}
      <aside className="col-span-12 lg:col-span-5 space-y-5">
        {/* Referral box supersedes everything when active */}
        {stage === "ready_referral" && referral && (
          <div className="border border-danger bg-paper-raised px-5 py-4">
            <p className="eyebrow" style={{ color: "#8A2C1B" }}>
              {L.referralTitle}
            </p>
            <p className="mt-3 text-[12.5px] text-ink-soft leading-relaxed">
              {locale === "es" ? referral.reason_es : referral.reason_en}
            </p>
            <p className="mt-4 eyebrow">
              {locale === "es" ? "Próximos pasos" : "Next steps"}
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] text-ink-soft">
              {(locale === "es"
                ? referral.suggested_next_steps_es
                : referral.suggested_next_steps_en
              ).map((s, i) => (
                <li key={i}>· {s}</li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] tabular tracking-wide uppercase text-ink-mute">
              {L.referralHint}
            </p>
          </div>
        )}

        {/* Priors panel — skeletons during analyze */}
        {stage !== "ready_referral" && (
          <>
            <div className="border border-rule bg-paper-raised px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow eyebrow-accent">{L.priorsTitle}</p>
                {stage === "analyzing" && (
                  <span className="inline-flex items-center gap-2 text-[10px] tabular tracking-[0.18em] uppercase text-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    Sonnet 4.6
                  </span>
                )}
                {stage === "rendering" && (
                  <span className="inline-flex items-center gap-2 text-[10px] tabular tracking-[0.18em] uppercase text-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    Opus 4.7
                  </span>
                )}
              </div>
              {!posterior ? (
                stage === "analyzing" ? (
                  <div className="mt-4 space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="border-t border-rule pt-3 first:border-t-0 first:pt-0"
                      >
                        <div className="h-[14px] w-[60%] bg-paper-soft rounded-sm animate-pulse" />
                        <div className="mt-2 h-[10px] w-[80%] bg-paper-soft rounded-sm animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[12.5px] text-ink-mute italic">
                    {L.waitingLabel}
                  </p>
                )
              ) : (
                <ul className="mt-4 space-y-3">
                  {posterior.active_priors.map((p) => (
                    <li
                      key={p.id}
                      className="border-t border-rule pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="editorial text-[16px] text-ink leading-tight">
                          {p.label}
                        </p>
                        <span className="tabular text-[11px] text-accent font-medium">
                          {(p.strength * 100).toFixed(0)}%
                        </span>
                      </div>
                      {p.evidence?.[0] && (
                        <blockquote className="mt-2 border-l-2 border-rule pl-3 text-[11.5px] italic text-ink-quiet">
                          &ldquo;{p.evidence[0].quote}&rdquo;
                        </blockquote>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-rule bg-paper-raised px-5 py-4">
              <p className="eyebrow">{L.imprintsTitle}</p>
              <div className="mt-4 space-y-2.5">
                {(posterior?.imprint_posterior ?? [
                  { id: "i1", name: "Desacople", posterior: 0, rationale: "" },
                  { id: "i4", name: "Fijación Externa", posterior: 0, rationale: "" },
                  { id: "i7", name: "Hibernación", posterior: 0, rationale: "" },
                  { id: "i8", name: "Reserva", posterior: 0, rationale: "" },
                ]).map((imp) => {
                  const pct = Math.round(imp.posterior * 100);
                  const isDominant = posterior?.dominant_imprint === imp.id;
                  return (
                    <div key={imp.id} className="text-[12px]">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={isDominant ? "text-ink font-medium" : "text-ink-quiet"}>
                          {imp.id} · {imp.name}
                          {isDominant && (
                            <span className="ml-2 tabular text-[9px] text-accent tracking-[0.18em] uppercase">
                              {L.dominantLabel}
                            </span>
                          )}
                        </span>
                        <span className="tabular text-[11px] text-ink-soft">
                          {posterior ? `${pct}%` : "—"}
                        </span>
                      </div>
                      <div className="mt-1 h-[4px] bg-paper-soft rounded-sm overflow-hidden">
                        <div
                          className={isDominant ? "h-full bg-accent" : "h-full bg-ink-quiet"}
                          style={{ width: posterior ? `${pct}%` : "0%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {posterior && (
                <>
                  <p className="mt-4 text-[11px] text-ink-mute tabular">
                    {L.freeEnergy}{" "}
                    <span className="text-accent">
                      {(posterior.free_energy_delta_estimate * 100).toFixed(0)}%
                    </span>
                  </p>
                  {!posterior.had_objective_data && (
                    <p className="mt-2 text-[11px] italic text-danger">
                      {L.labsMissing}
                    </p>
                  )}
                  {posterior.soft_flags.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {posterior.soft_flags.map((f, i) => (
                        <li
                          key={i}
                          className="text-[11px] text-ink-soft border-l-2 border-accent/50 pl-2"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {errorMsg && (
          <div className="border border-danger px-4 py-3 text-[12px] text-danger">
            <strong>Error</strong> · {errorMsg}
          </div>
        )}
      </aside>
    </div>
  );
}
