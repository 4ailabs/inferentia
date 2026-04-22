"""
Bayesian Gaussian Mixture Model over imprint signatures.

Given a patient phenotype (partial observations over 10 physiological dimensions),
compute posterior over imprints:

    P(imprint_k | phenotype) ∝ P(phenotype | imprint_k) · P(imprint_k)

Where each imprint_k is a multivariate Gaussian component parametrized from
docs/imprint_signatures/*.md.

Handles missing phenotype values (patient has partial labs) and missing imprint
parameters (skeleton imprints not yet fully characterized) via marginalization.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

try:
    import jax.numpy as jnp
    import numpyro
    import numpyro.distributions as dist
    from numpyro.infer import MCMC, NUTS

    _HAS_NUMPYRO = True
except ImportError:
    _HAS_NUMPYRO = False

from .parse_signatures import ImprintSignature, load_all_imprints


@dataclass
class ImprintPosterior:
    imprint_ids: list[str]
    imprint_names: list[str]
    posterior_probs: np.ndarray  # shape (K,), sums to 1
    posterior_std: np.ndarray  # uncertainty over each probability
    log_evidence_per_imprint: np.ndarray  # shape (K,), unnormalized log-likelihoods
    dominant_imprint: str
    dominant_prob: float
    secondary_imprint: str | None
    secondary_prob: float


def _fallback_prior_mu(parameter_index: int) -> float:
    """
    Population-level fallback priors for dimensions missing in a given imprint.
    Rough population medians; used when an imprint skeleton does not yet have
    a filled value. Keeps the GMM defined.
    """
    fallbacks = {
        0: 0.40,  # sympathetic fraction (balanced)
        1: 0.35,  # ventral vagal
        2: 0.25,  # dorsal vagal
        3: 14.0,  # morning cortisol μg/dL
        4: 5.0,  # CAR slope
        5: 0.30,  # diurnal rigidity
        6: 2.0,  # reactivity amplitude
        7: 5.4,  # HbA1c %
        8: 1.5,  # HOMA-IR
        9: 90.0,  # fasting glucose
        10: 120.0,  # triglycerides
        11: 55.0,  # HDL
        12: 1.5,  # CRP mg/L
        13: 1.5,  # IL-6
        14: 1.5,  # TNF-α
        15: 1.0,  # Treg/Th17
        16: 50.0,  # SDNN ms
        17: 35.0,  # RMSSD
        18: 1.5,  # LF/HF
        19: 10.0,  # visceral fat %
        20: 35.0,  # lean mass %
        21: 58.0,  # body water %
        22: 1.5,  # F/B ratio
        23: 20.0,  # SWS %
        24: 22.0,  # REM %
        25: 2.0,  # awakenings
        26: 15.0,  # sleep latency
        27: 3.0,  # body awareness
        28: 3.0,  # emotional awareness
        29: 3.0,  # self-regulation
        30: 3.0,  # trust in body
    }
    return fallbacks.get(parameter_index, 0.0)


def _fallback_prior_sigma(parameter_index: int) -> float:
    """Population-level fallback standard deviation."""
    fallbacks = {
        0: 0.15,
        1: 0.15,
        2: 0.12,
        3: 4.0,
        4: 2.0,
        5: 0.15,
        6: 1.0,
        7: 0.4,
        8: 0.6,
        9: 10.0,
        10: 30.0,
        11: 12.0,
        12: 1.2,
        13: 1.0,
        14: 0.9,
        15: 0.3,
        16: 15.0,
        17: 12.0,
        18: 0.7,
        19: 4.0,
        20: 5.0,
        21: 4.0,
        22: 0.8,
        23: 5.0,
        24: 5.0,
        25: 1.5,
        26: 8.0,
        27: 1.0,
        28: 1.0,
        29: 1.0,
        30: 1.0,
    }
    return fallbacks.get(parameter_index, 1.0)


def impute_imprint_signature(sig: ImprintSignature) -> tuple[np.ndarray, np.ndarray]:
    """
    Fill NaN values in an imprint signature with population-level fallbacks.
    Returns (mu, sigma) fully populated.
    """
    mu = sig.mu.copy()
    sigma = sig.sigma.copy()
    for i in range(len(mu)):
        if np.isnan(mu[i]):
            mu[i] = _fallback_prior_mu(i)
        if np.isnan(sigma[i]) or sigma[i] <= 0:
            sigma[i] = _fallback_prior_sigma(i)
    return mu, sigma


def log_likelihood_diagonal_gaussian(
    x: np.ndarray, mu: np.ndarray, sigma: np.ndarray, observed_mask: np.ndarray
) -> float:
    """
    Log-likelihood of observation x under diagonal Gaussian N(mu, diag(sigma²)).
    Only dimensions where observed_mask is True contribute.

    This is the standard trick for handling missing observations: marginalize
    by simply skipping them in the product.
    """
    if not observed_mask.any():
        return 0.0
    diff = (x[observed_mask] - mu[observed_mask]) / sigma[observed_mask]
    log_lik = -0.5 * np.sum(diff**2) - np.sum(np.log(sigma[observed_mask])) - 0.5 * np.sum(observed_mask) * np.log(
        2 * np.pi
    )
    return float(log_lik)


def classify_imprint(
    phenotype: np.ndarray,
    observed_mask: np.ndarray,
    imprints: list[ImprintSignature],
    prior_weights: np.ndarray | None = None,
) -> ImprintPosterior:
    """
    Classify a patient into the imprint space.

    Args:
        phenotype: shape (D,) — patient values for each of the 31 canonical parameters.
                   Missing values can be NaN.
        observed_mask: shape (D,) bool — True where phenotype is observed.
        imprints: list of ImprintSignature (from load_all_imprints).
        prior_weights: shape (K,) — prior probability of each imprint in population.
                       Defaults to uniform over present imprints.

    Returns:
        ImprintPosterior with normalized probabilities and dominant imprint.
    """
    if prior_weights is None:
        prior_weights = np.ones(len(imprints)) / len(imprints)
    else:
        prior_weights = prior_weights / prior_weights.sum()

    log_liks = np.zeros(len(imprints))
    for k, sig in enumerate(imprints):
        mu, sigma = impute_imprint_signature(sig)
        log_liks[k] = log_likelihood_diagonal_gaussian(phenotype, mu, sigma, observed_mask)

    log_joint = log_liks + np.log(prior_weights + 1e-12)
    # Numerically stable softmax
    log_joint -= log_joint.max()
    posteriors = np.exp(log_joint)
    posteriors /= posteriors.sum()

    # Uncertainty over posteriors via bootstrap-like perturbation of sigma (fast heuristic;
    # full MCMC via NumPyro is in `classify_imprint_mcmc` below).
    posterior_std = _approximate_posterior_std(phenotype, observed_mask, imprints, prior_weights, n_samples=50)

    order = np.argsort(-posteriors)
    dominant = order[0]
    secondary = order[1] if len(order) > 1 and posteriors[order[1]] > 0.1 else None

    return ImprintPosterior(
        imprint_ids=[imp.imprint_id for imp in imprints],
        imprint_names=[imp.imprint_name for imp in imprints],
        posterior_probs=posteriors,
        posterior_std=posterior_std,
        log_evidence_per_imprint=log_liks,
        dominant_imprint=imprints[dominant].imprint_id,
        dominant_prob=float(posteriors[dominant]),
        secondary_imprint=imprints[secondary].imprint_id if secondary is not None else None,
        secondary_prob=float(posteriors[secondary]) if secondary is not None else 0.0,
    )


def _approximate_posterior_std(
    phenotype: np.ndarray,
    observed_mask: np.ndarray,
    imprints: list[ImprintSignature],
    prior_weights: np.ndarray,
    n_samples: int = 50,
    rng_seed: int = 42,
) -> np.ndarray:
    """
    Approximate uncertainty over imprint posteriors by perturbing sigma values.
    Fast heuristic suitable for real-time UI; use classify_imprint_mcmc for rigorous CI.
    """
    rng = np.random.default_rng(rng_seed)
    samples = np.zeros((n_samples, len(imprints)))
    for s in range(n_samples):
        log_liks = np.zeros(len(imprints))
        for k, sig in enumerate(imprints):
            mu, sigma = impute_imprint_signature(sig)
            # Add jitter to sigma (20% log-normal)
            sigma_perturbed = sigma * np.exp(rng.normal(0, 0.2, size=sigma.shape))
            log_liks[k] = log_likelihood_diagonal_gaussian(phenotype, mu, sigma_perturbed, observed_mask)
        log_joint = log_liks + np.log(prior_weights + 1e-12)
        log_joint -= log_joint.max()
        probs = np.exp(log_joint)
        probs /= probs.sum()
        samples[s] = probs
    return samples.std(axis=0)


def classify_imprint_mcmc(
    phenotype: np.ndarray,
    observed_mask: np.ndarray,
    imprints: list[ImprintSignature],
    prior_weights: np.ndarray | None = None,
    num_warmup: int = 500,
    num_samples: int = 1000,
    seed: int = 0,
):
    """
    Full Bayesian inference via NumPyro HMC/NUTS.

    Slower (~5-15s) but gives proper posterior samples with credible intervals.
    Used in the final clinical view; the fast heuristic above is used in the
    streaming chat UI.
    """
    if not _HAS_NUMPYRO:
        raise RuntimeError("NumPyro not available — install requirements.txt first")

    if prior_weights is None:
        prior_weights = np.ones(len(imprints)) / len(imprints)
    prior_weights = prior_weights / prior_weights.sum()

    mus = np.stack([impute_imprint_signature(s)[0] for s in imprints])
    sigmas = np.stack([impute_imprint_signature(s)[1] for s in imprints])

    def model(phenotype, observed_mask, mus, sigmas, prior_weights):
        # Dirichlet prior over imprint weights, centered on prior_weights
        # (concentration 10 gives moderate confidence in population prior)
        weights = numpyro.sample("weights", dist.Dirichlet(10.0 * jnp.asarray(prior_weights)))

        # Per-imprint log-likelihoods under observed dimensions only
        obs = jnp.asarray(phenotype)
        mask = jnp.asarray(observed_mask)
        mus_j = jnp.asarray(mus)
        sigmas_j = jnp.asarray(sigmas)

        log_lik_per_imprint = jnp.sum(
            mask * (-0.5 * ((obs - mus_j) / sigmas_j) ** 2 - jnp.log(sigmas_j) - 0.5 * jnp.log(2 * jnp.pi)),
            axis=-1,
        )
        log_mixture = jnp.log(weights + 1e-12) + log_lik_per_imprint
        numpyro.factor("mixture_ll", _logsumexp(log_mixture))

    kernel = NUTS(model)
    mcmc = MCMC(kernel, num_warmup=num_warmup, num_samples=num_samples, progress_bar=False)
    import jax

    mcmc.run(
        jax.random.PRNGKey(seed),
        phenotype=phenotype,
        observed_mask=observed_mask,
        mus=mus,
        sigmas=sigmas,
        prior_weights=prior_weights,
    )
    return mcmc


def _logsumexp(x):
    import jax.numpy as jnp

    m = jnp.max(x)
    return m + jnp.log(jnp.sum(jnp.exp(x - m)))


def build_phenotype_vector(observations: dict[str, float]) -> tuple[np.ndarray, np.ndarray]:
    """
    Convert a dict of partial observations {parameter_name: value} into
    (phenotype_vector, observed_mask) aligned with CANONICAL_PARAMS ordering.
    """
    from .parse_signatures import CANONICAL_PARAMS

    D = len(CANONICAL_PARAMS)
    phenotype = np.full(D, np.nan)
    mask = np.zeros(D, dtype=bool)
    for i, (section, param) in enumerate(CANONICAL_PARAMS):
        key = f"{section}.{param}"
        if key in observations:
            phenotype[i] = observations[key]
            mask[i] = True
        elif param in observations:
            phenotype[i] = observations[param]
            mask[i] = True
    return phenotype, mask


if __name__ == "__main__":
    import json
    import sys

    signatures_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/imprint_signatures")
    imprints = load_all_imprints(signatures_dir)

    # Demo: classify the synthetic i8 Reserva patient
    # Using the labs reported in docs/synthetic_patients/patient_001_reserva.md
    demo_observations = {
        "HbA1c": 6.1,
        "HOMA-IR": 3.2,
        "Fasting glucose": 104,
        "Triglycerides": 178,
        "HDL cholesterol": 41,
        "CRP": 2.8,
        "Morning cortisol": 22,
        "SDNN": 32,
        "RMSSD": 19,
        "LF/HF ratio": 2.8,
        "Trust in body": 2.0,
        "Self-regulation": 1.5,
    }

    phenotype, mask = build_phenotype_vector(demo_observations)
    posterior = classify_imprint(phenotype, mask, imprints)

    print(json.dumps({
        "dominant_imprint": posterior.dominant_imprint,
        "dominant_prob": round(posterior.dominant_prob, 3),
        "secondary_imprint": posterior.secondary_imprint,
        "secondary_prob": round(posterior.secondary_prob, 3),
        "all_posteriors": {
            id_: round(float(p), 3)
            for id_, p in zip(posterior.imprint_ids, posterior.posterior_probs)
        },
    }, indent=2))
