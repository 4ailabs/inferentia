import Link from "next/link";
import type { Metadata } from "next";
import SesionClient from "./sesion-client";
import { getAnaScript } from "@/lib/patient-ana";
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
        ? "Sesión en vivo — Inferentia"
        : "Live session — Inferentia",
  };
}

export default async function SessionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locale = resolveLocale(sp);
  const t = getDict(locale);
  const script = getAnaScript(locale);
  const langSuffix = locale === "en" ? "" : `?lang=${locale}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
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
              <p className="eyebrow">
                {locale === "es"
                  ? "Clínico · Figura iii · Sesión en vivo"
                  : "Clinician · Figure iii · Live session"}
              </p>
            </div>
            <LocaleToggle locale={locale} pathname="/clinico/sesion" search={sp} />
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      <article className="mx-auto max-w-[1480px] px-6 md:px-10 py-6 pb-16">
        <section className="mb-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <h1 className="editorial text-[26px] md:text-[32px] leading-[1.05] text-ink">
            {locale === "es" ? "Una sesión clínica " : "A clinical session "}
            <span className="editorial-italic text-accent">
              {locale === "es"
                ? "en tiempo de inferencia."
                : "in inference time."}
            </span>
          </h1>
          <p className="max-w-[56ch] text-[12.5px] leading-[1.5] text-ink-soft">
            {locale === "es"
              ? "Haiku 4.5 entrevista. Sonnet 4.6 calcula el posterior. Opus 4.7 reformula en dos registros —paciente y clínico."
              : "Haiku 4.5 interviews. Sonnet 4.6 computes the posterior. Opus 4.7 reframes into two registers — patient and clinician."}
          </p>
        </section>

        <SesionClient locale={locale} scriptedTurns={script} />

        <section className="mt-16 grid grid-cols-12 gap-x-10 border-t border-rule pt-10">
          <div className="col-span-12 md:col-span-4">
            <p className="eyebrow">§ iii.a</p>
            <p className="mt-3 editorial text-[18px] leading-snug text-ink">
              {locale === "es" ? "Pipeline agéntico" : "Agentic pipeline"}
            </p>
          </div>
          <div className="col-span-12 md:col-span-8 mt-6 md:mt-0 text-[13px] leading-[1.6] text-ink-soft">
            <dl className="divide-y divide-rule border-y border-rule">
              <div className="grid grid-cols-12 gap-4 py-4">
                <dt className="col-span-4 md:col-span-3">
                  <span className="eyebrow">Haiku 4.5</span>
                  <p className="mt-1 editorial text-[15px] text-ink">Interview</p>
                </dt>
                <dd className="col-span-8 md:col-span-9 text-ink-soft">
                  {locale === "es"
                    ? "Conduce la entrevista con latencia baja, preguntas cortas, una a la vez. Jamás diagnostica."
                    : "Runs the interview with low latency, one short question at a time. Never diagnoses."}
                </dd>
              </div>
              <div className="grid grid-cols-12 gap-4 py-4">
                <dt className="col-span-4 md:col-span-3">
                  <span className="eyebrow">Sonnet 4.6</span>
                  <p className="mt-1 editorial text-[15px] text-ink">Analyze</p>
                </dt>
                <dd className="col-span-8 md:col-span-9 text-ink-soft">
                  {locale === "es"
                    ? "Extrae priors con citas verbatim, calcula posterior sobre las cuatro improntas MVP y propone labs + SNPs."
                    : "Extracts priors with verbatim quotes, computes posterior over the four MVP imprints, proposes labs + SNPs."}
                </dd>
              </div>
              <div className="grid grid-cols-12 gap-4 py-4">
                <dt className="col-span-4 md:col-span-3">
                  <span className="eyebrow">Opus 4.7</span>
                  <p className="mt-1 editorial text-[15px] text-ink">Render</p>
                </dt>
                <dd className="col-span-8 md:col-span-9 text-ink-soft">
                  {locale === "es"
                    ? "Reescribe el posterior en dos registros paralelos: paciente (acceso y agencia) y clínico (diferencial, panel, protocolo)."
                    : "Rewrites the posterior in two parallel registers: patient (access and agency) and clinician (differential, panel, protocol)."}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </article>

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
