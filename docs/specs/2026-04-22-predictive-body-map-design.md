# `<PredictiveBodyMap />` — Design Spec

> Fecha: 2026-04-22
> Autor: Dr. Miguel Ojeda Rios + Claude (Opus 4.7)
> Hackathon: Built with Opus 4.7 — output 1 (hero shot) del MVP
> Estado: diseño aprobado, listo para implementación

---

## Propósito

Hero shot del demo. Una vista que comunica, en 2 segundos: *"el sistema infirió una impronta dominante, y predice que se manifiesta en estas 3 zonas del cuerpo con esta intensidad."*

Es el primer frame del video del domingo 2026-04-26.

## Alcance

**Dentro:**

- Nueva sección full-width en `/session/result`, entre el safety banner y el headline editorial.
- Silueta SVG frontal andrógina con 11 zonas anatómicas pre-definidas.
- Radar 4-ejes (posterior sobre improntas i1/i4/i7/i8).
- 3 cards de predicción somática (zona + firma BV4 canónica).
- Bilingüe EN/ES via el `locale` existente.
- Mapeo determinista impronta → zonas (opción C híbrida ligera, con campo de override opcional preparado para fase 2 pero NO implementado hoy).

**Fuera (fase 2 post-hackathon):**

- Animación de pulso.
- Tooltip en hover.
- Override dinámico emitido por Sonnet 4.6 en `/api/analyze` (`body_zones_override` queda sin uso hoy).
- Vista clínica con numeritos técnicos dentro del mapa — el split de abajo ya cubre eso.

## Ubicación

`packages/web/src/app/session/result/result-client.tsx`, sección nueva insertada **después** de:

```tsx
{posterior.safety_priority !== "none" && (<section>...</section>)}
```

y **antes** de:

```tsx
{/* Headline — thesis-first */}
<section className="mt-2 border border-ink bg-paper-raised">...</section>
```

El split paciente/clínico queda intacto debajo.

## Layout

### Desktop (`lg:` breakpoint)

```
┌─────────────────────────────────────────────────────────────────┐
│  PREDICTIVE BODY MAP                    confianza · ΔF · dom.    │
├──────────────────────────┬──────────────────────────────────────┤
│                          │  RADAR (4 ejes, improntas)           │
│      ┌──────┐            │         Reserva                       │
│      │ SVG  │  ← zona 1  │           /\                         │
│      │silu  │     zona 2 │    Expl.─/  \─Cuidador               │
│      │ eta  │     zona 3 │          \  /                        │
│      └──────┘            │           \/                         │
│                          │        Conquistador                   │
│                          ├──────────────────────────────────────┤
│                          │  3 PREDICCIONES (cards)              │
│                          │  1 · [zona] · [firma somática]       │
│                          │  2 · [zona] · [firma somática]       │
│                          │  3 · [zona] · [firma somática]       │
└──────────────────────────┴──────────────────────────────────────┘
```

Grid: `grid-cols-12`. Silueta ocupa `col-span-5`, panel derecho `col-span-7`. Panel derecho subdividido en radar (top) + cards (bottom).

### Mobile (default)

Stack vertical: eyebrow → silueta → radar → cards. Sin columnas.

## Componentes (3 archivos nuevos + 1 tabla de datos)

### 1. `lib/imprint-body-map.ts`

Tabla canónica BV4, determinista. Fuente única de verdad del mapeo impronta → zonas + textos de firma somática bilingües.

```ts
export type ZoneId =
  | "occiput_nape"       // nuca / occipital
  | "jaw"                // mandíbula
  | "throat_thyroid"     // garganta / tiroides
  | "eyes_forehead"      // ojos / frente
  | "chest_diaphragm"    // pecho / diafragma
  | "solar_plexus"       // plexo solar
  | "umbilicus_core"     // ombligo / core
  | "gut"                // intestino
  | "pelvis"             // pelvis
  | "hands"              // manos
  | "legs"               // piernas
  | "vestibular";        // sistema vestibular (centro cabeza)

export type ImprintId = "i1" | "i4" | "i7" | "i8";

export type ImprintBodyMap = {
  zones: [ZoneId, ZoneId, ZoneId];
  base_weights: [number, number, number];  // suma ≤ 1, pesos relativos entre las 3 zonas
  signatures: Record<ZoneId, { en: string; es: string }>;
};

export const IMPRINT_BODY_MAP: Record<ImprintId, ImprintBodyMap> = {
  i1: { zones: ["chest_diaphragm", "jaw", "hands"], ... },
  i4: { zones: ["throat_thyroid", "solar_plexus", "pelvis"], ... },
  i7: { zones: ["eyes_forehead", "vestibular", "legs"], ... },
  i8: { zones: ["occiput_nape", "gut", "umbilicus_core"], ... },
};

export const ZONE_LABELS: Record<ZoneId, { en: string; es: string }> = { ... };
export const IMPRINT_HUMAN_LABELS: Record<ImprintId, { en: string; es: string }> = {
  i1: { en: "Conqueror", es: "Conquistador" },
  i4: { en: "Caregiver", es: "Cuidador" },
  i7: { en: "Explorer", es: "Explorador" },
  i8: { en: "Reserve",  es: "Reserva"      },
};
```

Las firmas somáticas son frases cortas (≤ 90 caracteres) ancladas al tratado BV4 — **no** se escriben al azar; se derivan del capítulo de improntas. Ejemplo i8 · occiput_nape: `"Vigilancia cervical crónica; microtensión suboccipital sostenida."` / `"Chronic cervical vigilance; sustained suboccipital microtension."`

### 2. `components/predictive-body-map/body-silhouette.tsx`

SVG inline, silueta frontal andrógina, trazo editorial.

- `viewBox="0 0 200 400"`, `preserveAspectRatio="xMidYMid meet"`.
- Stroke `#1B1613` (token `ink`), `stroke-width="1.25"`, fill `none` para el contorno.
- Las 11 zonas son `<circle>` o `<ellipse>` con `id={ZoneId}`, radio 8–16px dependiendo de la región anatómica.
- Props:

```ts
type Props = {
  highlightedZones: { id: ZoneId; intensity: number }[];  // intensity 0..1
  className?: string;
};
```

- Render: overlay `<circle>` por zona destacada con `fill="#C65A2C"` (accent) y `opacity={Math.max(0.25, intensity)}`. Un pequeño halo exterior con `opacity={intensity * 0.3}` y radio +6px para dar presencia.

### 3. `components/predictive-body-map/posterior-radar.tsx`

SVG radar 4 ejes.

- `viewBox="0 0 200 200"`.
- 4 ejes cardinales: top = Reserva (i8), right = Cuidador (i4), bottom = Conquistador (i1), left = Explorador (i7). El orden se define en código; no depende del `dominant_imprint`.
- Grid: 3 anillos concéntricos (0.33, 0.66, 1.0) en `stroke-rule` muy suave.
- Polígono de datos: `fill="#C65A2C"` con opacity 0.15, `stroke="#C65A2C"`, `stroke-width="1.5"`.
- Etiquetas exteriores: `editorial`, 10.5px, `text-ink`.
- Valor numérico junto a cada etiqueta (porcentaje), `tabular`, 9.5px, `text-ink-mute`.
- Props:

```ts
type Props = {
  imprintPosterior: { id: ImprintId; posterior: number; name: string }[];
  locale: "en" | "es";
};
```

### 4. `components/predictive-body-map/index.tsx`

Orquestador. Componente puro (no fetch, no state, solo props).

```ts
type Props = {
  posterior: ClinicalPosterior;
  locale: "en" | "es";
};
```

Lógica:

1. Lee `posterior.dominant_imprint`.
2. Obtiene `IMPRINT_BODY_MAP[dominant]`.
3. Calcula intensidad por zona:

```ts
const dominant_posterior = posterior.imprint_posterior.find(
  i => i.id === posterior.dominant_imprint
)!.posterior;

const strongest_prior_strength = Math.max(
  ...posterior.active_priors.map(p => p.strength)
);

const zone_intensity = (base_weight: number) =>
  base_weight * dominant_posterior * clip(strongest_prior_strength, 0.3, 1.0);
```

4. Construye cards de predicción:

```ts
const predictions = IMPRINT_BODY_MAP[dom].zones.map((zoneId, i) => ({
  zone_id: zoneId,
  zone_label: ZONE_LABELS[zoneId][locale],
  signature: IMPRINT_BODY_MAP[dom].signatures[zoneId][locale],
  intensity: zone_intensity(IMPRINT_BODY_MAP[dom].base_weights[i]),
}));
```

5. Render:

```tsx
<div className="px-6 md:px-10 py-8">
  <div className="flex items-baseline justify-between mb-6">
    <p className="eyebrow eyebrow-accent">Predictive Body Map</p>
    <div className="flex gap-6 text-[11px]">
      {/* confianza · ΔF · dom. */}
    </div>
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <div className="lg:col-span-5">
      <BodySilhouette highlightedZones={...} />
    </div>
    <div className="lg:col-span-7 space-y-8">
      <PosteriorRadar imprintPosterior={...} locale={locale} />
      <div className="space-y-3">
        {predictions.map(p => (
          <PredictionCard key={p.zone_id} {...p} />
        ))}
      </div>
    </div>
  </div>
</div>
```

### 5. Integración en `result-client.tsx`

Una sola sección nueva, después del safety banner:

```tsx
<section className="mt-2 border border-ink bg-paper-raised">
  <PredictiveBodyMap posterior={posterior} locale={locale} />
</section>
```

## Flujo de datos

```
ClinicalPosterior (ya existe en payload.posterior)
  ├── dominant_imprint  ──────┐
  ├── imprint_posterior ──────┤
  └── active_priors.strength ─┤
                              ↓
              IMPRINT_BODY_MAP (tabla estática)
                              ↓
        { silueta zonas 3 + radar 4 + cards 3 }
```

Cero cambios en backend. Cero tokens extra. Cero latencia extra. Todo sucede en render client.

## Tokens visuales (reuso del sistema existente)

| Elemento | Token / valor |
|---|---|
| Sección container | `border border-ink bg-paper-raised` |
| Silueta stroke | `#1B1613` (ink), 1.25px |
| Zona highlighted | `fill #C65A2C` (accent), opacity = intensity |
| Radar polígono | `fill accent/15`, `stroke accent`, 1.5px |
| Radar grid | `stroke rule`, muy suave |
| Eyebrow "Predictive Body Map" | `eyebrow eyebrow-accent` |
| Labels zonas | `editorial` 13px |
| Porcentajes | `tabular` 11px, `text-accent` |
| Card de predicción | `border-l-2 border-accent pl-4 py-2` (patrón ya usado en `soft_flags`) |

## Safety / cumplimiento

- Componente NO toma decisiones médicas autónomas — visualiza el posterior que el clínico valorará.
- Respeta la etiqueta global de disclaimer del README: "Prototipo de asistencia clínica. Validación formal pendiente."
- Si `posterior.safety_priority === "critical"`, el banner ya aparece ARRIBA del mapa; el mapa sigue visible pero el clínico ve el flag primero.
- Si `posterior.confidence < 0.5` o `had_objective_data === false`, añadir badge discreto al lado del eyebrow: `"low confidence — caveat"`.

## Testing / verificación

1. **Perfiles sintéticos manuales (3)**: Ana (i8 dom 68%), un i1 sintético (~70%), un i4 sintético (~70%). Verificar que las 3 zonas y el radar rotan correctamente por impronta.
2. **Edge cases**: confidence baja (< 0.5) → badge; posterior casi uniforme (sin dominante clara > 0.35) → el mapa sigue renderizando la dominante nominal pero con intensidad baja; test con `strongest_prior_strength = 0` → zonas en intensidad mínima (0.25, gracias al clip).
3. **Snapshot visual**: desktop 1440px y mobile 375px.
4. **Bilingüe**: toggle ES/EN rota labels de zona + etiquetas de radar + firmas somáticas.
5. **Accesibilidad básica**: `<svg role="img" aria-label="...">`, texto alternativo describiendo zonas iluminadas.

## Criterio de "hecho"

- Las 3 zonas se iluminan correctamente para los 4 improntas (i1/i4/i7/i8) verificado con perfiles sintéticos.
- El radar muestra los 4 porcentajes con los datos del posterior real de Ana.
- Las 3 cards muestran firma somática BV4 canónica en ES y EN.
- Desktop y mobile se ven sin overflow ni cortes.
- Deploy a inferentia.vercel.app funciona sin romper el resto de la página.
- El frame "hero" se puede capturar limpio para el video del domingo.

## Riesgos

1. **Silueta SVG toma más de lo previsto**: mitigación — empezar con silueta muy simple (contorno minimal, una cabeza redonda, torso trapezoide, brazos y piernas como líneas). No es un render anatómico, es un mapa simbólico.
2. **Firmas somáticas BV4 requieren consulta al tratado**: Dr. Miguel las redacta en 10 min; son 12 frases cortas × 2 idiomas.
3. **Integración rompe layout actual**: mitigación — sección self-contained, aislada del split. Si falla, revert de 15 líneas.

---

## Checklist de implementación (high-level, se detalla en plan)

- [ ] `lib/imprint-body-map.ts` con tabla completa + firmas BV4 EN/ES.
- [ ] `components/predictive-body-map/body-silhouette.tsx`.
- [ ] `components/predictive-body-map/posterior-radar.tsx`.
- [ ] `components/predictive-body-map/index.tsx`.
- [ ] Integración en `result-client.tsx`.
- [ ] Verificación con 3 perfiles sintéticos + snapshot desktop/mobile.
- [ ] Commit + deploy.
