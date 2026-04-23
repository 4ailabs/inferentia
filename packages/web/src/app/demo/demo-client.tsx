"use client";

import { useState } from "react";

type Stage =
  | "sesion"
  | "resultado"
  | "programa"
  | "agencia";

const CLINICO_ROUTES: Record<Stage, string> = {
  sesion: "/clinico/sesion",
  resultado: "/clinico/resultado",
  programa: "/clinico/programa",
  agencia: "/clinico/agencia",
};

const PACIENTE_ROUTES: Record<Stage, string> = {
  sesion: "/paciente",
  resultado: "/paciente/resultado",
  programa: "/paciente/programa",
  agencia: "/paciente/agencia",
};

export default function DemoClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const [stage, setStage] = useState<Stage>("sesion");
  const locale = initialLocale;
  const lang = locale === "es" ? "?lang=es" : "";

  const L =
    locale === "es"
      ? {
          stageLabel: "Etapa",
          stages: {
            sesion: "Entrevista",
            resultado: "Resultado",
            programa: "Programa",
            agencia: "Agencia",
          },
          clinico: "Clínico",
          paciente: "Paciente",
          hint: "Actúa en la pestaña clínica. Los cambios firmados aparecen en la vista paciente en tiempo real.",
        }
      : {
          stageLabel: "Stage",
          stages: {
            sesion: "Interview",
            resultado: "Result",
            programa: "Program",
            agencia: "Agency",
          },
          clinico: "Clinician",
          paciente: "Patient",
          hint: "Act on the clinician side. Signed changes appear on the patient side in real time.",
        };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Stage selector ------------------------------------------ */}
      <nav className="shrink-0 border-b border-rule bg-paper-soft">
        <div className="mx-auto max-w-[2200px] px-6 md:px-10 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="eyebrow text-ink-mute">{L.stageLabel}</span>
            <div className="flex items-center gap-1">
              {(["sesion", "resultado", "programa", "agencia"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    className={`px-3 py-1 tabular tracking-[0.12em] uppercase text-[10.5px] transition-colors ${
                      stage === s
                        ? "bg-ink text-paper"
                        : "border border-rule text-ink-mute hover:border-ink"
                    }`}
                  >
                    {L.stages[s]}
                  </button>
                ),
              )}
            </div>
          </div>
          <p className="text-[11px] italic text-ink-mute max-w-[60ch] text-right">
            {L.hint}
          </p>
        </div>
      </nav>

      {/* Split canvas ------------------------------------------- */}
      <div className="flex-1 grid grid-cols-2 min-h-0">
        <div className="flex flex-col min-h-0 border-r-2 border-ink">
          <div className="shrink-0 bg-ink text-paper px-5 py-2 text-[11px] tabular tracking-[0.18em] uppercase flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            {L.paciente}
            <span className="opacity-60 text-[10px]">
              · {PACIENTE_ROUTES[stage]}
            </span>
          </div>
          <iframe
            src={`${PACIENTE_ROUTES[stage]}${lang}`}
            className="flex-1 w-full bg-paper"
            title="Patient window"
          />
        </div>
        <div className="flex flex-col min-h-0">
          <div className="shrink-0 bg-accent text-paper px-5 py-2 text-[11px] tabular tracking-[0.18em] uppercase flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-paper animate-pulse" />
            {L.clinico}
            <span className="opacity-80 text-[10px]">
              · {CLINICO_ROUTES[stage]}
            </span>
          </div>
          <iframe
            src={`${CLINICO_ROUTES[stage]}${lang}`}
            className="flex-1 w-full bg-paper"
            title="Clinician window"
          />
        </div>
      </div>
    </div>
  );
}
