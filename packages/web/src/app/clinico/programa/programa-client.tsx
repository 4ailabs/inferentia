"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  ClinicalPosterior,
  DualRender,
  NutritionalProgram,
} from "@/lib/clinical-schema";
import {
  STORAGE_KEYS,
  readStored,
  subscribeSharedState,
  writeStored,
} from "@/lib/role";

type SessionPayload = {
  posterior: ClinicalPosterior;
  render: DualRender;
  locale: "en" | "es";
};

type LoadState = "loading" | "ready" | "empty" | "error";

function isValidSessionPayload(x: unknown): x is SessionPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    !!o.posterior &&
    !!o.render &&
    (o.locale === "en" || o.locale === "es")
  );
}

export default function ProgramaClient({
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
            "Corre /clinico/sesion primero para generar el posterior.",
          backToSession: "← /clinico/sesion",
          composing: "Sonnet 4.6 está componiendo el borrador…",
          composingSub:
            "Aterrizando reglas en la impronta dominante del posterior.",
          regenerate: "Re-componer borrador",
          heroEyebrow: "Output 4 · Borrador clínico",
          imprint: "Impronta dominante",
          status: "Estado",
          draftBadge: "BORRADOR",
          signedBadge: "FIRMADO",
          emphasise: "Alimentos a enfatizar",
          reduce: "Alimentos a reducir",
          rhythms: "Ritmos",
          experiments: "Experimentos de flexibilidad",
          molecularRationale: "Racional molecular",
          cautions: "Precauciones",
          clinicianNotes: "Notas clínicas",
          days: "días",
          signatureTitle: "Firma clínica",
          signerPlaceholder: "Tu nombre y credencial",
          signButton: "Firmar y publicar al paciente",
          signedOn: "Firmado el",
          unsign: "Retirar firma",
          patientHint:
            "Al firmar, el paciente ve la versión final en su pestaña. Sin firma no ve nada.",
          hackathonNote:
            "Hackathon MVP · firma en localStorage compartido entre pestañas. Fase 2 = audit log real.",
          goAgency: "Panel de agencia ↗",
          goResult: "← Volver al resultado",
        }
      : {
          emptyTitle: "No session available.",
          emptyBody: "Run /clinico/sesion first to generate the posterior.",
          backToSession: "← /clinico/sesion",
          composing: "Sonnet 4.6 is composing the draft…",
          composingSub:
            "Grounding rules in the posterior's dominant imprint.",
          regenerate: "Re-compose draft",
          heroEyebrow: "Output 4 · Clinical draft",
          imprint: "Dominant imprint",
          status: "Status",
          draftBadge: "DRAFT",
          signedBadge: "SIGNED",
          emphasise: "Foods to emphasise",
          reduce: "Foods to reduce",
          rhythms: "Rhythms",
          experiments: "Flexibility experiments",
          molecularRationale: "Molecular rationale",
          cautions: "Cautions",
          clinicianNotes: "Clinician notes",
          days: "days",
          signatureTitle: "Clinician signature",
          signerPlaceholder: "Your name and credential",
          signButton: "Sign and publish to patient",
          signedOn: "Signed on",
          unsign: "Remove signature",
          patientHint:
            "On signing, the patient sees the final version in their window. Until then they see nothing.",
          hackathonNote:
            "Hackathon MVP · signature in shared localStorage across tabs. Fase 2 = real audit log.",
          goAgency: "Agency panel ↗",
          goResult: "← Back to result",
        };

  useEffect(() => {
    const load = async () => {
      const session = readStored<SessionPayload>(STORAGE_KEYS.session);
      if (!session || !isValidSessionPayload(session)) {
        setLoadState("empty");
        return;
      }
      setPosterior(session.posterior);

      const cached = readStored<NutritionalProgram>(STORAGE_KEYS.program);
      if (cached && cached.patient_id === session.posterior.patient_id) {
        setProgram(cached);
        setLoadState("ready");
        return;
      }

      try {
        const res = await fetch("/api/program", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            posterior: session.posterior,
            locale,
          }),
        });
        const j = await res.json();
        if (!res.ok || !j.ok) {
          setError(j.error ?? `status ${res.status}`);
          setLoadState("error");
          return;
        }
        setProgram(j.program);
        writeStored(STORAGE_KEYS.program, j.program);
        setLoadState("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoadState("error");
      }
    };
    load();
    return subscribeSharedState((key) => {
      if (key === STORAGE_KEYS.program) {
        const next = readStored<NutritionalProgram>(STORAGE_KEYS.program);
        if (next) setProgram(next);
      }
    });
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
      setProgram(j.program);
      writeStored(STORAGE_KEYS.program, j.program);
      setLoadState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoadState("error");
    }
  }, [posterior, locale]);

  const sign = useCallback(() => {
    if (!program || !signer.trim()) return;
    const next: NutritionalProgram = {
      ...program,
      signed_by: signer.trim(),
      signed_at: new Date().toISOString(),
    };
    setProgram(next);
    writeStored(STORAGE_KEYS.program, next);
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
    writeStored(STORAGE_KEYS.program, next);
  }, [program]);

  if (loadState === "empty") {
    return (
      <div className="mt-10 border border-rule bg-paper-raised p-8 max-w-[60ch]">
        <p className="editorial text-[18px] text-ink">{L.emptyTitle}</p>
        <p className="mt-3 text-[13px] text-ink-soft">{L.emptyBody}</p>
        <Link
          href={locale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="mt-5 inline-flex bg-ink text-paper px-4 py-2 text-[12px] tracking-wide"
        >
          {L.backToSession}
        </Link>
      </div>
    );
  }

  if (loadState === "loading" || !program) {
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

  if (loadState === "error") {
    return (
      <div className="mt-10 border border-danger bg-paper-raised p-6 max-w-[60ch]">
        <p className="eyebrow" style={{ color: "#8A2C1B" }}>Error</p>
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
      {/* Hero ---------------------------------------------------- */}
      <section className="mt-2 border border-ink bg-paper-raised">
        <div className="px-6 md:px-10 py-8 grid grid-cols-12 gap-x-10">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow eyebrow-accent">{L.heroEyebrow}</p>
            <h2 className="mt-4 editorial text-[26px] md:text-[32px] leading-[1.15] text-ink">
              {program.headline}
            </h2>
            <p className="mt-4 text-[12px] italic text-ink-mute">
              {L.patientHint}
            </p>
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
                <dt className="eyebrow">{L.status}</dt>
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

      {/* Draft body (editable-view, not edit-in-place for MVP) ---- */}
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-rule bg-paper-raised px-5 py-5">
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

        <div className="border border-rule bg-paper-raised px-5 py-5 space-y-5">
          <div>
            <p className="eyebrow">{L.reduce}</p>
            <ul className="mt-2 space-y-1.5 text-[12.5px]">
              {program.foods_reduce.map((f) => (
                <li key={f.name}>
                  <span className="editorial text-[14px] text-ink">{f.name}</span>
                  <span className="text-ink-quiet"> · {f.why}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">{L.rhythms}</p>
            <ol className="mt-2 space-y-2 list-decimal list-inside text-[13px]">
              {program.rhythms.map((r) => (
                <li key={r.title} className="text-ink-soft">
                  <span className="editorial text-ink">{r.title}</span>
                  <span className="block ml-5 mt-0.5 text-[12.5px]">
                    {r.instruction}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mt-8 border border-rule bg-paper-raised px-6 py-5">
        <p className="eyebrow">{L.experiments}</p>
        <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
      </section>

      {/* Clinician block: rationale + cautions + signature --------- */}
      <section className="mt-8 border border-ink bg-paper-raised">
        <header className="px-6 py-4 border-b border-rule flex items-baseline justify-between">
          <p className="eyebrow">
            {locale === "es" ? "Bloque clínico" : "Clinician block"}
          </p>
          <button
            onClick={regenerate}
            className="text-[10.5px] tabular tracking-[0.14em] uppercase text-ink-mute hover:text-accent transition-colors"
          >
            ↻ {L.regenerate}
          </button>
        </header>
        <div className="px-6 py-5 space-y-6">
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
                  <li key={i} className="text-[12px] text-ink-soft">· {c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Signature */}
          <div className="border-t-2 border-ink pt-5">
            <p className="eyebrow eyebrow-accent">{L.signatureTitle}</p>
            {isSigned ? (
              <div className="mt-3 flex items-baseline justify-between gap-4">
                <div>
                  <p className="editorial text-[16px] italic text-accent">
                    {program.signed_by}
                  </p>
                  <p className="mt-0.5 text-[11px] tabular text-ink-mute">
                    {L.signedOn} {signedDate}
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
              {L.hackathonNote}
            </p>
          </div>
        </div>
      </section>

      {/* Footer nav --------------------------------------------- */}
      <section className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-rule pt-10 text-[13px]">
        <Link
          href={locale === "es" ? "/clinico/agencia?lang=es" : "/clinico/agencia"}
          className="border-2 border-ink bg-paper-raised px-5 py-4 hover:border-accent transition-colors"
        >
          <p className="eyebrow eyebrow-accent">
            {locale === "es" ? "Siguiente" : "Next"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goAgency}</p>
        </Link>
        <Link
          href={locale === "es" ? "/clinico/resultado?lang=es" : "/clinico/resultado"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Regresar" : "Back"}</p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goResult}</p>
        </Link>
        <Link
          href={locale === "es" ? "/clinico/sesion?lang=es" : "/clinico/sesion"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Nueva sesión" : "New session"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">
            {locale === "es" ? "Reiniciar ↗" : "Restart ↗"}
          </p>
        </Link>
      </section>
    </>
  );
}
