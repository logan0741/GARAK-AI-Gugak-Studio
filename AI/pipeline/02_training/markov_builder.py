from __future__ import annotations

import os
import pickle
from datetime import datetime, timezone

try:
    import numpy as np
except ImportError as exc:
    raise ImportError(
        "markov_builder requires 'numpy'. Install it with: pip install numpy"
    ) from exc

LAPLACE_ALPHA = 1e-6


def build_transition_matrix(
    pattern_sequences: list[list[int]], n_patterns: int
) -> np.ndarray:
    if n_patterns < 1:
        raise ValueError("n_patterns must be >= 1")

    counts = np.zeros((n_patterns, n_patterns), dtype=np.double)
    for sequence in pattern_sequences:
        for current, nxt in zip(sequence[:-1], sequence[1:]):
            if 0 <= current < n_patterns and 0 <= nxt < n_patterns:
                counts[current, nxt] += 1.0

    counts += LAPLACE_ALPHA
    row_sums = counts.sum(axis=1, keepdims=True)
    return counts / row_sums


def save_model(
    transition_matrix: np.ndarray,
    medoids: np.ndarray,
    jo: str,
    jangdan: str,
    output_dir: str = "AI/models",
) -> str:
    os.makedirs(output_dir, exist_ok=True)

    model = {
        "transition_matrix": np.asarray(transition_matrix),
        "medoids": np.asarray(medoids),
        "jo": jo,
        "jangdan": jangdan,
        "n_patterns": int(np.asarray(transition_matrix).shape[0]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    file_path = os.path.join(output_dir, f"{jo}_{jangdan}.pkl")
    with open(file_path, "wb") as f:
        pickle.dump(model, f)
    return file_path


def load_model(pkl_path: str) -> dict:
    with open(pkl_path, "rb") as f:
        return pickle.load(f)
