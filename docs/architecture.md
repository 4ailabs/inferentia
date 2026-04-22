# Architecture — Inferentia

## Two-level architecture (patient + clinician)

Unified backend, two rendered outputs, two Next.js views.

```
┌──────────────────────────────────────────────────────────┐
│  PATIENT VIEW (Next.js /patient)                          │
│  Accessible narrative, agency panel, predictive map       │
└──────────────────────────────────────────────────────────┘
                          ↕ same data, different rendering
┌──────────────────────────────────────────────────────────┐
│  OPUS 4.7 OUTPUT TRANSFORMERS                             │
│  renderForPatient(json) · renderForClinician(json)        │
└──────────────────────────────────────────────────────────┘
                          ↕
┌──────────────────────────────────────────────────────────┐
│  UNIFIED BACKEND ENGINE (single JSON output)              │
│  • Orchestrator (Opus 4.7 + Claude Agent SDK)             │
│  • Multimodal capture (narrative, prosody, HRV-sim)       │
│  • Active Inference motor (pymdp, Vercel Sandbox)         │
│  • Bayesian SNP inference (NumPyro, Vercel Sandbox)       │
│  • MIRT/CAT adaptive interview (Vercel Sandbox)           │
│  • Reactome pathway analysis                              │
└──────────────────────────────────────────────────────────┘
                          ↕
┌──────────────────────────────────────────────────────────┐
│  CLINICIAN VIEW (Next.js /clinician)                      │
│  Full posteriors, SNPs, metabolic signature, note editor  │
└──────────────────────────────────────────────────────────┘
```

## Flow

1. Patient completes multimodal intake (narrative + audio for prosody + simulated HRV).
2. Backend engine infers predictive priors (Active Inference), maps to clinical instance (BV4 imprints), predicts metabolic signature (DBN), infers prior SNPs (Bayesian posterior).
3. Two renderers produce patient-friendly and clinician-technical outputs from the same JSON.
4. Clinician validates, edits nutritional program, signs.
5. Patient receives validated program + sees agency delta pre/post.

## Demo shortcut

For the hackathon demo, clinician validation happens in a second browser tab (split screen), not through an async flow. Async flow is Phase 2.

## Five MVP outputs (details)

1. **Predictive Map** — active priors + multimodal evidence + rigidity + body zones.
2. **Expected Metabolic Signature** — HbA1c, HOMA-IR, cortisol, HRV, etc. with CI and discordance vs. labs.
3. **Prioritized SNPs** (clinician only) — top 10–20 with OR and rationale.
4. **Salutogenic Nutritional Program** — clinician-validated, agency-oriented, flexibility-expanding.
5. **Agency Panel pre/post** — Pearlin Mastery (brief) + author-derived interoceptive items + perceived-options delta.

## Phase 2 (post-hackathon)

- Interactive counterfactuals with longitudinal simulation.
- Automated clinical notes (markdown + PDF + HL7 FHIR).
- Printable patient PDF.
- Longitudinal inter-session trajectory.
- Full async patient ↔ clinician flow with authentication.
- Wearable integration (Apple Watch, Oura).
- Formal clinical validation study.
