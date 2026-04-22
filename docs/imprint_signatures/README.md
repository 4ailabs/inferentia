# Imprint Signatures — Clinical Parameter Tables

Each imprint is represented as a **multivariate Gaussian component** in a 10-dimensional physiological space. These tables encode the prior beliefs about the expected signature of each imprint, derived from clinical expertise (Dr. Miguel Ojeda Rios, BV4 framework) and peer-reviewed literature.

## MVP scope

4 imprints for hackathon MVP (i1, i4, i7, i8). Chosen for maximum clinical contrast and coverage of the 3 autonomic branches.

- **i1 Desacople** — sympathetic dominance with hippocampal dysfunction.
- **i4 Fijación Externa** — sympathetic sustained + RAGE circuit (Panksepp).
- **i7 Hibernación** — dorsal vagal collapse, metabolic depression.
- **i8 Reserva** — mixed autonomic + HPA rigidity, scarcity prediction.

## The 10 physiological dimensions

1. **Autonomic balance** (sympathetic / ventral vagal / dorsal vagal) — sums to 1.0
2. **HPA axis** (cortisol morning, CAR slope, diurnal rigidity, reactivity)
3. **Metabolic** (HbA1c, HOMA-IR, fasting glucose, triglycerides, HDL)
4. **Inflammatory** (CRP, IL-6, TNF-α, Treg/Th17 ratio)
5. **HRV** (SDNN, RMSSD, LF/HF)
6. **Body composition** (visceral fat %, lean mass %, body water %)
7. **Microbiota** (dominant enterotype, Firmicutes/Bacteroidetes ratio, SCFA production)
8. **Genetic enrichment** (expected SNP prior elevation, top 10 relevant nutrigenomic SNPs)
9. **Sleep architecture** (SWS %, REM %, awakenings, latency)
10. **Interoception** (MAIA-like dimensions, author-derived items)

## File format

Each imprint has its own `i{N}_{name}.md` file with YAML frontmatter + structured markdown. The math engine parses these directly into GMM priors.

## Files

- `TEMPLATE.md` — blank template to copy for each new imprint.
- `i1_desacople.md` — reference implementation (base from BV4 Treatise Cap07).
- `i4_fijacion_externa.md` — skeleton, pending fill.
- `i7_hibernacion.md` — skeleton, pending fill.
- `i8_reserva.md` — skeleton, pending fill (MVP demo patient).

## How to fill an imprint signature

1. Copy `TEMPLATE.md` or start from the skeleton already created.
2. For each dimension, fill:
   - **Expected value** (mean of the Gaussian).
   - **Uncertainty** (standard deviation).
   - **Clinical rationale** (1-3 lines).
   - **Literature reference** (1-2 key refs, not exhaustive).
3. The math engine will automatically convert this to priors for the GMM and DBN.

## What the math engine does with these tables

```python
# Pseudocode
for each imprint_file in imprint_signatures/*.md:
    signature = parse_markdown(imprint_file)
    mu, sigma = extract_gaussian_params(signature)
    components.append(GaussianComponent(mu, sigma))

gmm = BayesianGMM(components, prior_weights=population_frequencies)
# Given patient phenotype → posterior over imprints
posterior = gmm.infer(patient_phenotype)
```

## References

Full bibliography in `/docs/references.md`. Priority references cited inline using `[author_year]` format.
