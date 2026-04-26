import Link from "next/link";
import type { Metadata } from "next";
import PacienteInferentiaClient from "./paciente-inferentia-client";
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
        ? "Tu lectura — Inferentia"
        : "Your reading — Inferentia",
  };
}

export default async function PacienteInferentiaPage({
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
                  ? "Paciente · Tu lectura personal"
                  : "Patient · Your personal reading"}
              </p>
            </div>
            <LocaleToggle locale={locale} pathname="/paciente/inferentia" search={sp} />
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      <article className="mx-auto max-w-[1080px] px-6 md:px-10 py-10 pb-16">
        <PacienteInferentiaClient initialLocale={locale} />
      </article>

      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[1080px] px-6 md:px-10 py-6 flex items-center justify-between text-[11px] text-ink-mute">
          <Link
            href={`/${langSuffix}`}
            className="tabular tracking-wider hover:text-ink transition-colors"
          >
            ← Inferentia · v0.1
          </Link>
          <p className="editorial italic">{t.footer.center_italic}</p>
          <Link
            href={`/paciente${langSuffix}`}
            className="tabular tracking-wider hover:text-ink transition-colors"
          >
            {locale === "es" ? "Tu espacio" : "Your space"} →
          </Link>
        </div>
      </footer>
    </main>
  );
}
