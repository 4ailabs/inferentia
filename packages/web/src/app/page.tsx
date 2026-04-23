import Link from "next/link";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const locale = resolveLocale(await searchParams);
  const t = getDict(locale);
  return {
    title: t.meta.title,
    description: t.meta.description,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locale = resolveLocale(sp);
  const t = getDict(locale);
  const pathname = "/";
  const langSuffix = locale === "en" ? "" : `?lang=${locale}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Masthead ---------------------------------------------------- */}
      <header className="border-b border-rule">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10">
          <div className="flex items-end justify-between py-5">
            <div className="flex items-end gap-5">
              <MarkGlyph />
              <div className="leading-none">
                <p className="running-head text-ink">{t.masthead.running_head}</p>
                <p className="mt-1 text-[11px] text-ink-mute tabular lining">
                  {t.masthead.edition}
                </p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-[12px] tracking-wide text-ink-quiet">
              <Link
                href={`/clinico/sesion${langSuffix}`}
                className="text-accent hover:text-accent-deep transition-colors font-medium"
              >
                {locale === "es" ? "Clínico" : "Clinician"}
              </Link>
              <Link
                href={`/paciente${langSuffix}`}
                className="hover:text-ink transition-colors"
              >
                {locale === "es" ? "Paciente" : "Patient"}
              </Link>
              <Link
                href={`/demo${langSuffix}`}
                className="hover:text-ink transition-colors italic"
              >
                Demo
              </Link>
              <Link href={`/network${langSuffix}`} className="hover:text-ink transition-colors">
                {t.masthead.nav.network}
              </Link>
              <a
                href="https://github.com/4ailabs/inferentia"
                target="_blank"
                rel="noreferrer"
                className="hover:text-ink transition-colors"
              >
                {t.masthead.nav.source}
              </a>
              <a href="#method" className="hover:text-ink transition-colors">
                {t.masthead.nav.method}
              </a>
              <span className="tabular text-ink-mute text-[10.5px]">
                {t.masthead.stack_badge}
              </span>
              <LocaleToggle locale={locale} pathname={pathname} search={sp} />
            </nav>
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      {/* Article ----------------------------------------------------- */}
      <article className="mx-auto max-w-[1280px] px-6 md:px-10 pb-24">
        {/* Hero */}
        <section className="grid grid-cols-12 gap-x-10 pt-16 md:pt-24">
          <aside className="col-span-12 md:col-span-3 lg:col-span-3">
            <p className="eyebrow eyebrow-accent">{t.hero.eyebrow_abstract}</p>
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-quiet max-w-[220px]">
              {t.hero.abstract_body}
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-y-5 gap-x-4 text-[11px]">
              {t.hero.aside.map((row) => (
                <div key={row.dt}>
                  <dt className="eyebrow">{row.dt}</dt>
                  <dd className="mt-2 editorial text-[15px]">{row.dd}</dd>
                </div>
              ))}
            </dl>
          </aside>

          <div className="col-span-12 md:col-span-9 lg:col-span-9 mt-12 md:mt-0">
            <p className="eyebrow">{t.hero.thesis_eyebrow}</p>
            <h1 className="mt-6 editorial text-[44px] md:text-[60px] lg:text-[72px] leading-[0.98] text-ink">
              {t.hero.thesis_line_1}
              <br />
              {t.hero.thesis_line_2}
              <br />
              <span className="editorial-italic text-accent">
                {t.hero.thesis_line_3_italic}
              </span>
            </h1>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-10">
              <div className="drop-cap text-[17px] leading-[1.65] text-ink-soft max-w-[62ch]">
                {t.hero.drop_cap_body}
              </div>
              <aside className="border-t border-rule lg:border-t-0 lg:border-l lg:pl-6 pt-6 lg:pt-0">
                <p className="eyebrow">{t.hero.outcome_eyebrow}</p>
                <p className="mt-4 editorial italic text-[22px] leading-[1.2] text-ink">
                  {t.hero.outcome_line}
                </p>
                <p className="mt-4 text-[12px] leading-relaxed text-ink-quiet">
                  {t.hero.outcome_body}
                </p>
              </aside>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href={`/clinico/sesion${langSuffix}`}
                className="group border-2 border-ink bg-paper-raised px-5 py-5 hover:border-accent transition-colors"
              >
                <p className="eyebrow eyebrow-accent">
                  {locale === "es" ? "Entrar como clínico" : "Enter as clinician"}
                </p>
                <p className="mt-3 editorial text-[19px] text-ink leading-tight">
                  {locale === "es"
                    ? "Conducir la entrevista · firmar el programa →"
                    : "Run the interview · sign the program →"}
                </p>
                <p className="mt-3 text-[11.5px] text-ink-mute leading-snug">
                  {locale === "es"
                    ? "Intake con labs + red flags. Síntesis clínica. Firma que publica al paciente."
                    : "Intake with labs + red flags. Clinical synthesis. Signing publishes to the patient."}
                </p>
              </Link>
              <Link
                href={`/paciente${langSuffix}`}
                className="group border border-rule bg-paper-raised px-5 py-5 hover:border-ink transition-colors"
              >
                <p className="eyebrow">
                  {locale === "es" ? "Entrar como paciente" : "Enter as patient"}
                </p>
                <p className="mt-3 editorial text-[19px] text-ink leading-tight">
                  {locale === "es"
                    ? "Ver mi lectura y mi programa →"
                    : "See my reading and my program →"}
                </p>
                <p className="mt-3 text-[11.5px] text-ink-mute leading-snug">
                  {locale === "es"
                    ? "Lenguaje humano, sin taxonomía técnica. Solo lo firmado por tu clínico."
                    : "Plain language, no technical taxonomy. Only what your clinician has signed."}
                </p>
              </Link>
              <Link
                href={`/demo${langSuffix}`}
                className="group border border-rule bg-paper-raised px-5 py-5 hover:border-accent transition-colors"
              >
                <p className="eyebrow">
                  {locale === "es" ? "Demo · Jurado" : "Demo · Jury"}
                </p>
                <p className="mt-3 editorial italic text-[19px] text-accent leading-tight">
                  {locale === "es"
                    ? "Split screen simultáneo →"
                    : "Simultaneous split screen →"}
                </p>
                <p className="mt-3 text-[11.5px] text-ink-mute leading-snug">
                  {locale === "es"
                    ? "Paciente y clínico en una sola pantalla (hero shot del hackathon)."
                    : "Patient and clinician in one canvas (the hackathon hero shot)."}
                </p>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link
                href={`/network${langSuffix}`}
                className="inline-flex items-center gap-2 text-[13px] text-ink underline decoration-rule underline-offset-4 decoration-1 hover:decoration-ink transition-colors"
              >
                {t.hero.cta_primary}
              </Link>
              <a
                href="#method"
                className="inline-flex items-center gap-2 text-[13px] text-ink-quiet border-b border-ink-mute pb-0.5 hover:text-ink hover:border-ink transition-colors"
              >
                {t.hero.cta_secondary}
              </a>
            </div>
          </div>
        </section>

        {/* Figure i — six layers */}
        <section id="figure-i" className="mt-32">
          <div className="section-rule">
            <span className="eyebrow">{t.figure_i.eyebrow}</span>
            <span className="hairline" />
            <span className="eyebrow text-ink-quiet">
              {t.figure_i.eyebrow_caption}
            </span>
          </div>

          <figure className="mt-10 border-t border-ink">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b border-rule">
              {t.layers.map((layer, idx) => (
                <div
                  key={layer.num}
                  className={`relative p-7 md:p-9 min-h-[220px] border-rule ${
                    idx % 3 !== 2 ? "lg:border-r" : ""
                  } ${idx % 2 === 0 ? "md:border-r lg:border-r" : ""} ${
                    idx < 3 ? "lg:border-b" : ""
                  } ${idx < 4 ? "md:border-b" : ""} border-b md:border-b-0`}
                >
                  <div className="flex items-start justify-between">
                    <span className="section-num text-[42px] text-accent leading-none">
                      {layer.num}
                    </span>
                    <span className="eyebrow mt-2">{layer.tag}</span>
                  </div>
                  <h3 className="mt-8 editorial text-[22px] leading-tight text-ink">
                    {layer.title}
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-quiet">
                    {layer.body}
                  </p>
                  <p className="mt-6 tabular text-[10.5px] text-ink-mute">
                    {layer.meta}
                  </p>
                </div>
              ))}
            </div>
            <figcaption className="figure-caption mt-5">
              <strong>Fig. i</strong>
              {t.figure_i.caption}
            </figcaption>
          </figure>
        </section>

        {/* Method */}
        <section id="method" className="mt-32 grid grid-cols-12 gap-x-10">
          <div className="col-span-12 md:col-span-4">
            <div className="section-rule">
              <span className="eyebrow">{t.method.section_number}</span>
              <span className="hairline" />
            </div>
            <h2 className="mt-6 editorial text-[38px] leading-[1.05] text-ink">
              {t.method.heading}
            </h2>
            <p className="mt-5 text-[13px] leading-relaxed text-ink-quiet max-w-[32ch]">
              {t.method.lead}
            </p>
          </div>

          <div className="col-span-12 md:col-span-8 mt-10 md:mt-0">
            <dl className="divide-y divide-rule border-y border-rule">
              {t.method.items.map((item) => (
                <div key={item.label} className="grid grid-cols-12 gap-4 py-5">
                  <dt className="col-span-4 md:col-span-3">
                    <span className="eyebrow">{item.tag}</span>
                    <p className="mt-2 editorial text-[17px] text-ink">
                      {item.label}
                    </p>
                  </dt>
                  <dd className="col-span-8 md:col-span-9 text-[13.5px] leading-relaxed text-ink-soft">
                    {item.body}
                    <span className="ml-2 tabular text-[11px] text-ink-mute">
                      — {item.cite}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Colophon */}
        <section className="mt-32">
          <div className="section-rule">
            <span className="eyebrow">{t.colophon.section_number}</span>
            <span className="hairline" />
            <span className="eyebrow text-ink-quiet">{t.colophon.eyebrow}</span>
          </div>

          <div className="mt-10 grid grid-cols-12 gap-x-10 gap-y-10 border-t border-rule pt-10">
            <div className="col-span-12 md:col-span-6 lg:col-span-4">
              <p className="eyebrow">{t.colophon.status_label}</p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
                {t.colophon.status_body}
              </p>
            </div>
            <div className="col-span-12 md:col-span-6 lg:col-span-4">
              <p className="eyebrow">{t.colophon.attribution_label}</p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
                {t.colophon.attribution_body}
              </p>
            </div>
            <div className="col-span-12 md:col-span-12 lg:col-span-4">
              <p className="eyebrow">{t.colophon.license_label}</p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
                {t.colophon.license_body_pre}
                <a
                  href="https://github.com/4ailabs/inferentia"
                  className="underline decoration-rule underline-offset-4 decoration-1 hover:decoration-ink transition-colors"
                >
                  {t.colophon.license_body_link}
                </a>
                {t.colophon.license_body_post}
              </p>
            </div>
          </div>
        </section>
      </article>

      {/* Running foot */}
      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-6 flex items-center justify-between text-[11px] text-ink-mute">
          <p className="tabular tracking-wider">{t.footer.left}</p>
          <p className="editorial italic">{t.footer.center_italic}</p>
          <p className="tabular tracking-wider">{t.footer.right}</p>
        </div>
      </footer>
    </main>
  );
}

function MarkGlyph() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="20" cy="20" r="19" stroke="#0F0F0E" strokeWidth="1" />
      <circle cx="20" cy="20" r="6" fill="#6B3FA0" />
      <path
        d="M3 20 L14 20 M26 20 L37 20 M20 3 L20 14 M20 26 L20 37"
        stroke="#0F0F0E"
        strokeWidth="1"
      />
      <circle
        cx="20"
        cy="20"
        r="12"
        stroke="#0F0F0E"
        strokeWidth="0.6"
        strokeDasharray="2 2"
      />
    </svg>
  );
}
