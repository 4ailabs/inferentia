"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  ClinicalPosterior,
  DualRender,
  NutritionalProgram,
} from "@/lib/clinical-schema";
import { STORAGE_KEYS, readStored, subscribeSharedState } from "@/lib/role";

type SessionPayload = {
  posterior: ClinicalPosterior;
  render: DualRender;
  locale: "en" | "es";
};

type LobbyState = {
  hasSession: boolean;
  programSigned: boolean;
};

export default function PacienteLobbyClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [state, setState] = useState<LobbyState>({
    hasSession: false,
    programSigned: false,
  });

  useEffect(() => {
    const refresh = () => {
      const session = readStored<SessionPayload>(STORAGE_KEYS.session);
      const program = readStored<NutritionalProgram>(STORAGE_KEYS.program);
      setState({
        hasSession: !!session?.render?.patient,
        programSigned:
          !!program?.signed_by && !!program?.signed_at,
      });
    };
    refresh();
    return subscribeSharedState((key) => {
      if (
        key === STORAGE_KEYS.session ||
        key === STORAGE_KEYS.program ||
        key === STORAGE_KEYS.panel
      ) {
        refresh();
      }
    });
  }, []);

  const L =
    locale === "es"
      ? {
          available: "Disponible",
          waiting: "Esperando a tu clínico",
          readingTitle: "Tu lectura",
          readingBody:
            "Narrativa humana de lo que tu sistema está anticipando.",
          programTitle: "Tu programa",
          programBody:
            "Alimentos, ritmos, experimentos. Sólo aparece cuando tu clínico lo firma.",
          agencyTitle: "Tu evolución esperada",
          agencyBody:
            "Cómo proyectamos que cambien tu dominio, tu señal interoceptiva y tus opciones percibidas.",
          enter: "Entrar →",
          waitReading:
            "Tu clínico aún no ha terminado la sesión.",
          waitProgram:
            "Tu clínico aún no firma el programa.",
        }
      : {
          available: "Available",
          waiting: "Waiting for your clinician",
          readingTitle: "Your reading",
          readingBody:
            "Plain-language narrative of what your system is anticipating.",
          programTitle: "Your program",
          programBody:
            "Foods, rhythms, experiments. Appears only when your clinician signs it.",
          agencyTitle: "Your expected trajectory",
          agencyBody:
            "How we project your mastery, interoception, and perceived options to shift.",
          enter: "Enter →",
          waitReading:
            "Your clinician hasn't finished the session yet.",
          waitProgram: "Your clinician hasn't signed the program yet.",
        };

  type Card = {
    key: string;
    href: string;
    title: string;
    body: string;
    ready: boolean;
    waitingMsg?: string;
  };

  const cards: Card[] = [
    {
      key: "resultado",
      href: locale === "es" ? "/paciente/resultado?lang=es" : "/paciente/resultado",
      title: L.readingTitle,
      body: L.readingBody,
      ready: state.hasSession,
      waitingMsg: L.waitReading,
    },
    {
      key: "programa",
      href: locale === "es" ? "/paciente/programa?lang=es" : "/paciente/programa",
      title: L.programTitle,
      body: L.programBody,
      ready: state.programSigned,
      waitingMsg: L.waitProgram,
    },
    {
      key: "agencia",
      href: locale === "es" ? "/paciente/agencia?lang=es" : "/paciente/agencia",
      title: L.agencyTitle,
      body: L.agencyBody,
      ready: state.hasSession,
      waitingMsg: L.waitReading,
    },
  ];

  return (
    <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((c) =>
        c.ready ? (
          <Link
            key={c.key}
            href={c.href}
            className="border border-rule bg-paper-raised px-5 py-5 hover:border-ink transition-colors"
          >
            <p className="eyebrow eyebrow-accent">{L.available}</p>
            <p className="mt-3 editorial text-[19px] text-ink leading-tight">
              {c.title}
            </p>
            <p className="mt-3 text-[12.5px] text-ink-soft leading-snug">
              {c.body}
            </p>
            <p className="mt-5 text-[13px] text-accent">{L.enter}</p>
          </Link>
        ) : (
          <div
            key={c.key}
            className="border border-rule bg-paper-soft px-5 py-5 opacity-70"
          >
            <p className="eyebrow text-ink-mute">{L.waiting}</p>
            <p className="mt-3 editorial text-[19px] text-ink-quiet leading-tight">
              {c.title}
            </p>
            <p className="mt-3 text-[12.5px] text-ink-mute leading-snug">
              {c.body}
            </p>
            <p className="mt-5 text-[11.5px] italic text-ink-mute">
              {c.waitingMsg}
            </p>
          </div>
        ),
      )}
    </section>
  );
}
