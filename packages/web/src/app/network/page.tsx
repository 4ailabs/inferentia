import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import NetworkCanvas from "./network-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NetworkData } from "@/lib/network-layout";

async function loadNetwork(): Promise<NetworkData> {
  const filePath = path.join(process.cwd(), "public", "data", "network.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as NetworkData;
}

export const metadata = {
  title: "Red de flexibilidad · Inferentia",
};

export default async function NetworkPage() {
  const data = await loadNetwork();
  const categories = Array.from(new Set(data.nodes.map((n) => n.category)));

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1480px] px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-mono text-xs tracking-widest text-slate-500 hover:text-slate-300"
            >
              ← INFERENTIA
            </Link>
            <span className="h-4 w-px bg-slate-700" />
            <h1 className="text-base font-semibold text-slate-100">
              Red de flexibilidad fenotípica
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-700 text-slate-400 font-mono text-[10px]">
              {data.nodes.length} nodos
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-slate-400 font-mono text-[10px]">
              {data.edges.length} aristas
            </Badge>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-[10px]">
              v0.1
            </Badge>
          </div>
        </header>

        <p className="mt-6 max-w-3xl text-sm text-slate-400 leading-relaxed">
          Mapa fisiopatológico del síndrome metabólico con las cuatro improntas
          BV4 (MVP) como capa predictiva upstream. Síntesis original de Inferentia
          inspirada en el modelo de flexibilidad de sistemas de{" "}
          <span className="text-slate-300">Ben van Ommen</span> (TNO/NuGO, ILSI NA EB 2017).
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant="outline"
              className="border-slate-700 text-slate-400 font-mono text-[10px] capitalize"
            >
              {cat}
            </Badge>
          ))}
          <span className="ml-auto text-[11px] text-slate-500">
            Pasa el cursor sobre un nodo para ver moduladores y SNPs asociados.
          </span>
        </div>

        <section className="mt-6">
          <NetworkCanvas data={data} />
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2 border-t border-slate-800/60 pt-8">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              Lectura del grafo
            </p>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              Izquierda a derecha, la cascada causal:{" "}
              <span className="text-indigo-300">improntas predictivas</span> →{" "}
              <span className="text-rose-300">neuroendocrino</span> /{" "}
              <span className="text-amber-300">autonómico</span> →{" "}
              <span className="text-emerald-300">intestinal</span> /{" "}
              <span className="text-cyan-300">metabólico</span> →{" "}
              <span className="text-orange-300">hepático</span> /{" "}
              <span className="text-fuchsia-300">inflamatorio</span> →{" "}
              <span className="text-slate-200">patología</span>.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              Atribución
            </p>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Conceptual framework inspired by Ben van Ommen. Imprint taxonomy and clinical
              synthesis are proprietary to Dr. Miguel Ojeda Rios (BV4). Node and edge data
              derived from public biomedical literature — see{" "}
              <a
                className="text-slate-200 underline decoration-slate-600 underline-offset-4 hover:decoration-slate-400"
                href="https://github.com/4ailabs/inferentia/blob/main/docs/flexibility_network/README.md"
                target="_blank"
                rel="noreferrer"
              >
                full attribution
              </a>
              .
            </p>
          </div>
        </section>

        <div className="mt-10 flex items-center justify-between text-xs text-slate-500">
          <Button variant="outline" asChild className="border-slate-700 text-slate-200 hover:bg-slate-900">
            <Link href="/">← Volver</Link>
          </Button>
          <span className="font-mono">MIT · Built with Opus 4.7</span>
        </div>
      </div>
    </main>
  );
}
