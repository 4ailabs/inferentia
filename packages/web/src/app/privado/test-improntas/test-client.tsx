"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types mirrored from server (kept loose to avoid importing the loader
//     which is server-only). ────────────────────────────────────────────

type LikertItem = { id: string; text: string };
type ChecklistBlock = { prompt: string; items: string[] };
type ImprintDefinition = {
  id: string;
  name_es: string;
  name_en: string;
  mechanism_es: string;
  items: {
    A: LikertItem[];
    B: LikertItem[];
    C_checklist: ChecklistBlock;
    D: LikertItem[];
    E: LikertItem;
    R: LikertItem;
  };
};
type ImprintBank = {
  version: string;
  generated: string;
  scoring: {
    weights: { A: number; B: number; C: number; D: number; E: number; R: number };
    thresholds: { probable: number; strong: number; coactivation_gap: number };
  };
  imprints: ImprintDefinition[];
};

type ImprintScore = {
  imprint_id: string;
  name_es: string;
  name_en: string;
  total: number;
  band: "below" | "probable" | "strong";
  breakdown: {
    A: { mean: number | null; count_valid: number; count_total: number; weighted: number };
    B: { mean: number | null; count_valid: number; count_total: number; weighted: number };
    C: { marked: number; total: number; proportion: number; weighted: number };
    D: { mean: number | null; count_valid: number; count_total: number; weighted: number };
    E: { value: number | null; weighted: number };
    R: { value: number | null; reverse: number | null; weighted: number };
  };
  missing_items: string[];
};
type TestResult = {
  version: string;
  scores: ImprintScore[];
  dominant: string;
  top_gap: number;
  coactivation: boolean;
  runner_up: string | null;
  top3: ImprintScore[];
  flags: string[];
};

const LIKERT_OPTIONS: Array<{ value: number; label: string; short: string }> = [
  { value: 0, label: "No lo sé / no puedo contactar", short: "—" },
  { value: 1, label: "Totalmente falso", short: "1" },
  { value: 2, label: "Mayormente falso", short: "2" },
  { value: 3, label: "A veces sí, a veces no", short: "3" },
  { value: 4, label: "Mayormente cierto", short: "4" },
  { value: 5, label: "Totalmente cierto", short: "5" },
];

export default function TestImprontasClient() {
  const [bank, setBank] = useState<ImprintBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [likert, setLikert] = useState<Record<string, number>>({});
  const [checklist, setChecklist] = useState<Record<string, number[]>>({});
  const [expandedImprint, setExpandedImprint] = useState<string | null>("i1");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/test-improntas")
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        const j = await r.json();
        if (!cancelled) setBank(j.bank as ImprintBank);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLikertFor = useCallback((id: string, value: number) => {
    setLikert((prev) => ({ ...prev, [id]: value }));
  }, []);

  const toggleChecklist = useCallback((imprintId: string, idx: number) => {
    setChecklist((prev) => {
      const current = prev[imprintId] ?? [];
      const has = current.includes(idx);
      return {
        ...prev,
        [imprintId]: has ? current.filter((x) => x !== idx) : [...current, idx],
      };
    });
  }, []);

  const runScoring = useCallback(async () => {
    if (!bank) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/test-improntas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ responses: { likert, checklist } }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? `status ${res.status}`);
        return;
      }
      setResult(j.result as TestResult);
      // Scroll a resultado
      setTimeout(() => {
        const el = document.getElementById("result");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [bank, likert, checklist]);

  const progress = useMemo(() => {
    if (!bank) return { answered: 0, total: 0 };
    let total = 0;
    let answered = 0;
    for (const imp of bank.imprints) {
      // 2 A + 2 B + 2 D + 1 E + 1 R = 8 Likert por impronta
      const likertIds = [
        ...imp.items.A.map((i) => i.id),
        ...imp.items.B.map((i) => i.id),
        ...imp.items.D.map((i) => i.id),
        imp.items.E.id,
        imp.items.R.id,
      ];
      total += likertIds.length;
      for (const id of likertIds) {
        if (typeof likert[id] === "number") answered++;
      }
    }
    return { answered, total };
  }, [bank, likert]);

  const resetAll = useCallback(() => {
    if (!confirm("¿Borrar todas las respuestas y empezar de nuevo?")) return;
    setLikert({});
    setChecklist({});
    setResult(null);
    setError(null);
  }, []);

  if (loading) {
    return (
      <p className="eyebrow">Cargando banco de ítems…</p>
    );
  }
  if (loadError || !bank) {
    return (
      <div className="border border-danger bg-paper-raised p-6 max-w-[60ch]">
        <p className="eyebrow" style={{ color: "#8A2C1B" }}>
          Error cargando el banco
        </p>
        <p className="mt-3 text-[13px] text-ink-soft">{loadError ?? "Banco vacío"}</p>
        <p className="mt-3 text-[12px] text-ink-mute">
          Verifica que el archivo esté en:
          <code className="block mt-1 tabular">
            /Users/miguel/Claude_hackathon/improntas_test/data/imprint-test-v2.json
          </code>
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Header con progreso */}
      <section className="border border-ink bg-paper-raised px-6 py-5 mb-6 sticky top-0 z-10">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="eyebrow eyebrow-accent">Progreso</p>
            <p className="mt-2 editorial text-[22px] text-ink">
              {progress.answered} / {progress.total} ítems respondidos
            </p>
            <p className="mt-1 text-[11.5px] text-ink-mute">
              Escala 0–5. El 0 significa "no lo sé / no accesible" y no
              afecta el score de esa dimensión.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetAll}
              className="text-[11px] text-ink-mute hover:text-danger underline decoration-rule underline-offset-4"
            >
              Reiniciar
            </button>
            <button
              onClick={runScoring}
              disabled={running || progress.answered === 0}
              className="inline-flex items-center gap-3 bg-accent text-paper px-5 py-3 text-[13px] tracking-wide hover:bg-accent-deep transition-colors disabled:opacity-50"
            >
              {running ? "Calculando…" : "Ver resultado →"}
            </button>
          </div>
        </div>
        <div className="mt-3 h-[4px] bg-paper-soft overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progress.total > 0 ? (progress.answered / progress.total) * 100 : 0}%` }}
          />
        </div>
      </section>

      {/* Error inline */}
      {error && (
        <div className="border border-danger bg-paper-raised px-4 py-3 mb-4 text-[12.5px] text-danger">
          {error}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <section id="result" className="mb-10 border-2 border-ink bg-paper-raised px-6 py-6">
          <p className="eyebrow eyebrow-accent">Resultado del test</p>
          <h2 className="mt-3 editorial text-[28px] text-ink leading-tight">
            Impronta dominante:{" "}
            <span className="text-accent">
              {result.top3[0]?.name_es ?? "—"}
            </span>{" "}
            <span className="tabular text-[18px] text-ink-quiet">
              ({result.top3[0]?.total.toFixed(2) ?? "—"} / 5)
            </span>
          </h2>

          {result.flags.length > 0 && (
            <ul className="mt-4 space-y-1">
              {result.flags.map((f, i) => (
                <li
                  key={i}
                  className="text-[11.5px] text-ink-soft border-l-2 border-accent pl-3 italic"
                >
                  {f}
                </li>
              ))}
            </ul>
          )}

          {/* Top 3 */}
          <div className="mt-6">
            <p className="eyebrow">Top 3</p>
            <ul className="mt-3 space-y-3">
              {result.top3.map((s, idx) => {
                const pct = (s.total / 5) * 100;
                const color =
                  s.band === "strong"
                    ? "bg-accent"
                    : s.band === "probable"
                      ? "bg-accent/60"
                      : "bg-ink-quiet";
                return (
                  <li key={s.imprint_id}>
                    <div className="flex items-baseline justify-between">
                      <span className="editorial text-[15px] text-ink">
                        {idx + 1}. {s.imprint_id} · {s.name_es}{" "}
                        <span className="tabular text-[11px] text-ink-mute">
                          ({s.band === "strong" ? "fuerte" : s.band === "probable" ? "probable" : "por debajo del umbral"})
                        </span>
                      </span>
                      <span className="tabular text-[12px] text-accent">
                        {s.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 h-[5px] bg-paper-soft overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[10.5px] tabular text-ink-mute">
                      A {s.breakdown.A.mean?.toFixed(2) ?? "—"} · B{" "}
                      {s.breakdown.B.mean?.toFixed(2) ?? "—"} · C{" "}
                      {s.breakdown.C.marked}/{s.breakdown.C.total} ({(s.breakdown.C.proportion * 100).toFixed(0)}%) · D{" "}
                      {s.breakdown.D.mean?.toFixed(2) ?? "—"} · E{" "}
                      {s.breakdown.E.value ?? "—"} · R{" "}
                      {s.breakdown.R.value ?? "—"} (penalty{" "}
                      {s.breakdown.R.weighted.toFixed(2)})
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Todos los scores */}
          <details className="mt-6">
            <summary className="eyebrow cursor-pointer hover:text-accent">
              Ver scores de las 13 improntas
            </summary>
            <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[11.5px]">
              {result.scores
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((s) => (
                  <li key={s.imprint_id} className="flex items-baseline justify-between">
                    <span className="text-ink-quiet">
                      {s.imprint_id} · {s.name_es}
                    </span>
                    <span className="tabular text-ink-quiet">{s.total.toFixed(2)}</span>
                  </li>
                ))}
            </ul>
          </details>
        </section>
      )}

      {/* Improntas — acordeón */}
      <section className="space-y-3">
        {bank.imprints.map((imp) => {
          const isOpen = expandedImprint === imp.id;
          const imprintItems = [
            ...imp.items.A,
            ...imp.items.B,
            ...imp.items.D,
            imp.items.E,
            imp.items.R,
          ];
          const answered = imprintItems.filter(
            (i) => typeof likert[i.id] === "number",
          ).length;
          const checkedCount = (checklist[imp.id] ?? []).length;

          return (
            <div
              key={imp.id}
              className={`border ${isOpen ? "border-ink" : "border-rule"} bg-paper-raised`}
            >
              <button
                onClick={() =>
                  setExpandedImprint(isOpen ? null : imp.id)
                }
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-paper-soft"
              >
                <span className="flex items-baseline gap-3">
                  <span className="tabular text-[10.5px] text-ink-mute">
                    {isOpen ? "−" : "+"}
                  </span>
                  <span className="editorial text-[17px] text-ink">
                    {imp.id.toUpperCase()} · {imp.name_es}
                  </span>
                  <span className="text-[11.5px] italic text-ink-quiet">
                    {imp.mechanism_es}
                  </span>
                </span>
                <span className="tabular text-[10.5px] text-ink-mute">
                  {answered}/{imprintItems.length} · ✓{checkedCount}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-6 pt-1 border-t border-rule space-y-6">
                  {/* Tipo A — Shock */}
                  <Block
                    label="A · Shock originario"
                    items={imp.items.A}
                    likert={likert}
                    onSet={setLikertFor}
                  />
                  {/* Tipo B — Predicción implícita */}
                  <Block
                    label="B · Efecto del prior activo"
                    items={imp.items.B}
                    likert={likert}
                    onSet={setLikertFor}
                    sublabel="Reporta el efecto que notas en tu cuerpo / conducta. La coletilla 'aunque racionalmente no sé por qué' filtra creencias N2."
                  />
                  {/* Tipo C — Checklist */}
                  <div>
                    <p className="eyebrow">C · Firma somática observable</p>
                    <p className="mt-1 text-[11.5px] text-ink-mute">
                      {imp.items.C_checklist.prompt}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {imp.items.C_checklist.items.map((text, idx) => {
                        const isMarked = (checklist[imp.id] ?? []).includes(idx);
                        return (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => toggleChecklist(imp.id, idx)}
                              className="w-full flex items-start gap-3 text-left px-3 py-2 border border-rule hover:border-ink transition-colors"
                            >
                              <span
                                className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 border ${
                                  isMarked
                                    ? "bg-ink text-paper border-ink"
                                    : "border-rule"
                                }`}
                              >
                                {isMarked ? "✓" : ""}
                              </span>
                              <span className="text-[12.5px] text-ink-soft leading-snug">
                                {text}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {/* Tipo D — Conductual */}
                  <Block
                    label="D · Firma conductual"
                    items={imp.items.D}
                    likert={likert}
                    onSet={setLikertFor}
                  />
                  {/* Tipo E — Vivencial */}
                  <Block
                    label="E · Frase vivencial central"
                    items={[imp.items.E]}
                    likert={likert}
                    onSet={setLikertFor}
                  />
                  {/* Tipo R — Reverse */}
                  <Block
                    label="R · Capacidad sana intacta (reverse-keyed)"
                    items={[imp.items.R]}
                    likert={likert}
                    onSet={setLikertFor}
                    sublabel="Este ítem se puntúa invertido — una respuesta alta aquí baja el score de impronta."
                    accent="accent"
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Footer con CTA al final */}
      <section className="mt-10 flex items-center justify-between gap-4 border-t border-rule pt-6">
        <p className="text-[11.5px] text-ink-mute">
          Cuando termines — o en cualquier momento — pulsa "Ver resultado"
          arriba para ver el score por impronta.
        </p>
        <button
          onClick={runScoring}
          disabled={running || progress.answered === 0}
          className="inline-flex items-center gap-3 bg-accent text-paper px-5 py-3 text-[13px] tracking-wide hover:bg-accent-deep disabled:opacity-50"
        >
          {running ? "Calculando…" : "Ver resultado →"}
        </button>
      </section>
    </>
  );
}

function Block({
  label,
  items,
  likert,
  onSet,
  sublabel,
  accent,
}: {
  label: string;
  items: LikertItem[];
  likert: Record<string, number>;
  onSet: (id: string, v: number) => void;
  sublabel?: string;
  accent?: "accent";
}) {
  return (
    <div>
      <p className={`eyebrow ${accent ? "eyebrow-accent" : ""}`}>{label}</p>
      {sublabel && (
        <p className="mt-1 text-[11px] italic text-ink-mute max-w-[72ch]">
          {sublabel}
        </p>
      )}
      <ul className="mt-3 space-y-4">
        {items.map((it) => {
          const v = likert[it.id];
          return (
            <li key={it.id}>
              <p className="text-[13.5px] text-ink-soft leading-snug">
                <span className="tabular text-[10.5px] text-ink-mute mr-2">
                  {it.id}
                </span>
                {it.text}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LIKERT_OPTIONS.map((opt) => {
                  const selected = v === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onSet(it.id, opt.value)}
                      title={opt.label}
                      className={`px-3 py-1.5 text-[11.5px] tabular tracking-wide border transition-colors ${
                        selected
                          ? "bg-ink text-paper border-ink"
                          : "border-rule text-ink-mute hover:border-ink"
                      }`}
                    >
                      <span className="font-medium">{opt.short}</span>
                      <span className="ml-2 opacity-70 hidden sm:inline">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
