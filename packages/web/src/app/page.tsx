import Link from "next/link";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const locale = resolveLocale(await searchParams);
  const t = getDict(locale);
  return {
    title: t.meta.title,
    description: t.meta.description,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locale = resolveLocale(sp);
  const pathname = "/";
  const langSuffix = locale === "en" ? "" : `?lang=${locale}`;
  const es = locale === "es";

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col">
      {/* ═══ MASTHEAD ═══ */}
      <header className="border-b border-ink">
        <div className="mx-auto max-w-[1080px] w-full px-6 md:px-10">
          <div className="h-14 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <MarkGlyph />
              <p className="font-mono text-[11px] tracking-[0.22em] uppercase font-medium">
                Inferentia
              </p>
            </Link>
            <nav className="flex items-center gap-4">
              <a
                href="https://github.com/4ailabs/inferentia"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline font-mono text-[11px] tracking-[0.12em] uppercase text-ink-quiet hover:text-ink transition-colors"
              >
                GitHub ↗
              </a>
              <LocaleToggle locale={locale} pathname={pathname} search={sp} />
            </nav>
          </div>
        </div>
      </header>

      {/* ═══ HERO — grid 7+5: thesis izq · live product readout der ═══ */}
      <section className="border-b border-ink">
        <div className="mx-auto max-w-[1240px] w-full px-6 md:px-10 py-16 md:py-20 grid grid-cols-12 gap-x-10 gap-y-12">
          {/* Left: thesis */}
          <div className="col-span-12 lg:col-span-7">
            <p className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-accent">
              {es ? "Inferentia · prototipo de investigación" : "Inferentia · research prototype"}
            </p>

            <h1
              className="mt-8 editorial text-[38px] md:text-[52px] lg:text-[60px] leading-[1.04] text-ink tracking-[-0.025em]"
              style={{ fontVariationSettings: '"SOFT" 30, "WONK" 0, "opsz" 96' }}
            >
              {es ? (
                <>
                  Identificamos los 13 patrones
                  <br />
                  que sostienen la enfermedad crónica.
                  <br />
                  <span className="editorial-italic text-accent">
                    Calculamos qué intervenciones los liberan.
                  </span>
                </>
              ) : (
                <>
                  We identify the 13 patterns
                  <br />
                  sustaining chronic disease.
                  <br />
                  <span className="editorial-italic text-accent">
                    We compute what loosens them.
                  </span>
                </>
              )}
            </h1>

            <p className="mt-8 text-[16px] md:text-[17px] leading-[1.6] text-ink-soft max-w-[52ch]">
              {es
                ? "Los síntomas crónicos son la firma de patrones defensivos que el organismo ejecuta para sobrevivir. Inferentia los mide con matemática auditable y propone moléculas específicas con mecanismo documentado y ajuste por SNPs."
                : "Chronic symptoms are the signature of defensive patterns the organism runs to survive. Inferentia measures them with auditable math and proposes specific molecules with documented mechanism and SNP-aware dosing."}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href={`/clinico/inferentia${langSuffix}`}
                className="group inline-flex items-center gap-3 h-12 pl-6 pr-5 bg-ink text-paper hover:bg-accent transition-colors"
              >
                <span className="font-mono text-[11.5px] tracking-[0.16em] uppercase">
                  {es ? "Ver una sesión" : "See a session"}
                </span>
                <span className="font-mono text-[13px] transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <Link
                href={`/paciente${langSuffix}`}
                className="inline-flex items-center h-12 px-5 text-ink-quiet hover:text-ink transition-colors font-mono text-[11px] tracking-[0.14em] uppercase underline decoration-rule underline-offset-[6px] hover:decoration-ink"
              >
                {es ? "Vista del paciente" : "Patient view"}
              </Link>
            </div>
          </div>

          {/* Right: live Orchestrator readout mockup */}
          <div className="col-span-12 lg:col-span-5">
            <HeroReadout locale={locale} />
          </div>
        </div>
      </section>

      {/* ═══ PROCESO — 3 pasos, lo que pasa cuando entras ═══ */}
      <section className="border-b border-ink">
        <div className="mx-auto max-w-[1080px] w-full px-6 md:px-10 py-20 md:py-24">
          <div className="mb-14 max-w-[52ch]">
            <p className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-ink-mute">
              {es ? "Cómo funciona" : "How it works"}
            </p>
            <h2
              className="mt-6 editorial text-[30px] md:text-[40px] leading-[1.08] text-ink tracking-[-0.02em]"
              style={{ fontVariationSettings: '"SOFT" 30, "opsz" 72' }}
            >
              {es
                ? "Tres pasos, una sesión clínica."
                : "Three steps, one clinical session."}
            </h2>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {/* PASO 1 */}
            <li>
              <div className="flex items-baseline gap-3">
                <span
                  className="editorial text-[42px] leading-none text-accent"
                  style={{ fontVariationSettings: '"opsz" 72' }}
                >
                  01
                </span>
                <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-ink-mute">
                  {es ? "Entrada" : "Intake"}
                </span>
              </div>
              <h3 className="mt-5 editorial text-[22px] leading-[1.2] text-ink">
                {es
                  ? "Llega un paciente con su historia."
                  : "A patient arrives with their story."}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft max-w-[38ch]">
                {es
                  ? "El clínico captura lo esencial: notas de consulta, laboratorios recientes, contexto biográfico y variantes genéticas relevantes."
                  : "The clinician captures what matters: consultation notes, recent labs, life context, and relevant genetic variants."}
              </p>
            </li>

            {/* PASO 2 */}
            <li>
              <div className="flex items-baseline gap-3">
                <span
                  className="editorial text-[42px] leading-none text-accent"
                  style={{ fontVariationSettings: '"opsz" 72' }}
                >
                  02
                </span>
                <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-ink-mute">
                  {es ? "Análisis" : "Analysis"}
                </span>
              </div>
              <h3 className="mt-5 editorial text-[22px] leading-[1.2] text-ink">
                {es
                  ? "El sistema identifica los patrones activos."
                  : "The system identifies the active patterns."}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft max-w-[38ch]">
                {es
                  ? "Un motor matemático calcula la rigidez en 22 puntos del metabolismo. Opus 4.7 identifica cuáles de los 13 patrones defensivos están dirigiendo el cuadro. Un sintetizador propone el protocolo con dosis, forma y contraindicaciones."
                  : "A math engine computes rigidity across 22 metabolic points. Opus 4.7 identifies which of the 13 defensive patterns are driving the case. A synthesizer proposes the protocol with dose, form, and contraindications."}
              </p>
            </li>

            {/* PASO 3 */}
            <li>
              <div className="flex items-baseline gap-3">
                <span
                  className="editorial text-[42px] leading-none text-accent"
                  style={{ fontVariationSettings: '"opsz" 72' }}
                >
                  03
                </span>
                <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-ink-mute">
                  {es ? "Devolución" : "Return"}
                </span>
              </div>
              <h3 className="mt-5 editorial text-[22px] leading-[1.2] text-ink">
                {es
                  ? "Dos lecturas del mismo caso."
                  : "Two readings of the same case."}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft max-w-[38ch]">
                {es
                  ? "El clínico recibe el protocolo completo con matemática, evidencia y contraindicaciones. El paciente recibe una narrativa en segunda persona — sin jerga — que puede releer en casa."
                  : "The clinician receives the full protocol with math, evidence and contraindications. The patient receives a second-person narrative — no jargon — they can reread at home."}
              </p>
            </li>
          </ol>

          <div className="mt-16 border-t border-rule pt-6 flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-[13.5px] italic text-ink-quiet max-w-[54ch] leading-[1.55]">
              {es
                ? "La matemática es determinista y auditable. La síntesis clínica usa Opus 4.7 con razonamiento extendido sobre el marco teórico cargado."
                : "The math is deterministic and auditable. The clinical synthesis uses Opus 4.7 with extended reasoning over the loaded theoretical framework."}
            </p>
            <Link
              href={`/clinico/inferentia${langSuffix}`}
              className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink hover:text-accent transition-colors underline decoration-rule underline-offset-[6px]"
            >
              {es ? "Iniciar una sesión →" : "Start a session →"}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ THE MODEL — scientific basis, visual anchor ═══ */}
      <section className="border-b border-ink bg-paper-soft">
        <div className="mx-auto max-w-[1080px] w-full px-6 md:px-10 py-20 md:py-24">
          <div className="mb-12 max-w-[64ch]">
            <p className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-accent">
              {es ? "El modelo" : "The model"}
            </p>
            <h2
              className="mt-6 editorial text-[30px] md:text-[40px] leading-[1.08] text-ink tracking-[-0.02em]"
              style={{ fontVariationSettings: '"SOFT" 30, "opsz" 72' }}
            >
              {es
                ? "La flexibilidad del sistema es la llave."
                : "System flexibility is the key."}
            </h2>
            <p className="mt-6 text-[15px] md:text-[16px] leading-[1.65] text-ink-soft max-w-[58ch]">
              {es
                ? "22 nodos metabólicos conectados en un gradiente que va de procesos reversibles a daño estructural. El motor de Inferentia mide dónde está el paciente en esa red, qué nodos son aún reversibles y qué moléculas específicas liberan el sistema antes de que el daño se cristalice."
                : "22 metabolic nodes connected in a gradient that goes from reversible processes to structural damage. Inferentia's engine measures where the patient is in that network, which nodes are still reversible, and which specific molecules loosen the system before damage crystallizes."}
            </p>
          </div>

          {/* Hero figure — Factor graph jerárquico SVG inline */}
          <figure className="border border-ink bg-paper">
            <div className="w-full overflow-x-auto px-6 py-8">
              <svg
                viewBox="0 0 860 480"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full max-w-[860px] mx-auto font-mono"
                aria-label={es ? "Factor graph jerárquico de 3 niveles" : "3-level hierarchical factor graph"}
              >
                {/* ── defs ── */}
                <defs>
                  <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" className="text-ink" style={{fill:"#1a1a18"}}/>
                  </marker>
                  <marker id="arr-up" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#1a1a18"/>
                  </marker>
                </defs>

                {/* ══ NIVEL 1 — Clasificación impronta ══ */}
                <rect x="180" y="20" width="500" height="96" rx="0" fill="none" stroke="#1a1a18" strokeWidth="1.5"/>
                <text x="200" y="42" fontSize="9" fill="#888" letterSpacing="2" fontFamily="monospace">NIVEL 1 · CLASIFICACIÓN</text>
                <text x="200" y="62" fontSize="13" fill="#1a1a18" fontFamily="monospace" fontWeight="600">P(impronta | fenotipo)</text>
                {/* 13 imprint pills */}
                {["i1","i2","i3","i4","i5","i6","i7","i8","i9","i10","i11","i12","i13"].map((imp, i) => {
                  const col = i % 7;
                  const row = Math.floor(i / 7);
                  const x = 200 + col * 67;
                  const y = 74 + row * 22;
                  const isI8 = imp === "i8";
                  return (
                    <g key={imp}>
                      <rect x={x} y={y} width="58" height="16" rx="0"
                        fill={isI8 ? "#1a1a18" : "none"}
                        stroke={isI8 ? "#1a1a18" : "#ccc"}
                        strokeWidth="1"/>
                      <text x={x + 29} y={y + 11} fontSize="9" fill={isI8 ? "#f5f0e8" : "#888"}
                        textAnchor="middle" fontFamily="monospace">{imp}</text>
                    </g>
                  );
                })}

                {/* ── bidirectional arrow L1↔L2 ── */}
                <line x1="430" y1="116" x2="430" y2="162" stroke="#1a1a18" strokeWidth="1.5"
                  markerEnd="url(#arr)" markerStart="url(#arr-up)"/>
                <text x="438" y="143" fontSize="8" fill="#888" fontFamily="monospace">belief propagation</text>

                {/* ══ NIVEL 2 — Firma multimodal ══ */}
                <rect x="80" y="162" width="700" height="190" rx="0" fill="none" stroke="#1a1a18" strokeWidth="1.5"/>
                <text x="100" y="184" fontSize="9" fill="#888" letterSpacing="2" fontFamily="monospace">NIVEL 2 · FIRMA MULTIMODAL</text>
                <text x="100" y="204" fontSize="13" fill="#1a1a18" fontFamily="monospace" fontWeight="600">F ∈ ℝ⁸  ·  22 nodos  ·  PFF</text>

                {/* 8 dimension cells */}
                {[
                  {label: "Autonómico", sub:"HRV · SDNN · RMSSD"},
                  {label: "HPA", sub:"cortisol · CAR · ritmo"},
                  {label: "Inflamatorio", sub:"IL-6 · TNF-α · PCR"},
                  {label: "Metabólico", sub:"HbA1c · HOMA-IR"},
                  {label: "Lipídico", sub:"TG · HDL · LDL"},
                  {label: "Composición", sub:"visceral · magra"},
                  {label: "Microbiota", sub:"enterotipos · SCFAs"},
                  {label: "Agencia", sub:"predictive agency"},
                ].map((dim, i) => {
                  const col = i % 4;
                  const row = Math.floor(i / 4);
                  const x = 100 + col * 170;
                  const y = 216 + row * 66;
                  const isAgency = dim.label === "Agencia";
                  return (
                    <g key={dim.label}>
                      <rect x={x} y={y} width="158" height="54" rx="0"
                        fill={isAgency ? "#f0ece2" : "none"}
                        stroke={isAgency ? "#1a1a18" : "#ccc"}
                        strokeWidth={isAgency ? "1.5" : "1"}/>
                      <text x={x+8} y={y+18} fontSize="11" fill="#1a1a18" fontFamily="monospace" fontWeight="600">{dim.label}</text>
                      <text x={x+8} y={y+34} fontSize="9" fill="#888" fontFamily="monospace">{dim.sub}</text>
                    </g>
                  );
                })}

                {/* ── bidirectional arrow L2↔L3 ── */}
                <line x1="430" y1="352" x2="430" y2="396" stroke="#1a1a18" strokeWidth="1.5"
                  markerEnd="url(#arr)" markerStart="url(#arr-up)"/>
                <text x="438" y="378" fontSize="8" fill="#888" fontFamily="monospace">enriquecimiento</text>

                {/* ══ NIVEL 3 — Genética ══ */}
                <rect x="180" y="396" width="500" height="72" rx="0" fill="none" stroke="#1a1a18" strokeWidth="1.5"/>
                <text x="200" y="418" fontSize="9" fill="#888" letterSpacing="2" fontFamily="monospace">NIVEL 3 · ENRIQUECIMIENTO GENÉTICO</text>
                <text x="200" y="438" fontSize="13" fill="#1a1a18" fontFamily="monospace" fontWeight="600">SNPs nutrigenéticos</text>
                {["rs174547","rs1801133","rs4680","rs9939609","rs1799945","rs662"].map((snp, i) => (
                  <g key={snp}>
                    <text x={200 + i * 108} y={458} fontSize="9" fill="#888" fontFamily="monospace">{snp}</text>
                  </g>
                ))}

                {/* ── factor graph cross-connections (SNP → imprint hint lines) ── */}
                <line x1="220" y1="396" x2="265" y2="116" stroke="#ccc" strokeWidth="0.8" strokeDasharray="3,3"/>
                <line x1="328" y1="396" x2="530" y2="116" stroke="#ccc" strokeWidth="0.8" strokeDasharray="3,3"/>
              </svg>
            </div>
            <figcaption className="border-t border-rule px-5 py-3 flex items-baseline justify-between gap-4">
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
                Fig. 1
              </span>
              <span className="text-[12px] italic text-ink-quiet leading-snug text-right max-w-[70ch]">
                {es
                  ? "Factor graph jerárquico de 3 niveles con belief propagation bidireccional. i8 resaltada = caso demo Ana."
                  : "3-level hierarchical factor graph with bidirectional belief propagation. i8 highlighted = demo case Ana."}
              </span>
            </figcaption>
          </figure>

          {/* Two secondary figures — SVG inline */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fig 2 — Leverage ranking */}
            <figure className="border border-rule bg-paper">
              <div className="px-6 py-6">
                <svg viewBox="0 0 380 200" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-label="Leverage ranking">
                  <text x="0" y="18" fontSize="9" fill="#888" letterSpacing="2" fontFamily="monospace">LEVERAGE RANKING · {es ? "ANA · i8" : "ANA · i8"}</text>
                  {[
                    {label:"inflammation_control", score:0.87, molecules:"curcumin · EPA · quercetin"},
                    {label:"insulin_sensitivity",  score:0.74, molecules:"berberine · ALA · Mg"},
                    {label:"autonomic_flexibility", score:0.61, molecules:"glycine · taurine · D3"},
                    {label:"predictive_agency",    score:0.55, molecules:"prior work · NAC"},
                  ].map((item, i) => (
                    <g key={item.label} transform={`translate(0,${36 + i * 42})`}>
                      <text x="0" y="12" fontSize="10" fill="#1a1a18" fontFamily="monospace" fontWeight="600">
                        {i+1}. {item.label.replace(/_/g," ")}
                      </text>
                      <rect x="0" y="18" width={item.score * 340} height="10" fill={i===0?"#1a1a18":"#ccc"}/>
                      <text x={item.score * 340 + 6} y="27" fontSize="9" fill="#888" fontFamily="monospace">{item.score.toFixed(2)}</text>
                      <text x="0" y="38" fontSize="8" fill="#aaa" fontFamily="monospace">{item.molecules}</text>
                    </g>
                  ))}
                </svg>
              </div>
              <figcaption className="border-t border-rule px-4 py-2.5">
                <span className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-ink-mute">Fig. 2</span>
                <p className="mt-1 text-[11.5px] italic text-ink-quiet leading-snug">
                  {es
                    ? "Ranking de apalancamiento: gain × tractability × alignment / cost. Moléculas seleccionadas por mecanismo sobre nodos rígidos."
                    : "Leverage ranking: gain × tractability × alignment / cost. Molecules selected by mechanism on rigid nodes."}
                </p>
              </figcaption>
            </figure>

            {/* Fig 3 — ΔFree energy counterfactual */}
            <figure className="border border-rule bg-paper">
              <div className="px-6 py-6">
                <svg viewBox="0 0 380 200" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-label="Free energy counterfactual">
                  <text x="0" y="18" fontSize="9" fill="#888" letterSpacing="2" fontFamily="monospace">{es ? "PREDICCIÓN CONTRAFACTUAL · ΔF" : "COUNTERFACTUAL · ΔF"}</text>
                  {/* Baseline bar */}
                  <text x="0" y="50" fontSize="9" fill="#888" fontFamily="monospace">{es ? "Carga actual" : "Current burden"}</text>
                  <rect x="0" y="56" width="300" height="18" fill="#e8e4da"/>
                  <text x="306" y="70" fontSize="11" fill="#1a1a18" fontFamily="monospace" fontWeight="600">68%</text>
                  {/* After bar */}
                  <text x="0" y="96" fontSize="9" fill="#1a1a18" fontFamily="monospace">{es ? "Proyección 12 sem" : "Projection 12 wk"}</text>
                  <rect x="0" y="102" width="196" height="18" fill="#1a1a18"/>
                  <text x="202" y="116" fontSize="11" fill="#1a1a18" fontFamily="monospace" fontWeight="600">−31%</text>
                  {/* Delta label */}
                  <text x="0" y="145" fontSize="22" fill="#1a1a18" fontFamily="monospace" fontWeight="700">ΔF = −31%</text>
                  <text x="0" y="165" fontSize="9" fill="#888" fontFamily="monospace">{es ? "free energy liberada · horizonte 12 semanas" : "free energy released · 12-week horizon"}</text>
                  <text x="0" y="183" fontSize="9" fill="#aaa" fontFamily="monospace">{es ? "Asume adherencia completa al apalancamiento primario" : "Assumes full adherence to primary leverage"}</text>
                </svg>
              </div>
              <figcaption className="border-t border-rule px-4 py-2.5">
                <span className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-ink-mute">Fig. 3</span>
                <p className="mt-1 text-[11.5px] italic text-ink-quiet leading-snug">
                  {es
                    ? "Predicción contrafactual del motor (do-calculus). Si el apalancamiento primario se trabaja durante 12 semanas, el sistema libera 31% de carga alostática."
                    : "Engine counterfactual prediction (do-calculus). If primary leverage is worked for 12 weeks, the system releases 31% of allostatic load."}
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ═══ RESULTADOS — 4 claims concretos, qué produce el sistema ═══ */}
      <section className="border-b border-ink">
        <div className="mx-auto max-w-[1080px] w-full px-6 md:px-10 py-20 md:py-24">
          <div className="mb-14 max-w-[52ch]">
            <p className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-ink-mute">
              {es ? "Resultados" : "Outputs"}
            </p>
            <h2
              className="mt-6 editorial text-[30px] md:text-[40px] leading-[1.08] text-ink tracking-[-0.02em]"
              style={{ fontVariationSettings: '"SOFT" 30, "opsz" 72' }}
            >
              {es
                ? "Lo que Inferentia produce en cada sesión."
                : "What Inferentia produces in each session."}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border-t border-b border-ink">
            {/* 01 */}
            <div className="bg-paper px-6 py-7 md:px-8 md:py-9 flex flex-col gap-3 min-h-[180px]">
              <span
                className="editorial text-[38px] leading-none text-accent"
                style={{ fontVariationSettings: '"opsz" 72' }}
              >
                01
              </span>
              <h3 className="editorial text-[22px] leading-[1.2] text-ink mt-2">
                {es
                  ? "Un objeto clínico único."
                  : "A single clinical object."}
              </h3>
              <p className="text-[14px] leading-[1.6] text-ink-soft max-w-[42ch]">
                {es
                  ? "Integra tres capas que hoy viven separadas en distintas consultas: laboratorios, biografía del paciente y selección molecular con mecanismo documentado."
                  : "Integrates three layers that today live apart across different clinics: labs, patient biography, and molecular selection with documented mechanism."}
              </p>
            </div>

            {/* 02 */}
            <div className="bg-paper px-6 py-7 md:px-8 md:py-9 flex flex-col gap-3 min-h-[180px]">
              <span
                className="editorial text-[38px] leading-none text-accent"
                style={{ fontVariationSettings: '"opsz" 72' }}
              >
                02
              </span>
              <h3 className="editorial text-[22px] leading-[1.2] text-ink mt-2">
                {es
                  ? "Matemática auditable."
                  : "Auditable math."}
              </h3>
              <p className="text-[14px] leading-[1.6] text-ink-soft max-w-[42ch]">
                {es
                  ? "Cada número es cómputo determinista sobre 22 nodos metabólicos. No es opinión del modelo de lenguaje — se puede reproducir y revisar."
                  : "Every number is deterministic computation across 22 metabolic nodes. Not a language-model opinion — reproducible and reviewable."}
              </p>
            </div>

            {/* 03 */}
            <div className="bg-paper px-6 py-7 md:px-8 md:py-9 flex flex-col gap-3 min-h-[180px]">
              <span
                className="editorial text-[38px] leading-none text-accent"
                style={{ fontVariationSettings: '"opsz" 72' }}
              >
                03
              </span>
              <h3 className="editorial text-[22px] leading-[1.2] text-ink mt-2">
                {es
                  ? "Ajuste por genética."
                  : "Genetic adjustment."}
              </h3>
              <p className="text-[14px] leading-[1.6] text-ink-soft max-w-[42ch]">
                {es
                  ? "Moléculas seleccionadas con dosis, forma y corrección por variantes genéticas del paciente cuando existen."
                  : "Molecules selected with dose, form, and correction for the patient's genetic variants when available."}
              </p>
            </div>

            {/* 04 */}
            <div className="bg-paper px-6 py-7 md:px-8 md:py-9 flex flex-col gap-3 min-h-[180px]">
              <span
                className="editorial text-[38px] leading-none text-accent"
                style={{ fontVariationSettings: '"opsz" 72' }}
              >
                04
              </span>
              <h3 className="editorial text-[22px] leading-[1.2] text-ink mt-2">
                {es
                  ? "Devolución al paciente."
                  : "Patient-facing reading."}
              </h3>
              <p className="text-[14px] leading-[1.6] text-ink-soft max-w-[42ch]">
                {es
                  ? "Narrativa en segunda persona que conecta biografía y síntomas sin jerga clínica. Escrita para que el paciente la relea en casa."
                  : "Second-person narrative that connects biography and symptoms without clinical jargon. Written so the patient can reread it at home."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MARCO TEÓRICO — justifica autoridad sin jerga propietaria ═══ */}
      <section className="border-b border-ink">
        <div className="mx-auto max-w-[1080px] w-full px-6 md:px-10 py-20 md:py-24 grid grid-cols-12 gap-x-8 gap-y-10">
          <div className="col-span-12 md:col-span-4">
            <p className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-ink-mute">
              {es ? "Marco" : "Framework"}
            </p>
            <h2
              className="mt-6 editorial text-[30px] md:text-[36px] leading-[1.08] text-ink tracking-[-0.02em]"
              style={{ fontVariationSettings: '"SOFT" 30, "opsz" 72' }}
            >
              {es
                ? "Inferencia activa aplicada a clínica."
                : "Active inference applied to clinical care."}
            </h2>
          </div>

          <div className="col-span-12 md:col-span-7 md:col-start-6 space-y-6 max-w-[58ch] text-[15px] md:text-[16px] leading-[1.65] text-ink-soft">
            <p>
              {es
                ? "Inferentia trabaja sobre la hipótesis — hoy ampliamente aceptada en neurociencia — de que el organismo no reacciona al mundo: lo predice. Cuando esas predicciones se cristalizan, aparecen como síntomas crónicos."
                : "Inferentia builds on the hypothesis — now widely accepted in neuroscience — that the organism doesn't react to the world: it predicts it. When those predictions crystallize, they appear as chronic symptoms."}
            </p>
            <p>
              {es
                ? "La taxonomía de 13 patrones defensivos es resultado de dos décadas de práctica clínica integrativa. No es un catálogo de enfermedades — es una gramática de cómo el organismo aprende a sobrevivir."
                : "The taxonomy of 13 defensive patterns is the result of two decades of integrative clinical practice. It is not a catalog of diseases — it is a grammar of how the organism learns to survive."}
            </p>
            <p className="pt-4 border-t border-rule">
              <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-mute">
                {es ? "Referencias base" : "Core references"}
              </span>
              <span className="block mt-2 text-[14px] text-ink leading-[1.7]">
                Karl Friston · Bruce McEwen · Lisa Feldman Barrett · Stephen Porges · Michael Levin
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER — mt-auto pushes it to viewport bottom when content is short ═══ */}
      <footer className="mt-auto border-t border-ink bg-paper">
        <div className="mx-auto max-w-[1080px] w-full px-6 md:px-10 py-6 md:py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11.5px] tracking-[0.18em] uppercase text-ink font-medium">
              Dr. Miguel Ojeda Rios
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-mute">
              Cerebral Valley × Anthropic · April 2026
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase text-ink-mute">
            <span>Next.js 16</span>
            <span className="text-rule">·</span>
            <span>Opus 4.7</span>
            <span className="text-rule">·</span>
            <span>Vercel</span>
          </div>

          <a
            href="https://github.com/4ailabs/inferentia"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11.5px] tracking-[0.16em] uppercase text-ink hover:text-accent transition-colors"
          >
            MIT · 4ailabs/inferentia ↗
          </a>
        </div>
      </footer>
    </main>
  );
}

// ─── HeroReadout ───────────────────────────────────────────────
// Static mock of the Orchestrator output for the Ana synthetic case.
// Numbers are real — they come from running the math engine on Ana.
// This is a product snapshot, not marketing.
function HeroReadout({ locale }: { locale: "en" | "es" }) {
  const es = locale === "es";
  return (
    <div className="border border-ink bg-paper-raised relative">
      {/* Corner ticks — instrument signature */}
      <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent -translate-x-[1px] -translate-y-[1px]" />
      <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-accent translate-x-[1px] -translate-y-[1px]" />
      <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-accent -translate-x-[1px] translate-y-[1px]" />
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent translate-x-[1px] translate-y-[1px]" />

      {/* Header */}
      <div className="border-b border-rule px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-accent">
            {es ? "Sesión en vivo · Ana" : "Live session · Ana"}
          </span>
        </div>
        <span className="font-mono text-[9.5px] tracking-[0.14em] text-ink-mute">
          inf-0147
        </span>
      </div>

      {/* Two metric tiles */}
      <div className="grid grid-cols-2 border-b border-rule">
        <div className="p-5 border-r border-rule">
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-mute">
            {es ? "Rigidez" : "Rigidity"}
          </p>
          <p
            className="mt-2 editorial text-[38px] leading-none text-ink tabular-nums"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            39.8<span className="text-[18px] text-ink-mute">%</span>
          </p>
          <p className="mt-1 font-mono text-[9.5px] text-ink-mute">
            12 / 22 {es ? "nodos" : "nodes"}
          </p>
        </div>
        <div className="p-5">
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-accent">
            {es ? "ΔFree energy" : "ΔFree energy"}
          </p>
          <p
            className="mt-2 editorial text-[38px] leading-none text-accent tabular-nums"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            −7.8<span className="text-[18px] text-ink-mute">%</span>
          </p>
          <p className="mt-1 font-mono text-[9.5px] text-ink-mute">
            {es ? "12 semanas" : "12 weeks"}
          </p>
        </div>
      </div>

      {/* Active patterns */}
      <div className="px-5 py-4 border-b border-rule">
        <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-mute mb-3">
          {es ? "Patrones activos" : "Active patterns"}
        </p>
        <div className="space-y-2.5">
          {[
            { id: "i8", name: es ? "Reserva" : "Reserve", w: 0.82 },
            { id: "i2", name: es ? "Escasez" : "Scarcity", w: 0.54 },
            { id: "i4", name: es ? "Vigilancia" : "Vigilance", w: 0.31 },
          ].map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-accent w-6">
                {p.id}
              </span>
              <span className="editorial text-[13px] text-ink flex-1">
                {p.name}
              </span>
              <div className="w-24 h-1 bg-paper-soft">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${p.w * 100}%` }}
                />
              </div>
              <span className="font-mono text-[9.5px] text-ink-mute tabular-nums w-8 text-right">
                {p.w.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top leverage */}
      <div className="px-5 py-4">
        <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-mute mb-3">
          {es ? "Apalancamiento primario" : "Primary leverage"}
        </p>
        <p className="editorial text-[15px] text-ink leading-tight">
          {es ? "Control inflamatorio" : "Inflammation control"}
        </p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-ink-mute leading-[1.5]">
          EPA+DHA · curcumin · NAC · quercetin
        </p>
        <p className="mt-3 text-[11px] italic text-ink-quiet leading-[1.5]">
          {es
            ? "Dosis ajustada por rs174547 (FADS1): EPA preformado ↑."
            : "Dose adjusted by rs174547 (FADS1): preformed EPA ↑."}
        </p>
      </div>
    </div>
  );
}

function MarkGlyph() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="20" cy="20" r="5" fill="var(--accent)" />
      <path
        d="M2 20 L13 20 M27 20 L38 20 M20 2 L20 13 M20 27 L20 38"
        stroke="currentColor"
        strokeWidth="0.6"
      />
    </svg>
  );
}
