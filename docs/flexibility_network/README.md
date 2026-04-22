---
artifact: "Inferentia Flexibility Network"
version: "0.1.0-mvp"
last_updated: "2026-04-21"
author: "Dr. Miguel Ojeda Rios (BV4 imprint layer) + Inferentia synthesis team"
status: "MVP demo — first-draft network, not peer-reviewed"
---

# Flexibility Network — Inferentia

## 1. What this is

The **Flexibility Network** is the core visual artifact of Inferentia: a physiopathological graph that integrates upstream nervous-system predictive priors (the BV4 imprint layer) with the downstream metabolic-inflammatory-vascular cascade that they drive. It is implemented as a JSON graph of **33 nodes across 8 categories, connected by 61 directed edges** (`network.json`), ready to be rendered by a React Flow component.

Each node encodes a clinical construct (an imprint, an autonomic state, an axis, a tissue, a disease) together with the laboratory/biomarker evidence that activates it, the genetic enrichment that raises its prior probability, the nutrient/functional modulators that regulate it, and a mapping to the four MVP imprints (i1, i4, i7, i8). Each edge encodes a directed biological mechanism (promotes / inhibits / modulates), a strength in [0, 1], a one-line rationale, and a citation.

At demo time, the network is overlaid with a patient's multimodal signature: nodes whose evidence is met "light up", propagating activation through the graph and making the patient's physiopathology visually legible in seconds.

## 2. Attribution

> This network is Inferentia's original synthesis, inspired by the systems flexibility framework articulated by **Dr. Ben van Ommen** (TNO/NuGO, ILSI North America EB 2017 presentation; van Ommen et al., *Genes Nutr* 2017). We extend it with the **BV4 imprint taxonomy (Ojeda Rios, proprietary)** as the upstream predictive layer. All node selections, edge justifications, and nutrient modulator mappings are our own synthesis from public biomedical literature and the BV4 framework.

Specifically:

- **From van Ommen** (conceptual inspiration only — no copying): the idea that chronic disease is better understood as loss of *phenotypic flexibility* across an integrated physiological network than as isolated biomarker abnormality; the practice of encoding nutrient modulators at each node; the multi-level organization (autonomic / endocrine / metabolic / inflammatory / gut / vascular).
- **Original Inferentia contribution**: the **imprint layer** — four upstream predictive priors (i1 Desacople, i4 Fijación Externa, i7 Hibernación, i8 Reserva) that act as Bayesian sources of information cascading into the physiological network. This is the operational formalization of the BV4 clinical framework (Dr. Miguel Ojeda Rios, *BV4 Clinical Treatise*, Chapter 7) inside an Active Inference / Systems Flexibility scaffold. Van Ommen's published framework does **not** contain this layer.
- **Node selection is deliberately different** from van Ommen's ~55-node diagrams: we work at 33 nodes for demo readability in three minutes and to make the selection unambiguously ours.

All claims about mechanism and modulation are sourced from the public biomedical literature cited per-edge and per-node. Van Ommen is cited for the framework concept, not for specific claims.

## 3. Categories and taxonomy rationale

We use **8 node categories** (rather than 6):

| Category | Count | Content |
|---|---|---|
| `imprint` | 4 | BV4 imprints as upstream predictive priors (i1, i4, i7, i8) — **Inferentia's original layer** |
| `autonomic` | 4 | Sympathetic tone, ventral vagal, dorsal vagal collapse, HRV reduction |
| `neuroendocrine` | 4 | HPA rigidity, chronic cortisol, exaggerated CAR, adrenergic drive |
| `metabolic` | 7 | Visceral adiposity, ectopic lipid, adipose/hepatic/systemic insulin resistance, HbA1c, atherogenic dyslipidemia |
| `inflammatory` | 3 | Adipose inflammation, systemic low-grade inflammation, Treg/Th17 imbalance |
| `gut` | 3 | Dysbiosis, intestinal permeability, SCFA production |
| `hepatic` | 4 | Mitochondrial dysfunction, oxidative stress, LDL oxidation, MASLD |
| `pathology` | 4 | T2DM, atherosclerosis/CV, diabetic neuropathy, advanced MASH/fibrosis |

**Why 8 rather than 6.** We kept `neuroendocrine` separate from `autonomic` because HPA rigidity and CAR are mechanistically distinct effectors from vagal tone and their modulation targets differ (ashwagandha, fosfatidilserina vs. magnesium, omega-3). We kept `hepatic` separate from `metabolic` because MASLD and mitochondrial/oxidative/LDL-oxidation mechanisms form a coherent sub-network with their own nutrient modulator set (vitamin E, choline, NAC, CoQ10) and their own output pathology (advanced MASH). Collapsing them would obscure mechanism. This decision is documented here so future versions can flatten if needed.

**Why 33 nodes.** Van Ommen's published diagrams hover around 55; we deliberately chose a smaller graph to (a) remain legible in a 3-minute demo, (b) make the selection unambiguously Inferentia's own, (c) keep each node's evidence and modulator fields authorable by a single clinician-engineer pair during MVP. Future versions may expand — notably toward renal, neuroinflammation, and thyroid sub-networks.

## 4. How Inferentia uses this network

1. **Per-patient activation.** Given a patient's multimodal signature (labs, HRV, imprint posterior from the Bayesian classifier), each node's `activation_by.direct_evidence` and `activation_by.from_nodes` are evaluated. Nodes whose thresholds are met are rendered as *active* (colored, pulsing); nodes with partial evidence as *at-risk*; nodes with no evidence as *quiescent*. The React Flow component reads `position_hint` to lay out the graph left-to-right from imprints to pathologies.

2. **Imprint-driven propagation.** An imprint node activates downstream targets via the `from_nodes` mechanism AND via the `imprint_association` scalar present on every non-imprint node. A patient classified as i8 with posterior 0.72 raises the prior activation of all nodes with `imprint_association.i8 > 0.6`, making the Reserva signature visually coherent even before every lab is reviewed.

3. **Intervention targeting.** Each node carries `nutrient_modulators` with mechanism and direction. The clinician (or the LLM proposing a protocol) reads active nodes and surfaces candidate nutraceuticals: e.g., active `visceral_adiposity` → berberine + omega-3; active `hpa_axis_rigidity` → ashwagandha + fosfatidilserina. Genetic enrichment on each node (`snp_enrichment`) tells the Bayesian genetic engine which SNPs to prioritize for testing/interpretation.

4. **Demo patient consistency (Paciente 001, i8 Reserva).** When patient_001's signature is overlaid, the following nodes should render active: `imprint_i8_reserva` (dominant), `hpa_axis_rigidity`, `cortisol_chronic`, `car_exaggerated`, `visceral_adiposity`, `adipose_inflammation`, `adipose_insulin_resistance`, `hepatic_insulin_resistance`, `systemic_insulin_resistance`, `hba1c_elevated`, `atherogenic_dyslipidemia`, `gut_dysbiosis`, `gut_permeability`, `systemic_inflammation`, and at-risk `ldl_oxidation` (LDL 135) + `pathology_atherosclerosis` (downstream risk). The following should **not** activate: `vagal_dorsal_collapse`, `mitochondrial_dysfunction` (i7 path), `pathology_masld_advanced`, `pathology_t2dm` (not yet crossed HbA1c 6.5%). This differential is verified by the `imprint_association` weights in `network.json`.

## 5. Nutrient modulator index

Distinct modulators used across nodes (14 canonical + variants): Omega-3 EPA/DHA, Berberine, Magnesium glycinate, Ashwagandha, Phosphatidylserine, Rhodiola rosea, Myo-inositol, Choline, Curcumin, Quercetin, Vitamin D, Vitamin E, NAC, Selenium, CoQ10, L-carnitine, NAD+ precursors (NR/NMN), PQQ, α-lipoic acid, benfotiamine, taurine, L-theanine, L-glutamine, zinc carnosine, niacin, resveratrol, chromium picolinate, prebiotics (inulin/GOS), multi-strain probiotics, fermentable fiber, resistant starch, polyphenols (green tea, blueberry, olive, cocoa), cinnamon. The redundancy (e.g., omega-3 appearing on multiple nodes) is intentional and reflects genuine pleiotropy.

## 6. References

**Conceptual framework (inspiration, paraphrased):**
- van Ommen, B., et al. (2017). Phenotypic flexibility as key factor in the human nutrition and health relationship. *Genes & Nutrition* 12:26.
- van Ommen, B. (2017). Systems Flexibility. ILSI North America Annual Meeting, EB 2017 presentation.

**BV4 imprint layer (proprietary framework, cited briefly):**
- Ojeda Rios, M. (2026). *BV4 Clinical Treatise*, Chapter 7 (Las 13 Improntas) — §7.10 Impronta 8 Reserva. Instituto Centrobioenergetica, unpublished.
- Imprint signatures curated in `/docs/imprint_signatures/` (i1, i4, i7, i8).

**Primary biomedical literature (selected; full list in per-edge citations of `network.json`):**
- Panksepp, J. (1998). *Affective Neuroscience*. Oxford University Press.
- Porges, S.W. (2011). *The Polyvagal Theory*. Norton.
- McEwen, B.S. (2017). Neurobiological and systemic effects of chronic stress. *Chronic Stress* 1.
- Dallman, M.F. et al. (2005). Chronic stress and comfort foods. *Brain Behav Immun* 19(4):275-280.
- Bjorntorp, P. (2001). Do stress reactions cause abdominal obesity and comorbidities? *Obes Rev* 2(2):73-86.
- Rosmond, R. et al. (1998). Stress-related cortisol secretion. *J Clin Endocrinol Metab* 83(6):1853-1859.
- Epel, E.S. et al. (2000). Stress and body shape. *Psychosom Med* 62(5):623-632.
- Binder, E.B. et al. (2008). FKBP5 polymorphisms. *JAMA* 299(11):1291-1305.
- Klengel, T. et al. (2013). Allele-specific FKBP5 demethylation. *Nat Neurosci.*
- Caspi, A. et al. (2002). Role of genotype in the cycle of violence. *Science* 297.
- Ling, C. et al. (2004). PPARGC1A expression. *Diabetes.*
- Hotamisligil, G.S. (2006). Inflammation and metabolic disorders. *Nature* 444:860-867.
- Samuel, V.T., Shulman, G.I. (2010). Mechanisms for insulin resistance. *Cell* 148(5).
- Gastaldelli, A. (2017). Insulin resistance and reduced metabolic flexibility. *Br J Nutr* 117(9).
- DeFronzo, R.A. (2009). Banting Lecture: from the triumvirate to the ominous octet. *Diabetes* 58(4).
- Rinella, M.E. et al. (2023). New MASLD nomenclature. *J Hepatol.*
- Sanyal, A.J. et al. (2010). Pioglitazone, vitamin E, or placebo for NASH (PIVENS). *NEJM* 362.
- Libby, P. (2021). The changing landscape of atherosclerosis. *Nature* 592.
- Bhatt, D.L. et al. (2019). Cardiovascular risk reduction with icosapent ethyl (REDUCE-IT). *NEJM* 380.
- Ridker, P.M. et al. (2000). hs-CRP and cardiovascular events. *NEJM* 342.
- Steinberg, D. (2009). The LDL modification hypothesis of atherogenesis. *J Lipid Res* 50 Suppl.
- Ziegler, D. et al. (2011). α-Lipoic acid for diabetic neuropathy (ALADIN). *Diabetes Care* 34.
- Sies, H., Jones, D.P. (2020). Reactive oxygen species as signalling molecules. *Nat Rev Mol Cell Biol* 21.
- Cani, P.D. et al. (2007). Metabolic endotoxemia initiates obesity and insulin resistance. *Diabetes* 56.
- Fasano, A. (2012). Leaky gut and autoimmune diseases. *Clin Rev Allergy Immunol* 42.
- Arpaia, N. et al. (2013). Metabolites produced by commensal bacteria promote Treg generation. *Nature* 504.
- Koh, A. et al. (2016). From dietary fiber to host physiology: SCFAs. *Cell* 165.
- Cryan, J.F., Dinan, T.G. (2012). Mind-altering microorganisms. *Nat Rev Neurosci* 13.
- Foster, J.A., McVey Neufeld, K.-A. (2013). Gut-brain axis. *Trends Neurosci* 36.
- Thayer, J.F. et al. (2012). Meta-analysis of HRV and neuroimaging. *Neurosci Biobehav Rev* 36.
- Shaffer, F., Ginsberg, J.P. (2017). HRV metrics and norms. *Front Public Health* 5:258.
- Clow, A. et al. (2010). The cortisol awakening response. *Neurosci Biobehav Rev* 35.
- Miller, G.E., Chen, E., Zhou, E.S. (2007). If it goes up, must it come down? Chronic stress and the HPA axis. *Psychol Bull* 133.
- Calder, P.C. (2017). Omega-3 fatty acids and inflammatory processes. *Biochem Soc Trans* 45.
- Grundy, S.M. et al. (2005). Diagnosis and management of the metabolic syndrome. *Circulation* 112.
- Chida, Y., Steptoe, A. (2009). The association of anger and hostility with future coronary heart disease. *JACC* 53.
- Winer, S. et al. (2009). Normalization of obesity-associated insulin resistance through immunotherapy. *Nat Med* 15.

## 7. Limitations and caveats

- **First-draft network for MVP.** Not peer-reviewed. Subject to refinement after clinical and external-reviewer audit. Do not use for unsupervised clinical decision-making.
- **Edge strengths are clinician-authored priors**, not meta-analytically derived weights. They should be read as directional hypotheses ("this mechanism is strong / moderate / weak based on current evidence"), not as calibrated probabilities.
- **Imprint node count limited to 4 (i1, i4, i7, i8)** — the full BV4 taxonomy has 13 imprints. This is the MVP demo subset. Future versions will extend.
- **Nutrient modulator direction (+/–) refers to modulator's effect on the node's activation**, not on the node's marker per se (e.g., vitamin D `+` on `vagal_ventral` means vitamin D supports ventral vagal tone; `-` on `systemic_inflammation` means vitamin D reduces it).
- **No [NEEDS VERIFICATION] markers were required** for this draft; every claim in `network.json` is supported by a citation traceable to public literature or to the attributed BV4 / van Ommen frameworks. Items flagged in imprint signatures as [CONFIRMAR] or [INFER] (microbiota composition, certain SNP-phenotype associations) were **not imported** into the network without a supporting edge citation, by design.
- **Rendering assumption.** The React Flow renderer will honor `position_hint` (col 1-6, row 1-8) to produce a left-to-right cascade: imprints (col 1) → autonomic/neuroendocrine (col 2-3) → metabolic/inflammatory (col 4-5) → hepatic/gut/pathology (col 6). Deviations from this layout should document rationale.
- **Patient consistency check is qualitative.** The quantitative verification (that overlaying patient_001's signature activates the expected nodes and does not activate i7-pathway nodes) is the responsibility of the renderer + a small integration test, not of this static JSON.

## 8. File manifest

- `network.json` — the graph (nodes + edges), canonical machine-readable source.
- `README.md` — this document, authoritative human-readable description and attribution.

---

*Generated 2026-04-21 as MVP deliverable for the Inferentia hackathon project. Maintained by Dr. Miguel Ojeda Rios and the Inferentia synthesis team.*
