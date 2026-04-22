# Credits and Third-Party Licenses

All third-party components used in Inferentia are open source. Licenses are listed below for transparency and compliance with hackathon rules.

## Runtime and frameworks

| Component | License | Purpose |
|---|---|---|
| Next.js | MIT | Web application framework |
| React | MIT | UI library |
| TypeScript | Apache 2.0 | Language |
| Node.js | MIT-like (Node.js license) | Runtime |
| Python 3.x | PSF License | Math engine runtime |

## AI and inference

| Component | License | Purpose |
|---|---|---|
| Anthropic Claude API (Opus 4.7, Sonnet 4.6, Haiku 4.5) | Proprietary API (Anthropic TOS) | LLM orchestration — this hackathon is explicitly built on Anthropic's Claude API |
| Vercel AI SDK v6 | Apache 2.0 | LLM orchestration, streaming, tool use |
| Vercel AI Gateway | Service (platform) | Multi-provider routing |
| pymdp | MIT | Active Inference / POMDP inference engine |
| NumPyro | Apache 2.0 | Bayesian probabilistic programming (MCMC) |
| JAX | Apache 2.0 | Numerical backend for NumPyro |

## Frontend components

| Component | License | Purpose |
|---|---|---|
| shadcn/ui | MIT | UI component system |
| Tailwind CSS | MIT | Styling |
| Radix UI | MIT | Accessible primitives |
| Recharts / Visx | MIT | Data visualization |

## Multimodal capture (MVP)

| Component | License | Purpose |
|---|---|---|
| OpenAI Whisper (v3) | MIT | Speech-to-text transcription |
| librosa | ISC | Acoustic feature extraction (prosody) |

## Infrastructure

| Component | License | Purpose |
|---|---|---|
| Vercel Sandbox | Service (platform) | Isolated Python execution |
| Vercel Fluid Compute | Service (platform) | Deployment runtime |
| Vercel Blob | Service (platform) | Private file storage |
| Neon Postgres (via Vercel Marketplace) | Service (open-source core PostgreSQL) | Session persistence |

## Biomedical datasets (public)

| Dataset | License | Citation |
|---|---|---|
| GWAS Catalog (EBI) | CC0 | Sollis et al., Nucleic Acids Res. 2023 |
| gnomAD | CC0 | Karczewski et al., Nature 2020 |
| Human Phenotype Ontology (HPO) | CC-BY 4.0 | Köhler et al., Nucleic Acids Res. 2021 |
| Reactome | CC0 | Gillespie et al., Nucleic Acids Res. 2022 |

KEGG is intentionally not used in the hackathon MVP to avoid licensing friction. Pathway analysis relies on Reactome (CC0) exclusively.

## Psychometric instruments

| Instrument | Status | Notes |
|---|---|---|
| Pearlin Mastery Scale | Public domain | Pearlin & Schooler, 1978 |
| Interoceptive items | Author-derived | Inspired by but not copied from MAIA; no copyrighted material reused |

## Theoretical references

The Active Inference framework and related theory references (Friston, Barrett, Porges, Sterling, McEwen, Levin) are cited as academic sources in documentation. No proprietary content is reproduced.

## Project license

This project is released under the MIT License. See LICENSE.
