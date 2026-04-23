import Link from "next/link";
import type { Metadata } from "next";
import PacienteLobbyClient from "./paciente-lobby-client";
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
        ? "Tu espacio · Paciente — Inferentia"
        : "Your space · Patient — Inferentia",
  };
}

export default async function PacienteLobbyPage({
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
                  ? "Paciente · Tu espacio"
                  : "Patient · Your space"}
              </p>
            </div>
            <LocaleToggle locale={locale} pathname="/paciente" search={sp} />
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      <article className="mx-auto max-w-[1280px] px-6 md:px-10 py-12 pb-16">
        <section className="max-w-[64ch]">
          <p className="eyebrow eyebrow-accent">
            {locale === "es" ? "Para ti" : "For you"}
          </p>
          <h1 className="mt-4 editorial text-[32px] md:text-[42px] leading-[1.05] text-ink">
            {locale === "es"
              ? "Este es tu espacio."
              : "This is your space."}
            <br />
            <span className="editorial-italic text-accent">
              {locale === "es"
                ? "Sólo ves lo que tu clínico ha firmado."
                : "You only see what your clinician has signed."}
            </span>
          </h1>
          <p className="mt-6 text-[14px] leading-[1.6] text-ink-soft">
            {locale === "es"
              ? "Tu clínico conduce la entrevista y compone tu lectura. Lo que aparece aquí es la versión en lenguaje humano que tu clínico aprobó. Nada se publica sin su firma."
              : "Your clinician runs the interview and composes your reading. What appears here is the plain-language version your clinician approved. Nothing is published without their signature."}
          </p>
        </section>

        <PacienteLobbyClient initialLocale={locale} />
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
