"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClinicalPosterior, DualRender } from "@/lib/clinical-schema";

type Payload = {
  posterior: ClinicalPosterior;
  render: DualRender;
  locale: "en" | "es";
};

type LoadState = "loading" | "loaded" | "empty";

function isValidPayload(x: unknown): x is Payload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    !!o.posterior &&
    !!o.render &&
    typeof o.render === "object" &&
    !!(o.render as Record<string, unknown>).patient &&
    !!(o.render as Record<string, unknown>).clinician &&
    (o.locale === "en" || o.locale === "es")
  );
}

export default function ResultClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("inferentia:last_session");
      if (!raw) {
        setLoadState("empty");
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (isValidPayload(parsed)) {
        setPayload(parsed);
        setLoadState("loaded");
      } else {
        // Stale / malformed payload (e.g., from a previous deploy with a different schema)
        setLoadState("empty");
      }
    } catch {
      setLoadState("empty");
    }
  }, []);

  if (loadState === "loading") {
    return (
      <div className="mt-10 max-w-[60ch]">
        <p className="eyebrow">
          {initialLocale === "es" ? "Cargando sesión" : "Loading session"}
        </p>
        <p className="mt-3 text-[13px] italic text-ink-mute">
          {initialLocale === "es"
            ? "Preparando la vista…"
            : "Preparing the view…"}
        </p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mt-10 border border-rule bg-paper-raised p-8 max-w-[60ch]">
        <p className="editorial text-[18px] text-ink">
          {initialLocale === "es"
            ? "No hay sesión disponible."
            : "No session available."}
        </p>
        <p className="mt-3 text-[13px] text-ink-soft">
          {initialLocale === "es"
            ? "Ejecuta una sesión primero — regresa a /session y completa el flujo."
            : "Run a session first — go back to /session and complete the flow."}
        </p>
        <Link
          href={initialLocale === "es" ? "/session?lang=es" : "/session"}
          className="mt-5 inline-flex bg-ink text-paper px-4 py-2 text-[12px] tracking-wide"
        >
          ← /session
        </Link>
      </div>
    );
  }

  // URL locale overrides the one persisted at render-time so the LocaleToggle
  // on this page stays meaningful (otherwise the page would ignore the toggle).
  // The render itself was composed in payload.locale — it won't re-translate,
  // but every UI label around it responds to initialLocale.
  const { render, posterior } = payload;
  const locale = initialLocale;

  return (
    <>
      {/* Headline — thesis-first, carries the story --------------- */}
      <section className="mt-2 border border-ink bg-paper-raised">
        <div className="px-6 md:px-10 py-8 grid grid-cols-12 gap-x-10">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow eyebrow-accent">
              {locale === "es"
                ? "Narrativa generada por Opus 4.7"
                : "Narrative composed by Opus 4.7"}
            </p>
            <h2 className="mt-4 editorial text-[30px] md:text-[38px] leading-[1.1] text-ink">
              {render.patient.headline}
            </h2>
          </div>
          <aside className="col-span-12 lg:col-span-4 mt-6 lg:mt-0">
            <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-[11px]">
              <div>
                <dt className="eyebrow">
                  {locale === "es" ? "Impronta dominante" : "Dominant imprint"}
                </dt>
                <dd className="mt-2 editorial text-[17px] text-accent">
                  {posterior.dominant_imprint.toUpperCase()} ·{" "}
                  {
                    posterior.imprint_posterior.find(
                      (i) => i.id === posterior.dominant_imprint,
                    )?.name
                  }
                </dd>
              </div>
              <div>
                <dt className="eyebrow">
                  {locale === "es" ? "Confianza" : "Confidence"}
                </dt>
                <dd className="mt-2 editorial text-[17px] text-ink tabular">
                  {(posterior.confidence * 100).toFixed(0)}%
                </dd>
              </div>
              <div>
                <dt className="eyebrow">
                  {locale === "es" ? "Δ energía libre" : "Free-energy Δ"}
                </dt>
                <dd className="mt-2 editorial text-[17px] text-ink tabular">
                  {(posterior.free_energy_delta_estimate * 100).toFixed(0)}%
                </dd>
              </div>
              <div>
                <dt className="eyebrow">
                  {locale === "es" ? "Priors" : "Priors"}
                </dt>
                <dd className="mt-2 editorial text-[17px] text-ink tabular">
                  {posterior.active_priors.length}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      {/* Split screen — patient | clinician ----------------------- */}
      <section className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient view ------------------------------------------- */}
        <article className="border border-rule bg-paper-raised">
          <header className="px-6 py-4 border-b border-rule flex items-center justify-between">
            <div>
              <p className="eyebrow eyebrow-accent">
                {locale === "es" ? "Vista paciente" : "Patient view"}
              </p>
              <p className="mt-1 text-[11px] text-ink-mute">
                Opus 4.7 · {locale === "es" ? "registro acceso" : "access register"}
              </p>
            </div>
          </header>
          <div className="px-6 py-6 space-y-4">
            {render.patient.body_paragraphs.map((para, i) => (
              <p
                key={i}
                className="text-[14.5px] leading-[1.65] text-ink-soft"
              >
                {para}
              </p>
            ))}
            <div className="mt-6 border-t border-rule pt-5">
              <p className="editorial italic text-[17px] text-accent leading-snug">
                {render.patient.invitation}
              </p>
            </div>
            {render.patient.modulators_summary.length > 0 && (
              <div className="mt-6 border-t border-rule pt-5 space-y-3">
                <p className="eyebrow">
                  {locale === "es" ? "Moléculas sugeridas" : "Suggested molecules"}
                </p>
                {render.patient.modulators_summary.map((m) => (
                  <div key={m.name} className="flex items-baseline gap-4">
                    <p className="editorial text-[14px] text-ink w-[40%]">
                      {m.name}
                    </p>
                    <p className="text-[12px] text-ink-quiet leading-snug">
                      {m.plain_benefit}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Clinician view ----------------------------------------- */}
        <article className="border border-ink bg-paper-raised">
          <header className="px-6 py-4 border-b border-rule flex items-center justify-between">
            <div>
              <p className="eyebrow">
                {locale === "es" ? "Vista clínico" : "Clinician view"}
              </p>
              <p className="mt-1 text-[11px] text-ink-mute">
                Opus 4.7 ·{" "}
                {locale === "es" ? "registro técnico" : "technical register"}
              </p>
            </div>
          </header>
          <div className="px-6 py-6 space-y-5">
            <div>
              <p className="eyebrow">
                {locale === "es" ? "Resumen clínico" : "Clinical summary"}
              </p>
              <p className="mt-2 text-[13px] leading-[1.6] text-ink-soft">
                {render.clinician.clinical_summary}
              </p>
            </div>

            <div>
              <p className="eyebrow">
                {locale === "es" ? "Priors activos" : "Active priors"}
              </p>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {render.clinician.active_priors_technical.map((p) => (
                  <li key={p.id} className="py-2.5">
                    <div className="flex items-baseline justify-between">
                      <p className="editorial text-[13px] text-ink">{p.label}</p>
                      <span className="tabular text-[11px] text-accent">
                        {(p.strength * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-quiet leading-snug">
                      {p.clinical_meaning}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow">
                {locale === "es" ? "Diferencial" : "Differential"}
              </p>
              <p className="mt-2 text-[12.5px] text-ink-soft leading-[1.55] italic">
                {render.clinician.differential}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="eyebrow">
                  {locale === "es" ? "Panel labs" : "Lab panel"}
                </p>
                <ul className="mt-2 space-y-2">
                  {render.clinician.lab_panel.map((l) => (
                    <li key={l.marker} className="text-[12px]">
                      <span className="tabular text-ink font-medium">
                        {l.marker}
                      </span>
                      <span className="text-ink-quiet"> · {l.rationale}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">
                  {locale === "es" ? "Panel genético" : "Genetic panel"}
                </p>
                <ul className="mt-2 space-y-2">
                  {render.clinician.genetic_panel.map((g) => (
                    <li key={g.rsid} className="text-[12px]">
                      <span className="tabular text-accent font-medium">
                        {g.rsid}
                      </span>{" "}
                      <span className="text-ink-soft">{g.gene}</span>
                      <span className="text-ink-quiet"> · {g.clinical_action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <p className="eyebrow">
                {locale === "es" ? "Protocolo" : "Protocol"}
              </p>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {render.clinician.protocol.map((p) => (
                  <li key={p.molecule} className="py-2.5 flex items-baseline gap-4">
                    <p className="editorial text-[14px] text-ink w-[34%]">
                      {p.molecule}
                    </p>
                    <div className="flex-1 text-[12px] text-ink-soft leading-snug">
                      <span className="text-ink">{p.target_node}</span>
                      <span className="text-ink-quiet"> · {p.dosage_comment}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {render.clinician.flags.length > 0 && (
              <div className="border-l-2 border-danger pl-4 py-2">
                <p className="eyebrow" style={{ color: "#8A2C1B" }}>
                  {locale === "es" ? "Banderas" : "Flags"}
                </p>
                <ul className="mt-2 space-y-1">
                  {render.clinician.flags.map((f, i) => (
                    <li key={i} className="text-[12px] text-ink-soft">
                      · {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </article>
      </section>

      {/* Footer strip: navigation ---------------------------------- */}
      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-rule pt-10 text-[13px]">
        <Link
          href={locale === "es" ? "/network?lang=es" : "/network"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Ver en la red" : "See on the network"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es"
              ? "Los nodos activos del paciente ↗"
              : "Patient's active nodes ↗"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/session?lang=es" : "/session"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Nueva sesión" : "New session"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Reiniciar el flujo ↗" : "Restart the flow ↗"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/?lang=es" : "/"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Tesis" : "Thesis"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Volver a Inferentia ↗" : "Back to Inferentia ↗"}
          </p>
        </Link>
      </section>
    </>
  );
}
