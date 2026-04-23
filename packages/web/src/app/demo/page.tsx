import Link from "next/link";
import type { Metadata } from "next";
import DemoClient from "./demo-client";
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
        ? "Demo · Paciente + Clínico simultáneos — Inferentia"
        : "Demo · Patient + Clinician simultaneous — Inferentia",
  };
}

export default async function DemoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locale = resolveLocale(sp);
  const t = getDict(locale);
  const langSuffix = locale === "en" ? "" : `?lang=${locale}`;

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="border-b border-rule shrink-0">
        <div className="mx-auto max-w-[2200px] px-6 md:px-10">
          <div className="flex items-end justify-between py-4">
            <div className="flex items-end gap-6">
              <Link
                href={`/${langSuffix}`}
                className="running-head hover:text-accent transition-colors"
              >
                ← {t.masthead.running_head}
              </Link>
              <span className="h-4 w-px bg-rule" />
              <p className="eyebrow eyebrow-accent">
                {locale === "es"
                  ? "Demo · Jurado · Split screen simultáneo"
                  : "Demo · Jury · Simultaneous split screen"}
              </p>
            </div>
            <LocaleToggle locale={locale} pathname="/demo" search={sp} />
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      <DemoClient initialLocale={locale} />

      <footer className="border-t border-ink shrink-0">
        <div className="mx-auto max-w-[2200px] px-6 md:px-10 py-4 flex items-center justify-between text-[11px] text-ink-mute">
          <p className="editorial italic">
            {locale === "es"
              ? "Dos ventanas comparten localStorage. Firma del clínico se propaga al paciente en vivo."
              : "Both windows share localStorage. The clinician's signature propagates to the patient in real time."}
          </p>
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
