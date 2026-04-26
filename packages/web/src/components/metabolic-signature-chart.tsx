"use client";

import type { Discordance } from "@/lib/clinical-schema";

type MetabolicSignatureChartProps = {
  discordances: Discordance[];
  locale?: "en" | "es";
};

export function MetabolicSignatureChart({
  discordances,
  locale = "en",
}: MetabolicSignatureChartProps) {
  if (!discordances || discordances.length === 0) return null;

  return (
    <div className="w-full">
      <ul className="space-y-6">
        {discordances.map((d) => {
          const isDiscordant = d.direction !== "concordant";
          const span = d.expected_high - d.expected_low;
          // Si por alguna razón el span es 0, evitamos división por cero
          const safeSpan = span === 0 ? 1 : span;
          
          // Mapeamos expected_low a 30% y expected_high a 70%
          let percent = 30 + ((d.measured - d.expected_low) / safeSpan) * 40;
          // Clamp para que el punto no se salga visualmente del contenedor
          percent = Math.max(5, Math.min(95, percent));

          // Colores semánticos
          const dotColor = isDiscordant ? "bg-danger" : "bg-ink";
          const rangeColor = isDiscordant ? "bg-danger/10 border-danger/20" : "bg-rule/40 border-rule";
          
          return (
            <li key={d.marker} className="relative">
              <div className="flex items-baseline justify-between mb-2">
                <span className="tabular font-medium text-ink text-[13px]">
                  {d.marker}
                </span>
                <span
                  className={`tabular text-[11px] ${
                    isDiscordant ? "text-danger font-medium" : "text-ink-quiet"
                  }`}
                >
                  {d.measured} · expected {d.expected_low}–{d.expected_high}
                  {isDiscordant && (
                    <> · {d.direction === "above_expected" ? "↑" : "↓"}</>
                  )}
                </span>
              </div>

              {/* Chart Track */}
              <div className="relative h-6 w-full flex items-center">
                {/* Línea base sutil */}
                <div className="absolute w-full h-[1px] bg-rule" />
                
                {/* Zona esperada (30% a 70%) */}
                <div 
                  className={`absolute h-3 top-1.5 left-[30%] w-[40%] border-x ${rangeColor}`} 
                />

                {/* Valor medido */}
                <div
                  className={`absolute w-3 h-3 rounded-full top-1.5 shadow-sm transform -translate-x-1/2 transition-all duration-700 ease-out ${dotColor}`}
                  style={{ left: `${percent}%` }}
                />
              </div>

              {/* Rationale/Note */}
              <p className="mt-2 text-[11.5px] text-ink-quiet leading-snug">
                {d.clinical_note}
              </p>
            </li>
          );
        })}
      </ul>
      
      {/* Leyenda visual */}
      <div className="mt-6 flex items-center gap-4 text-[10px] tabular tracking-wide uppercase text-ink-mute border-t border-rule pt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-rule/40 border-x border-rule" />
          <span>{locale === "es" ? "Rango de firma esperada" : "Expected signature range"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-danger" />
          <span>{locale === "es" ? "Discordancia" : "Discordance"}</span>
        </div>
      </div>
    </div>
  );
}
