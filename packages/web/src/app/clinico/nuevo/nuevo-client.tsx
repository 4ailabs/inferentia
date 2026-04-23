"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  FEATURE_META,
  FEATURE_SYSTEMS,
  NARRATIVE_KEYS,
  type FeatureKey,
} from "@/lib/math/gmm-imprint";

type Labs = Partial<Record<FeatureKey, number>>;

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

export default function NuevoClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [caseId, setCaseId] = useState("");
  const [labs, setLabs] = useState<Labs>({});
  const [transcript, setTranscript] = useState("");
  const [openSystems, setOpenSystems] = useState<Record<string, boolean>>({
    hpa: true,
    metabolic: true,
    inflammation: false,
    thyroid: false,
    micronutrients: false,
    autonomic: false,
    body_comp: false,
  });
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<ClassifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const L =
    locale === "es"
      ? {
          caseStep: "Paso 1 · Identificador anonimizado",
          caseHint:
            "Usa un alias no identificable (ej. 'A-042', 'mujer-34'). Sin nombres, fechas, clínica.",
          caseIdLabel: "ID del caso",
          labsStep: "Paso 2 · Datos objetivos",
          labsHint:
            "Introduce los ejes que tengas. El clasificador marginaliza los faltantes. Cuantos más ejes, más estrecho el posterior.",
          narrStep: "Paso 3 · Narrativa clínica",
          narrHint:
            "Pega transcripto de entrevista, notas propias o resumen. Sonnet 4.6 puntúa 12 dimensiones [0,1] con cita verbatim cada una.",
          run: "Ejecutar clasificador",
          running: "Corriendo tool call…",
          noInput:
            "Introduce al menos un lab o una narrativa antes de clasificar.",
          toolExec: "Tool call ejecutado",
          modelVersion: "Modelo",
          posteriorTitle: "Posterior Bayesiano P(impronta | x)",
          dominant: "Dominante",
          topGap: "Gap dominante-segunda",
          entropy: "Entropía (bits)",
          featuresUsed: "Ejes utilizados",
          featuresMissing: "Ejes marginalizados",
          narrTitle: "12 dimensiones narrativas extraídas",
          narrNote: "Cada cita es verbatim del transcript.",
          disclaimer:
            "Posterior = softmax( log P(x|k) + log π_k ). P(x|k) = producto de gaussianas independientes por eje. Parámetros μ,σ en lib/math/gmm-imprint.ts (v0.2).",
          emptyOut: "Al ejecutar verás el posterior, log-likelihoods, entropía, y las citas verbatim.",
          logLik: "log P(x|impronta)",
          openAll: "Abrir todo",
          closeAll: "Cerrar todo",
        }
      : {
          caseStep: "Step 1 · Anonymised identifier",
          caseHint:
            "Use a non-identifying alias (e.g. 'A-042', 'woman-34'). No names, dates, clinic.",
          caseIdLabel: "Case ID",
          labsStep: "Step 2 · Objective data",
          labsHint:
            "Enter whatever axes you have. The classifier marginalises missing ones. More axes → tighter posterior.",
          narrStep: "Step 3 · Clinical narrative",
          narrHint:
            "Paste transcript, own notes, or summary. Sonnet 4.6 scores 12 [0,1] dimensions with a verbatim quote each.",
          run: "Run classifier",
          running: "Executing tool call…",
          noInput: "Enter at least one lab or narrative before classifying.",
          toolExec: "Tool call executed",
          modelVersion: "Model",
          posteriorTitle: "Bayesian posterior P(imprint | x)",
          dominant: "Dominant",
          topGap: "Dominant-second gap",
          entropy: "Entropy (bits)",
          featuresUsed: "Axes used",
          featuresMissing: "Axes marginalised",
          narrTitle: "12 extracted narrative dimensions",
          narrNote: "Each quote is verbatim from the transcript.",
          disclaimer:
            "Posterior = softmax( log P(x|k) + log π_k ). P(x|k) = product of per-axis independent Gaussians. Parameters μ,σ in lib/math/gmm-imprint.ts (v0.2).",
          emptyOut:
            "On run you will see the posterior, log-likelihoods, entropy, and verbatim quotes.",
          logLik: "log P(x|imprint)",
          openAll: "Open all",
          closeAll: "Close all",
        };

  const toggleSystem = (id: string) =>
    setOpenSystems((prev) => ({ ...prev, [id]: !prev[id] }));

  const openOrCloseAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const s of FEATURE_SYSTEMS) next[s.id] = open;
    setOpenSystems(next);
  };

  const hasAnyInput =
    Object.keys(labs).length > 0 || transcript.trim().length > 0;

  const labsCount = Object.keys(labs).length;

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

  const posteriorSorted = useMemo(
    () =>
      response
        ? [...response.posterior.posterior].sort((a, b) => b.posterior - a.posterior)
        : [],
    [response],
  );

  return (
    <>
      <section className="mt-4 grid grid-cols-12 gap-6">
        {/* ─── Input column ────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Step 1 — case ID */}
          <div className="border border-rule bg-paper-raised px-5 py-5">
            <p className="eyebrow eyebrow-accent">{L.caseStep}</p>
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

          {/* Step 2 — modular labs by system */}
          <div className="border border-rule bg-paper-raised">
            <div className="px-5 py-4 border-b border-rule flex items-baseline justify-between gap-3">
              <div>
                <p className="eyebrow eyebrow-accent">{L.labsStep}</p>
                <p className="mt-1 text-[11.5px] text-ink-mute max-w-[60ch]">
                  {L.labsHint}
                </p>
              </div>
              <div className="flex items-baseline gap-3 shrink-0 text-[10.5px] tabular tracking-wide uppercase">
                <button
                  onClick={() => openOrCloseAll(true)}
                  className="text-ink-mute hover:text-ink transition-colors"
                >
                  {L.openAll}
                </button>
                <span className="text-rule">·</span>
                <button
                  onClick={() => openOrCloseAll(false)}
                  className="text-ink-mute hover:text-ink transition-colors"
                >
                  {L.closeAll}
                </button>
                <span className="text-rule">·</span>
                <span className="tabular text-accent">
                  {labsCount}/26
                </span>
              </div>
            </div>
            <ul className="divide-y divide-rule">
              {FEATURE_SYSTEMS.map((sys) => {
                const isOpen = openSystems[sys.id] ?? false;
                const filled = sys.keys.filter(
                  (k) => typeof labs[k] === "number",
                ).length;
                return (
                  <li key={sys.id}>
                    <button
                      onClick={() => toggleSystem(sys.id)}
                      className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-paper-soft transition-colors"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="text-[10px] tabular tracking-[0.18em] uppercase text-ink-mute w-4">
                          {isOpen ? "−" : "+"}
                        </span>
                        <span className="editorial text-[14px] text-ink">
                          {locale === "es" ? sys.label_es : sys.label_en}
                        </span>
                      </span>
                      <span className="tabular text-[10.5px] text-ink-mute">
                        {filled} / {sys.keys.length}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-3">
                        {sys.keys.map((k) => {
                          const meta = FEATURE_META[k];
                          return (
                            <label key={k} className="flex flex-col gap-1">
                              <span className="text-[10.5px] tabular tracking-wide uppercase text-ink-mute">
                                {locale === "es" ? meta.label_es : meta.label_en}{" "}
                                {meta.unit && (
                                  <span className="text-ink-mute/70">
                                    {meta.unit}
                                  </span>
                                )}
                              </span>
                              <input
                                type="number"
                                step={meta.step}
                                inputMode="decimal"
                                value={(labs[k] ?? "") as number | ""}
                                placeholder={meta.placeholder ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setLabs((prev) => {
                                    const next = { ...prev };
                                    if (raw === "") delete next[k];
                                    else next[k] = Number(raw);
                                    return next;
                                  });
                                }}
                                className="border border-rule bg-paper px-3 py-1.5 text-[13px] tabular text-ink focus:border-accent outline-none"
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

          {/* Step 3 — narrative */}
          <div className="border border-rule bg-paper-raised px-5 py-5">
            <p className="eyebrow eyebrow-accent">{L.narrStep}</p>
            <p className="mt-2 text-[11.5px] text-ink-mute max-w-[60ch]">
              {L.narrHint}
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
            <p className="mt-2 text-[10.5px] tabular text-ink-mute">
              {transcript.trim().length} chars
            </p>
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

        {/* ─── Output column ────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {!response ? (
            <div className="border border-rule bg-paper-soft px-5 py-6">
              <p className="eyebrow text-ink-mute">
                {locale === "es" ? "Salida del tool" : "Tool output"}
              </p>
              <p className="mt-3 text-[12.5px] italic text-ink-mute leading-snug">
                {L.emptyOut}
              </p>
            </div>
          ) : (
            <>
              {/* Tool call header */}
              <div className="border-2 border-ink bg-paper-raised px-5 py-4">
                <p className="eyebrow eyebrow-accent">{L.toolExec}</p>
                <p className="mt-3 tabular text-[13px] text-ink">
                  {response.tool}
                  <span className="text-ink-mute">
                    {" "}· {L.modelVersion} {response.model_version}
                  </span>
                </p>
                {response.narrative_extraction.used &&
                  response.narrative_extraction.usage && (
                    <p className="mt-2 text-[10.5px] tabular text-ink-mute">
                      Sonnet 4.6 · {response.narrative_extraction.usage.input} in /
                      {" "}
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
                  {posteriorSorted.map((p) => {
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
                          {L.logLik} = {p.log_likelihood.toFixed(3)}
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

              {/* Narrative 12-dim */}
              {response.narrative_extraction.used &&
                response.narrative_extraction.quotes && (
                  <div className="border border-rule bg-paper-raised px-5 py-5">
                    <p className="eyebrow">{L.narrTitle}</p>
                    <p className="mt-2 text-[11px] italic text-ink-mute">
                      {L.narrNote}
                    </p>
                    <ul className="mt-4 space-y-3">
                      {NARRATIVE_KEYS.map((dim) => {
                        const val =
                          (response.trace.input_features as Record<string, number>)[
                            dim
                          ] ?? 0;
                        const quote =
                          response.narrative_extraction.quotes?.[dim] ?? "";
                        const meta = FEATURE_META[dim];
                        return (
                          <li key={dim}>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="tabular text-[10.5px] tracking-wide uppercase text-ink-mute">
                                {locale === "es" ? meta.label_es : meta.label_en}
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
                              <blockquote className="mt-1.5 border-l-2 border-rule pl-3 text-[11px] italic text-ink-quiet leading-snug">
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
                <p className="eyebrow">
                  {locale === "es" ? "Trazabilidad" : "Trace"}
                </p>
                <dl className="mt-4 space-y-3 text-[11.5px]">
                  <div>
                    <dt className="text-ink-mute">
                      {L.featuresUsed} ({response.posterior.features_used.length})
                    </dt>
                    <dd className="mt-0.5 tabular text-ink leading-relaxed">
                      {response.posterior.features_used.join(" · ") || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-mute">
                      {L.featuresMissing} (
                      {response.posterior.features_missing.length})
                    </dt>
                    <dd className="mt-0.5 tabular text-ink-quiet leading-relaxed">
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

      <section className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-rule pt-8 text-[13px]">
        <Link
          href={locale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Caso ejemplo" : "Example case"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
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
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Vista paciente →" : "Patient view →"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/?lang=es" : "/"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Regresar" : "Back"}</p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Inferentia ↗" : "Inferentia ↗"}
          </p>
        </Link>
      </section>
    </>
  );
}
