"""
Parse imprint signature markdown files into numeric GMM parameters.

Each file in docs/imprint_signatures/*.md encodes the expected physiological
signature of one imprint as a Gaussian (mean + std) across 10 dimensions.

This module extracts (mu, sigma) from the markdown tables and produces
numpy arrays ready for the Bayesian GMM.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import yaml


@dataclass
class ImprintSignature:
    imprint_id: str
    imprint_name: str
    panksepp_circuit: str
    autonomic_profile: str
    status: str
    mu: np.ndarray  # shape (D,) where D = total parameters across 10 dimensions
    sigma: np.ndarray  # shape (D,)
    parameter_names: list[str] = field(default_factory=list)
    snp_priors: dict[str, float] = field(default_factory=dict)
    raw_tables: dict[str, list[dict]] = field(default_factory=dict)


# Canonical parameter ordering — must stay stable across imprints for GMM to work.
CANONICAL_PARAMS = [
    # 1. Autonomic
    ("autonomic", "Sympathetic fraction"),
    ("autonomic", "Ventral vagal fraction"),
    ("autonomic", "Dorsal vagal fraction"),
    # 2. HPA
    ("hpa", "Morning cortisol"),
    ("hpa", "CAR slope"),
    ("hpa", "Diurnal rigidity"),
    ("hpa", "Reactivity amplitude"),
    # 3. Metabolic
    ("metabolic", "HbA1c"),
    ("metabolic", "HOMA-IR"),
    ("metabolic", "Fasting glucose"),
    ("metabolic", "Triglycerides"),
    ("metabolic", "HDL cholesterol"),
    # 4. Inflammatory
    ("inflammatory", "CRP"),
    ("inflammatory", "IL-6"),
    ("inflammatory", "TNF-a"),
    ("inflammatory", "Treg/Th17 ratio"),
    # 5. HRV
    ("hrv", "SDNN"),
    ("hrv", "RMSSD"),
    ("hrv", "LF/HF ratio"),
    # 6. Body composition
    ("body", "Visceral fat"),
    ("body", "Lean mass"),
    ("body", "Body water"),
    # 7. Microbiota (F/B ratio as the only numeric proxy; enterotype is categorical → handled separately)
    ("microbiota", "F/B ratio"),
    # 9. Sleep
    ("sleep", "SWS"),
    ("sleep", "REM"),
    ("sleep", "Awakenings"),
    ("sleep", "Sleep latency"),
    # 10. Interoception
    ("interoception", "Body awareness"),
    ("interoception", "Emotional awareness"),
    ("interoception", "Self-regulation"),
    ("interoception", "Trust in body"),
]


FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)


def parse_frontmatter(text: str) -> dict:
    m = FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError("Missing YAML frontmatter")
    return yaml.safe_load(m.group(1))


def extract_tables(text: str) -> dict[str, list[dict]]:
    """
    Extract markdown tables by section heading (### 1. Autonomic, etc.).

    Returns dict mapping section slug → list of row dicts with keys:
    {'Parametro': str, 'Valor esperado': float|None, 'Incertidumbre': float|None, ...}
    """
    sections = {
        "1. Autonomic balance": "autonomic",
        "2. HPA axis": "hpa",
        "3. Metabolic": "metabolic",
        "4. Inflammatory": "inflammatory",
        "5. HRV": "hrv",
        "6. Body composition": "body",
        "7. Microbiota": "microbiota",
        "9. Sleep architecture": "sleep",
        "10. Interoception": "interoception",
    }

    out: dict[str, list[dict]] = {}
    for heading, slug in sections.items():
        pattern = rf"###\s+{re.escape(heading)}.*?\n(.*?)(?=\n###|\n---\n|\Z)"
        m = re.search(pattern, text, re.DOTALL)
        if not m:
            out[slug] = []
            continue
        out[slug] = _parse_markdown_table(m.group(1))
    return out


def _parse_markdown_table(block: str) -> list[dict]:
    """Parse a single markdown table block into list of dicts."""
    lines = [ln.strip() for ln in block.splitlines() if ln.strip().startswith("|")]
    if len(lines) < 3:
        return []
    headers = [h.strip() for h in lines[0].strip("|").split("|")]
    rows = []
    for line in lines[2:]:
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) != len(headers):
            continue
        rows.append(dict(zip(headers, cells)))
    return rows


def _parse_numeric(cell: str) -> float | None:
    """
    Parse numeric cell. Handles:
    - "0.72"
    - "20.5"
    - "±4.5"  → 4.5
    - "3.2" (with leading ± stripped)
    - empty/missing → None
    """
    if not cell or cell in ("—", "-", "|"):
        return None
    # Strip ± and other non-numeric prefix
    cleaned = re.sub(r"[±\s%]", "", cell)
    # Try to extract first float
    m = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    if not m:
        return None
    try:
        return float(m.group(0))
    except ValueError:
        return None


def extract_snp_priors(text: str) -> dict[str, float]:
    """Extract SNP prior elevations from section 8."""
    pattern = r"###\s+8\.\s+Genetic enrichment.*?\n(.*?)(?=\n###|\n---\n|\Z)"
    m = re.search(pattern, text, re.DOTALL)
    if not m:
        return {}
    rows = _parse_markdown_table(m.group(1))
    out = {}
    for row in rows:
        rsid = row.get("SNP rsID", "").strip()
        elevation_str = row.get("Expected prior elevation", "").strip()
        if rsid and rsid.startswith("rs"):
            val = _parse_numeric(elevation_str)
            if val is not None:
                out[rsid] = val
    return out


def parse_imprint_file(path: Path) -> ImprintSignature:
    """
    Parse one imprint signature file into an ImprintSignature object.

    For skeleton files (values missing), returns NaN for missing parameters.
    The GMM will handle NaN by using population priors for those dimensions.
    """
    text = path.read_text(encoding="utf-8")
    fm = parse_frontmatter(text)
    tables = extract_tables(text)

    mu_list: list[float] = []
    sigma_list: list[float] = []
    names: list[str] = []

    for section_slug, param_name in CANONICAL_PARAMS:
        rows = tables.get(section_slug, [])
        # Find the row whose first column matches param_name
        match = next(
            (r for r in rows if _first_col_matches(r, param_name)),
            None,
        )
        if match is None:
            mu_list.append(float("nan"))
            sigma_list.append(float("nan"))
        else:
            val_col = next(
                (k for k in match.keys() if "Valor" in k or "Value" in k),
                None,
            )
            unc_col = next(
                (k for k in match.keys() if "Incertidumbre" in k or "Uncertainty" in k or "σ" in k),
                None,
            )
            mu = _parse_numeric(match.get(val_col, "")) if val_col else None
            sigma = _parse_numeric(match.get(unc_col, "")) if unc_col else None
            mu_list.append(mu if mu is not None else float("nan"))
            sigma_list.append(sigma if sigma is not None else float("nan"))
        names.append(f"{section_slug}.{param_name}")

    return ImprintSignature(
        imprint_id=fm.get("imprint_id", "unknown"),
        imprint_name=fm.get("imprint_name", ""),
        panksepp_circuit=fm.get("panksepp_circuit", ""),
        autonomic_profile=fm.get("autonomic_profile", ""),
        status=fm.get("status", "unknown"),
        mu=np.array(mu_list, dtype=np.float64),
        sigma=np.array(sigma_list, dtype=np.float64),
        parameter_names=names,
        snp_priors=extract_snp_priors(text),
        raw_tables=tables,
    )


def _first_col_matches(row: dict, target: str) -> bool:
    if not row:
        return False
    first_value = next(iter(row.values()), "")
    return target.lower() in first_value.lower()


def load_all_imprints(signatures_dir: Path) -> list[ImprintSignature]:
    """Load every i*.md file in the signatures directory."""
    paths = sorted(p for p in signatures_dir.glob("i*.md") if p.stem != "TEMPLATE")
    return [parse_imprint_file(p) for p in paths]


if __name__ == "__main__":
    import json
    import sys

    directory = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/imprint_signatures")
    imprints = load_all_imprints(directory)
    summary = [
        {
            "id": imp.imprint_id,
            "name": imp.imprint_name,
            "status": imp.status,
            "filled_params": int(np.sum(~np.isnan(imp.mu))),
            "total_params": len(imp.mu),
            "snp_count": len(imp.snp_priors),
        }
        for imp in imprints
    ]
    print(json.dumps(summary, indent=2))
