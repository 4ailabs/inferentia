"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClinicalPosterior, DualRender } from "@/lib/clinical-schema";
import { STORAGE_KEYS, readStored, subscribeSharedState } from "@/lib/role";

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

export default function ResultadoClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const load = () => {
      const stored = readStored<Payload>(STORAGE_KEYS.session);
      if (stored && isValidPayload(stored)) {
        setPayload(stored);
        setLoadState("loaded");
      } else {
        setLoadState("empty");
      }
    };
    load();
    return subscribeSharedState((key) => {
      if (key === STORAGE_KEYS.session) load();
    });
  }, []);

  if (loadState === "loading") {
    return (
      <div className="mt-10 max-w-[60ch]">
        <p className="eyebrow">
          {initialLocale === "es" ? "Cargando sesión" : "Loading session"}
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
            ? "Ejecuta una sesión primero — regresa a /clinico/sesion y completa el flujo."
            : "Run a session first — go back to /clinico/sesion and complete the flow."}
        </p>
        <Link
          href={initialLocale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="mt-5 inline-flex bg-ink text-paper px-4 py-2 text-[12px] tracking-wide"
        >
          ← /clinico/sesion
        </Link>
      </div>
    );
  }

  const { render, posterior } = payload;
  const locale = initialLocale;

  return (
    <>
      {/* Headline — clinician register ------------------------------ */}
      <section className="mt-2 border border-ink bg-paper-raised">
        <div className="px-6 md:px-10 py-8 grid grid-cols-12 gap-x-10">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow eyebrow-accent">
              {locale === "es"
                ? "Opus 4.7 · Registro técnico"
                : "Opus 4.7 · Technical register"}
            </p>
            <h2 className="mt-4 editorial text-[26px] md:text-[32px] leading-[1.1] text-ink">
              {render.clinician.clinical_summary}
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

      {/* Safety banner when applicable ----------------------------- */}
      {posterior.safety_priority !== "none" && (
        <section
          className={`mt-6 border px-6 py-4 bg-paper-raised ${
            posterior.safety_priority === "critical"
              ? "border-danger"
              : "border-accent"
          }`}
        >
          <p
            className="eyebrow"
            style={{
              color:
                posterior.safety_priority === "critical" ? "#8A2C1B" : undefined,
            }}
          >
            {posterior.safety_priority === "critical"
              ? locale === "es"
                ? "Prioridad de seguridad — crítica"
                : "Safety priority — critical"
              : locale === "es"
                ? "Prioridad de seguridad — elevada"
                : "Safety priority — elevated"}
          </p>
          {posterior.safety_rationale && (
            <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">
              {posterior.safety_rationale}
            </p>
          )}
        </section>
      )}

      {/* Clinician view (full) ------------------------------------- */}
      <section className="mt-10 border border-rule bg-paper-raised">
        <header className="px-6 py-4 border-b border-rule">
          <p className="eyebrow">
            {locale === "es" ? "Vista clínico" : "Clinician view"}
          </p>
          <p className="mt-1 text-[11px] text-ink-mute">
            {locale === "es"
              ? "El paciente ve una versión paralela en su pestaña."
              : "The patient sees a parallel version in their window."}
          </p>
        </header>
        <div className="px-6 md:px-10 py-8 space-y-7">
          <div>
            <p className="eyebrow">
              {locale === "es" ? "Priors activos" : "Active priors"}
            </p>
            <ul className="mt-2 divide-y divide-rule border-y border-rule">
              {render.clinician.active_priors_technical.map((p) => (
                <li key={p.id} className="py-2.5">
                  <div className="flex items-baseline justify-between">
                    <p className="editorial text-[14px] text-ink">{p.label}</p>
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

          {posterior.discordances && posterior.discordances.length > 0 && (
            <div>
              <p className="eyebrow">
                {locale === "es"
                  ? "Labs vs firma esperada"
                  : "Labs vs expected signature"}
              </p>
              <ul className="mt-2 space-y-2">
                {posterior.discordances.map((d) => {
                  const isDiscordant = d.direction !== "concordant";
                  return (
                    <li
                      key={d.marker}
                      className={`py-2 px-3 text-[12px] border ${
                        isDiscordant
                          ? "border-danger bg-danger/5"
                          : "border-rule"
                      }`}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="tabular font-medium text-ink">
                          {d.marker}
                        </span>
                        <span
                          className={`tabular text-[11px] ${
                            isDiscordant ? "text-danger" : "text-ink-quiet"
                          }`}
                        >
                          {d.measured} · expected {d.expected_low}–
                          {d.expected_high}
                          {isDiscordant && (
                            <>
                              {" "}
                              · {d.direction === "above_expected" ? "↑" : "↓"}
                            </>
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-ink-quiet leading-snug">
                        {d.clinical_note}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {posterior.soft_flags && posterior.soft_flags.length > 0 && (
            <div className="border-l-2 border-accent pl-4 py-2">
              <p className="eyebrow eyebrow-accent">
                {locale === "es" ? "Caveats" : "Caveats"}
              </p>
              <ul className="mt-2 space-y-1">
                {posterior.soft_flags.map((f, i) => (
                  <li key={i} className="text-[12px] text-ink-soft">
                    · {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                <li
                  key={p.molecule}
                  className="py-2.5 flex items-baseline gap-4"
                >
                  <p className="editorial text-[14px] text-ink w-[34%]">
                    {p.molecule}
                  </p>
                  <div className="flex-1 text-[12px] text-ink-soft leading-snug">
                    <span className="text-ink">{p.target_node}</span>
                    <span className="text-ink-quiet">
                      {" "}
                      · {p.dosage_comment}
                    </span>
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
      </section>

      {/* Footer: next steps in clinician arc ----------------------- */}
      <section className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-rule pt-10 text-[13px]">
        <Link
          href={locale === "es" ? "/clinico/programa?lang=es" : "/clinico/programa"}
          className="border-2 border-ink bg-paper-raised px-5 py-4 hover:border-accent transition-colors"
        >
          <p className="eyebrow eyebrow-accent">
            {locale === "es" ? "Siguiente paso" : "Next step"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es"
              ? "Programa nutricional ↗"
              : "Nutritional program ↗"}
          </p>
          <p className="mt-1 text-[11px] text-ink-mute">
            {locale === "es" ? "Borrador editable + firma" : "Editable draft + sign"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/clinico/agencia?lang=es" : "/clinico/agencia"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Outcome primario" : "Primary outcome"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Panel de agencia ↗" : "Agency panel ↗"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Nueva sesión" : "New session"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Reiniciar el flujo ↗" : "Restart the flow ↗"}
          </p>
        </Link>
      </section>
    </>
  );
}
