import Link from "next/link";
import type { Metadata } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";
import TieredMap from "./tiered-map";
import CuratedMap from "./curated-map";
import type { NetworkData } from "@/lib/network-layout";
import { getDict, resolveLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function loadNetwork(): Promise<NetworkData> {
  const filePath = path.join(process.cwd(), "public", "data", "network.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as NetworkData;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const locale = resolveLocale(await searchParams);
  const t = getDict(locale);
  return { title: t.network.meta_title };
}

type Modulator = {
  name: string;
  target: string;
  mechanism_en: string;
  mechanism_es: string;
};

const PRESCRIBED_MODULATORS: Modulator[] = [
  {
    name: "Ashwagandha",
    target: "HPA axis rigidity",
    mechanism_en: "Cortisol rhythm restoration · GABA-ergic tone",
    mechanism_es: "Restaura ritmo cortisol · tono GABA-érgico",
  },
  {
    name: "Mg glycinate",
    target: "Autonomic tone",
    mechanism_en: "NMDA modulation · parasympathetic restoration",
    mechanism_es: "Modulación NMDA · restauración parasimpática",
  },
  {
    name: "Myo-inositol",
    target: "Insulin resistance",
    mechanism_en: "IP3 second messenger · insulin sensitisation",
    mechanism_es: "Segundo mensajero IP3 · sensibilización insulínica",
  },
  {
    name: "Berberine",
    target: "Hepatic insulin resistance",
    mechanism_en: "AMPK activation · hepatic gluconeogenesis",
    mechanism_es: "Activa AMPK · reduce gluconeogénesis hepática",
  },
  {
    name: "Omega-3 EPA/DHA",
    target: "Systemic inflammation",
    mechanism_en: "Resolvin synthesis · NLRP3 inhibition",
    mechanism_es: "Síntesis de resolvinas · inhibición NLRP3",
  },
];

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locale = resolveLocale(sp);
  const t = getDict(locale);
  const data = await loadNetwork();
  const langSuffix = locale === "en" ? "" : `?lang=${locale}`;

  // Patient mode (default ana)
  const rawPatient = sp.patient;
  const patientParam = Array.isArray(rawPatient) ? rawPatient[0] : rawPatient;
  const patient: "ana" | null = patientParam === "none" ? null : "ana";

  // View mode — tiered (default) or atlas
  const rawView = sp.view;
  const viewParam = Array.isArray(rawView) ? rawView[0] : rawView;
  const view: "tiered" | "atlas" = viewParam === "atlas" ? "atlas" : "tiered";

  // Helpers to keep all params consistent when switching one
  const hrefWith = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (locale === "es") params.set("lang", "es");
    if (patient) params.set("patient", patient);
    params.set("view", view);
    for (const [k, v] of Object.entries(overrides)) params.set(k, v);
    // Drop default values for cleanliness
    if (params.get("view") === "tiered") params.delete("view");
    if (params.get("patient") === "ana") params.delete("patient");
    const qs = params.toString();
    return qs ? `/network?${qs}` : "/network";
  };

  const activeCount =
    patient === "ana"
      ? data.nodes.filter((n) => (n.imprint_association?.i8 ?? 0) >= 0.55).length
      : 0;

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Masthead ---------------------------------------------------- */}
      <header className="border-b border-rule">
        <div className="mx-auto max-w-[1480px] px-6 md:px-10">
          <div className="flex items-end justify-between py-5">
            <div className="flex items-end gap-6">
              <Link
                href={`/${langSuffix}`}
                className="running-head hover:text-accent transition-colors"
              >
                ← {t.masthead.running_head}
              </Link>
              <span className="h-4 w-px bg-rule" />
              <p className="eyebrow">{t.network.eyebrow_figure}</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="hidden md:flex items-center gap-5 text-[11px] tabular text-ink-mute">
                <span>
                  {t.network.stats.nodes}{" "}
                  <span className="text-ink font-medium">{data.nodes.length}</span>
                </span>
                <span>
                  {t.network.stats.edges}{" "}
                  <span className="text-ink font-medium">{data.edges.length}</span>
                </span>
                <span>
                  {t.network.stats.imprints}{" "}
                  <span className="text-ink font-medium">04</span>
                </span>
              </div>
              <LocaleToggle locale={locale} pathname="/network" search={sp} />
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      {/* Article ----------------------------------------------------- */}
      <article className="mx-auto max-w-[1480px] px-6 md:px-10 pb-16">
        {/* Hero — thesis-first narrative caption */}
        <section className="pt-10 grid grid-cols-12 gap-x-10">
          <div className="col-span-12 lg:col-span-8">
            <h1 className="editorial text-[38px] md:text-[46px] leading-[1] text-ink">
              {t.network.hero_title_a}
              <br />
              <span className="editorial-italic text-accent">
                {t.network.hero_title_b_italic}
              </span>
            </h1>
            <p className="mt-6 max-w-[62ch] text-[14px] leading-[1.6] text-ink-soft">
              {t.network.hero_body}
            </p>
          </div>

          <aside className="col-span-12 lg:col-span-4 mt-8 lg:mt-0 space-y-4">
            {/* Patient selector */}
            <div className="border border-ink">
              <div className="px-5 py-3 border-b border-ink bg-ink text-paper">
                <p className="eyebrow" style={{ color: "#FAFAF7", opacity: 0.7 }}>
                  {t.network.patient_label}
                </p>
                <p className="mt-1 editorial text-[18px] leading-tight">
                  {patient === "ana" ? t.network.patient_ana : t.network.patient_none}
                </p>
                {patient === "ana" && (
                  <p className="mt-1 tabular text-[10.5px] opacity-70">
                    {activeCount} / {data.nodes.length}{" "}
                    {t.network.category_index.nodes_suffix}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 divide-x divide-rule text-[11px]">
                <Link
                  href={hrefWith({ patient: "ana" })}
                  className={`px-4 py-2.5 text-center transition-colors ${
                    patient === "ana"
                      ? "bg-paper-soft text-ink font-medium"
                      : "text-ink-quiet hover:text-ink"
                  }`}
                >
                  Ana
                </Link>
                <Link
                  href={hrefWith({ patient: "none" })}
                  className={`px-4 py-2.5 text-center transition-colors ${
                    patient === null
                      ? "bg-paper-soft text-ink font-medium"
                      : "text-ink-quiet hover:text-ink"
                  }`}
                >
                  Atlas
                </Link>
              </div>
            </div>

            {/* View toggle — Cascade vs Atlas */}
            <div className="border border-rule">
              <div className="grid grid-cols-2 divide-x divide-rule text-[11px]">
                <Link
                  href={hrefWith({ view: "tiered" })}
                  className={`px-4 py-2.5 text-center transition-colors ${
                    view === "tiered"
                      ? "bg-ink text-paper font-medium"
                      : "text-ink-quiet hover:text-ink"
                  }`}
                >
                  {t.network.view_tiered}
                </Link>
                <Link
                  href={hrefWith({ view: "atlas" })}
                  className={`px-4 py-2.5 text-center transition-colors ${
                    view === "atlas"
                      ? "bg-ink text-paper font-medium"
                      : "text-ink-quiet hover:text-ink"
                  }`}
                >
                  {t.network.view_atlas}
                </Link>
              </div>
            </div>
          </aside>
        </section>

        {/* Narrative caption — the thesis that the diagram confirms */}
        <section className="mt-14">
          <div className="section-rule">
            <span className="eyebrow eyebrow-accent">
              {view === "tiered" ? t.network.tiered_eyebrow : t.network.atlas_eyebrow}
            </span>
            <span className="hairline" />
          </div>
          {view === "tiered" && (
            <p className="mt-6 editorial text-[22px] md:text-[26px] leading-[1.35] text-ink max-w-[56ch]">
              {t.network.narrative_caption}
            </p>
          )}
        </section>

        {/* Diagram ----------------------------------------------------- */}
        <section className="mt-10 border border-ink bg-paper-soft">
          {view === "tiered" ? (
            <TieredMap data={data} patient={patient} locale={locale} />
          ) : (
            <CuratedMap data={data} patient={patient} />
          )}
        </section>

        {/* Caption */}
        <p className="figure-caption mt-5 max-w-[80ch]">
          <strong>{view === "tiered" ? "Fig. ii" : "Fig. ii.b"}</strong>
          {view === "tiered" ? t.network.caption : t.network.atlas_caption}
        </p>

        {/* Prescribed modulators panel (cascade view only, ana only) --- */}
        {patient === "ana" && view === "tiered" && (
          <section className="mt-20">
            <div className="section-rule">
              <span className="eyebrow">§ ii.a</span>
              <span className="hairline" />
              <span className="eyebrow text-ink-quiet">
                {locale === "en" ? "Prescribed modulators" : "Moduladores prescritos"}
              </span>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 border-t border-ink">
              {PRESCRIBED_MODULATORS.map((m, idx) => (
                <div
                  key={m.name}
                  className={`p-6 border-rule ${
                    idx < 4 ? "lg:border-r" : ""
                  } ${idx % 2 === 0 ? "md:border-r lg:border-r" : ""} ${
                    idx < 3 ? "md:border-b lg:border-b-0" : ""
                  } border-b md:border-b-0`}
                >
                  <p className="eyebrow eyebrow-accent">
                    {locale === "en" ? `Modulator ${idx + 1}` : `Modulador ${idx + 1}`}
                  </p>
                  <p className="mt-3 editorial text-[22px] leading-tight text-ink">
                    {m.name}
                  </p>
                  <p className="mt-4 text-[11px] text-ink-mute uppercase tracking-wide">
                    {locale === "en" ? "Target" : "Objetivo"}
                  </p>
                  <p className="text-[12px] text-ink-soft">{m.target}</p>
                  <p className="mt-4 text-[11px] text-ink-mute uppercase tracking-wide">
                    {locale === "en" ? "Mechanism" : "Mecanismo"}
                  </p>
                  <p className="text-[12px] text-ink-soft leading-snug">
                    {locale === "en" ? m.mechanism_en : m.mechanism_es}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category index */}
        <section className="mt-20">
          <div className="section-rule">
            <span className="eyebrow">{t.network.category_index.eyebrow}</span>
            <span className="hairline" />
            <span className="eyebrow text-ink-quiet">
              {t.network.category_index.eyebrow_caption}
            </span>
          </div>

          <ul className="mt-8 grid grid-cols-2 md:grid-cols-4 border-t border-rule">
            {t.network.category_index.categories.map((cat, idx) => {
              const count = data.nodes.filter((n) => n.category === cat.slug).length;
              return (
                <li
                  key={cat.slug}
                  className={`p-5 border-b border-rule ${
                    idx % 4 !== 3 ? "md:border-r" : ""
                  } ${idx % 2 === 0 ? "border-r md:border-r" : ""}`}
                >
                  <p className="eyebrow">{cat.numeral}</p>
                  <p className="mt-3 editorial text-[17px] text-ink">{cat.label}</p>
                  <p className="mt-1 tabular lining text-[11px] text-ink-mute">
                    {count} {t.network.category_index.nodes_suffix}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Explore link + attribution */}
        <section className="mt-20 grid grid-cols-12 gap-x-10 pb-8 border-t border-rule pt-10">
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow">§ Supplementary</p>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-soft max-w-[42ch]">
              {locale === "en"
                ? "For deeper exploration, an interactive graph view is available with per-node clinical detail panels, filters, zoom and pan."
                : "Para exploración más profunda, existe una vista de grafo interactiva con paneles de detalle clínico por nodo, filtros, zoom y desplazamiento."}
            </p>
            <Link
              href={`/network/explore${langSuffix}`}
              className="mt-5 inline-flex items-center gap-2 text-[13px] text-ink underline decoration-rule underline-offset-4 decoration-1 hover:decoration-ink hover:text-accent transition-colors"
            >
              {t.network.explore_link}
            </Link>
          </div>

          <div className="col-span-12 md:col-span-6 mt-8 md:mt-0">
            <p className="eyebrow">{t.network.attribution.eyebrow}</p>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
              {t.network.attribution.body_pre}
              <a
                href="https://github.com/4ailabs/inferentia/blob/main/docs/flexibility_network/README.md"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-rule underline-offset-4 decoration-1 hover:decoration-ink transition-colors"
              >
                {t.network.attribution.body_link}
              </a>
              {t.network.attribution.body_post}
            </p>
          </div>
        </section>
      </article>

      {/* Foot -------------------------------------------------------- */}
      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[1480px] px-6 md:px-10 py-6 flex items-center justify-between text-[11px] text-ink-mute">
          <Link
            href={`/${langSuffix}`}
            className="tabular tracking-wider hover:text-ink transition-colors"
          >
            ← Inferentia · v0.1
          </Link>
          <p className="editorial italic">{t.footer.center_italic}</p>
          <a
            href="https://github.com/4ailabs/inferentia"
            target="_blank"
            rel="noreferrer"
            className="tabular tracking-wider hover:text-ink transition-colors"
          >
            Source ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
