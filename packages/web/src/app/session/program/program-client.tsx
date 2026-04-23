"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
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

function isValidSessionPayload(x: unknown): x is SessionPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    !!o.posterior &&
    !!o.render &&
    (o.locale === "en" || o.locale === "es")
  );
}

export default function ProgramClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [posterior, setPosterior] = useState<ClinicalPosterior | null>(null);
  const [program, setProgram] = useState<NutritionalProgram | null>(null);
  const [signer, setSigner] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const locale = initialLocale;
  const L =
    locale === "es"
      ? {
          emptyTitle: "No hay sesión disponible.",
          emptyBody:
            "Ejecuta una sesión primero — regresa a /session y completa el flujo.",
          backToSession: "← /session",
          loading: "Preparando el programa…",
          composing: "Sonnet 4.6 está componiendo el programa…",
          regenerate: "Re-componer programa",
          patientTitle: "Vista paciente",
          patientSub: "Programa firmado por tu clínico",
          clinicianTitle: "Vista clínico",
          clinicianSub: "Borrador editable · justificación molecular",
          imprint: "Impronta dominante",
          headline: "Titular del programa",
          emphasise: "Alimentos a enfatizar",
          reduce: "Alimentos a reducir",
          rhythms: "Ritmos",
          experiments: "Experimentos de flexibilidad",
          molecularRationale: "Racional molecular",
          cautions: "Precauciones",
          clinicianNotes: "Notas clínicas",
          days: "días",
          signerPlaceholder: "Tu nombre y credencial",
          signButton: "Firmar programa",
          signed: "Firmado por",
          unsign: "Retirar firma",
          signedAtLabel: "el",
          draftBadge: "BORRADOR — sin firma",
          signedBadge: "FIRMADO",
          goAgency: "Panel de agencia ↗",
          goResult: "← Volver al resultado",
        }
      : {
          emptyTitle: "No session available.",
          emptyBody:
            "Run a session first — go back to /session and complete the flow.",
          backToSession: "← /session",
          loading: "Preparing the program…",
          composing: "Sonnet 4.6 is composing the program…",
          regenerate: "Re-compose program",
          patientTitle: "Patient view",
          patientSub: "Program signed by your clinician",
          clinicianTitle: "Clinician view",
          clinicianSub: "Editable draft · molecular rationale",
          imprint: "Dominant imprint",
          headline: "Program headline",
          emphasise: "Foods to emphasise",
          reduce: "Foods to reduce",
          rhythms: "Rhythms",
          experiments: "Flexibility experiments",
          molecularRationale: "Molecular rationale",
          cautions: "Cautions",
          clinicianNotes: "Clinician notes",
          days: "days",
          signerPlaceholder: "Your name and credential",
          signButton: "Sign program",
          signed: "Signed by",
          unsign: "Remove signature",
          signedAtLabel: "on",
          draftBadge: "DRAFT — unsigned",
          signedBadge: "SIGNED",
          goAgency: "Agency panel ↗",
          goResult: "← Back to result",
        };

  // Compose the program on mount. If a program is cached in sessionStorage
  // with the same patient_id we reuse it — keeps signature state across
  // accidental reloads.
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

        // Reuse cached program if it matches this session
        const cachedRaw = sessionStorage.getItem(PROGRAM_KEY);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw) as NutritionalProgram;
            if (cached.patient_id === parsed.posterior.patient_id) {
              setProgram(cached);
              setLoadState("ready");
              return;
            }
          } catch {
            // ignore and recompose
          }
        }

        const res = await fetch("/api/program", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            posterior: parsed.posterior,
            locale,
          }),
        });
        const j = await res.json();
        if (!res.ok || !j.ok) {
          setError(j.error ?? `status ${res.status}`);
          setLoadState("error");
          return;
        }
        setProgram(j.program as NutritionalProgram);
        sessionStorage.setItem(PROGRAM_KEY, JSON.stringify(j.program));
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
      const res = await fetch("/api/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ posterior, locale }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? `status ${res.status}`);
        setLoadState("error");
        return;
      }
      const next = j.program as NutritionalProgram;
      setProgram(next);
      sessionStorage.setItem(PROGRAM_KEY, JSON.stringify(next));
      setLoadState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoadState("error");
    }
  }, [posterior, locale]);

  const sign = useCallback(() => {
    if (!program || !signer.trim()) return;
    const now = new Date().toISOString();
    const next: NutritionalProgram = {
      ...program,
      signed_by: signer.trim(),
      signed_at: now,
    };
    setProgram(next);
    sessionStorage.setItem(PROGRAM_KEY, JSON.stringify(next));
  }, [program, signer]);

  const unsign = useCallback(() => {
    if (!program) return;
    const next: NutritionalProgram = {
      ...program,
      signed_by: null,
      signed_at: null,
    };
    setProgram(next);
    setSigner("");
    sessionStorage.setItem(PROGRAM_KEY, JSON.stringify(next));
  }, [program]);

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
          {locale === "es"
            ? "Aterrizando las reglas a la impronta dominante."
            : "Grounding rules in the dominant imprint."}
        </p>
      </div>
    );
  }

  if (loadState === "error" || !program) {
    return (
      <div className="mt-10 border border-danger bg-paper-raised p-6 max-w-[60ch]">
        <p className="eyebrow" style={{ color: "#8A2C1B" }}>
          {locale === "es" ? "Error" : "Error"}
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

  const isSigned = !!program.signed_by && !!program.signed_at;
  const signedDate = program.signed_at
    ? new Date(program.signed_at).toLocaleDateString(
        locale === "es" ? "es-ES" : "en-US",
        { year: "numeric", month: "short", day: "numeric" },
      )
    : "";

  return (
    <>
      {/* Headline ---------------------------------------------------- */}
      <section className="mt-2 border border-ink bg-paper-raised">
        <div className="px-6 md:px-10 py-8 grid grid-cols-12 gap-x-10">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow eyebrow-accent">
              {locale === "es"
                ? "Output 4 · Programa Nutricional Salutogénico"
                : "Output 4 · Salutogenic Nutritional Program"}
            </p>
            <h2 className="mt-4 editorial text-[26px] md:text-[32px] leading-[1.15] text-ink">
              {program.headline}
            </h2>
          </div>
          <aside className="col-span-12 lg:col-span-4 mt-6 lg:mt-0">
            <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-[11px]">
              <div>
                <dt className="eyebrow">{L.imprint}</dt>
                <dd className="mt-2 editorial text-[17px] text-accent">
                  {program.imprint_id.toUpperCase()} · {program.imprint_name}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">
                  {locale === "es" ? "Estado" : "Status"}
                </dt>
                <dd
                  className={`mt-2 editorial text-[13px] tabular tracking-wide uppercase ${
                    isSigned ? "text-accent" : "text-ink-mute"
                  }`}
                >
                  {isSigned ? L.signedBadge : L.draftBadge}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      {/* Split: patient | clinician --------------------------------- */}
      <section className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ───── PATIENT VIEW ─────────────────────────────────────── */}
        <article className="border border-rule bg-paper-raised">
          <header className="px-6 py-4 border-b border-rule flex items-baseline justify-between">
            <div>
              <p className="eyebrow eyebrow-accent">{L.patientTitle}</p>
              <p className="mt-1 text-[11px] text-ink-mute">{L.patientSub}</p>
            </div>
            {isSigned ? (
              <span className="tabular text-[10px] tracking-[0.18em] uppercase text-accent">
                {L.signedBadge}
              </span>
            ) : (
              <span className="tabular text-[10px] tracking-[0.18em] uppercase text-ink-mute">
                {L.draftBadge}
              </span>
            )}
          </header>

          {!isSigned && (
            <div className="mx-6 mt-5 border-l-2 border-accent pl-4 py-2 text-[12px] text-ink-soft">
              {locale === "es"
                ? "Tu clínico aún no ha firmado. Esta es una versión preliminar."
                : "Your clinician has not signed yet. This is a preliminary version."}
            </div>
          )}

          <div className="px-6 py-6 space-y-6">
            <div>
              <p className="eyebrow">{L.emphasise}</p>
              <ul className="mt-3 space-y-2.5">
                {program.foods_emphasise.map((f) => (
                  <li
                    key={f.name}
                    className="border-b border-rule pb-2 last:border-b-0"
                  >
                    <p className="editorial text-[15px] text-ink">{f.name}</p>
                    <p className="mt-1 text-[12.5px] text-ink-soft leading-snug">
                      {f.why}
                    </p>
                    {f.when && (
                      <p className="mt-1 text-[11px] italic text-ink-quiet">
                        · {f.when}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow">{L.reduce}</p>
              <ul className="mt-3 space-y-2">
                {program.foods_reduce.map((f) => (
                  <li key={f.name} className="text-[12.5px] leading-snug">
                    <span className="editorial text-[14px] text-ink">
                      {f.name}
                    </span>
                    <span className="text-ink-quiet"> · {f.why}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow">{L.rhythms}</p>
              <ol className="mt-3 space-y-2.5 list-decimal list-inside">
                {program.rhythms.map((r) => (
                  <li key={r.title} className="text-[13px] text-ink-soft">
                    <span className="editorial text-ink">{r.title}</span>
                    <span className="block ml-5 mt-0.5 text-[12.5px] text-ink-soft leading-snug">
                      {r.instruction}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="eyebrow">{L.experiments}</p>
              <ul className="mt-3 space-y-3">
                {program.flexibility_experiments.map((e) => (
                  <li
                    key={e.title}
                    className="border border-rule px-4 py-3 bg-paper-soft"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="editorial text-[14px] text-ink">{e.title}</p>
                      <span className="tabular text-[10.5px] text-ink-mute">
                        {e.duration_days} {L.days}
                      </span>
                    </div>
                    <p className="mt-2 text-[12.5px] text-ink-soft leading-snug italic">
                      {e.prompt}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Signature block (visible to patient when signed) ----- */}
            {isSigned && (
              <div className="mt-6 border-t-2 border-ink pt-5">
                <p className="eyebrow eyebrow-accent">
                  {locale === "es" ? "Firma clínica" : "Clinician signature"}
                </p>
                <p className="mt-3 editorial text-[16px] italic text-accent">
                  {program.signed_by}
                </p>
                <p className="mt-1 text-[11px] tabular tracking-wide text-ink-mute">
                  {L.signedAtLabel} {signedDate}
                </p>
              </div>
            )}
          </div>
        </article>

        {/* ───── CLINICIAN VIEW ────────────────────────────────────── */}
        <article className="border border-ink bg-paper-raised">
          <header className="px-6 py-4 border-b border-rule flex items-baseline justify-between">
            <div>
              <p className="eyebrow">{L.clinicianTitle}</p>
              <p className="mt-1 text-[11px] text-ink-mute">
                Sonnet 4.6 · {L.clinicianSub}
              </p>
            </div>
            <button
              onClick={regenerate}
              className="text-[10.5px] tabular tracking-[0.14em] uppercase text-ink-mute hover:text-accent transition-colors"
            >
              ↻ {L.regenerate}
            </button>
          </header>

          <div className="px-6 py-6 space-y-6">
            <div>
              <p className="eyebrow">{L.molecularRationale}</p>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {program.molecular_rationale.map((m) => (
                  <li key={m.target_node} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="editorial text-[14px] text-ink">
                        {m.target_node}
                      </p>
                      <p className="tabular text-[11px] text-accent">
                        {m.molecules.join(" · ")}
                      </p>
                    </div>
                    <p className="mt-1.5 text-[12px] text-ink-quiet leading-snug">
                      {m.mechanism}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow">{L.clinicianNotes}</p>
              <p className="mt-2 text-[13px] leading-[1.55] text-ink-soft italic">
                {program.clinician_notes}
              </p>
            </div>

            {program.cautions.length > 0 && (
              <div className="border-l-2 border-danger pl-4 py-2">
                <p className="eyebrow" style={{ color: "#8A2C1B" }}>
                  {L.cautions}
                </p>
                <ul className="mt-2 space-y-1">
                  {program.cautions.map((c, i) => (
                    <li key={i} className="text-[12px] text-ink-soft">
                      · {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Signature controls --------------------------------- */}
            <div className="border-t-2 border-ink pt-5">
              <p className="eyebrow eyebrow-accent">
                {locale === "es" ? "Firma clínica" : "Clinician signature"}
              </p>
              {isSigned ? (
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <div>
                    <p className="editorial text-[16px] italic text-accent">
                      {program.signed_by}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular text-ink-mute">
                      {L.signedAtLabel} {signedDate}
                    </p>
                  </div>
                  <button
                    onClick={unsign}
                    className="text-[11px] text-ink-mute underline decoration-rule underline-offset-4 hover:text-danger"
                  >
                    {L.unsign}
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex items-stretch gap-2">
                  <input
                    type="text"
                    value={signer}
                    onChange={(e) => setSigner(e.target.value)}
                    placeholder={L.signerPlaceholder}
                    className="flex-1 border border-rule bg-paper px-3 py-2 text-[13px] text-ink focus:border-accent outline-none"
                  />
                  <button
                    onClick={sign}
                    disabled={!signer.trim()}
                    className="bg-accent text-paper px-4 py-2 text-[12px] tracking-wide hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {L.signButton}
                  </button>
                </div>
              )}
              <p className="mt-3 text-[10.5px] italic text-ink-mute">
                {locale === "es"
                  ? "Hackathon MVP · firma guardada localmente. Fase 2 usa log de auditoría."
                  : "Hackathon MVP · signature stored locally. Fase 2 uses an audit log."}
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Footer navigation ------------------------------------------ */}
      <section className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-rule pt-10 text-[13px]">
        <Link
          href={locale === "es" ? "/session/agency?lang=es" : "/session/agency"}
          className="border-2 border-ink bg-paper-raised px-5 py-4 hover:border-accent transition-colors"
        >
          <p className="eyebrow eyebrow-accent">
            {locale === "es" ? "Siguiente paso" : "Next step"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Panel de agencia ↗" : "Agency panel ↗"}
          </p>
          <p className="mt-1 text-[11px] text-ink-mute">
            {locale === "es"
              ? "Output 5 · outcome primario"
              : "Output 5 · primary outcome"}
          </p>
        </Link>
        <Link
          href={locale === "es" ? "/session/result?lang=es" : "/session/result"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Regresar" : "Back"}</p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goResult}</p>
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
      </section>
    </>
  );
}
