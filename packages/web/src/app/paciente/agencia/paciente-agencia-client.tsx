"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AgencyItem, AgencyPanel } from "@/lib/clinical-schema";
import { STORAGE_KEYS, readStored, subscribeSharedState } from "@/lib/role";

type LoadState = "loading" | "ready" | "empty";

function averageValue(items: AgencyItem[], which: "pre" | "post") {
  if (items.length === 0) return 0;
  return items.reduce((s, i) => s + i[which], 0) / items.length;
}

export default function PacienteAgenciaClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [state, setState] = useState<LoadState>("loading");
  const [panel, setPanel] = useState<AgencyPanel | null>(null);

  useEffect(() => {
    const load = () => {
      const p = readStored<AgencyPanel>(STORAGE_KEYS.panel);
      if (p) {
        setPanel(p);
        setState("ready");
      } else {
        setState("empty");
      }
    };
    load();
    return subscribeSharedState((key) => {
      if (key === STORAGE_KEYS.panel) load();
    });
  }, []);

  const L =
    locale === "es"
      ? {
          emptyTitle: "Tu clínico aún no prepara tu panel.",
          emptyBody:
            "Cuando tu clínico cierre la sesión, aquí verás cómo se espera que evolucione tu sistema.",
          backToLobby: "← Tu espacio",
          eyebrow: "Tu evolución esperada",
          now: "Ahora",
          projection: "En unas semanas",
          weeks: "semanas",
          horizon: "horizonte",
          dimensions: {
            mastery: "Dominio sobre lo que te pasa",
            interoception: "Escucha de tu cuerpo",
            perceived_options: "Caminos que puedes ver",
          },
          disclaimer:
            "Esto es una proyección basada en el programa que tu clínico firmó. No es una promesa; es una hipótesis de cómo podría moverse tu sistema.",
          goLobby: "← Tu espacio",
          goProgram: "Tu programa ↗",
          goResult: "Tu lectura ↗",
        }
      : {
          emptyTitle: "Your clinician hasn't prepared your panel yet.",
          emptyBody:
            "Once your clinician closes the session, you'll see here how your system is expected to move.",
          backToLobby: "← Your space",
          eyebrow: "Your expected trajectory",
          now: "Now",
          projection: "In a few weeks",
          weeks: "weeks",
          horizon: "horizon",
          dimensions: {
            mastery: "Mastery over what happens to you",
            interoception: "Listening to your body",
            perceived_options: "Paths you can see",
          },
          disclaimer:
            "This is a projection based on the program your clinician signed. It is not a promise; it is a hypothesis of how your system might move.",
          goLobby: "← Your space",
          goProgram: "Your program ↗",
          goResult: "Your reading ↗",
        };

  const summary = useMemo(() => {
    if (!panel) return "";
    return locale === "es" ? panel.summary_es : panel.summary_en;
  }, [panel, locale]);

  if (state === "loading") {
    return (
      <div className="mt-10">
        <p className="eyebrow">{locale === "es" ? "Cargando" : "Loading"}</p>
      </div>
    );
  }

  if (!panel) {
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

  return (
    <>
      {/* Headline ----------------------------------------------- */}
      <section className="mt-2">
        <p className="eyebrow eyebrow-accent">{L.eyebrow}</p>
        <h1 className="mt-4 editorial text-[28px] md:text-[36px] leading-[1.1] text-ink max-w-[48ch]">
          {summary}
        </h1>
        <p className="mt-4 text-[12px] italic text-ink-mute">
          {L.horizon}: {panel.horizon_weeks} {L.weeks}
        </p>
      </section>

      {/* Three dimension cards ---------------------------------- */}
      <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        {(["mastery", "interoception", "perceived_options"] as const).map(
          (dim) => {
            const items = panel.items.filter((i) => i.dimension === dim);
            const preAvg = averageValue(items, "pre");
            const postAvg = averageValue(items, "post");
            return (
              <div
                key={dim}
                className="border border-rule bg-paper-raised px-5 py-5"
              >
                <p className="eyebrow">{L.dimensions[dim]}</p>
                <div className="mt-5 space-y-2.5">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] tabular tracking-wide uppercase text-ink-mute">
                        {L.now}
                      </span>
                    </div>
                    <div className="mt-1 h-[8px] bg-paper-soft overflow-hidden">
                      <div
                        className="h-full bg-ink-quiet transition-all duration-500"
                        style={{ width: `${(preAvg / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] tabular tracking-wide uppercase text-accent">
                        {L.projection}
                      </span>
                    </div>
                    <div className="mt-1 h-[8px] bg-paper-soft overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-700"
                        style={{ width: `${(postAvg / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          },
        )}
      </section>

      {/* Per-item listing (only prompts, no rationale) ----------- */}
      <section className="mt-12 border-t border-rule pt-8">
        <p className="eyebrow">
          {locale === "es" ? "En detalle" : "In detail"}
        </p>
        <ul className="mt-5 space-y-5">
          {panel.items.map((it) => (
            <li key={it.id} className="grid grid-cols-12 gap-4 items-center">
              <p className="col-span-12 md:col-span-7 editorial text-[15px] text-ink-soft leading-snug">
                {it.prompt}
              </p>
              <div className="col-span-12 md:col-span-5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-[64px] text-[10px] tabular tracking-wide uppercase text-ink-mute">
                    {L.now}
                  </span>
                  <div className="flex-1 h-[5px] bg-paper-soft overflow-hidden">
                    <div
                      className="h-full bg-ink-quiet"
                      style={{ width: `${(it.pre / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-[64px] text-[10px] tabular tracking-wide uppercase text-accent">
                    {L.projection}
                  </span>
                  <div className="flex-1 h-[5px] bg-paper-soft overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(it.post / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 border-t border-rule pt-6 text-[12px] italic text-ink-mute max-w-[64ch]">
        {L.disclaimer}
      </p>

      {/* Footer nav --------------------------------------------- */}
      <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 text-[13px]">
        <Link
          href={locale === "es" ? "/paciente?lang=es" : "/paciente"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">{locale === "es" ? "Regresar" : "Back"}</p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goLobby}</p>
        </Link>
        <Link
          href={locale === "es" ? "/paciente/programa?lang=es" : "/paciente/programa"}
          className="border border-rule bg-paper-raised px-5 py-4 hover:border-ink transition-colors"
        >
          <p className="eyebrow">
            {locale === "es" ? "Tu programa" : "Your program"}
          </p>
          <p className="mt-2 editorial text-[16px] text-ink">{L.goProgram}</p>
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
      </section>
    </>
  );
}
