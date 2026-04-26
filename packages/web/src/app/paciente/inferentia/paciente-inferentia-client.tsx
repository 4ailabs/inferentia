"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PredictiveBodyMap } from "@/components/predictive-body-map";
import type { ImprintId } from "@/lib/math/sensations";

const STORAGE_KEY = "inferentia:last-orchestration";

const IMPRINT_NAMES_ES: Record<string, string> = {
  i1: "Invasión",
  i2: "Escasez",
  i3: "Carga",
  i4: "Traición",
  i5: "Exposición",
  i6: "Confusión",
  i7: "Aplastamiento",
  i8: "Reserva",
  i9: "Abandono",
  i10: "Rechazo",
  i11: "Fracaso",
  i12: "Pérdida",
  i13: "Aniquilación",
};

// Traducciones humanas de jerga técnica del JSON del Orchestrator
const HUMAN_LABELS: Record<string, { es: string; en: string }> = {
  inflammation_control: {
    es: "inflamación del cuerpo",
    en: "body inflammation",
  },
  insulin_sensitivity: {
    es: "cómo el cuerpo usa el azúcar",
    en: "how the body uses sugar",
  },
  fatty_acid_oxidation: {
    es: "cómo el cuerpo quema grasa",
    en: "how the body burns fat",
  },
  lipid_distribution: {
    es: "cómo se distribuye la grasa",
    en: "how fat is distributed",
  },
  satiety: {
    es: "la señal de saciedad",
    en: "satiety signalling",
  },
  insulin_production: {
    es: "la fábrica de insulina",
    en: "insulin production",
  },
  autonomic_flexibility: {
    es: "el sistema de calma y alerta",
    en: "calm and alert system",
  },
  predictive_agency: {
    es: "tu capacidad de revisar lo que asumes del mundo",
    en: "your capacity to revise what you assume about the world",
  },
};

type Snapshot = {
  savedAt: number;
  caseLabel?: string;
  imprintId?: ImprintId;
  imprintName?: string;
  primaryLeverage?: string;
  freeEnergyReleasedPct?: number;
  horizonWeeks?: number;
  narrative?: string;
  level1Primary?: Array<{
    id: string;
    dose?: string;
    timing?: string;
    rationale?: string;
  }>;
  foodFirst?: string[];
  monitoringBiomarkers?: string[];
  sequencing?: Record<string, string>;
  confidence?: string;
};

export default function PacienteInferentiaClient({
  initialLocale,
}: {
  initialLocale: "en" | "es";
}) {
  const locale = initialLocale;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Snapshot;
        setSnapshot(parsed);
      }
    } catch {
      // corrupt — ignorar
    }
    setHydrated(true);
  }, []);

  const L =
    locale === "es"
      ? {
          title: "Tu lectura personal",
          sub: "Esto es lo que el análisis de hoy vio en ti. Está escrito pensando en que lo leas tú, no un médico.",
          noData:
            "Aún no hay ninguna lectura guardada para ti. Pide a tu clínico que complete el análisis en su consola y te lo envíe.",
          waitingClinician: "Esperando a tu clínico",
          fromClinician: "Lectura recibida del clínico",
          savedAt: "Enviada",
          section_map: "Lo que el mapa encontró",
          section_meaning: "Cómo leerlo",
          section_priority: "En qué nos concentramos primero",
          section_whatfirst: "Qué vas a notar primero",
          section_plan: "Tus próximas semanas",
          section_food: "Alimentos que trabajan contigo",
          section_followup: "Cómo sabremos que funciona",
          section_note: "Un recordatorio importante",
          noteText:
            "Esto no es un diagnóstico médico. Es una lectura de asistencia clínica que tu médico usó para diseñar el plan. Cualquier cambio en tus medicamentos o tratamientos se decide con tu clínico.",
          howRead:
            "Tu cuerpo aprendió ciertas formas de protegerse hace mucho tiempo. Hoy algunas de ellas ya no te sirven. El plan de abajo es para ayudarle a soltar despacio, sin que sienta amenaza.",
          priorityIntro: "Lo primero a calmar es",
          weeksPrefix: "Semanas",
          confidenceHigh: "El análisis tiene mucha confianza en esta lectura.",
          confidenceModerate:
            "El análisis tiene una confianza media. Hay señales claras pero conviene afinar con tu clínico en sesión.",
          confidenceLow:
            "Esta lectura es preliminar. Requiere más conversación con tu clínico antes de actuar.",
          backToLobby: "Volver a tu espacio",
          refresh: "Actualizar",
        }
      : {
          title: "Your personal reading",
          sub: "This is what today's analysis saw in you. It is written so you can read it — not a physician.",
          noData:
            "There is no reading saved for you yet. Ask your clinician to complete the analysis in their console and send it to you.",
          waitingClinician: "Waiting for your clinician",
          fromClinician: "Reading received from clinician",
          savedAt: "Sent",
          section_map: "What the map found",
          section_meaning: "How to read it",
          section_priority: "What we focus on first",
          section_whatfirst: "What you'll feel first",
          section_plan: "Your next weeks",
          section_food: "Food that works with you",
          section_followup: "How we'll know it is working",
          section_note: "An important reminder",
          noteText:
            "This is not a medical diagnosis. It is a clinical-assist reading that your clinician used to design the plan. Any change in medication or treatment is decided with your clinician.",
          howRead:
            "Your body learned certain ways of protecting itself a long time ago. Some of them no longer serve you today. The plan below helps it let them go slowly, without feeling threatened.",
          priorityIntro: "The first thing to calm is",
          weeksPrefix: "Weeks",
          confidenceHigh: "The analysis has strong confidence in this reading.",
          confidenceModerate:
            "The analysis has moderate confidence. Signals are clear but worth refining with your clinician in session.",
          confidenceLow:
            "This reading is preliminary. It needs more conversation with your clinician before acting.",
          backToLobby: "Back to your space",
          refresh: "Refresh",
        };

  if (!hydrated) {
    return (
      <div className="py-20 text-center text-[13px] text-ink-mute italic">
        {locale === "es" ? "Cargando…" : "Loading…"}
      </div>
    );
  }

  if (!snapshot) {
    return (
      <section className="py-16 max-w-[56ch]">
        <p className="eyebrow eyebrow-accent">{L.waitingClinician}</p>
        <h1 className="mt-4 editorial text-[28px] md:text-[36px] leading-[1.1] text-ink">
          {L.title}
        </h1>
        <p className="mt-5 editorial-italic text-[15px] text-ink-soft leading-[1.6]">
          {L.noData}
        </p>
        <div className="mt-8 flex items-center gap-4 text-[12.5px]">
          <Link
            href={`/paciente${locale === "es" ? "?lang=es" : ""}`}
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            ← {L.backToLobby}
          </Link>
          <button
            onClick={() => location.reload()}
            className="text-ink-mute underline decoration-rule underline-offset-4 hover:decoration-ink hover:text-ink"
          >
            ↻ {L.refresh}
          </button>
        </div>
      </section>
    );
  }

  const primaryLabel = snapshot.primaryLeverage
    ? HUMAN_LABELS[snapshot.primaryLeverage]?.[locale] ??
      snapshot.primaryLeverage.replace(/_/g, " ")
    : null;

  const confidenceText =
    snapshot.confidence === "high"
      ? L.confidenceHigh
      : snapshot.confidence === "low"
      ? L.confidenceLow
      : L.confidenceModerate;

  return (
    <>
      {/* Header del snapshot */}
      <section className="mb-8">
        <p className="eyebrow eyebrow-accent">{L.fromClinician}</p>
        <h1 className="mt-4 editorial text-[30px] md:text-[40px] leading-[1.05] text-ink">
          {L.title}
        </h1>
        <p className="mt-4 max-w-[66ch] text-[14px] leading-[1.6] text-ink-soft">
          {L.sub}
        </p>
        <p className="mt-3 text-[10.5px] tabular tracking-wide uppercase text-ink-mute">
          {L.savedAt} · {new Date(snapshot.savedAt).toLocaleString(locale === "es" ? "es-MX" : "en-US")}
          {snapshot.caseLabel ? ` · ${snapshot.caseLabel}` : ""}
        </p>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* ── Body map a la izquierda ────────────────────── */}
        <div className="col-span-12 md:col-span-5">
          {snapshot.imprintId && (
            <PredictiveBodyMap
              imprintId={snapshot.imprintId}
              imprintName={
                snapshot.imprintName ??
                IMPRINT_NAMES_ES[snapshot.imprintId] ??
                snapshot.imprintId.toUpperCase()
              }
              strength={Math.min(1, (snapshot.freeEnergyReleasedPct ?? 5) / 10 + 0.4)}
              priors={[
                {
                  label:
                    locale === "es"
                      ? `Patrón: ${IMPRINT_NAMES_ES[snapshot.imprintId] ?? snapshot.imprintId}`
                      : `Pattern: ${snapshot.imprintId.toUpperCase()}`,
                  strength: 0.85,
                },
                ...(primaryLabel
                  ? [
                      {
                        label:
                          locale === "es"
                            ? `Foco: ${primaryLabel}`
                            : `Focus: ${primaryLabel}`,
                        strength: 0.7,
                      },
                    ]
                  : []),
              ]}
              locale={locale}
            />
          )}

          {/* Confianza */}
          <div className="mt-6 border-l-2 border-rule pl-3">
            <p className="eyebrow">
              {locale === "es" ? "Cómo de segura es esta lectura" : "How certain is this reading"}
            </p>
            <p className="mt-1.5 text-[12.5px] italic text-ink-soft leading-snug">
              {confidenceText}
            </p>
          </div>
        </div>

        {/* ── Narrativa + plan a la derecha ───────────────── */}
        <div className="col-span-12 md:col-span-7 space-y-7">
          {/* 1. Qué encontró el mapa */}
          <section>
            <p className="eyebrow eyebrow-accent">{L.section_map}</p>
            <blockquote className="mt-3 border-l-2 border-accent pl-4 text-[15.5px] editorial-italic text-ink leading-[1.6]">
              {snapshot.narrative ?? L.howRead}
            </blockquote>
          </section>

          {/* 2. Cómo leerlo */}
          {!snapshot.narrative && (
            <section>
              <p className="eyebrow">{L.section_meaning}</p>
              <p className="mt-2 text-[13.5px] text-ink-soft leading-[1.6]">
                {L.howRead}
              </p>
            </section>
          )}

          {/* 3. Prioridad (primary leverage traducido) */}
          {primaryLabel && (
            <section className="border border-ink bg-paper-raised px-5 py-4">
              <p className="eyebrow">{L.section_priority}</p>
              <p className="mt-2 editorial text-[20px] text-ink leading-[1.2]">
                {L.priorityIntro}{" "}
                <span className="text-accent">{primaryLabel}</span>.
              </p>
              {snapshot.freeEnergyReleasedPct != null && (
                <p className="mt-2 text-[12px] tabular text-ink-mute">
                  {locale === "es"
                    ? `Trabajando este punto, el sistema puede liberar cerca de ${snapshot.freeEnergyReleasedPct.toFixed(0)}% de la carga actual en ${snapshot.horizonWeeks ?? 12} semanas.`
                    : `Working on this point, the system can release about ${snapshot.freeEnergyReleasedPct.toFixed(0)}% of the current load in ${snapshot.horizonWeeks ?? 12} weeks.`}
                </p>
              )}
            </section>
          )}

          {/* 4. Plan simple */}
          {snapshot.level1Primary && snapshot.level1Primary.length > 0 && (
            <section>
              <p className="eyebrow">{L.section_plan}</p>
              <ul className="mt-3 space-y-3">
                {snapshot.level1Primary.slice(0, 4).map((m) => (
                  <li key={m.id} className="border-l-2 border-rule pl-3">
                    <p className="editorial text-[15px] text-ink">
                      {humanizeModulator(m.id, locale)}
                    </p>
                    {(m.dose || m.timing) && (
                      <p className="mt-0.5 text-[12.5px] tabular text-ink-mute">
                        {m.dose ?? ""}
                        {m.dose && m.timing ? " · " : ""}
                        {m.timing ?? ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 5. Food-first */}
          {snapshot.foodFirst && snapshot.foodFirst.length > 0 && (
            <section>
              <p className="eyebrow">{L.section_food}</p>
              <p className="mt-2 text-[13.5px] text-ink-soft leading-[1.6]">
                {snapshot.foodFirst.join(" · ")}
              </p>
            </section>
          )}

          {/* 6. Secuenciación */}
          {snapshot.sequencing && Object.keys(snapshot.sequencing).length > 0 && (
            <section className="border border-rule bg-paper-soft px-4 py-3">
              <p className="eyebrow">{L.section_whatfirst}</p>
              <dl className="mt-2 text-[12.5px] space-y-1.5">
                {Object.entries(snapshot.sequencing).map(([weeks, desc]) => (
                  <div key={weeks} className="grid grid-cols-[auto_1fr] gap-2">
                    <dt className="tabular text-[10.5px] uppercase text-accent whitespace-nowrap">
                      {L.weeksPrefix} {weeks.replace(/weeks?_?/i, "").replace(/_/g, "–")}
                    </dt>
                    <dd className="text-ink-soft leading-snug">{desc}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* 7. Seguimiento */}
          {snapshot.monitoringBiomarkers &&
            snapshot.monitoringBiomarkers.length > 0 && (
              <section>
                <p className="eyebrow">{L.section_followup}</p>
                <p className="mt-2 text-[12.5px] text-ink-soft leading-snug">
                  {locale === "es"
                    ? `A las 8–12 semanas, revisaremos contigo: ${snapshot.monitoringBiomarkers.join(", ")}.`
                    : `At 8–12 weeks, we'll review with you: ${snapshot.monitoringBiomarkers.join(", ")}.`}
                </p>
              </section>
            )}

          {/* 8. Nota legal + disclaimer en lenguaje humano */}
          <section className="border-t border-rule pt-4">
            <p className="eyebrow">{L.section_note}</p>
            <p className="mt-2 text-[11.5px] italic text-ink-mute leading-snug">
              {L.noteText}
            </p>
          </section>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between text-[12px] border-t border-rule pt-5">
        <Link
          href={`/paciente${locale === "es" ? "?lang=es" : ""}`}
          className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
        >
          ← {L.backToLobby}
        </Link>
        <button
          onClick={() => location.reload()}
          className="text-ink-mute tabular underline decoration-rule underline-offset-4 hover:decoration-ink hover:text-ink"
        >
          ↻ {L.refresh}
        </button>
      </div>
    </>
  );
}

// Traducciones de ids de moduladores a nombre cotidiano
const MODULATOR_HUMAN: Record<string, { es: string; en: string }> = {
  epa_dha: { es: "Omega-3 marino (EPA + DHA)", en: "Marine omega-3 (EPA + DHA)" },
  curcumin: { es: "Cúrcuma (forma absorbible)", en: "Curcumin (bioavailable form)" },
  quercetin: { es: "Quercetina (del bulbo de cebolla, alcaparras)", en: "Quercetin (from onion, capers)" },
  n_acetyl_cysteine: { es: "NAC (N-acetil cisteína)", en: "NAC (N-acetyl cysteine)" },
  sulforaphane: { es: "Sulforafano (del brócoli)", en: "Sulforaphane (from broccoli)" },
  berberine: { es: "Berberina", en: "Berberine" },
  resveratrol: { es: "Resveratrol", en: "Resveratrol" },
  vitamin_d3: { es: "Vitamina D3", en: "Vitamin D3" },
  magnesium_glycinate: { es: "Magnesio (glicinato)", en: "Magnesium (glycinate)" },
  zinc_picolinate: { es: "Zinc", en: "Zinc" },
  selenium_selenomethionine: { es: "Selenio", en: "Selenium" },
  coq10_ubiquinol: { es: "CoQ10 (ubiquinol)", en: "CoQ10 (ubiquinol)" },
  alpha_lipoic_acid: { es: "Ácido alfa-lipoico", en: "Alpha-lipoic acid" },
  l_carnitine: { es: "L-carnitina", en: "L-carnitine" },
  taurine: { es: "Taurina", en: "Taurine" },
  glycine: { es: "Glicina", en: "Glycine" },
  betaine_tmg: { es: "Betaína (TMG)", en: "Betaine (TMG)" },
  methyl_b12: { es: "Vitamina B12 activa (metilcobalamina)", en: "Active B12 (methylcobalamin)" },
  methylfolate_5mthf: { es: "Folato activo (5-MTHF)", en: "Active folate (5-MTHF)" },
  pyridoxal_5_phosphate: { es: "Vitamina B6 activa (P-5-P)", en: "Active B6 (P-5-P)" },
  silymarin: { es: "Silimarina (del cardo mariano)", en: "Silymarin (milk thistle)" },
  psyllium: { es: "Psyllium (fibra soluble)", en: "Psyllium (soluble fiber)" },
  inulin_fos: { es: "Inulina / FOS (fibra prebiótica)", en: "Inulin / FOS (prebiotic fiber)" },
  beta_glucans_oat: { es: "Beta-glucanos de avena", en: "Oat beta-glucans" },
  chromium_picolinate: { es: "Cromo", en: "Chromium" },
};

function humanizeModulator(id: string, locale: "en" | "es"): string {
  const entry = MODULATOR_HUMAN[id];
  if (!entry) return id.replace(/_/g, " ");
  return entry[locale];
}
