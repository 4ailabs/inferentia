# Plan de trabajo — tarde del 2026-04-21

**Objetivo de la sesión**: llenar las firmas clínicas de las 4 improntas MVP + afinar el paciente sintético, mientras el motor matemático ya está scaffoldeado y listo para consumirlas mañana.

## Lo que YA está hecho (no tocar, solo leer si quieres contexto)

- Estructura del repo `inferentia/` creada en GitHub: https://github.com/4ailabs/inferentia
- Template de firma clínica: [docs/imprint_signatures/TEMPLATE.md](imprint_signatures/TEMPLATE.md)
- Firma de referencia i1 Desacople (llena, base tratado): [docs/imprint_signatures/i1_desacople.md](imprint_signatures/i1_desacople.md)
- Motor matemático scaffoldeado: [packages/math-engine/](../packages/math-engine/)
  - `parse_signatures.py` lee los markdowns y los convierte en parámetros GMM
  - `imprint_gmm.py` hace clasificación Bayesiana del paciente
- Script GWAS Catalog: [packages/data-pipeline/extract_gwas_nutrigenomic.py](../packages/data-pipeline/extract_gwas_nutrigenomic.py)

## Lo que tú (Dr. Ojeda) tienes que llenar hoy

3 archivos markdown. Cada uno debería tomar ~45 minutos.

### 1. [i4_fijacion_externa.md](imprint_signatures/i4_fijacion_externa.md) — Impronta RAGE

- Simpático dirigido (distinto del difuso de i1).
- HPA: cortisol alto con reactividad aguda pero menos aplanamiento diurno.
- Metabólico: lipidograma típico + cardiovascular.
- 5 SNPs del circuito RAGE (MAOA, DRD4, COMT, TPH2, SLC6A4).
- Arquetipo: paciente orientado al agresor, no suelta foco, somatización cardiovascular.

### 2. [i7_hibernacion.md](imprint_signatures/i7_hibernacion.md) — Impronta dorsal-vagal

- Dorsal vagal dominante (opuesto a i1).
- HPA: **hipo**funcional — cortisol bajo, CAR aplanada por defecto.
- Metabólico: metabolismo lento, posibles labs "normales bajos".
- SNPs: función mitocondrial, tiroides (DIO2), metabolismo energético.
- Arquetipo: paciente fatigado crónico, hipersomnia, hipotensión, labs "normales".

### 3. [i8_reserva.md](imprint_signatures/i8_reserva.md) — **PRIORIDAD ALTA** (paciente del demo)

- Ya tiene SNPs pre-llenados como hipótesis. **Confirma o ajusta**.
- Llena los valores numéricos (10 tablas).
- Completa arquetipo clínico con tu voz.
- Este archivo alimenta directamente el demo del video final.

## Cómo llenar cada tabla

Para cada parámetro:

1. **Valor esperado** = la mediana clínica de esa población con esa impronta dominante.
2. **Incertidumbre (σ)** = la desviación estándar de esa población. Regla práctica: ~20-30% de la media para la mayoría de biomarcadores; más estrecho en escalas acotadas (0-1 o 0-5).
3. **Rationale** = 1 línea con el porqué clínico.
4. **Referencia** = 1-2 refs si las tienes a mano. No exhaustivo.

### Ejemplo (de i1):

```markdown
| Morning cortisol | 20.5 | ±4.5 | μg/dL | Elevado crónicamente; eje HPA en activación sostenida |
```

Si no tienes valor preciso, **usa rangos de tu experiencia clínica + literatura que recuerdes**. No hagas investigación extensa — la Parte 2 del hackathon premia domain expertise, no citas. Valores razonables con rationale clínico valen más que precisión bibliográfica excesiva.

## Qué NO hacer

- No cambies el formato de los archivos (el parser los lee automáticamente).
- No borres las secciones de "Hipótesis" ya escritas — son tu propia guía para mantener consistencia.
- No hagas exhaustiva la bibliografía — 1-2 refs por impronta son suficientes.
- No modifiques i1 (ya está llena y es la referencia de calibración).

## Paralelamente — mientras tú llenas, yo (Claude) hago mañana

Mañana miércoles, en cuanto arranquemos:

1. Ejecuto `parse_signatures.py` sobre tus 4 markdowns llenos.
2. Pruebo `imprint_gmm.py` clasificando el paciente sintético.
3. Confirmo que el posterior de i8 para el paciente 001 da >0.60.
4. Si falla, ajustamos las firmas juntos (toma 30 min).
5. Arranco el scaffold Next.js + AI SDK.

## Si terminas temprano

Opcional: revisa y expande [docs/synthetic_patients/patient_001_reserva.md](synthetic_patients/patient_001_reserva.md). Especialmente:

- Historia biográfica (hoy solo esqueleto).
- Labs completos del paciente (ajusta números si crees que deben ser distintos).
- Confirma que la narrativa de entrevista (turnos 1-12) suena auténtica clínicamente.

## Checklist al cierre de hoy

- [ ] i4 Fijación Externa: todas las tablas llenas, arquetipo escrito.
- [ ] i7 Hibernación: todas las tablas llenas, arquetipo escrito.
- [ ] i8 Reserva: todas las tablas llenas, arquetipo escrito, SNPs revisados.
- [ ] Paciente 001: opcional — ajustes narrativos si el tiempo alcanza.
- [ ] Commit al repo con las firmas completadas.

## Comando para commit al terminar

```bash
cd /Users/miguel/Claude_hackathon/inferentia
git add docs/imprint_signatures/ docs/synthetic_patients/
git commit -m "Fill imprint signatures i4, i7, i8 + synthetic patient 001"
git push
```

O simplemente me avisas y yo hago el commit por ti.
