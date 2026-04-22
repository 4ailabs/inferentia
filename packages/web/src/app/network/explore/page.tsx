import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import NetworkCanvas from "./network-canvas";
import type { NetworkData } from "@/lib/network-layout";
import { getDict, resolveLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function loadNetwork(): Promise<NetworkData> {
  const filePath = path.join(process.cwd(), "public", "data", "network.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as NetworkData;
}

export const metadata = {
  title: "Explore graph — Inferentia",
};

export default async function NetworkExplorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locale = resolveLocale(sp);
  const t = getDict(locale);
  const data = await loadNetwork();
  const langSuffix = locale === "en" ? "" : `?lang=${locale}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-[1480px] px-6 md:px-10">
          <div className="flex items-end justify-between py-5">
            <div className="flex items-end gap-6">
              <Link
                href={`/network${langSuffix}`}
                className="running-head hover:text-accent transition-colors"
              >
                ← {t.network.eyebrow_figure}
              </Link>
              <span className="h-4 w-px bg-rule" />
              <p className="eyebrow">Interactive graph exploration</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-5 text-[11px] tabular text-ink-mute">
                <span>
                  {t.network.stats.nodes}{" "}
                  <span className="text-ink font-medium">{data.nodes.length}</span>
                </span>
                <span>
                  {t.network.stats.edges}{" "}
                  <span className="text-ink font-medium">{data.edges.length}</span>
                </span>
              </div>
              <LocaleToggle locale={locale} pathname="/network/explore" />
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      <article className="mx-auto max-w-[1480px] px-6 md:px-10 py-10 pb-16">
        <section>
          <p className="eyebrow">§ Supplementary material</p>
          <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
            Full interactive exploration of the 33-node network with per-node
            detail panels, filtering, zoom and pan. Use this view for research
            or deep inspection; the main{" "}
            <Link
              href={`/network${langSuffix}`}
              className="underline decoration-rule underline-offset-4 decoration-1 hover:decoration-ink"
            >
              figure ii
            </Link>{" "}
            is recommended for clinical reading.
          </p>
        </section>

        <section className="mt-8">
          <NetworkCanvas data={data} />
        </section>
      </article>
    </main>
  );
}
