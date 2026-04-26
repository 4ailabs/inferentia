"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[inferentia:error-boundary]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-[960px] px-6 md:px-10 py-5">
          <Link
            href="/"
            className="running-head hover:text-accent transition-colors"
          >
            ← Inferentia
          </Link>
        </div>
        <div className="h-[2px] bg-ink" />
      </header>

      <article className="mx-auto max-w-[680px] px-6 md:px-10 py-16">
        <p className="eyebrow eyebrow-accent">Algo salió mal</p>
        <h1 className="mt-4 editorial text-[32px] md:text-[42px] leading-[1.05] text-ink">
          Este prototipo encontró un error inesperado.
        </h1>
        <p className="mt-6 max-w-[56ch] text-[13.5px] text-ink-soft leading-[1.6]">
          Inferentia es un prototipo de asistencia clínica en activo desarrollo.
          Gracias por reportar este tropiezo — puedes intentar de nuevo o volver
          a la portada.
        </p>

        {error.digest && (
          <p className="mt-4 tabular text-[10.5px] text-ink-mute">
            ref: {error.digest}
          </p>
        )}

        {process.env.NODE_ENV === "development" && error.message && (
          <pre className="mt-6 border-l-2 border-danger pl-3 text-[11.5px] tabular text-ink-quiet whitespace-pre-wrap max-h-[240px] overflow-y-auto">
            {error.message}
          </pre>
        )}

        <div className="mt-10 flex items-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-3 bg-accent text-paper px-5 py-3 text-[13px] tracking-wide hover:bg-accent-deep transition-colors"
          >
            Reintentar
            <span className="inline-block w-6 h-px bg-paper" />
          </button>
          <Link
            href="/"
            className="text-[12.5px] text-ink-mute underline decoration-rule underline-offset-4 hover:decoration-ink hover:text-ink"
          >
            Volver a Inferentia
          </Link>
        </div>
      </article>
    </main>
  );
}
