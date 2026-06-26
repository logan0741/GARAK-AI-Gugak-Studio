from __future__ import annotations

try:
    import numpy as np
except ImportError as exc:
    raise ImportError(
        "clustering requires 'numpy'. Install it with: pip install numpy"
    ) from exc

try:
    from dtaidistance import dtw
except ImportError as exc:
    raise ImportError(
        "clustering requires 'dtaidistance'. "
        "Install it with: pip install dtaidistance"
    ) from exc

try:
    from sklearn_extra.cluster import KMedoids
except ImportError as exc:
    raise ImportError(
        "clustering requires 'scikit-learn-extra'. "
        "Install it with: pip install scikit-learn-extra"
    ) from exc


def _normalize_length(pattern: np.ndarray, target_len: int) -> np.ndarray:
    pattern = np.asarray(pattern, dtype=np.double).ravel()
    if pattern.size >= target_len:
        return pattern[:target_len]
    padded = np.zeros(target_len, dtype=np.double)
    padded[: pattern.size] = pattern
    return padded


def _stack_patterns(patterns: list[np.ndarray]) -> np.ndarray:
    target_len = max(int(np.asarray(p).ravel().size) for p in patterns)
    return np.vstack([_normalize_length(p, target_len) for p in patterns])


def build_pattern_db(
    patterns: list[np.ndarray], n_clusters: int = 16
) -> tuple[np.ndarray, np.ndarray]:
    if len(patterns) == 0:
        raise ValueError("build_pattern_db received an empty pattern list")

    matrix = _stack_patterns(patterns)
    n_patterns = matrix.shape[0]
    effective_clusters = min(n_clusters, n_patterns)

    series = [matrix[i] for i in range(n_patterns)]
    dist_matrix = dtw.distance_matrix_fast(series, compact=False)
    dist_matrix = np.asarray(dist_matrix, dtype=np.double)
    dist_matrix[~np.isfinite(dist_matrix)] = 0.0
    dist_matrix = np.maximum(dist_matrix, dist_matrix.T)
    np.fill_diagonal(dist_matrix, 0.0)

    if effective_clusters <= 1:
        labels = np.zeros(n_patterns, dtype=int)
        medoids = matrix[:1].copy()
        return labels, medoids

    model = KMedoids(
        n_clusters=effective_clusters,
        metric="precomputed",
        method="pam",
        init="k-medoids++",
        random_state=0,
    )
    labels = model.fit_predict(dist_matrix)
    medoids = matrix[model.medoid_indices_].copy()
    return np.asarray(labels, dtype=int), medoids


def assign_pattern_id(ioi: np.ndarray, medoids: np.ndarray) -> int:
    medoids = np.asarray(medoids, dtype=np.double)
    if medoids.ndim != 2 or medoids.shape[0] == 0:
        raise ValueError("medoids must be a non-empty 2D array")

    target_len = medoids.shape[1]
    query = _normalize_length(ioi, target_len)

    distances = np.array(
        [dtw.distance_fast(query, medoids[i]) for i in range(medoids.shape[0])],
        dtype=np.double,
    )
    distances[~np.isfinite(distances)] = np.inf
    return int(np.argmin(distances))
