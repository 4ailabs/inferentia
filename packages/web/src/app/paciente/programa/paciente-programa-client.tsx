"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NutritionalProgram } from "@/lib/clinical-schema";
import { STORAGE_KEYS, readStored, subscribeSharedState } from "@/lib/role";

type LoadState = "loading" | "unsigned" | "signed" | "empty";

export default function PacienteProgramaClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [state, setState] = useState<LoadState>("loading");
  const [program, setProgram] = useState<NutritionalProgram | null>(null);

  useEffect(() => {
    const load = () => {
      const p = readStored<NutritionalProgram>(STORAGE_KEYS.program);
      if (!p) {
        setState("empty");
        setProgram(null);
        return;
      }
      setProgram(p);
      if (p.signed_by && p.signed_at) {
        setState("signed");
      } else {
        setState("unsigned");
      }
    };
    load();
    return subscribeSharedState((key) => {
      if (key === STORAGE_KEYS.program) load();
    });
  }, []);

  const L =
    locale === "es"
      ? {
          emptyTitle: "Tu clínico aún no ha preparado tu programa.",
          emptyBody:
            "Cuando tu clínico termine de componerlo y lo firme, aparecerá aquí.",
          unsignedTitle: "Tu programa está en borrador.",
          unsignedBody:
            "Tu clínico aún no lo firma. Nada aparece hasta que lo firme.",
          signedBadge: "Firmado por tu clínico",
          signedOn: "el",
          backToLobby: "← Tu espacio",
          emphasise: "Alimentos para enfatizar",
          reduce: "Alimentos para reducir",
          rhythms: "Ritmos",
          experiments: "Experimentos de flexibilidad",
          days: "días",
          goLobby: "← Tu espacio",
          goResult: "Tu lectura ↗",
          goAgency: "Tu evolución esperada ↗",
          disclaimer:
            "Este programa es una hipótesis revisada y firmada por tu clínico. Hablen antes de hacer cambios.",
        }
      : {
          emptyTitle: "Your clinician hasn't prepared your program yet.",
          emptyBody:
            "Once your clinician has composed and signed it, it will appear here.",
          unsignedTitle: "Your program is in draft.",
          unsignedBody:
            "Your clinician hasn't signed it yet. Nothing appears until they do.",
          signedBadge: "Signed by your clinician",
          signedOn: "on",
          backToLobby: "← Your space",
          emphasise: "Foods to emphasise",
          reduce: "Foods to reduce",
          rhythms: "Rhythms",
          experiments: "Flexibility experiments",
          days: "days",
          goLobby: "← Your space",
          goResult: "Your reading ↗",
          goAgency: "Your expected trajectory ↗",
          disclaimer:
            "This program is a hypothesis reviewed and signed by your clinician. Talk with them before making changes.",
        };

  if (state === "loading") {
    return (
      <div className="mt-10">
        <p className="eyebrow">{locale === "es" ? "Cargando" : "Loading"}</p>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="mt-10 border border-rule bg-paper-raised p-8 max-w-[60ch]">
        <p className="editorial text-[20px] text-ink">{L.emptyTitle}</p>
        <p className="mt-3 text-[13px] text-ink-soft">{L.emptyBody}</p>
        <Link
          href={locale === "es" ? "/paciente?lang=es" : "/paciente"}
          className="mt-5 inline-flex bg-ink text-paper px-4 py-2 text-[12px] tracking-wide"
        >
          {L.backToLobby}
        </Link>
      </div>
    );
  }

  // Unsigned — gate active, do not render any program content.
  if (state === "unsigned") {
    return (
      <div className="mt-10 border-2 border-accent bg-paper-raised p-8 max-w-[60ch]">
        <p className="eyebrow eyebrow-accent">
          {locale === "es" ? "En espera" : "Waiting"}
        </p>
        <p className="mt-4 editorial text-[22px] text-ink leading-tight">
          {L.unsignedTitle}
        </p>
        <p className="mt-4 text-[14px] text-ink-soft leading-relaxed">
          {L.unsignedBody}
        </p>
        <Link
          href={locale === "es" ? "/paciente?lang=es" : "/paciente"}
          className="mt-6 inline-flex bg-ink text-paper px-4 py-2 text-[12px] tracking-wide"
        >
          {L.backToLobby}
        </Link>
      </div>
    );
  }

  if (!program || !program.signed_by || !program.signed_at) return null;
  const signedDate = new Date(program.signed_at).toLocaleDateString(
    locale === "es" ? "es-ES" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  return (
    <>
      {/* Signature seal ----------------------------------------- */}
      <section className="mt-2 border-2 border-ink bg-paper-raised px-6 py-5">
        <p className="eyebrow eyebrow-accent">{L.signedBadge}</p>
        <p className="mt-2 editorial italic text-[20px] text-accent">
          {program.signed_by}
        </p>
        <p className="mt-1 text-[11px] tabular text-ink-mute">
          {L.signedOn} {signedDate}
        </p>
      </section>

      {/* Headline ----------------------------------------------- */}
      <section className="mt-8">
        <h1 className="editorial text-[28px] md:text-[36px] leading-[1.1] text-ink">
          {program.headline}
        </h1>
      </section>

      {/* Foods emphasise ---------------------------------------- */}
      <section className="mt-12">
        <p className="eyebrow">{L.emphasise}</p>
        <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {program.foods_emphasise.map((f) => (
            <li key={f.name} className="border-b border-rule pb-3">
              <p className="editorial text-[17px] text-ink">{f.name}</p>
              <p className="mt-1 text-[13px] text-ink-soft leading-snug">
                {f.why}
              </p>
              {f.when && (
                <p className="mt-1 text-[11.5px] italic text-ink-quiet">
                  · {f.when}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Foods reduce ------------------------------------------- */}
      {program.foods_reduce.length > 0 && (
        <section className="mt-10">
          <p className="eyebrow">{L.reduce}</p>
          <ul className="mt-4 space-y-2 max-w-[68ch]">
            {program.foods_reduce.map((f) => (
              <li key={f.name} className="text-[13.5px]">
                <span className="editorial text-[15px] text-ink">{f.name}</span>
                <span className="text-ink-quiet"> · {f.why}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Rhythms ------------------------------------------------ */}
      <section className="mt-10">
        <p className="eyebrow">{L.rhythms}</p>
        <ol className="mt-4 space-y-3 max-w-[68ch] list-decimal list-inside">
          {program.rhythms.map((r) => (
            <li key={r.title} className="text-[14px] text-ink-soft">
              <span className="editorial text-ink">{r.title}</span>
              <span className="block ml-6 mt-0.5 text-[13px]">
                {r.instruction}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Experiments ------------------------------------------- */}
      <section className="mt-10">
        <p className="eyebrow">{L.experiments}</p>
        <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {program.flexibility_experiments.map((e) => (
            <li
              key={e.title}
              className="border border-rule px-4 py-3 bg-paper-soft"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="editorial text-[15px] text-ink">{e.title}</p>
                <span className="tabular text-[10.5px] text-ink-mute">
                  {e.duration_days} {L.days}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-ink-soft leading-snug italic">
                {e.prompt}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 border-t border-rule pt-6 text-[12px] italic text-ink-mute max-w-[64ch]">
        {L.disclaimer}
      </p>

      {/* Footer nav -------------------------------------------- */}
      <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 text-[13px]">
        <Link
          href={locale === "es" ? "/paciente?lang=es" : "/paciente"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Regresar" : "Back"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goLobby}</p>
        </Link>
        <Link
          href={locale === "es" ? "/paciente/resultado?lang=es" : "/paciente/resultado"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Tu lectura" : "Your reading"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goResult}</p>
        </Link>
        <Link
          href={locale === "es" ? "/paciente/agencia?lang=es" : "/paciente/agencia"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Evolución" : "Trajectory"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goAgency}</p>
        </Link>
      </section>
    </>
  );
}
