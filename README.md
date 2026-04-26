# Inferentia

Built with Opus 4.7 · Cerebral Valley × Anthropic Hackathon · April 2026

---

## Core thesis

> *An ill person is an organism executing predictions across its four cognitive levels — cellular bioelectric, organic homeostasis, somatic unconscious, explicit consciousness. Altered biomarkers, chronic symptoms, metabolic rigidity: all are the signature of instructions the organism keeps executing, not memories it consults. Inferentia identifies those active instructions — predictive imprints, deficiencies limiting regulation, toxins forcing the system, available agency, amplifying genetics — and computes which interventions expand the frontier the pattern contracted. The outcome is not normalizing a value: it is enabling the organism to do more.*

**Tesis (original, español):**

> *Una persona enferma es un organismo ejecutando predicciones en sus cuatro niveles cognitivos — bioeléctrico celular, homeostasis orgánica, inconsciente somático y consciencia explícita. Biomarcadores alterados, síntomas crónicos, rigidez metabólica: todo es la signatura de instrucciones que el organismo sigue ejecutando, no recuerdos que consulta. Inferentia identifica esas instrucciones activas — improntas predictivas, carencias que limitan la regulación, toxinas que fuerzan el sistema, agencia disponible, genética amplificadora — y calcula qué intervenciones expanden la frontera que el patrón contrajo. El outcome no es normalizar un valor: es que el organismo pueda más.*

## What Inferentia does

Inferentia is a clinical tool that identifies active predictive instructions across six co-present layers — **active imprints, nutritional substrate, toxic load, available agency, inferred nutrigenomic profile, and observable signature** — and computes interventions that expand the organism's regulatory capacity. The computational engine combines **Active Inference** (Friston) with **multivariate Bayesian classification** over clinical signatures, integrating the **TAME multi-scale cognition framework** (Levin), **phenotypic flexibility** (van Ommen), and the **BV4 clinical framework** (Ojeda Rios, proprietary).

## Status

**Research prototype — built during Cerebral Valley × Anthropic Hackathon (2026-04-21 through 2026-04-26).**

- Not a medical device.
- Not a diagnostic tool.
- Not a replacement for professional medical consultation.
- Clinical validation: planned for Phase 2, post-hackathon.

## Architecture (two-level, clinician-validated)

```
  Clinician                              Patient
/clinico/inferentia                  /paciente/inferentia
        │                                   │
        │    (localStorage handshake)       │
        │  ┌────────────────────────────┐   │
        └──▶  Same JSON, two audiences  ◀───┘
             └────────────┬──────────────┘
                          │
                  /api/orchestrator
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
  Metabolic           Nutrigenomic      Orchestrator
  Mathematician       Advisor           (Opus 4.7
  (4 math modules,    (25-modulator     extended thinking,
  22 nodes,           knowledge base,   BV4 Treatise
  8 flexibility       SNP-aware         cached)
  components,         selection)
  leverage,
  free energy)
```

All clinical content requires clinician validation before reaching the patient. The patient view renders only the salutogenic narrative, humanized plan, and confidence — no raw JSON, no technical jargon.

## What actually shipped (2026-04-23)

- **4 deterministic math modules in TypeScript** — `system-state.ts` (22 metabolic nodes with rigidity 0..1 + reversibility class), `flexibility-index.ts` (8-component PFF vector), `leverage-finder.ts` (imprint-aware intervention ranking), `free-energy-estimator.ts` (counterfactual prediction of load released).
- **25-modulator curated knowledge base** (`modulators-db.json`) with real references (REDUCE-IT 2019 NEJM, Calder 2017, Yin 2008 Metabolism, etc.), SNP interactions (FADS1 rs174547, MTHFR rs1801133, etc.), dose ranges in canonical units, contraindications, and BV4 imprint alignment annotations. No generic adaptogens.
- **4 Opus 4.7 agents** with extended thinking (adaptive + effort): Clinical Reasoner (`/api/reasoner`), Metabolic Mathematician (`/api/math-agent`), Nutrigenomic Advisor (`/api/nutrigenomic-agent`), and Orchestrator (`/api/orchestrator`) that synthesizes the other three.
- **Two-level UI** — `/clinico/inferentia` (technical, 4 panels streaming SSE) and `/paciente/inferentia` (humanized, body map + narrative + plan). Handshake via `localStorage`.
- **Demo fallback** — if `DEMO_MODE=1` or the Opus call fails, the orchestrator serves a pre-recorded snapshot of the Ana case so the demo never breaks.

## MVP outputs

1. **Predictive Map** — body map silhouette with BV4 imprint zones illuminated.
2. **Counterfactual Prediction** — % of system load releasable in 12 weeks if primary leverage is worked, with ceiling disclosure.
3. **Molecular Protocol** — modulators with dose, timing, form, SNP adjustment, and evidence level per item.
4. **Salutogenic Narrative for Patient** — second-person, jargon-free explanation authored by Opus.
5. **Monitoring + Sequencing** — biomarkers to repeat at 8-12 weeks, phased rollout (weeks 1-4 / 5-8 / 9-12).

## How to run

```bash
git clone https://github.com/4ailabs/inferentia
cd inferentia/packages/web
pnpm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
# (or set DEMO_MODE=1 to use the pre-recorded snapshot)
pnpm dev
```

Then open `http://localhost:3000/clinico/inferentia?lang=es`, click "Ana · 34F i8" to load the demo case, and press "Iniciar orquestación". The pipeline takes ~40-60 seconds end-to-end with real Opus; <5 seconds in demo mode.

## Theoretical framework

Pilar references (not exhaustive):

- Friston (2010, 2017) — Free Energy Principle / Active Inference.
- Sterling & Eyer (1988); McEwen (1998, 2017) — Allostasis / allostatic load.
- Barrett (2017) — Predictive interoceptive construction.
- Porges (2011) — Polyvagal Theory.
- Levin (2019) — TAME framework / cognitive cone.

The clinical instance used in this prototype references the author's independent clinical framework (BV4 Clinical Treatise, Dr. Miguel Ojeda Rios) — a taxonomy of 13 survival imprints with canonical Spanish names. **That framework is proprietary to the author and is not included in this repository.** This hackathon project is a distinct new implementation that references BV4 only as one of several possible clinical ontologies mappable to the Active Inference substrate. For a one-page conceptual overview including Spanish-English term equivalences, see [docs/concepts/imprints_overview.md](docs/concepts/imprints_overview.md).

## Originality and scope declaration (hackathon compliance)

- **All code in this repository was written during the hackathon** (2026-04-21 onward).
- **No prior code, models, or datasets have been reused.**
- **No real patient data is used anywhere.** All demonstrations use a synthetic patient generated by the author.
- The author's independent clinical framework (BV4) is referenced as intellectual context but is not included in code or data form in this repo.

## Open source and licensing

- This project is released under the **MIT License** (see LICENSE).
- All dependencies are open source. See CREDITS.md for the full list and respective licenses.
- Public biomedical datasets used (see CREDITS.md): GWAS Catalog (EBI, CC0), gnomAD (CC0), Human Phenotype Ontology (CC-BY), Reactome (CC0).
- Psychometric instruments: Pearlin Mastery Scale (public domain, Pearlin & Schooler 1978). Interoceptive items are author-derived; no copyrighted instrument has been copied.

## Usage policy compliance

This project operates within Anthropic's Usage Policy. Specifically:

- The system does not provide autonomous medical diagnosis or treatment recommendations to end users.
- All clinical outputs are presented as probabilistic hypotheses requiring professional validation.
- The two-level architecture (patient view + clinician validation gate) ensures human oversight of all clinical content delivered to patients.
- Language in the patient-facing interface is strictly probabilistic and non-directive.

## Disclaimers

This prototype is for research and demonstration purposes only.

- Not approved by any regulatory body (FDA, EMA, COFEPRIS, etc.).
- Not intended for clinical decision-making in production settings.
- Not to be used as a substitute for professional medical advice, diagnosis, or treatment.
- The author assumes no liability for use outside the controlled demonstration context of the hackathon.

## Team

- **Dr. Miguel Ojeda Rios** — Author, clinical lead, full stack (solo team).

## Submission

- Hackathon: Built with Opus 4.7 (Cerebral Valley × Anthropic).
- Problem statement: #1 — Build From What You Know.
- Submission deadline: 2026-04-26, 20:00 EST.
