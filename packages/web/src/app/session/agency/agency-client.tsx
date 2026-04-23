"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AgencyItem,
  AgencyPanel,
  ClinicalPosterior,
  DualRender,
  NutritionalProgram,
} from "@/lib/clinical-schema";

type SessionPayload = {
  posterior: ClinicalPosterior;
  render: DualRender;
  locale: "en" | "es";
};

type LoadState = "loading" | "ready" | "empty" | "error";

const SESSION_KEY = "inferentia:last_session";
const PROGRAM_KEY = "inferentia:last_program";
const PANEL_KEY = "inferentia:last_agency";

function isValidSessionPayload(x: unknown): x is SessionPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    !!o.posterior &&
    !!o.render &&
    (o.locale === "en" || o.locale === "es")
  );
}

function averageDelta(items: AgencyItem[], dim: AgencyItem["dimension"]) {
  const filtered = items.filter((i) => i.dimension === dim);
  if (filtered.length === 0) return 0;
  const sum = filtered.reduce((s, i) => s + (i.post - i.pre), 0);
  return sum / filtered.length;
}

function averageValue(items: AgencyItem[], which: "pre" | "post") {
  if (items.length === 0) return 0;
  return items.reduce((s, i) => s + i[which], 0) / items.length;
}

export default function AgencyClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [panel, setPanel] = useState<AgencyPanel | null>(null);
  const [posterior, setPosterior] = useState<ClinicalPosterior | null>(null);
  const [program, setProgram] = useState<NutritionalProgram | null>(null);
  const [error, setError] = useState<string | null>(null);

  const L =
    locale === "es"
      ? {
          emptyTitle: "No hay sesión disponible.",
          emptyBody:
            "Ejecuta una sesión primero — regresa a /session y completa el flujo.",
          backToSession: "← /session",
          composing: "Sonnet 4.6 está componiendo el panel de agencia…",
          composingSub:
            "Anclando pre/post en el posterior clínico y el programa firmado.",
          regenerate: "Re-componer panel",
          heroEyebrow: "Output 5 · Outcome primario",
          pre: "Pre",
          post: "Post",
          deltaLabel: "Δ",
          horizon: "horizonte",
          weeks: "semanas",
          dimensions: {
            mastery: "Dominio sobre el entorno",
            interoception: "Señal interoceptiva",
            perceived_options: "Opciones percibidas",
          },
          averageOverall: "Promedio global",
          programStatus: "Programa firmado",
          programSigned: "Adoptado",
          programMissing: "Sin firmar · proyección acotada",
          rationale: "Por qué",
          items: "Ítems",
          summary: "Resumen del sistema",
          projectionCaveat:
            "Proyección del sistema basada en el programa firmado. En fase 2 este panel se mide longitudinalmente.",
          publicDomainNote:
            "Mastery: adaptación breve de Pearlin Mastery Scale (dominio público). Interocepción y opciones percibidas: ítems originales.",
          goResult: "← Volver al resultado",
          goProgram: "Programa nutricional ↗",
          goNetwork: "Ver en la red ↗",
          goHome: "Volver a Inferentia ↗",
        }
      : {
          emptyTitle: "No session available.",
          emptyBody:
            "Run a session first — go back to /session and complete the flow.",
          backToSession: "← /session",
          composing: "Sonnet 4.6 is composing the agency panel…",
          composingSub:
            "Anchoring pre/post in the posterior and the signed program.",
          regenerate: "Re-compose panel",
          heroEyebrow: "Output 5 · Primary outcome",
          pre: "Pre",
          post: "Post",
          deltaLabel: "Δ",
          horizon: "horizon",
          weeks: "weeks",
          dimensions: {
            mastery: "Mastery over environment",
            interoception: "Interoceptive signal",
            perceived_options: "Perceived options",
          },
          averageOverall: "Overall average",
          programStatus: "Signed program",
          programSigned: "Adopted",
          programMissing: "Unsigned · projection bounded",
          rationale: "Why",
          items: "Items",
          summary: "System summary",
          projectionCaveat:
            "System projection based on the signed program. In fase 2 this panel is measured longitudinally.",
          publicDomainNote:
            "Mastery: brief adaptation of Pearlin Mastery Scale (public domain). Interoception and perceived options: original items.",
          goResult: "← Back to result",
          goProgram: "Nutritional program ↗",
          goNetwork: "See on the network ↗",
          goHome: "Back to Inferentia ↗",
        };

  useEffect(() => {
    const run = async () => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
          setLoadState("empty");
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        if (!isValidSessionPayload(parsed)) {
          setLoadState("empty");
          return;
        }
        setPosterior(parsed.posterior);

        let prog: NutritionalProgram | null = null;
        const cachedProg = sessionStorage.getItem(PROGRAM_KEY);
        if (cachedProg) {
          try {
            const p = JSON.parse(cachedProg) as NutritionalProgram;
            if (p.patient_id === parsed.posterior.patient_id) prog = p;
          } catch {
            // ignore
          }
        }
        setProgram(prog);

        const cachedPanel = sessionStorage.getItem(PANEL_KEY);
        if (cachedPanel) {
          try {
            const p = JSON.parse(cachedPanel) as AgencyPanel;
            if (p.patient_id === parsed.posterior.patient_id) {
              setPanel(p);
              setLoadState("ready");
              return;
            }
          } catch {
            // ignore and recompose
          }
        }

        const res = await fetch("/api/agency", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            posterior: parsed.posterior,
            program: prog,
            locale,
          }),
        });
        const j = await res.json();
        if (!res.ok || !j.ok) {
          setError(j.error ?? `status ${res.status}`);
          setLoadState("error");
          return;
        }
        const next = j.panel as AgencyPanel;
        setPanel(next);
        sessionStorage.setItem(PANEL_KEY, JSON.stringify(next));
        setLoadState("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoadState("error");
      }
    };
    run();
  }, [locale]);

  const regenerate = useCallback(async () => {
    if (!posterior) return;
    setLoadState("loading");
    setError(null);
    try {
      const res = await fetch("/api/agency", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ posterior, program, locale }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? `status ${res.status}`);
        setLoadState("error");
        return;
      }
      const next = j.panel as AgencyPanel;
      setPanel(next);
      sessionStorage.setItem(PANEL_KEY, JSON.stringify(next));
      setLoadState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoadState("error");
    }
  }, [posterior, program, locale]);

  const dimensionDeltas = useMemo(() => {
    if (!panel) return null;
    return {
      mastery: averageDelta(panel.items, "mastery"),
      interoception: averageDelta(panel.items, "interoception"),
      perceived_options: averageDelta(panel.items, "perceived_options"),
    };
  }, [panel]);

  const overall = useMemo(() => {
    if (!panel) return null;
    return {
      pre: averageValue(panel.items, "pre"),
      post: averageValue(panel.items, "post"),
    };
  }, [panel]);

  if (loadState === "empty") {
    return (
      <div className="mt-10 border border-rule bg-paper-raised p-8 max-w-[60ch]">
        <p className="editorial text-[18px] text-ink">{L.emptyTitle}</p>
        <p className="mt-3 text-[13px] text-ink-soft">{L.emptyBody}</p>
        <Link
          href={locale === "es" ? "/session?lang=es" : "/session"}
          className="mt-5 inline-flex bg-ink text-paper px-4 py-2 text-[12px] tracking-wide"
        >
          {L.backToSession}
        </Link>
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="mt-10 max-w-[60ch]">
        <p className="eyebrow eyebrow-accent">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse mr-2 align-middle" />
          {L.composing}
        </p>
        <p className="mt-3 text-[13px] italic text-ink-mute">
          {L.composingSub}
        </p>
      </div>
    );
  }

  if (loadState === "error" || !panel) {
    return (
      <div className="mt-10 border border-danger bg-paper-raised p-6 max-w-[60ch]">
        <p className="eyebrow" style={{ color: "#8A2C1B" }}>
          Error
        </p>
        <p className="mt-2 text-[13px] text-ink-soft">{error ?? "Unknown"}</p>
        <button
          onClick={regenerate}
          className="mt-4 bg-ink text-paper px-4 py-2 text-[12px]"
        >
          {L.regenerate}
        </button>
      </div>
    );
  }

  const programSigned = !!program?.signed_by;
  const summary = locale === "es" ? panel.summary_es : panel.summary_en;

  return (
    <>
      {/* Headline ---------------------------------------------------- */}
      <section className="mt-2 border border-ink bg-paper-raised">
        <div className="px-6 md:px-10 py-8 grid grid-cols-12 gap-x-10">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow eyebrow-accent">{L.heroEyebrow}</p>
            <h2 className="mt-4 editorial text-[26px] md:text-[32px] leading-[1.15] text-ink">
              {summary}
            </h2>
            <p className="mt-4 text-[12px] text-ink-mute italic">
              {L.projectionCaveat}
            </p>
          </div>
          <aside className="col-span-12 lg:col-span-4 mt-6 lg:mt-0">
            <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-[11px]">
              <div>
                <dt className="eyebrow">{L.horizon}</dt>
                <dd className="mt-2 editorial text-[17px] text-ink tabular">
                  {panel.horizon_weeks} {L.weeks}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">{L.programStatus}</dt>
                <dd
                  className={`mt-2 editorial text-[13px] tabular tracking-wide uppercase ${
                    programSigned ? "text-accent" : "text-ink-mute"
                  }`}
                >
                  {programSigned ? L.programSigned : L.programMissing}
                </dd>
              </div>
              {overall && (
                <>
                  <div>
                    <dt className="eyebrow">{L.pre}</dt>
                    <dd className="mt-2 editorial text-[17px] text-ink tabular">
                      {overall.pre.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">{L.post}</dt>
                    <dd className="mt-2 editorial text-[17px] text-accent tabular">
                      {overall.post.toFixed(1)}{" "}
                      <span className="text-[11px] text-ink-mute">
                        · {L.deltaLabel}{" "}
                        {overall.post - overall.pre >= 0 ? "+" : ""}
                        {(overall.post - overall.pre).toFixed(1)}
                      </span>
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </aside>
        </div>
      </section>

      {/* Dimension summary ------------------------------------------- */}
      {dimensionDeltas && (
        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {(
            ["mastery", "interoception", "perceived_options"] as const
          ).map((dim) => {
            const delta = dimensionDeltas[dim];
            const items = panel.items.filter((i) => i.dimension === dim);
            const preAvg = averageValue(items, "pre");
            const postAvg = averageValue(items, "post");
            return (
              <div
                key={dim}
                className="border border-rule bg-paper-raised px-5 py-5"
              >
                <p className="eyebrow">{L.dimensions[dim]}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="editorial text-[22px] text-ink tabular">
                    {preAvg.toFixed(1)}{" "}
                    <span className="text-ink-mute text-[14px]">→</span>{" "}
                    <span className="text-accent">{postAvg.toFixed(1)}</span>
                  </span>
                  <span
                    className={`tabular text-[12px] tracking-wide ${
                      delta > 0 ? "text-accent" : "text-ink-mute"
                    }`}
                  >
                    {L.deltaLabel} {delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)}
                  </span>
                </div>
                {/* Bar visual */}
                <div className="mt-4 space-y-1.5">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                        {L.pre}
                      </span>
                      <span className="tabular text-[10px] text-ink-mute">
                        {preAvg.toFixed(1)} / 5
                      </span>
                    </div>
                    <div className="mt-1 h-[4px] bg-paper-soft overflow-hidden">
                      <div
                        className="h-full bg-ink-quiet"
                        style={{ width: `${(preAvg / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] tabular tracking-wide uppercase text-accent">
                        {L.post}
                      </span>
                      <span className="tabular text-[10px] text-accent">
                        {postAvg.toFixed(1)} / 5
                      </span>
                    </div>
                    <div className="mt-1 h-[4px] bg-paper-soft overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${(postAvg / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Items table ------------------------------------------------- */}
      <section className="mt-10 border border-ink bg-paper-raised">
        <header className="px-6 py-4 border-b border-rule flex items-baseline justify-between">
          <p className="eyebrow">{L.items}</p>
          <button
            onClick={regenerate}
            className="text-[10.5px] tabular tracking-[0.14em] uppercase text-ink-mute hover:text-accent transition-colors"
          >
            ↻ {L.regenerate}
          </button>
        </header>
        <ul className="divide-y divide-rule">
          {panel.items.map((it) => {
            const delta = it.post - it.pre;
            return (
              <li key={it.id} className="px-6 py-5 grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <p className="tabular text-[10px] tracking-[0.14em] uppercase text-ink-mute">
                    {it.id} · {L.dimensions[it.dimension]}
                  </p>
                  <p className="mt-1 editorial text-[15px] text-ink leading-snug">
                    {it.prompt}
                  </p>
                  <p className="mt-2 text-[11.5px] text-ink-quiet italic leading-snug">
                    <span className="not-italic text-ink-mute tabular uppercase tracking-wide text-[9.5px]">
                      pre
                    </span>{" "}
                    · {it.rationale_pre}
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink-quiet italic leading-snug">
                    <span className="not-italic text-ink-mute tabular uppercase tracking-wide text-[9.5px]">
                      post
                    </span>{" "}
                    · {it.rationale_post}
                  </p>
                </div>
                <div className="col-span-12 md:col-span-6 space-y-3 self-center">
                  {/* Pre bar */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] tabular tracking-wide uppercase text-ink-mute">
                        {L.pre}
                      </span>
                      <span className="tabular text-[11px] text-ink-mute">
                        {it.pre.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1 h-[6px] bg-paper-soft overflow-hidden">
                      <div
                        className="h-full bg-ink-quiet transition-all duration-500"
                        style={{ width: `${(it.pre / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                  {/* Post bar */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] tabular tracking-wide uppercase text-accent">
                        {L.post}
                      </span>
                      <span className="tabular text-[11px] text-accent">
                        {it.post.toFixed(1)}
                        <span className="text-ink-mute">
                          {" "}
                          · {L.deltaLabel} {delta >= 0 ? "+" : ""}
                          {delta.toFixed(1)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-[6px] bg-paper-soft overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-700"
                        style={{ width: `${(it.post / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <footer className="px-6 py-3 border-t border-rule text-[10.5px] italic text-ink-mute">
          {L.publicDomainNote}
        </footer>
      </section>

      {/* Footer nav -------------------------------------------------- */}
      <section className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-rule pt-10 text-[13px]">
        <Link
          href={locale === "es" ? "/session/result?lang=es" : "/session/result"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Regresar" : "Back"}</p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goResult}</p>
        </Link>
        <Link
          href={
            locale === "es" ? "/session/program?lang=es" : "/session/program"
          }
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Output 4" : "Output 4"}</p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goProgram}</p>
        </Link>
        <Link
          href={locale === "es" ? "/network?lang=es" : "/network"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Red" : "Network"}</p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goNetwork}</p>
        </Link>
        <Link
          href={locale === "es" ? "/?lang=es" : "/"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Tesis" : "Thesis"}</p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goHome}</p>
        </Link>
      </section>
    </>
  );
}
