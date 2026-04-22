# Imprints — Conceptual Overview

> **One-page reference for clinicians, judges, and LLM context.** Explains what an imprint is, why Inferentia categorizes patients by imprint (not by disease), and how to read an imprint signature. Referenced by the README, the clinical renderer, and the demo pitch.

## What is an imprint?

An **imprint** is a complete biological survival program that the nervous system installed at a specific moment when an adaptive defense could not complete its cycle. It is not a trauma (which describes the event), not a schema (which describes the belief), not a pattern (which describes the behavior). It is the **full program still active**: the prediction the system is making, the allostatic cascade that prediction drives, the somatic signature that reveals it, and the genetic vulnerability that makes it more likely to install.

From the perspective of Active Inference (Friston, Clark, Barrett), an imprint is a **rigid predictive prior** — a belief the nervous system holds strongly about what will happen next, defended so tightly that new evidence cannot update it easily. The allostatic machinery (Sterling & Eyer; McEwen) is the downstream consequence: the body prepares metabolically for what its prior predicts, whether or not that prediction matches present reality.

Imprints are not invented by any individual. They are **evolutionary heritage** — documented homologues exist in over thirty species of mammals, birds, reptiles, and even crustaceans (Humphreys & Ruxton, 2018). What distinguishes humans is the capacity to **interrupt the defensive cycle** before discharge completes — a verbal instruction, an absence of co-regulation, a caregiver paradox, a physical immobilization. The response was adaptive; the interruption made it chronic.

## The four constituents of an imprint

Every imprint in Inferentia is characterized by four coupled components:

1. **Active predictive prior** — the IF-THEN rule the nervous system runs continuously. *IF [trigger class] THEN [allostatic cascade].*
2. **Allostatic cascade** — the pre-emptive bodily preparation: autonomic bias, HPA axis configuration, metabolic routing, inflammatory tone.
3. **Multimodal signature** — the observable downstream: labs, biomarkers, HRV, composition, microbiota, sleep architecture, interoceptive phenomenology.
4. **Genetic enrichment** — the SNP profile that raises the posterior probability of this imprint installing given a triggering event.

When Inferentia classifies a patient as "i8 Reserva, posterior 0.72", it is saying: **given this phenotype, the most coherent explanation is that this person's nervous system is running the Reserva program** — predicting scarcity, preparing metabolically for it, producing the observed signature, likely carrying the relevant genetic susceptibility.

## Why 13 imprints

The taxonomy maps onto biological substrates documented independently in the affective neuroscience literature:

| Panksepp circuit / substrate | Imprints |
|---|---|
| **FEAR** | i1 Desacople · i2 Acorazamiento · i6 Camuflaje |
| **RAGE** | i4 Fijación Externa |
| **PANIC-GRIEF** | i8 Reserva · i9 Confluencia · i10 Vinculación · i12 Desarraigo · i13 Encapsulamiento |
| **CARE (inward-distorted)** | i3 Retracción · i5 Compresión |
| **Dorsal-vagal collapse** (Porges) | i7 Hibernación |
| **Transgenerational / epigenetic** | i11 Superposición |

The number 13 is not arbitrary: each imprint represents a distinct strategy-outcome combination along the progressive defensive scale (from experience fragmentation to emotional-center sealing). Multiple imprints can coexist in one patient; clinically most individuals carry two to four active imprints with one dominant.

## Why classify by imprint, not by disease

This is the thesis of Inferentia. Contemporary medicine treats the signature (the biomarker, the symptom); Inferentia treats the prior that is producing it.

| Conventional paradigm | Inferentia (Active Inference) |
|---|---|
| Symptom → diagnosis → symptomatic treatment | Multimodal signature → active prior → prior update |
| Categorization by organ system (endocrine, cardio...) | Categorization by survival logic |
| Isolated indicator (HbA1c, LDL) | Integrated phenotype (metabolic + autonomic + behavioral + somatic) |
| Normalize the biomarker | Expand the cognitive cone (Levin, 2019) |
| Standardized patient | Radical individualization via imprint |
| Physician decides | Patient operates their own model (agency) |

A patient does not "have diabetes" in isolation. A patient has an **imprint whose metabolic signature includes elevated HbA1c, visceral adiposity, insulin resistance, and lowered HDL**. The disease is a downstream fingerprint of an upstream predictive program. Treating the fingerprint without updating the program reliably reproduces the condition.

## How imprints differ from adjacent frameworks

| Framework | What it names | What it misses that imprints capture |
|---|---|---|
| DSM diagnosis | Clinical presentation | Mechanism, adaptive logic, somatic signature, multimodal coupling |
| Trauma (ACE, PTSD) | The event that occurred | The active program still running decades later |
| Early maladaptive schema (Young) | The belief structure | The autonomic/metabolic/genetic substrate |
| Attachment pattern (Bowlby, Main) | The relational configuration | The full physiological signature beyond interpersonal dynamics |
| Parts / protectors (IFS) | Subpersonalities and their functions | Evolutionary-biological grounding, cross-species homologues |

Imprints are **not a replacement** for these frameworks. They are a more integrated and mechanism-oriented substrate onto which clinicians from other traditions can map their familiar constructs. A schema therapist recognizing "Abandonment schema" will see i8 Reserva or i10 Vinculación depending on the somatic-autonomic signature; both mappings are valid within Inferentia.

## How Inferentia uses imprints operationally

1. **Signature file** (`docs/imprint_signatures/iN_name.md`) encodes each imprint as a 31-dimensional multivariate Gaussian — ten physiological dimensions plus genetic enrichment.
2. **Parser** (`parse_signatures.py`) reads these markdown files into numeric parameters automatically; no hand-coding per imprint.
3. **Classifier** (`imprint_gmm.py`) takes a partial patient phenotype and returns a posterior distribution over imprints, handling missing observations by marginalization.
4. **SNP prior conditional** — the inferred dominant imprint raises the prior probability of its characteristic SNP set, which the Bayesian genetic engine then uses to prioritize nutrigenomic testing.
5. **Signature predictor** — given the imprint, the engine predicts the expected metabolic signature with credible intervals, enabling the clinician to see where the patient's current labs agree and where they discord (discordances are diagnostic clues).
6. **Agency restoration** — the imprint is not presented as diagnosis but as **a hypothesis the patient can see, question, and update**. The outcome measured pre/post is not the biomarker but the patient's agency delta.

## A precision for clinicians

An imprint is a **probabilistic hypothesis**, never a label. A posterior of 0.70 means "given the evidence, this is the most coherent reading — but 0.30 probability mass lies elsewhere, requiring clinical judgment". Inferentia's two-level architecture exists precisely because the clinician validates, corrects, and contextualizes the hypothesis before it reaches the patient as actionable content. The system surfaces evidence; the clinician interprets it.

## A precision for non-clinical judges

If you are evaluating this project and the taxonomy of 13 imprints is unfamiliar, the **mathematical substance** is independent of the clinical ontology: Inferentia could operate with schemas, attachment patterns, or any other clinical framework providing the same multimodal signature granularity. The Bayesian engine, the Active Inference motor, and the two-level agency architecture are the technical contribution. The imprint taxonomy is the **clinical instance** we use because it is the author's primary clinical framework and because its cross-species evolutionary grounding gives it unusual theoretical coherence.

## The 13 imprints — canonical names (Spanish) with English gloss

Canonical names are preserved in Spanish as authored in the BV4 framework. Each entry lists the Spanish name (authoritative), a brief English gloss (for international readers), the dominant Panksepp circuit, and the core predictive prior.

| ID | Canonical (ES) | Gloss (EN) | Circuit | Active prior (one-line) |
|---|---|---|---|---|
| **i1** | Desacople | Decoupling / fragmentation | FEAR / dorsal vagal | Predicts sudden impact; fragments experience pre-emptively |
| **i2** | Acorazamiento | Armoring | FEAR | Predicts betrayal in closeness; blocks the posterior body |
| **i3** | Retracción | Retraction | CARE (inward) | Predicts punishment for exposure; occupies less space than due |
| **i4** | Fijación Externa | External fixation | RAGE | Predicts persistent aggressor; directs sustained attention outward |
| **i5** | Compresión | Compression | CARE (inward) | Predicts punishment for expression; receives but cannot emit |
| **i6** | Camuflaje | Camouflage | FEAR | Predicts danger in visibility; operates in not-being-seen mode |
| **i7** | Hibernación | Hibernation | dorsal-vagal collapse | Predicts that any action costs more than available resource |
| **i8** | Reserva | Reserve | PANIC-GRIEF | Predicts scarcity; accumulates resources that are never enough |
| **i9** | Confluencia | Confluence | PANIC-GRIEF | Predicts loss of bond if differentiated; merges self with other |
| **i10** | Vinculación | Bonding-via-symptom | PANIC-GRIEF | Predicts exclusion if well; maintains symptom as belonging signal |
| **i11** | Superposición | Superposition | transgenerational / epigenetic | Runs a vital program inherited, not one's own |
| **i12** | Desarraigo | Uprooting | PANIC-GRIEF | Predicts no safe territory exists; cannot land anywhere |
| **i13** | Encapsulamiento | Encapsulation | PANIC-GRIEF | Predicts that loving from inside is dangerous; seals the emotional center |

The English glosses are approximations for accessibility; they do not replace the canonical Spanish terms. When communicating with clinicians or judges in English, the preferred form is *"imprint i8 Reserva (scarcity-anticipation program)"* — canonical name first, gloss parenthetical.

## Key references

- Friston, K. (2010). The free-energy principle: a unified brain theory? *Nat Rev Neurosci.*
- Panksepp, J. (1998). *Affective Neuroscience.*
- Porges, S.W. (2011). *The Polyvagal Theory.*
- Sterling, P., Eyer, J. (1988). Allostasis: a new paradigm to explain arousal pathology.
- Barrett, L.F. (2017). *How Emotions Are Made.*
- Levin, M. (2019). The computational boundary of a "self": developmental bioelectricity drives multicellularity and scale-free cognition. *Frontiers in Psychology.*
- Humphreys, R.K., Ruxton, G.D. (2018). A review of thanatosis (death feigning) as an anti-predator behaviour. *Behav Ecol Sociobiol.*
- Ojeda Rios, M. (2026). BV4 Clinical Treatise (unpublished, author-independent IP).
