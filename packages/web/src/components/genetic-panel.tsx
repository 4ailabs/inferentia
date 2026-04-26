"use client";

import { useMemo } from "react";

type RecommendedSnp = {
  rsid: string;
  gene: string;
  clinical_action: string;
};

type GeneticPanelProps = {
  snps: RecommendedSnp[];
  dominantImprint: string;
  locale?: "en" | "es";
};

// Función simple para generar un OR (Odds Ratio) determinístico y pseudo-aleatorio
// basado en el nombre del gen, solo para el MVP visual del Hackathon.
function generateMockOR(seedStr: string): string {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const minOR = 1.2;
  const maxOR = 2.8;
  const pseudoRandom = Math.abs(Math.sin(hash));
  const orValue = minOR + pseudoRandom * (maxOR - minOR);
  return orValue.toFixed(2);
}

export function GeneticPanel({
  snps,
  dominantImprint,
  locale = "en",
}: GeneticPanelProps) {
  if (!snps || snps.length === 0) return null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-4">
        {snps.map((snp) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const mockOR = useMemo(() => generateMockOR(snp.gene), [snp.gene]);
          
          return (
            <div 
              key={snp.rsid} 
              className="border border-rule bg-paper px-4 py-3 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="tabular text-[14px] font-medium text-accent">
                      {snp.rsid}
                    </span>
                    <span className="text-[12px] font-mono tracking-widest text-ink-soft uppercase">
                      {snp.gene}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-ink-quiet leading-snug">
                    {snp.clinical_action}
                  </p>
                </div>
                
                {/* OR Badge */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[9px] uppercase tracking-widest text-ink-mute mb-1">
                    Risk OR
                  </span>
                  <div className="bg-accent/10 border border-accent/20 px-2 py-1">
                    <span className="tabular text-[12px] font-medium text-accent">
                      {mockOR}x
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t border-rule/50 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-ink-mute">
                  {locale === "es" ? "Relevancia:" : "Relevance:"}
                </span>
                <span className="text-[10px] tabular text-ink-soft bg-paper-raised px-1.5 py-0.5 border border-rule">
                  {dominantImprint.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
