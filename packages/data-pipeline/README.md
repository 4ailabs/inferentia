# data-pipeline

Extraction and preprocessing scripts for public biomedical datasets used in Inferentia.

## Datasets

- **GWAS Catalog** (EBI, CC0) — filtered to nutrigenomic-relevant SNPs.
- **gnomAD** (CC0) — population frequencies for prior computation.
- **Reactome** (CC0) — metabolic pathway enrichment.

KEGG is intentionally **not** used (licensing friction for open-source projects).

## Scripts

- `extract_gwas_nutrigenomic.py` — download GWAS Catalog, filter to relevant traits, output JSON.
- `extract_gnomad_frequencies.py` — fetch population frequencies for target SNPs.
- `build_snp_prior_table.py` — merge GWAS + gnomAD into the canonical prior table used by `math_engine/snp_bayes.py`.

All data is fetched on-demand at build time, not committed to the repo.
Output goes to `/data/pipeline/` (gitignored).
