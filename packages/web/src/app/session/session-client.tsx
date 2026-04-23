"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnaScript, PATIENT_ANA_PROFILE, type PrescriptedTurn } from "@/lib/patient-ana";
import type { ClinicalPosterior } from "@/lib/clinical-schema";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type Stage = "idle" | "interviewing" | "analyzing" | "ready" | "rendering" | "error";

export default function SessionClient({
  locale,
  scriptedTurns,
}: {
  locale: "en" | "es";
  scriptedTurns: PrescriptedTurn[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { id: "seed", role: "assistant", content: scriptedTurns[0]?.content ?? "" },
  ]);
  const [stage, setStage] = useState<Stage>("idle");
  const [nextTurnIdx, setNextTurnIdx] = useState(1);
  const [posterior, setPosterior] = useState<ClinicalPosterior | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const L = useMemo(
    () =>
      locale === "es"
        ? {
            title: "Sesión en vivo · Ana",
            subtitle:
              "Entrevista adaptativa turno a turno. Haiku 4.5 conduce · Sonnet 4.6 extrae priors · Opus 4.7 compone las dos vistas.",
            age: "Edad",
            chief_complaint: "Motivo",
            playNext: "Siguiente turno",
            analyze: "Analizar transcripción",
            analyzing: "Analizando…",
            render: "Componer con Opus 4.7",
            rendering: "Componiendo…",
            priorsTitle: "Priors activos inferidos",
            imprintsTitle: "Posterior sobre improntas",
            dominantLabel: "Dominante",
            waitingLabel: "Esperando entrevista…",
            afterAnalysis: "Análisis completado. El posterior clínico está listo.",
            reset: "Reiniciar",
            demoNote:
              "Modo demo — turnos pre-grabados con paciente sintética. Garantiza reproducibilidad del flujo para el jurado.",
            error: "Algo salió mal. Revisa la consola.",
            freeEnergy: "Δ energía libre estimada",
          }
        : {
            title: "Live session · Ana",
            subtitle:
              "Adaptive turn-by-turn interview. Haiku 4.5 conducts · Sonnet 4.6 extracts priors · Opus 4.7 composes both views.",
            age: "Age",
            chief_complaint: "Chief complaint",
            playNext: "Next turn",
            analyze: "Analyze transcript",
            analyzing: "Analyzing…",
            render: "Compose with Opus 4.7",
            rendering: "Composing…",
            priorsTitle: "Active priors inferred",
            imprintsTitle: "Posterior over imprints",
            dominantLabel: "Dominant",
            waitingLabel: "Waiting for interview…",
            afterAnalysis: "Analysis complete. Clinical posterior is ready.",
            reset: "Reset",
            demoNote:
              "Demo mode — pre-recorded turns with a synthetic patient. Guarantees reproducibility for the jury.",
            error: "Something went wrong. Check console.",
            freeEnergy: "Est. free-energy Δ",
          },
    [locale],
  );

  const playNextTurn = useCallback(() => {
    if (nextTurnIdx >= scriptedTurns.length) return;
    const next = scriptedTurns[nextTurnIdx];
    setMessages((prev) => [
      ...prev,
      { id: `t-${nextTurnIdx}`, role: next.role, content: next.content },
    ]);
    setNextTurnIdx((i) => i + 1);
    setStage("interviewing");
  }, [nextTurnIdx, scriptedTurns]);

  const reset = useCallback(() => {
    setMessages([
      { id: "seed", role: "assistant", content: scriptedTurns[0]?.content ?? "" },
    ]);
    setNextTurnIdx(1);
    setStage("idle");
    setPosterior(null);
    setErrorMsg(null);
  }, [scriptedTurns]);

  const runAnalyze = useCallback(async () => {
    setStage("analyzing");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patient_id: "ana",
          transcript: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErrorMsg(j.error ?? `status ${res.status}`);
        setStage("error");
        return;
      }
      setPosterior(j.posterior as ClinicalPosterior);
      setStage("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage("error");
    }
  }, [messages]);

  const runRender = useCallback(async () => {
    if (!posterior) return;
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
      // Persist the full payload in sessionStorage for the next page.
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

  const transcriptDone = nextTurnIdx >= scriptedTurns.length;

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* LEFT — Chat + demo controls --------------------------------- */}
      <section className="col-span-12 lg:col-span-7 border border-ink bg-paper-raised">
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-rule">
          <div>
            <p className="eyebrow">{L.age} · {L.chief_complaint}</p>
            <h2 className="mt-2 editorial text-[24px] leading-tight text-ink">
              {PATIENT_ANA_PROFILE.name},{" "}
              <span className="editorial-italic text-ink-quiet">
                {PATIENT_ANA_PROFILE.age}
              </span>
            </h2>
            <p className="mt-2 max-w-[55ch] text-[12.5px] leading-snug text-ink-soft">
              {locale === "es"
                ? PATIENT_ANA_PROFILE.chief_complaint_es
                : PATIENT_ANA_PROFILE.chief_complaint_en}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-2 border border-rule px-2 py-1 text-[10px] tabular tracking-[0.18em] uppercase text-ink-mute">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              demo mode
            </span>
            <button
              onClick={reset}
              className="text-[11px] text-ink-mute hover:text-ink transition-colors underline decoration-rule underline-offset-4 decoration-1"
            >
              {L.reset}
            </button>
          </div>
        </header>

        <div className="h-[480px] overflow-y-auto px-6 py-5 space-y-4 bg-paper-soft">
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
                    : "bg-ink text-paper"
                }`}
                style={{ borderRadius: 2 }}
              >
                <p>{m.content}</p>
              </div>
              <p
                className={`mt-1 text-[10px] tabular tracking-[0.14em] uppercase ${
                  m.role === "assistant" ? "text-ink-mute" : "text-ink-mute text-right"
                }`}
              >
                {m.role === "assistant" ? "Haiku 4.5" : "Ana"}
              </p>
            </div>
          ))}
        </div>

        <footer className="px-6 py-4 border-t border-rule flex items-center justify-between gap-4 bg-paper-raised">
          <p className="text-[11px] text-ink-mute max-w-[50ch]">{L.demoNote}</p>
          {!transcriptDone ? (
            <button
              onClick={playNextTurn}
              className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-[12px] tracking-wide hover:bg-accent-deep transition-colors"
            >
              {L.playNext}
              <span className="inline-block w-5 h-px bg-paper" />
            </button>
          ) : stage === "ready" || stage === "rendering" ? (
            <button
              onClick={runRender}
              disabled={stage === "rendering"}
              className="inline-flex items-center gap-2 bg-accent text-paper px-4 py-2 text-[12px] tracking-wide hover:bg-accent-deep transition-colors disabled:opacity-60"
            >
              {stage === "rendering" ? L.rendering : L.render}
              <span className="inline-block w-5 h-px bg-paper" />
            </button>
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

      {/* RIGHT — live analysis panel --------------------------------- */}
      <aside className="col-span-12 lg:col-span-5 space-y-5">
        <div className="border border-rule bg-paper-raised px-5 py-4">
          <p className="eyebrow eyebrow-accent">{L.priorsTitle}</p>
          {!posterior ? (
            <p className="mt-4 text-[12.5px] text-ink-mute italic">
              {L.waitingLabel}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {posterior.active_priors.map((p) => (
                <li key={p.id} className="border-t border-rule pt-3 first:border-t-0 first:pt-0">
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
            <p className="mt-4 text-[11px] text-ink-mute tabular">
              {L.freeEnergy}{" "}
              <span className="text-accent">
                {(posterior.free_energy_delta_estimate * 100).toFixed(0)}%
              </span>
              {" · "}
              {L.afterAnalysis}
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="border border-danger px-4 py-3 text-[12px] text-danger">
            <strong>Error</strong> · {errorMsg}
          </div>
        )}
      </aside>
    </div>
  );
}
