import Link from "next/link";
import type { Metadata } from "next";
import NuevoClient from "./nuevo-client";
import { getDict, resolveLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const locale = resolveLocale(await searchParams);
  return {
    title:
      locale === "es"
        ? "Nuevo caso · Clínico — Inferentia"
        : "New case · Clinician — Inferentia",
  };
}

export default async function NuevoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locale = resolveLocale(sp);
  const t = getDict(locale);
  const langSuffix = locale === "en" ? "" : `?lang=${locale}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10">
          <div className="flex items-end justify-between py-5">
            <div className="flex items-end gap-6">
              <Link
                href={`/${langSuffix}`}
                className="running-head hover:text-accent transition-colors"
              >
                ← {t.masthead.running_head}
              </Link>
              <span className="h-4 w-px bg-rule" />
              <p className="eyebrow">
                {locale === "es"
                  ? "Clínico · Caso real · Clasificación bayesiana"
                  : "Clinician · Real case · Bayesian classification"}
              </p>
            </div>
            <LocaleToggle locale={locale} pathname="/clinico/nuevo" search={sp} />
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      {/* Anonymisation + consent banner — non-dismissable for v0.1 */}
      <div className="bg-ink text-paper">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-3 text-[11.5px] tabular tracking-wide flex flex-wrap items-center justify-between gap-4">
          <p>
            {locale === "es"
              ? "⚠ Prototipo clínico · NO introduzcas nombres, fechas precisas ni identificadores. Anonimiza antes de pegar."
              : "⚠ Clinical prototype · DO NOT enter names, exact dates, or identifiers. Anonymise before pasting."}
          </p>
          <p className="opacity-70">
            {locale === "es"
              ? "Los datos no persisten en servidor. Cálculo local + tool calls a Claude."
              : "Data does not persist server-side. Local compute + Claude tool calls."}
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-[1280px] px-6 md:px-10 py-10 pb-16">
        <NuevoClient initialLocale={locale} />
      </article>

      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-6 flex items-center justify-between text-[11px] text-ink-mute">
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
