"""
Extract nutrigenomic-relevant SNPs from GWAS Catalog.

GWAS Catalog is public, CC0 licensed, and downloadable from:
https://www.ebi.ac.uk/gwas/docs/file-downloads

This script:
1. Downloads the latest associations TSV.
2. Filters to traits relevant to nutrition, metabolism, and behavior.
3. Extracts SNP ID, gene, OR/beta, p-value, trait.
4. Outputs JSON for consumption by the math engine.

Usage:
    python extract_gwas_nutrigenomic.py --out data/pipeline/gwas_nutrigenomic.json
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from urllib.request import urlopen

GWAS_ASSOCIATIONS_URL = "https://www.ebi.ac.uk/gwas/api/search/downloads/alternative"

# Trait keywords that qualify a SNP as "nutrigenomic-relevant".
# Covers metabolism, nutrition response, stress response, behavior, autonomic.
NUTRIGENOMIC_KEYWORDS = {
    # Metabolic
    "body mass index", "bmi", "obesity", "waist", "visceral fat",
    "hba1c", "glucose", "insulin resistance", "type 2 diabetes",
    "triglycerides", "hdl cholesterol", "ldl cholesterol",
    "metabolic syndrome", "adipose", "leptin",
    # Nutrition response
    "vitamin d", "vitamin b12", "folate", "iron", "omega-3",
    "caffeine", "lactose", "gluten", "alcohol",
    # Stress and HPA
    "cortisol", "stress response", "anxiety", "depression",
    "post-traumatic", "ptsd",
    # Behavior and appetite
    "eating behavior", "food intake", "appetite", "satiety",
    "binge eating", "food preference",
    # Autonomic and cardiovascular
    "heart rate variability", "blood pressure", "hypertension",
    # Inflammation
    "c-reactive protein", "interleukin", "il-6", "tnf",
    "inflammation",
    # Sleep
    "sleep duration", "insomnia", "circadian",
}

# SNPs we specifically care about for the MVP imprints (i1, i4, i7, i8).
# These are our "must-have" list; missing any of them should raise a warning.
MVP_CORE_SNPS = {
    # i1 Desacople
    "rs4680",    # COMT Val158Met
    "rs1360780", # FKBP5
    "rs7209436", # CRHR1
    "rs1800497", # DRD2/ANKK1
    "rs53576",   # OXTR
    "rs1801133", # MTHFR C677T
    "rs6265",    # BDNF Val66Met
    "rs25531",   # SLC6A4
    # i8 Reserva
    "rs9939609", # FTO
    "rs17782313",# MC4R
    "rs7799039", # LEP
    "rs1137101", # LEPR
    "rs4994",    # ADRB3
    "rs1042713", # ADRB2
    "rs1801282", # PPARG
    # Additional broad-spectrum
    "rs662799",  # APOA5
    "rs7903146", # TCF7L2
    "rs429358",  # APOE
}


def matches_nutrigenomic_trait(trait: str) -> bool:
    """Check if a GWAS trait string matches any nutrigenomic keyword."""
    t = trait.lower()
    return any(kw in t for kw in NUTRIGENOMIC_KEYWORDS)


def download_gwas_associations(out_path: Path) -> None:
    """Download the GWAS Catalog full associations TSV."""
    print(f"Downloading GWAS Catalog from {GWAS_ASSOCIATIONS_URL} ...", file=sys.stderr)
    with urlopen(GWAS_ASSOCIATIONS_URL) as response:
        out_path.write_bytes(response.read())
    print(f"Saved to {out_path}", file=sys.stderr)


def parse_gwas_tsv(path: Path) -> list[dict]:
    """
    Parse GWAS Catalog TSV. Extract fields:
    - SNPS (rsID)
    - MAPPED_GENE
    - DISEASE/TRAIT
    - OR or BETA
    - P-VALUE
    - RISK ALLELE FREQUENCY
    """
    rows = []
    with path.open(encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            snp = row.get("SNPS", "").strip()
            trait = row.get("DISEASE/TRAIT", "").strip()
            if not snp or not snp.startswith("rs"):
                continue
            if not matches_nutrigenomic_trait(trait):
                continue
            rows.append({
                "snp": snp.split(";")[0].strip(),  # handle multi-SNP rows
                "gene": row.get("MAPPED_GENE", "").strip(),
                "trait": trait,
                "or_beta": row.get("OR or BETA", "").strip(),
                "p_value": row.get("P-VALUE", "").strip(),
                "risk_allele_freq": row.get("RISK ALLELE FREQUENCY", "").strip(),
                "pubmed_id": row.get("PUBMEDID", "").strip(),
            })
    return rows


def summarize_by_snp(rows: list[dict]) -> dict[str, dict]:
    """Collapse multiple rows per SNP into a single record with aggregated traits."""
    agg: dict[str, dict] = {}
    for row in rows:
        snp = row["snp"]
        if snp not in agg:
            agg[snp] = {
                "snp": snp,
                "gene": row["gene"],
                "traits": [],
                "n_associations": 0,
            }
        agg[snp]["traits"].append({
            "trait": row["trait"],
            "or_beta": row["or_beta"],
            "p_value": row["p_value"],
            "pubmed_id": row["pubmed_id"],
        })
        agg[snp]["n_associations"] += 1
    return agg


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=Path("data/pipeline/gwas_nutrigenomic.json"))
    parser.add_argument("--tsv-cache", type=Path, default=Path("data/pipeline/gwas_catalog.tsv"))
    parser.add_argument("--skip-download", action="store_true", help="Use existing TSV cache")
    args = parser.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)

    if not args.skip_download or not args.tsv_cache.exists():
        args.tsv_cache.parent.mkdir(parents=True, exist_ok=True)
        download_gwas_associations(args.tsv_cache)

    rows = parse_gwas_tsv(args.tsv_cache)
    by_snp = summarize_by_snp(rows)

    missing = MVP_CORE_SNPS - by_snp.keys()
    if missing:
        print(f"⚠ MVP core SNPs missing from filtered results: {sorted(missing)}", file=sys.stderr)

    output = {
        "source": "GWAS Catalog (EBI)",
        "license": "CC0",
        "retrieved_url": GWAS_ASSOCIATIONS_URL,
        "total_snps": len(by_snp),
        "filtered_by_keywords": sorted(NUTRIGENOMIC_KEYWORDS),
        "mvp_core_snps_covered": sorted(MVP_CORE_SNPS & by_snp.keys()),
        "mvp_core_snps_missing": sorted(missing),
        "snps": by_snp,
    }

    args.out.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {len(by_snp)} SNPs to {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
