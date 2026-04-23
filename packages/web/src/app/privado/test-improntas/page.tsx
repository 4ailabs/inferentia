import Link from "next/link";
import type { Metadata } from "next";
import TestImprontasClient from "./test-client";
import { isTestAvailable } from "@/lib/test/imprint-test-loader";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Test de Improntas · Privado — Inferentia",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TestImprontasPage() {
  if (!isTestAvailable()) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10">
          <div className="flex items-end justify-between py-5">
            <div className="flex items-end gap-6">
              <Link href="/" className="running-head hover:text-accent transition-colors">
                ← Inferentia
              </Link>
              <span className="h-4 w-px bg-rule" />
              <p className="eyebrow eyebrow-accent">
                Privado · Test de Improntas BV4 v2
              </p>
            </div>
            <span className="tabular text-[10px] tracking-wide uppercase text-danger border border-danger px-2 py-1">
              Solo local · IP del autor
            </span>
          </div>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      <div className="bg-ink text-paper">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-3 text-[11.5px] tabular tracking-wide flex flex-wrap items-center justify-between gap-4">
          <p>
            ⚠ Banco v2 en revisión. Propiedad intelectual del Dr. Miguel Ojeda
            Ríos. No distribuir.
          </p>
          <p className="opacity-70">
            Datos no persisten · Cálculo 100% local
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-[1200px] px-6 md:px-10 py-8 pb-16">
        <TestImprontasClient />
      </article>
    </main>
  );
}
