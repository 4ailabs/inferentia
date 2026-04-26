/**
 * ImprintTaxonomy — compact grid of the 13 BV4 imprints.
 *
 * Purpose: landing-page "explainer" — the juror sees at a glance what
 * a predictive imprint is and how Inferentia taxonomizes them. Each
 * row is a card: roman numeral + canonical name + one-line implicit
 * prediction + canonical somatic zone.
 *
 * Not interactive. Editorial layout. Pure server component.
 */

type ImprintRow = {
  id: string;
  name: string;
  predictionEs: string;
  predictionEn: string;
  zoneEs: string;
  zoneEn: string;
};

// Distilled from treatise-excerpts.ts (one-line versions).
// These are short enough to scan the grid; the full prediccion_implicita
// lives in the Opus 4.7 context, not in the UI.
const IMPRINTS: ImprintRow[] = [
  {
    id: "i1",
    name: "Desacople",
    predictionEs: "Si estoy integrado cuando llegue el impacto, será insoportable.",
    predictionEn: "If I'm integrated when impact hits, it'll be unbearable.",
    zoneEs: "Ocular · pies fríos",
    zoneEn: "Ocular · cold feet",
  },
  {
    id: "i2",
    name: "Acorazamiento",
    predictionEs: "Si bajo la guardia, me atacarán por la espalda.",
    predictionEn: "If I drop my guard, they'll strike me from behind.",
    zoneEs: "Trapecios · occipital",
    zoneEn: "Trapezius · occipital",
  },
  {
    id: "i3",
    name: "Retracción",
    predictionEs: "Si me muestro, quedará en evidencia que soy insuficiente.",
    predictionEn: "If I show up, it'll reveal I'm not enough.",
    zoneEs: "Pecho alto · diafragma",
    zoneEn: "Upper chest · diaphragm",
  },
  {
    id: "i4",
    name: "Fijación Externa",
    predictionEs: "Si yo no arreglo esto, el sistema colapsa.",
    predictionEn: "If I don't fix this, the system collapses.",
    zoneEs: "Mandíbula · hígado · puños",
    zoneEn: "Jaw · liver · fists",
  },
  {
    id: "i5",
    name: "Compresión",
    predictionEs: "Si pido espacio, me lo quitarán todo.",
    predictionEn: "If I ask for space, they'll take everything.",
    zoneEs: "Garganta · pecho alto",
    zoneEn: "Throat · upper chest",
  },
  {
    id: "i6",
    name: "Camuflaje",
    predictionEs: "Si me vuelvo visible, me harán daño.",
    predictionEn: "If I become visible, I'll be harmed.",
    zoneEs: "Mirada baja · perímetro",
    zoneEn: "Downcast gaze · perimeter",
  },
  {
    id: "i7",
    name: "Hibernación",
    predictionEs: "Si me activo, gastaré lo último que me queda.",
    predictionEn: "If I activate, I'll spend my last reserve.",
    zoneEs: "Mitocondrial · tiroides",
    zoneEn: "Mitochondrial · thyroid",
  },
  {
    id: "i8",
    name: "Reserva",
    predictionEs: "Si suelto algo, no volverá a haber.",
    predictionEn: "If I let go, there won't be any again.",
    zoneEs: "Abdomen · retención",
    zoneEn: "Abdomen · retention",
  },
  {
    id: "i9",
    name: "Confluencia",
    predictionEs: "Si existo separado del otro, desaparezco.",
    predictionEn: "If I exist apart from the other, I vanish.",
    zoneEs: "Plexo solar · borde ausente",
    zoneEn: "Solar plexus · absent edge",
  },
  {
    id: "i10",
    name: "Vinculación",
    predictionEs: "Si me quedo solo, el dolor no para.",
    predictionEn: "If I'm left alone, the pain won't stop.",
    zoneEs: "Brazos · anhelo torácico",
    zoneEn: "Arms · thoracic longing",
  },
  {
    id: "i11",
    name: "Superposición",
    predictionEs: "Si hago una sola cosa, quedarán las demás al descubierto.",
    predictionEn: "If I do one thing, the rest gets exposed.",
    zoneEs: "Cervical · ideación",
    zoneEn: "Neck · ideation",
  },
  {
    id: "i12",
    name: "Desarraigo",
    predictionEs: "Si me enraizo, me arrancarán de nuevo.",
    predictionEn: "If I take root, I'll be pulled out again.",
    zoneEs: "Piernas · pelvis baja",
    zoneEn: "Legs · low pelvis",
  },
  {
    id: "i13",
    name: "Encapsulamiento",
    predictionEs: "Si el centro vuelve a abrirse, no sobrevivirá otra pérdida.",
    predictionEn: "If the center opens again, it won't survive another loss.",
    zoneEs: "Centro cardíaco · sellado",
    zoneEn: "Cardiac center · sealed",
  },
];

export function ImprintTaxonomy({ locale }: { locale: "en" | "es" }) {
  const title =
    locale === "es"
      ? "Taxonomía de 13 priors clínicos (BV4)"
      : "Taxonomy of 13 clinical priors (BV4)";

  const subtitle =
    locale === "es"
      ? "Cada uno es un patrón predictivo defensivo: una frase implícita que el organismo ejecuta, una firma somática característica. Inferentia infiere cuáles están activos en un paciente y cuánto peso tienen."
      : "Each is a defensive predictive pattern: an implicit phrase the organism executes, a characteristic somatic signature. Inferentia infers which are active in a patient and how much weight they carry.";

  return (
    <section className="border-b border-ink">
      <div className="mx-auto max-w-[1240px] px-6 md:px-10 py-14 md:py-20">
        {/* Header */}
        <div className="grid grid-cols-12 gap-x-8 gap-y-6 mb-12">
          <div className="col-span-12 md:col-span-4">
            <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-accent">
              {locale === "es" ? "Marco clínico" : "Clinical framework"}
            </p>
            <h2
              className="mt-6 editorial text-[32px] md:text-[40px] leading-[1.05] text-ink tracking-[-0.02em]"
              style={{ fontVariationSettings: '"SOFT" 30, "opsz" 72' }}
            >
              {title}
            </h2>
          </div>
          <p className="col-span-12 md:col-span-7 md:col-start-6 text-[15px] md:text-[16px] leading-[1.6] text-ink-soft max-w-[60ch] self-end">
            {subtitle}
          </p>
        </div>

        {/* Grid of 13 imprints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border-t border-b border-ink">
          {IMPRINTS.map((imp) => (
            <div
              key={imp.id}
              className="bg-paper px-5 py-5 flex flex-col gap-2 min-h-[140px]"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-accent">
                  {imp.id}
                </span>
                <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-mute">
                  {locale === "es" ? imp.zoneEs : imp.zoneEn}
                </span>
              </div>
              <p
                className="editorial text-[20px] leading-[1.15] text-ink"
                style={{ fontVariationSettings: '"opsz" 48' }}
              >
                {imp.name}
              </p>
              <p className="mt-auto editorial-italic text-[13.5px] leading-[1.45] text-ink-soft">
                &ldquo;
                {locale === "es" ? imp.predictionEs : imp.predictionEn}
                &rdquo;
              </p>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="mt-6 font-mono text-[10.5px] tracking-[0.14em] uppercase text-ink-mute">
          {locale === "es"
            ? "Fuente: Tratado BV4 · marcos de referencia: Friston · McEwen · Barrett · Porges · Levin"
            : "Source: BV4 Treatise · reference frameworks: Friston · McEwen · Barrett · Porges · Levin"}
        </p>
      </div>
    </section>
  );
}
