"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DualRender } from "@/lib/clinical-schema";
import { STORAGE_KEYS, readStored, subscribeSharedState } from "@/lib/role";

type SessionPayload = {
  posterior: unknown;
  render: DualRender;
  locale: "en" | "es";
};

type LoadState = "loading" | "ready" | "empty";

export default function PacienteResultadoClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [state, setState] = useState<LoadState>("loading");
  const [render, setRender] = useState<DualRender | null>(null);

  useEffect(() => {
    const load = () => {
      const session = readStored<SessionPayload>(STORAGE_KEYS.session);
      if (session?.render?.patient) {
        setRender(session.render);
        setState("ready");
      } else {
        setState("empty");
      }
    };
    load();
    return subscribeSharedState((key) => {
      if (key === STORAGE_KEYS.session) load();
    });
  }, []);

  const L =
    locale === "es"
      ? {
          emptyTitle: "Tu clínico aún no termina la sesión.",
          emptyBody:
            "Cuando tu clínico cierre la entrevista y sintetice tu lectura, aparecerá aquí.",
          backToLobby: "← Tu espacio",
          eyebrow: "Tu lectura",
          kicker: "Compuesto para ti",
          suggestedMolecules: "Moléculas que tu clínico consideró",
          invitation: "Una invitación",
          goLobby: "← Tu espacio",
          goProgram: "Tu programa ↗",
          goAgency: "Tu evolución esperada ↗",
        }
      : {
          emptyTitle: "Your clinician hasn't finished the session yet.",
          emptyBody:
            "Once your clinician closes the interview and synthesises your reading, it will appear here.",
          backToLobby: "← Your space",
          eyebrow: "Your reading",
          kicker: "Composed for you",
          suggestedMolecules: "Molecules your clinician considered",
          invitation: "An invitation",
          goLobby: "← Your space",
          goProgram: "Your program ↗",
          goAgency: "Your expected trajectory ↗",
        };

  if (state === "loading") {
    return (
      <div className="mt-10">
        <p className="eyebrow">{locale === "es" ? "Cargando" : "Loading"}</p>
      </div>
    );
  }

  if (!render) {
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

  const view = render.patient;

  return (
    <>
      <section className="mt-2">
        <p className="eyebrow eyebrow-accent">{L.kicker}</p>
        <h1 className="mt-4 editorial text-[30px] md:text-[40px] leading-[1.1] text-ink">
          {view.headline}
        </h1>
      </section>

      <section className="mt-10 space-y-6 max-w-[68ch]">
        {view.body_paragraphs.map((p, i) => (
          <p key={i} className="text-[16px] leading-[1.7] text-ink-soft">
            {p}
          </p>
        ))}
      </section>

      <section className="mt-12 border-t border-rule pt-8">
        <p className="eyebrow">{L.invitation}</p>
        <p className="mt-3 editorial italic text-[22px] leading-snug text-accent max-w-[58ch]">
          {view.invitation}
        </p>
      </section>

      {view.modulators_summary.length > 0 && (
        <section className="mt-12 border-t border-rule pt-8">
          <p className="eyebrow">{L.suggestedMolecules}</p>
          <ul className="mt-5 space-y-4 max-w-[68ch]">
            {view.modulators_summary.map((m) => (
              <li
                key={m.name}
                className="flex items-baseline gap-5 border-b border-rule pb-3 last:border-b-0"
              >
                <p className="editorial text-[17px] text-ink w-[35%]">
                  {m.name}
                </p>
                <p className="flex-1 text-[13.5px] text-ink-quiet leading-snug">
                  {m.plain_benefit}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-rule pt-10 text-[13px]">
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
          href={locale === "es" ? "/paciente/programa?lang=es" : "/paciente/programa"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Continuar" : "Continue"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goProgram}</p>
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
