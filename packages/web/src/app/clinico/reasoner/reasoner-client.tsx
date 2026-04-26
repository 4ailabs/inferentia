"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { PredictiveBodyMap } from "@/components/predictive-body-map";
import type { ImprintId } from "@/lib/math/sensations";

type ThinkingEvent = { type: "thinking"; text: string; ts: number };
type TextEvent = { type: "text"; text: string; ts: number };
type ToolUseEvent = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
  ts: number;
};
type ToolResultEvent = {
  type: "tool_result";
  tool_use_id: string;
  name: string;
  result: unknown;
  ts: number;
};
type IterationEvent = { type: "iteration"; n: number; ts: number };
type DoneEvent = {
  type: "done";
  stop_reason: string;
  usage: { input: number; output: number; cached: number };
  iterations: number;
  ts: number;
};
type ErrorEvent = { type: "error"; message: string; ts: number };

type StreamEvent =
  | ThinkingEvent
  | TextEvent
  | ToolUseEvent
  | ToolResultEvent
  | IterationEvent
  | DoneEvent
  | ErrorEvent;

type FinalHypothesis = {
  top3: Array<{
    imprint_id: string;
    name: string;
    probability: number;
    rationale: string;
  }>;
  evidence_citations: Array<{
    imprint_id: string;
    excerpt_from_case: string;
    treatise_reference: string;
  }>;
  differential_question?: {
    between: string[];
    question: string;
    from_treatise: string;
  };
  confidence: "high" | "moderate" | "low";
  confidence_rationale: string;
  tool_calls_used: string[];
  next_clinical_step_es?: string;
  next_clinical_step_en?: string;
};

// ─── Example Ana preset ───────────────────────────────────────
const ANA_PRESET = {
  clinician_notes:
    "Mujer, 34 años. Consulta por fatiga crónica, ansiedad nocturna, dificultad para bajar de peso pese a dieta y ejercicio. No se da permiso de parar. Mantiene relaciones estables pero siente que tiene que 'tener todo bajo control'. Separación materna prolongada a los 3 años por hospitalización de la madre.",
  transcript: `PACIENTE: "Siento que si suelto algo, voy a perder. Como en la noche aunque no tenga hambre, es como si guardara por si acaso. Siempre estoy pensando en qué viene después — no logro simplemente estar. Cuando mi pareja se va unos días de viaje, aunque racionalmente sé que vuelve, algo dentro se activa. Mi madre estuvo hospitalizada cuando yo tenía 3 años, varios meses. Creo que eso me marcó aunque no lo recuerdo bien."

CLÍNICO: ¿Y tu cuerpo cómo está con todo esto?

PACIENTE: "Hinchada. Retengo líquidos. Me sube el azúcar aunque coma bien. Duermo mal, me despierto pensando. Los hombros los cargo arriba."`,
  labs: {
    cortisol_am: 22,
    hba1c: 6.1,
    homa_ir: 3.2,
    hdl: 38,
    triglycerides: 165,
    sdnn_hrv: 28,
    visceral_fat: 13,
  },
  case_id: "ana-demo",
  declared_imprint_hint: "posible i8 con i2 secundaria",
  declared_sensation_hint: "Abandono (primaria), Vulnerabilidad (secundaria)",
};

export default function ReasonerClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [notes, setNotes] = useState("");
  const [transcript, setTranscript] = useState("");
  const [labsRaw, setLabsRaw] = useState("");
  const [caseId, setCaseId] = useState("");
  const [imprintHint, setImprintHint] = useState("");
  const [sensationHint, setSensationHint] = useState("");
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [finalHypothesis, setFinalHypothesis] = useState<FinalHypothesis | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const L =
    locale === "es"
      ? {
          title: "Reasoner Clínico",
          sub: "Opus 4.7 con extended thinking + Tratado BV4 cargado + tool use en loop. Cada llamada a función es auditable, cada cita es verbatim, cada hipótesis lleva evidencia.",
          caseIdLabel: "ID del caso",
          notesLabel: "Notas clínicas",
          notesPlaceholder: "Observaciones, antecedentes, contexto…",
          transcriptLabel: "Transcripción del paciente (opcional)",
          transcriptPlaceholder: "Voz textual del paciente…",
          labsLabel: "Labs (JSON)",
          labsPlaceholder: '{"cortisol_am": 22, "hba1c": 6.1, ...}',
          imprintHintLabel: "Hipótesis del clínico (opcional)",
          sensationHintLabel: "Sensación declarada (opcional)",
          load: "Cargar caso Ana (demo)",
          run: "Iniciar razonamiento",
          running: "Razonando con Opus 4.7…",
          stop: "Detener",
          thinking: "Pensamiento interno (extended thinking)",
          textOutput: "Texto del razonamiento",
          toolUse: "Llamada a función",
          toolResult: "Resultado",
          noEvents: "El razonamiento aparecerá aquí en vivo cuando inicies.",
          hypothesis: "Hipótesis final",
          top3: "Top-3 improntas probables",
          evidence: "Citas verbatim",
          differential: "Pregunta diferencial",
          confidence: "Confianza",
          nextStep: "Siguiente paso clínico",
          iter: "Iteración",
          done: "Razonamiento completo",
          tokens: "Tokens",
          cachedTokens: "Cacheados",
          hero: "Este es el corazón técnico de Inferentia — Opus 4.7 como medio clínico, no como API.",
        }
      : {
          title: "Clinical Reasoner",
          sub: "Opus 4.7 with extended thinking + loaded BV4 Treatise + tool use in loop. Every function call is auditable, every quote is verbatim, every hypothesis carries evidence.",
          caseIdLabel: "Case ID",
          notesLabel: "Clinical notes",
          notesPlaceholder: "Observations, history, context…",
          transcriptLabel: "Patient transcript (optional)",
          transcriptPlaceholder: "Patient's literal voice…",
          labsLabel: "Labs (JSON)",
          labsPlaceholder: '{"cortisol_am": 22, "hba1c": 6.1, ...}',
          imprintHintLabel: "Clinician hypothesis (optional)",
          sensationHintLabel: "Declared sensation (optional)",
          load: "Load Ana case (demo)",
          run: "Start reasoning",
          running: "Reasoning with Opus 4.7…",
          stop: "Stop",
          thinking: "Internal thinking (extended thinking)",
          textOutput: "Reasoning text",
          toolUse: "Function call",
          toolResult: "Result",
          noEvents: "Reasoning will appear here live when you start.",
          hypothesis: "Final hypothesis",
          top3: "Top-3 probable imprints",
          evidence: "Verbatim citations",
          differential: "Differential question",
          confidence: "Confidence",
          nextStep: "Next clinical step",
          iter: "Iteration",
          done: "Reasoning complete",
          tokens: "Tokens",
          cachedTokens: "Cached",
          hero: "This is the technical heart of Inferentia — Opus 4.7 as clinical medium, not just API.",
        };

  const loadAnaPreset = useCallback(() => {
    setCaseId(ANA_PRESET.case_id);
    setNotes(ANA_PRESET.clinician_notes);
    setTranscript(ANA_PRESET.transcript);
    setLabsRaw(JSON.stringify(ANA_PRESET.labs, null, 2));
    setImprintHint(ANA_PRESET.declared_imprint_hint);
    setSensationHint(ANA_PRESET.declared_sensation_hint);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setEvents([]);
    setFinalHypothesis(null);

    let labs: Record<string, number> = {};
    if (labsRaw.trim()) {
      try {
        const parsed = JSON.parse(labsRaw);
        if (parsed && typeof parsed === "object") labs = parsed as Record<string, number>;
      } catch {
        setError("Labs JSON inválido");
        setRunning(false);
        return;
      }
    }

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/reasoner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          case_id: caseId || undefined,
          clinician_notes: notes || undefined,
          transcript: transcript || undefined,
          labs,
          declared_imprint_hint: imprintHint || undefined,
          declared_sensation_hint: sensationHint || undefined,
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
      let accumulatedText = "";

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
            const ts = Date.now();
            if (event === "thinking") {
              setEvents((p) => [
                ...p,
                { type: "thinking", text: payload.text, ts },
              ]);
            } else if (event === "text") {
              accumulatedText += payload.text;
              setEvents((p) => [
                ...p,
                { type: "text", text: payload.text, ts },
              ]);
              // Buscar JSON final
              const m = accumulatedText.match(/```json\s*([\s\S]*?)```/);
              if (m) {
                try {
                  const parsed = JSON.parse(m[1]) as FinalHypothesis;
                  setFinalHypothesis(parsed);
                } catch {
                  // sigue viniendo
                }
              }
            } else if (event === "tool_use") {
              setEvents((p) => [
                ...p,
                {
                  type: "tool_use",
                  id: payload.id,
                  name: payload.name,
                  input: payload.input,
                  ts,
                },
              ]);
            } else if (event === "tool_result") {
              setEvents((p) => [
                ...p,
                {
                  type: "tool_result",
                  tool_use_id: payload.tool_use_id,
                  name: payload.name,
                  result: payload.result,
                  ts,
                },
              ]);
            } else if (event === "iteration") {
              setEvents((p) => [
                ...p,
                { type: "iteration", n: payload.n, ts },
              ]);
            } else if (event === "done") {
              setEvents((p) => [
                ...p,
                {
                  type: "done",
                  stop_reason: payload.stop_reason,
                  usage: payload.usage,
                  iterations: payload.iterations,
                  ts,
                },
              ]);
            } else if (event === "error") {
              setEvents((p) => [
                ...p,
                { type: "error", message: payload.message, ts },
              ]);
              setError(payload.message);
            }
          } catch {
            // ignore parse error
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
  }, [
    running,
    caseId,
    notes,
    transcript,
    labsRaw,
    imprintHint,
    sensationHint,
    locale,
  ]);

  return (
    <>
      <section className="mb-6">
        <h1 className="editorial text-[32px] md:text-[42px] leading-[1.05] text-ink">
          {L.title}
          <span className="block text-[16px] md:text-[18px] editorial-italic text-accent mt-2">
            {L.hero}
          </span>
        </h1>
        <p className="mt-4 max-w-[68ch] text-[13.5px] leading-[1.6] text-ink-soft">
          {L.sub}
        </p>
      </section>

      <section className="grid grid-cols-12 gap-6">
        {/* ─── Input column ─────────────────────────────── */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="border border-ink bg-paper-raised px-5 py-4">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow eyebrow-accent">Caso</p>
              <button
                onClick={loadAnaPreset}
                className="text-[11px] text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
              >
                {L.load}
              </button>
            </div>
            <label className="block mt-3">
              <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                {L.caseIdLabel}
              </span>
              <input
                type="text"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="ana-demo"
                className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-[13px] tabular text-ink focus:border-accent outline-none"
              />
            </label>
            <label className="block mt-3">
              <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                {L.notesLabel}
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={L.notesPlaceholder}
                rows={4}
                className="mt-1 w-full border border-rule bg-paper px-3 py-2 text-[12.5px] text-ink-soft focus:border-accent outline-none resize-y"
              />
            </label>
            <label className="block mt-3">
              <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                {L.transcriptLabel}
              </span>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={L.transcriptPlaceholder}
                rows={6}
                className="mt-1 w-full border border-rule bg-paper px-3 py-2 text-[12.5px] text-ink-soft focus:border-accent outline-none resize-y"
              />
            </label>
            <label className="block mt-3">
              <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                {L.labsLabel}
              </span>
              <textarea
                value={labsRaw}
                onChange={(e) => setLabsRaw(e.target.value)}
                placeholder={L.labsPlaceholder}
                rows={4}
                className="mt-1 w-full border border-rule bg-paper px-3 py-2 text-[11.5px] tabular text-ink-soft focus:border-accent outline-none resize-y"
              />
            </label>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                  {L.imprintHintLabel}
                </span>
                <input
                  type="text"
                  value={imprintHint}
                  onChange={(e) => setImprintHint(e.target.value)}
                  className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-[12px] text-ink focus:border-accent outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                  {L.sensationHintLabel}
                </span>
                <input
                  type="text"
                  value={sensationHint}
                  onChange={(e) => setSensationHint(e.target.value)}
                  className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-[12px] text-ink focus:border-accent outline-none"
                />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={run}
                disabled={running}
                className="inline-flex items-center gap-3 bg-accent text-paper px-5 py-3 text-[13px] tracking-wide hover:bg-accent-deep transition-colors disabled:opacity-50"
              >
                {running ? L.running : L.run}
                <span className="inline-block w-6 h-px bg-paper" />
              </button>
              {running && (
                <button
                  onClick={stop}
                  className="text-[11.5px] text-ink-mute hover:text-danger underline decoration-rule underline-offset-4"
                >
                  {L.stop}
                </button>
              )}
            </div>
            {error && (
              <div className="mt-3 border border-danger bg-paper-raised px-3 py-2 text-[12px] text-danger">
                {error}
              </div>
            )}
          </div>

          {/* Predictive body map — appears as soon as top-3 is available */}
          {finalHypothesis && finalHypothesis.top3?.[0] && (
            <PredictiveBodyMap
              imprintId={finalHypothesis.top3[0].imprint_id as ImprintId}
              imprintName={finalHypothesis.top3[0].name}
              strength={finalHypothesis.top3[0].probability}
              priors={finalHypothesis.top3.slice(0, 4).map((t) => ({
                label: `${t.imprint_id.toUpperCase()} ${t.name}`,
                strength: t.probability,
              }))}
              locale={locale}
            />
          )}

          {/* Final hypothesis card */}
          {finalHypothesis && (
            <div className="border-2 border-ink bg-paper-raised px-5 py-4">
              <p className="eyebrow eyebrow-accent">{L.hypothesis}</p>
              <div className="mt-3">
                <p className="eyebrow">{L.top3}</p>
                <ul className="mt-2 space-y-2">
                  {finalHypothesis.top3.slice(0, 3).map((t, i) => {
                    const pct = (t.probability * 100).toFixed(1);
                    const isDom = i === 0;
                    return (
                      <li key={t.imprint_id}>
                        <div className="flex items-baseline justify-between">
                          <span
                            className={
                              isDom
                                ? "editorial text-[15px] text-ink"
                                : "editorial text-[14px] text-ink-quiet"
                            }
                          >
                            {t.imprint_id.toUpperCase()} · {t.name}
                          </span>
                          <span className="tabular text-[12px] text-accent">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-[4px] bg-paper-soft overflow-hidden">
                          <div
                            className={
                              isDom ? "h-full bg-accent" : "h-full bg-ink-quiet"
                            }
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11.5px] text-ink-soft leading-snug">
                          {t.rationale}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {finalHypothesis.evidence_citations?.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow">{L.evidence}</p>
                  <ul className="mt-2 space-y-2">
                    {finalHypothesis.evidence_citations.slice(0, 4).map((c, i) => (
                      <li key={i}>
                        <p className="tabular text-[10px] tracking-wide uppercase text-ink-mute">
                          {c.imprint_id} · {c.treatise_reference}
                        </p>
                        <blockquote className="mt-0.5 border-l-2 border-accent pl-3 text-[12px] italic text-ink-quiet leading-snug">
                          &ldquo;{c.excerpt_from_case}&rdquo;
                        </blockquote>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {finalHypothesis.differential_question && (
                <div className="mt-4 border-l-2 border-accent pl-3 py-1">
                  <p className="eyebrow eyebrow-accent">{L.differential}</p>
                  <p className="mt-1 text-[12.5px] italic text-ink">
                    {finalHypothesis.differential_question.question}
                  </p>
                  <p className="mt-1 text-[10.5px] tabular text-ink-mute">
                    {finalHypothesis.differential_question.between.join(" vs ")} ·{" "}
                    {finalHypothesis.differential_question.from_treatise}
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-baseline justify-between text-[11.5px]">
                <span className="text-ink-mute">
                  {L.confidence}:{" "}
                  <span className="tabular text-accent">
                    {finalHypothesis.confidence}
                  </span>
                </span>
                <span className="text-ink-mute tabular">
                  tools: {finalHypothesis.tool_calls_used?.length ?? 0}
                </span>
              </div>
              {finalHypothesis.confidence_rationale && (
                <p className="mt-2 text-[11.5px] text-ink-soft italic leading-snug">
                  {finalHypothesis.confidence_rationale}
                </p>
              )}

              {(finalHypothesis.next_clinical_step_es ||
                finalHypothesis.next_clinical_step_en) && (
                <div className="mt-4 border-t border-rule pt-3">
                  <p className="eyebrow">{L.nextStep}</p>
                  <p className="mt-1 text-[13px] text-ink-soft italic leading-relaxed">
                    {locale === "es"
                      ? finalHypothesis.next_clinical_step_es ??
                        finalHypothesis.next_clinical_step_en
                      : finalHypothesis.next_clinical_step_en ??
                        finalHypothesis.next_clinical_step_es}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Streaming reasoning column ─────────────── */}
        <div className="col-span-12 lg:col-span-7">
          <div className="border border-rule bg-paper-raised min-h-[600px]">
            <div className="border-b border-rule px-5 py-3 flex items-baseline justify-between">
              <p className="eyebrow eyebrow-accent">
                {locale === "es"
                  ? "Razonamiento de Opus 4.7 en vivo"
                  : "Opus 4.7 reasoning live"}
              </p>
              {running && (
                <span className="inline-flex items-center gap-2 text-[10.5px] tabular tracking-[0.18em] uppercase text-accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  streaming
                </span>
              )}
            </div>
            <div className="px-5 py-4 max-h-[75vh] overflow-y-auto space-y-3">
              {events.length === 0 && !running && (
                <p className="text-[12.5px] italic text-ink-mute">
                  {L.noEvents}
                </p>
              )}
              {events.map((e, i) => (
                <EventRow key={i} ev={e} locale={locale} L={L} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-rule pt-6 text-[13px]">
        <Link
          href={locale === "es" ? "/clinico/nuevo?lang=es" : "/clinico/nuevo"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Consola cuantitativa" : "Quantitative console"}
          </p>
          <p className="mt-2 editorial text-[15px] text-ink">
            {locale === "es"
              ? "/clinico/nuevo — GMM + cascada →"
              : "/clinico/nuevo — GMM + cascade →"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Flujo guiado" : "Guided flow"}
          </p>
          <p className="mt-2 editorial text-[15px] text-ink">
            {locale === "es" ? "Sesión Ana →" : "Ana session →"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/demo?lang=es" : "/demo"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Demo jurado" : "Jury demo"}
          </p>
          <p className="mt-2 editorial text-[15px] text-ink">
            {locale === "es" ? "Split screen →" : "Split screen →"}
          </p>
        </Link>
      </section>
    </>
  );
}

function EventRow({
  ev,
  locale,
  L,
}: {
  ev: StreamEvent;
  locale: "en" | "es";
  L: {
    thinking: string;
    toolUse: string;
    toolResult: string;
    iter: string;
    done: string;
    tokens: string;
    cachedTokens: string;
    textOutput: string;
  };
}) {
  if (ev.type === "thinking") {
    return (
      <div className="border-l-2 border-accent/50 pl-3 py-1">
        <p className="tabular text-[9.5px] tracking-[0.18em] uppercase text-accent">
          {L.thinking}
        </p>
        <p className="mt-0.5 text-[11.5px] italic text-ink-quiet leading-snug whitespace-pre-wrap">
          {ev.text}
        </p>
      </div>
    );
  }
  if (ev.type === "text") {
    return (
      <div className="text-[13px] text-ink-soft leading-[1.55] whitespace-pre-wrap">
        {ev.text}
      </div>
    );
  }
  if (ev.type === "tool_use") {
    return (
      <div className="border border-ink bg-paper-soft px-3 py-2 rounded-none">
        <div className="flex items-baseline justify-between gap-2">
          <span className="tabular text-[10.5px] tracking-wide uppercase text-ink">
            → {L.toolUse}: <span className="text-accent">{ev.name}</span>
          </span>
          <span className="tabular text-[9.5px] text-ink-mute">{ev.id.slice(0, 12)}…</span>
        </div>
        <pre className="mt-1 text-[10.5px] text-ink-quiet tabular whitespace-pre-wrap overflow-x-auto max-h-[120px]">
          {JSON.stringify(ev.input, null, 2)}
        </pre>
      </div>
    );
  }
  if (ev.type === "tool_result") {
    return (
      <div className="border border-rule bg-paper px-3 py-2 rounded-none">
        <div className="flex items-baseline justify-between gap-2">
          <span className="tabular text-[10.5px] tracking-wide uppercase text-ink-mute">
            ← {L.toolResult}: <span className="text-ink">{ev.name}</span>
          </span>
          <span className="tabular text-[9.5px] text-ink-mute">{ev.tool_use_id.slice(0, 12)}…</span>
        </div>
        <pre className="mt-1 text-[10.5px] text-ink-quiet tabular whitespace-pre-wrap overflow-x-auto max-h-[180px]">
          {JSON.stringify(ev.result, null, 2)}
        </pre>
      </div>
    );
  }
  if (ev.type === "iteration") {
    return (
      <div className="text-[10.5px] tabular tracking-[0.18em] uppercase text-ink-mute py-1">
        ── {L.iter} {ev.n} ──
      </div>
    );
  }
  if (ev.type === "done") {
    return (
      <div className="border-2 border-accent bg-paper-raised px-4 py-3 mt-4">
        <p className="eyebrow eyebrow-accent">✓ {L.done}</p>
        <p className="mt-1 text-[11.5px] tabular text-ink-mute">
          {ev.iterations} iter · {L.tokens}: {ev.usage.input} in / {ev.usage.output} out · {L.cachedTokens}: {ev.usage.cached}
        </p>
      </div>
    );
  }
  if (ev.type === "error") {
    return (
      <div className="border border-danger bg-paper-raised px-3 py-2 text-[12px] text-danger">
        ⚠ {ev.message}
      </div>
    );
  }
  return null;
}
