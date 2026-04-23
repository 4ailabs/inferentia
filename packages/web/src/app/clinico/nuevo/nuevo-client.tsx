"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

type Labs = {
  cortisol_morning?: number;
  sdnn_hrv?: number;
  hba1c?: number;
  homa_ir?: number;
  hdl?: number;
};

type PosteriorEntry = {
  id: "i1" | "i4" | "i7" | "i8";
  name: string;
  posterior: number;
  log_likelihood: number;
};

type ClassifyResponse = {
  ok: boolean;
  tool: string;
  model_version: string;
  trace: {
    input_features: Record<string, number>;
    input_features_count: number;
    features_used: string[];
    features_missing: string[];
  };
  narrative_extraction: {
    used: boolean;
    quotes: Record<string, string> | null;
    usage: { input: number; output: number; cached: number | null } | null;
  };
  posterior: {
    version: string;
    posterior: PosteriorEntry[];
    dominant: string;
    top_gap: number;
    features_used: string[];
    features_missing: string[];
    entropy_bits: number;
    prior: Record<string, number>;
  };
  error?: string;
};

const LAB_FIELDS: Array<{
  key: keyof Labs;
  label_en: string;
  label_es: string;
  unit: string;
  step: string;
  placeholder: string;
}> = [
  {
    key: "cortisol_morning",
    label_en: "AM cortisol",
    label_es: "Cortisol AM",
    unit: "μg/dL",
    step: "0.1",
    placeholder: "e.g. 22",
  },
  {
    key: "sdnn_hrv",
    label_en: "HRV (SDNN)",
    label_es: "HRV (SDNN)",
    unit: "ms",
    step: "1",
    placeholder: "e.g. 28",
  },
  {
    key: "hba1c",
    label_en: "HbA1c",
    label_es: "HbA1c",
    unit: "%",
    step: "0.1",
    placeholder: "e.g. 6.1",
  },
  {
    key: "homa_ir",
    label_en: "HOMA-IR",
    label_es: "HOMA-IR",
    unit: "",
    step: "0.1",
    placeholder: "e.g. 3.2",
  },
  {
    key: "hdl",
    label_en: "HDL",
    label_es: "HDL",
    unit: "mg/dL",
    step: "1",
    placeholder: "e.g. 41",
  },
];

export default function NuevoClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [caseId, setCaseId] = useState("");
  const [labs, setLabs] = useState<Labs>({});
  const [transcript, setTranscript] = useState("");
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<ClassifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const L =
    locale === "es"
      ? {
          stepOne: "Paso 1 · Identificador del caso",
          caseHint:
            "Usa un alias no identificable (ej. 'A-042', 'mujer-34'). No nombres, no fechas, no clínica.",
          caseIdLabel: "ID anonimizado del caso",
          stepTwo: "Paso 2 · Datos objetivos (opcional)",
          labsHint:
            "Cualquier subconjunto. El clasificador marginaliza los ejes faltantes.",
          stepThree: "Paso 3 · Narrativa clínica",
          transcriptHint:
            "Pega el transcript de entrevista, notas propias, o resumen clínico. El extractor narrativo puntúa tres dimensiones [0,1]: hipervigilancia · colapso dorsal · anticipación de escasez.",
          run: "Clasificar impronta",
          running: "Ejecutando tool call…",
          noInput:
            "Introduce al menos un lab o una narrativa antes de clasificar.",
          toolCallTitle: "Tool call ejecutado",
          posteriorTitle: "Posterior Bayesiano",
          traceTitle: "Trazabilidad",
          dominant: "Dominante",
          topGap: "Gap dominante-segunda",
          entropy: "Entropía (bits)",
          modelVersion: "Versión del modelo",
          featuresUsed: "Features utilizados",
          featuresMissing: "Features ausentes (marginalizados)",
          narrativeTitle: "Features narrativos extraídos",
          narrativeNote:
            "Sonnet 4.6 puntuó estas tres dimensiones leyendo el transcript. Citas verbatim abajo.",
          logLikelihood: "log P(x|impronta)",
          disclaimer:
            "Cada número de arriba es un cálculo cerrado: softmax de log P(x|k) + log π_k, con P(x|k) = producto de gaussianas independientes por eje. Parámetros μ,σ en gmm-imprint.ts.",
          nextStep: "Siguiente: alimentar el posterior al render + programa",
        }
      : {
          stepOne: "Step 1 · Case identifier",
          caseHint:
            "Use a non-identifying alias (e.g. 'A-042', 'woman-34'). No names, dates, clinic.",
          caseIdLabel: "Anonymised case ID",
          stepTwo: "Step 2 · Objective data (optional)",
          labsHint:
            "Any subset. The classifier marginalises over missing axes.",
          stepThree: "Step 3 · Clinical narrative",
          transcriptHint:
            "Paste interview transcript, your own notes, or clinical summary. The narrative extractor scores three [0,1] dimensions: hypervigilance · dorsal collapse · scarcity anticipation.",
          run: "Classify imprint",
          running: "Executing tool call…",
          noInput:
            "Enter at least one lab or narrative before classifying.",
          toolCallTitle: "Tool call executed",
          posteriorTitle: "Bayesian posterior",
          traceTitle: "Trace",
          dominant: "Dominant",
          topGap: "Dominant-second gap",
          entropy: "Entropy (bits)",
          modelVersion: "Model version",
          featuresUsed: "Features used",
          featuresMissing: "Features missing (marginalised)",
          narrativeTitle: "Extracted narrative features",
          narrativeNote:
            "Sonnet 4.6 scored these three dimensions from the transcript. Verbatim quotes below.",
          logLikelihood: "log P(x|imprint)",
          disclaimer:
            "Every number above is a closed-form computation: softmax of log P(x|k) + log π_k, with P(x|k) = product of independent Gaussians per axis. Parameters μ,σ in gmm-imprint.ts.",
          nextStep: "Next: feed this posterior into render + program",
        };

  const hasAnyInput =
    Object.keys(labs).length > 0 || transcript.trim().length > 0;

  const run = useCallback(async () => {
    if (!hasAnyInput) {
      setError(L.noInput);
      return;
    }
    setRunning(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim() || undefined,
          labs,
          locale,
        }),
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
  }, [hasAnyInput, transcript, labs, locale, L.noInput]);

  return (
    <>
      <section className="mt-4 grid grid-cols-12 gap-6">
        {/* ─── Input column ────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Step 1 — case ID */}
          <div className="border border-rule bg-paper-raised px-5 py-5">
            <p className="eyebrow eyebrow-accent">{L.stepOne}</p>
            <p className="mt-2 text-[11.5px] text-ink-mute max-w-[60ch]">
              {L.caseHint}
            </p>
            <label className="block mt-3">
              <span className="text-[10.5px] tabular tracking-wide uppercase text-ink-mute">
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

          {/* Step 2 — labs */}
          <div className="border border-rule bg-paper-raised px-5 py-5">
            <p className="eyebrow eyebrow-accent">{L.stepTwo}</p>
            <p className="mt-2 text-[11.5px] text-ink-mute max-w-[60ch]">
              {L.labsHint}
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-3">
              {LAB_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-[10.5px] tabular tracking-wide uppercase text-ink-mute">
                    {locale === "es" ? f.label_es : f.label_en}{" "}
                    {f.unit && (
                      <span className="text-ink-mute/70">{f.unit}</span>
                    )}
                  </span>
                  <input
                    type="number"
                    step={f.step}
                    inputMode="decimal"
                    value={(labs[f.key] ?? "") as number | ""}
                    placeholder={f.placeholder}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setLabs((prev) => {
                        const next = { ...prev };
                        if (raw === "") delete next[f.key];
                        else next[f.key] = Number(raw);
                        return next;
                      });
                    }}
                    className="border border-rule bg-paper px-3 py-1.5 text-[13px] tabular text-ink focus:border-accent outline-none"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Step 3 — narrative */}
          <div className="border border-rule bg-paper-raised px-5 py-5">
            <p className="eyebrow eyebrow-accent">{L.stepThree}</p>
            <p className="mt-2 text-[11.5px] text-ink-mute max-w-[60ch]">
              {L.transcriptHint}
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="mt-4 w-full h-[260px] border border-rule bg-paper px-3 py-2 text-[13px] text-ink-soft focus:border-accent outline-none leading-[1.55] resize-y"
              placeholder={
                locale === "es"
                  ? "Pega aquí el transcript ya anonimizado…"
                  : "Paste the anonymised transcript here…"
              }
            />
          </div>

          <button
            onClick={run}
            disabled={running || !hasAnyInput}
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

        {/* ─── Output column ────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {!response ? (
            <div className="border border-rule bg-paper-soft px-5 py-6">
              <p className="eyebrow text-ink-mute">
                {locale === "es" ? "Salida del tool" : "Tool output"}
              </p>
              <p className="mt-3 text-[12.5px] italic text-ink-mute leading-snug">
                {locale === "es"
                  ? "Al pulsar clasificar: Sonnet 4.6 extrae tres dimensiones narrativas del transcript → el clasificador GMM Bayesiano combina labs + narrativa → devuelve posterior auditable sobre i1/i4/i7/i8."
                  : "When you classify: Sonnet 4.6 extracts three narrative dimensions from the transcript → the Bayesian GMM classifier combines labs + narrative → returns an auditable posterior over i1/i4/i7/i8."}
              </p>
            </div>
          ) : (
            <>
              {/* Tool call header */}
              <div className="border-2 border-ink bg-paper-raised px-5 py-4">
                <p className="eyebrow eyebrow-accent">{L.toolCallTitle}</p>
                <p className="mt-3 tabular text-[13px] text-ink">
                  {response.tool}
                  <span className="text-ink-mute">
                    {" "}· {L.modelVersion}: {response.model_version}
                  </span>
                </p>
                {response.narrative_extraction.used &&
                  response.narrative_extraction.usage && (
                    <p className="mt-2 text-[10.5px] tabular text-ink-mute">
                      Sonnet 4.6 · {response.narrative_extraction.usage.input} in
                      {" / "}
                      {response.narrative_extraction.usage.output} out
                      {response.narrative_extraction.usage.cached
                        ? ` · ${response.narrative_extraction.usage.cached} cached`
                        : ""}
                    </p>
                  )}
              </div>

              {/* Posterior bars */}
              <div className="border border-rule bg-paper-raised px-5 py-5">
                <p className="eyebrow">{L.posteriorTitle}</p>
                <ul className="mt-4 space-y-3">
                  {response.posterior.posterior
                    .sort((a, b) => b.posterior - a.posterior)
                    .map((p) => {
                      const pct = p.posterior * 100;
                      const isDominant = p.id === response.posterior.dominant;
                      return (
                        <li key={p.id}>
                          <div className="flex items-baseline justify-between">
                            <span
                              className={
                                isDominant
                                  ? "editorial text-[15px] text-ink"
                                  : "editorial text-[15px] text-ink-quiet"
                              }
                            >
                              {p.id.toUpperCase()} · {p.name}
                              {isDominant && (
                                <span className="ml-2 tabular text-[9.5px] tracking-[0.18em] uppercase text-accent">
                                  {L.dominant}
                                </span>
                              )}
                            </span>
                            <span className="tabular text-[12px] text-accent">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-1 h-[5px] bg-paper-soft overflow-hidden">
                            <div
                              className={
                                isDominant
                                  ? "h-full bg-accent"
                                  : "h-full bg-ink-quiet"
                              }
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] tabular text-ink-mute">
                            {L.logLikelihood} = {p.log_likelihood.toFixed(3)}
                          </p>
                        </li>
                      );
                    })}
                </ul>
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] tabular">
                  <div>
                    <span className="text-ink-mute">{L.topGap}</span>{" "}
                    <span className="text-ink">
                      {response.posterior.top_gap.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-mute">{L.entropy}</span>{" "}
                    <span className="text-ink">
                      {response.posterior.entropy_bits.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Narrative features */}
              {response.narrative_extraction.used &&
                response.narrative_extraction.quotes && (
                  <div className="border border-rule bg-paper-raised px-5 py-5">
                    <p className="eyebrow">{L.narrativeTitle}</p>
                    <p className="mt-2 text-[11px] italic text-ink-mute">
                      {L.narrativeNote}
                    </p>
                    <ul className="mt-4 space-y-3">
                      {(
                        [
                          "hypervigilance",
                          "dorsal_collapse",
                          "scarcity_anticipation",
                        ] as const
                      ).map((dim) => {
                        const val =
                          (response.trace.input_features as Record<
                            string,
                            number
                          >)[dim] ?? 0;
                        const quote =
                          response.narrative_extraction.quotes?.[dim] ?? "";
                        return (
                          <li key={dim}>
                            <div className="flex items-baseline justify-between">
                              <span className="tabular text-[11px] tracking-wide uppercase text-ink-mute">
                                {dim}
                              </span>
                              <span className="tabular text-[11px] text-accent">
                                {val.toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-1 h-[3px] bg-paper-soft overflow-hidden">
                              <div
                                className="h-full bg-accent"
                                style={{ width: `${val * 100}%` }}
                              />
                            </div>
                            {quote && (
                              <blockquote className="mt-2 border-l-2 border-rule pl-3 text-[11.5px] italic text-ink-quiet">
                                &ldquo;{quote}&rdquo;
                              </blockquote>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

              {/* Trace */}
              <div className="border border-rule bg-paper-raised px-5 py-5">
                <p className="eyebrow">{L.traceTitle}</p>
                <dl className="mt-4 space-y-2 text-[11.5px]">
                  <div>
                    <dt className="text-ink-mute">{L.featuresUsed}</dt>
                    <dd className="mt-0.5 tabular text-ink">
                      {response.posterior.features_used.join(" · ") || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-mute">{L.featuresMissing}</dt>
                    <dd className="mt-0.5 tabular text-ink-quiet">
                      {response.posterior.features_missing.join(" · ") || "—"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-[10.5px] italic text-ink-mute leading-snug">
                  {L.disclaimer}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {response && caseId.trim() && (
        <section className="mt-10 border-t border-rule pt-6">
          <p className="text-[12px] italic text-ink-mute">
            {L.nextStep}{" "}
            <span className="tabular text-ink-quiet">(TODO v0.2)</span>
          </p>
          <p className="mt-2 text-[11px] tabular text-ink-mute">
            caseId: {caseId}
          </p>
        </section>
      )}

      <section className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-rule pt-8 text-[13px]">
        <Link
          href={locale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Flujo completo" : "Full flow"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es"
              ? "Sesión guiada (caso ejemplo) →"
              : "Guided session (example case) →"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/paciente?lang=es" : "/paciente"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Otra vista" : "Other view"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Vista paciente →" : "Patient view →"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/?lang=es" : "/"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Regresar" : "Back"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Inferentia ↗" : "Inferentia ↗"}
          </p>
        </Link>
      </section>
    </>
  );
}
