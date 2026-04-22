import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative min-h-dvh bg-slate-950 text-slate-100 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute top-[28%] -left-28 h-[460px] w-[460px] rounded-full bg-violet-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-cyan-600/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 shadow-lg shadow-indigo-500/30" />
            <span className="font-mono text-sm tracking-widest text-slate-400">INFERENTIA</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-700 text-slate-400 font-mono text-[10px]">
              v0.1 · prototype
            </Badge>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-[10px]">
              Opus 4.7
            </Badge>
          </div>
        </header>

        <section className="mt-24 max-w-4xl">
          <p className="font-mono text-xs tracking-widest text-slate-500 uppercase">
            Clinical model · Active Inference + Bayesian classification
          </p>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight text-balance">
            Una persona enferma es un organismo ejecutando predicciones.
          </h1>
          <p className="mt-8 text-lg text-slate-300 leading-relaxed max-w-3xl">
            Inferentia identifica esas instrucciones activas — improntas predictivas,
            carencias que limitan la regulación, toxinas que fuerzan el sistema,
            agencia disponible, genética amplificadora — y calcula qué intervenciones
            expanden la frontera que el patrón contrajo.
          </p>
          <p className="mt-6 text-base text-slate-400 max-w-3xl italic">
            El outcome no es normalizar un valor: es que el organismo pueda más.
          </p>

          <div className="mt-10 flex items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/network">Ver la red de flexibilidad</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-slate-700 text-slate-200 hover:bg-slate-900">
              <a href="https://github.com/4ailabs/inferentia" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </Button>
          </div>
        </section>

        <section className="mt-28 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {LAYERS.map((layer) => (
            <Card
              key={layer.id}
              className="border-slate-800/80 bg-slate-900/40 backdrop-blur transition-colors hover:border-slate-700"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-500">L{layer.id}</span>
                  <span className={`h-2 w-2 rounded-full ${layer.dot}`} />
                </div>
                <CardTitle className="mt-2 text-base font-semibold text-slate-100">
                  {layer.title}
                </CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  {layer.body}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="font-mono text-[10px] text-slate-500">{layer.meta}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-28 grid gap-6 md:grid-cols-2 border-t border-slate-800/60 pt-10">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              Stack teórico
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>· Active Inference / Free Energy Principle — Friston</li>
              <li>· TAME multi-scale cognition — Levin</li>
              <li>· Phenotypic flexibility — van Ommen (TNO/NuGO)</li>
              <li>· BV4 clinical framework — Ojeda Rios</li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              Descargos
            </p>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Prototipo de investigación. No es dispositivo médico. No sustituye consulta médica.
              Validación clínica formal planificada para Fase 2 post-hackathon.
            </p>
          </div>
        </section>

        <footer className="mt-24 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">Built with Opus 4.7 · Cerebral Valley × Anthropic 2026</span>
          <span className="font-mono">MIT licensed</span>
        </footer>
      </div>
    </main>
  );
}

const LAYERS = [
  {
    id: "01",
    title: "Improntas predictivas",
    body: "Programas de supervivencia cristalizados en el inconsciente somático (marco BV4).",
    dot: "bg-indigo-400",
    meta: "i1 · i4 · i7 · i8",
  },
  {
    id: "02",
    title: "Sustrato nutricional",
    body: "Carencias que limitan la capacidad regulatoria en los cuatro niveles TAME.",
    dot: "bg-emerald-400",
    meta: "vitaminas · minerales · cofactores",
  },
  {
    id: "03",
    title: "Carga tóxica y excesos",
    body: "Disruptores que fuerzan el sistema: metales, disruptores endocrinos, exceso crónico.",
    dot: "bg-amber-400",
    meta: "metales · azúcar · iatrogenia",
  },
  {
    id: "04",
    title: "Agencia disponible",
    body: "Capacidad del sistema de revisar sus priors y auto-regular.",
    dot: "bg-cyan-400",
    meta: "locus · interocepción · coherencia",
  },
  {
    id: "05",
    title: "Genética amplificadora",
    body: "Polimorfismos probables, inferidos desde fenotipo sin test genético.",
    dot: "bg-violet-400",
    meta: "FTO · MC4R · FKBP5 · COMT · MTHFR",
  },
  {
    id: "06",
    title: "Signatura observable",
    body: "Biomarcadores, HRV, composición corporal, síntomas — la evidencia que el clínico mide.",
    dot: "bg-rose-400",
    meta: "HbA1c · HOMA-IR · cortisol · HRV",
  },
];
