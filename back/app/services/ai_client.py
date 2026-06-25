"""AI model integration used by the FastAPI app.

This module replaces the original fixed stub responses with lightweight
runtime logic backed by the generated AI artifacts when they are available.
It deliberately does not import the legacy local ``back/services`` package,
because that package is not part of the tracked ``back/app`` layout.
"""

from __future__ import annotations

import glob
import math
import os
import pickle
import random
from functools import lru_cache
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[3]
_AI_MODELS_DIR = _REPO_ROOT / "AI" / "models"
_AI_SEGMENTS_DIR = _REPO_ROOT / "AI" / "segments"

_PYEONGJO_SCALE = [0, 2, 4, 7, 9]
_GYEMYEONJO_SCALE = [0, 3, 5, 7, 10]

_JO_TO_KR = {
    "pyeongjo": "평조",
    "gyemyeonjo": "계면조",
    "평조": "평조",
    "계면조": "계면조",
}
_JO_TO_PUBLIC = {
    "평조": "pyeongjo",
    "계면조": "gyemyeonjo",
}

_JANGDAN_TO_KR = {
    "jungmori": "중모리",
    "jungjungmori": "중중모리",
    "jajinmori": "자진모리",
    "gutgeori": "굿거리",
    "hwimori": "휘모리",
    "eotmori": "엇모리",
    "eotjungmori": "엇중모리",
    "semachi": "세마치",
    "jinyangjo": "진양조",
    "중모리": "중모리",
    "중중모리": "중중모리",
    "자진모리": "자진모리",
    "굿거리": "굿거리",
    "휘모리": "휘모리",
    "엇모리": "엇모리",
    "엇중모리": "엇중모리",
    "세마치": "세마치",
    "진양조": "진양조",
}
_JANGDAN_TO_PUBLIC = {
    "중모리": "jungmori",
    "중중모리": "jungjungmori",
    "자진모리": "jajinmori",
    "굿거리": "gutgeori",
    "휘모리": "hwimori",
    "엇모리": "eotmori",
    "엇중모리": "eotjungmori",
    "세마치": "semachi",
    "진양조": "jinyangjo",
}

_JANGDAN_BEATS = {
    "중모리": 12,
    "중중모리": 12,
    "자진모리": 12,
    "굿거리": 12,
    "휘모리": 12,
    "엇모리": 6,
    "엇중모리": 6,
    "세마치": 9,
    "진양조": 6,
}


def analyze_key(events: list[dict]) -> dict:
    """Detect the key from pitch-like event data.

    The API keeps returning public identifiers such as ``pyeongjo`` so existing
    frontend/backend contracts do not change. Internally, model metadata may
    use Korean labels.
    """

    pitch_classes = _extract_pitch_classes(events)
    if not pitch_classes:
        return {"key": "pyeongjo", "confidence": 0.5}

    key, confidence = _detect_key_from_pitch_classes(pitch_classes)
    return {"key": key, "confidence": round(confidence, 4)}


def analyze_jangdan(events: list[dict]) -> dict:
    """Detect jangdan/BPM from event timing.

    If trained model medoids are available in ``AI/models``, they are used for
    nearest-pattern matching. Otherwise this falls back to a timing heuristic.
    """

    timestamps = _extract_timestamps_seconds(events)
    if len(timestamps) < 2:
        return {
            "jangdan": "jungmori",
            "score": 0.0,
            "estimatedBpm": 0,
            "density": "unknown",
        }

    ioi_ms = _ioi_ms(timestamps)
    estimated_bpm = _estimate_bpm(ioi_ms)
    density = _density_from_ioi(ioi_ms)

    models = _load_rhythm_models()
    if models:
        requested_key = analyze_key(events)["key"]
        jo_kr = _normalize_jo(requested_key)
        candidates = [m for m in models if not jo_kr or m.get("jo") == jo_kr]
        if not candidates:
            candidates = models

        best = _match_jangdan_model(ioi_ms, candidates)
        if best is not None:
            jangdan_kr, distance = best
            confidence = 1.0 / (1.0 + distance / 1000.0)
            return {
                "jangdan": _public_jangdan(jangdan_kr),
                "score": round(confidence, 4),
                "estimatedBpm": int(round(estimated_bpm)),
                "density": density,
            }

    return {
        "jangdan": _heuristic_jangdan(estimated_bpm, density),
        "score": 0.45,
        "estimatedBpm": int(round(estimated_bpm)),
        "density": density,
    }


def generate_pattern_sequence(
    key: str,
    jangdan: str,
    bpm: float,
    temperature: float = 0.7,
) -> dict:
    """Generate an accompaniment pattern sequence from a Markov model.

    The return shape is kept compatible with ``AccompanimentResponse``.
    """

    jo_kr = _normalize_jo(key) or "평조"
    jangdan_kr = _normalize_jangdan(jangdan) or "굿거리"
    model = _find_rhythm_model(jo_kr, jangdan_kr)

    if model:
        sequence = _sample_markov_sequence(model, bars=8, temperature=temperature)
    else:
        sequence = _fallback_sequence(jangdan_kr, bars=8)

    beats_per_bar = _JANGDAN_BEATS.get(jangdan_kr, 12)
    beat_duration_ms = (60.0 / max(float(bpm), 1.0)) * 1000.0
    bar_duration_ms = beat_duration_ms * beats_per_bar

    pattern_sequence = []
    for idx, pattern_id in enumerate(sequence):
        pattern_sequence.append(
            {
                "step": idx,
                "slot": "gung" if idx % 2 == 0 else "deok",
                "velocity": round(0.9 if idx % 2 == 0 else 0.65, 2),
                "offsetMs": int(round(idx * bar_duration_ms)),
                "patternId": int(pattern_id),
            }
        )

    return {
        "patternSequence": pattern_sequence,
        "playbackRate": 1.0,
        "crossfadeMs": max(40, int(round(bar_duration_ms * 0.03))),
        "score": 0.8 if model else 0.35,
        "density": "medium",
        "beatStability": 0.7 if model else 0.4,
    }


@lru_cache(maxsize=1)
def _load_rhythm_models() -> list[dict[str, Any]]:
    models_dir = Path(os.getenv("MODELS_DIR", str(_AI_MODELS_DIR)))
    models: list[dict[str, Any]] = []
    if not models_dir.is_dir():
        return models

    for pkl_path in sorted(glob.glob(str(models_dir / "*.pkl"))):
        if Path(pkl_path).name.startswith("pitch_"):
            continue
        try:
            with open(pkl_path, "rb") as f:
                model = pickle.load(f)
        except Exception:
            continue
        if isinstance(model, dict) and model.get("jo") and model.get("jangdan"):
            models.append(model)
    return models


def _find_rhythm_model(jo: str, jangdan: str) -> dict[str, Any] | None:
    models = _load_rhythm_models()
    for model in models:
        if model.get("jo") == jo and model.get("jangdan") == jangdan:
            return model
    for model in models:
        if model.get("jangdan") == jangdan:
            return model
    return models[0] if models else None


def _extract_pitch_classes(events: list[dict]) -> list[int]:
    pitch_classes: list[int] = []
    for event in events:
        pitch = (
            event.get("midiNote")
            or event.get("midi_note")
            or event.get("pitch")
        )
        if pitch is not None:
            pitch_classes.append(int(pitch) % 12)
            continue

        unit = event.get("stringIndex") or event.get("unit_index")
        if unit is not None:
            pitch_classes.append((int(unit) - 1) % 12)
    return pitch_classes


def _extract_timestamps_seconds(events: list[dict]) -> list[float]:
    timestamps: list[float] = []
    for event in events:
        raw = event.get("timestampMs")
        if raw is None:
            raw = event.get("timestamp_ms")
        if raw is None:
            raw = event.get("tsMs")
        if raw is None:
            raw = event.get("ts_ms")
        if raw is None:
            raw = event.get("timestamp")
        if raw is None:
            continue

        value = float(raw)
        if value > 1000:
            value /= 1000.0
        timestamps.append(value)
    return sorted(timestamps)


def _detect_key_from_pitch_classes(pitch_classes: list[int]) -> tuple[str, float]:
    hist = [0.0] * 12
    for pc in pitch_classes:
        hist[pc % 12] += 1.0
    total = sum(hist)
    if total <= 0:
        return "pyeongjo", 0.5
    hist = [v / total for v in hist]

    best_key = "pyeongjo"
    best_score = -1.0
    for key, scale in (
        ("pyeongjo", _PYEONGJO_SCALE),
        ("gyemyeonjo", _GYEMYEONJO_SCALE),
    ):
        for root in range(12):
            template = [0.0] * 12
            for interval in scale:
                template[(root + interval) % 12] = 1.0 / len(scale)
            score = _cosine(hist, template)
            if score > best_score:
                best_key = key
                best_score = score
    return best_key, (best_score + 1.0) / 2.0


def _match_jangdan_model(
    ioi_ms: list[float],
    models: list[dict[str, Any]],
) -> tuple[str, float] | None:
    best_jangdan: str | None = None
    best_distance = float("inf")
    for model in models:
        for medoid in _iter_medoids(model.get("medoids")):
            distance = _sequence_distance(ioi_ms, medoid)
            if distance < best_distance:
                best_distance = distance
                best_jangdan = str(model.get("jangdan"))
    if best_jangdan is None:
        return None
    return best_jangdan, best_distance


def _iter_medoids(raw: Any) -> list[list[float]]:
    if raw is None:
        return []
    if hasattr(raw, "tolist"):
        raw = raw.tolist()
    if not isinstance(raw, list):
        return []
    medoids: list[list[float]] = []
    for item in raw:
        if hasattr(item, "tolist"):
            item = item.tolist()
        if isinstance(item, list):
            try:
                medoids.append([float(v) for v in item])
            except (TypeError, ValueError):
                continue
    return medoids


def _sample_markov_sequence(
    model: dict[str, Any],
    bars: int,
    temperature: float,
) -> list[int]:
    matrix = model.get("transition_matrix")
    if hasattr(matrix, "tolist"):
        matrix = matrix.tolist()
    if not isinstance(matrix, list) or not matrix:
        return _fallback_sequence(str(model.get("jangdan", "굿거리")), bars)

    n = len(matrix)
    current = 0
    sequence = [current]
    for _ in range(max(0, bars - 1)):
        row = matrix[current] if current < len(matrix) else []
        if hasattr(row, "tolist"):
            row = row.tolist()
        current = _weighted_choice(row, temperature, n)
        sequence.append(current)
    return sequence


def _weighted_choice(row: Any, temperature: float, n: int) -> int:
    if not isinstance(row, list) or not row:
        return random.randrange(max(n, 1))
    weights = []
    for value in row[:n]:
        try:
            weights.append(max(float(value), 0.0))
        except (TypeError, ValueError):
            weights.append(0.0)
    if not weights or sum(weights) <= 0:
        return random.randrange(max(n, 1))
    if temperature <= 0:
        return max(range(len(weights)), key=lambda idx: weights[idx])
    adjusted = [math.pow(w + 1e-9, 1.0 / max(temperature, 1e-6)) for w in weights]
    total = sum(adjusted)
    pick = random.random() * total
    acc = 0.0
    for idx, weight in enumerate(adjusted):
        acc += weight
        if pick <= acc:
            return idx
    return len(adjusted) - 1


def _fallback_sequence(jangdan: str, bars: int) -> list[int]:
    base = {
        "굿거리": [0, 2, 1, 3],
        "세마치": [0, 1, 2],
        "중모리": [0, 1, 0, 2],
        "자진모리": [0, 1, 2, 3],
    }.get(jangdan, [0, 1, 2, 3])
    return [base[idx % len(base)] for idx in range(bars)]


def _ioi_ms(timestamps: list[float]) -> list[float]:
    return [
        (timestamps[idx] - timestamps[idx - 1]) * 1000.0
        for idx in range(1, len(timestamps))
        if timestamps[idx] > timestamps[idx - 1]
    ]


def _estimate_bpm(ioi_ms: list[float]) -> float:
    if not ioi_ms:
        return 0.0
    mean_ioi_s = (sum(ioi_ms) / len(ioi_ms)) / 1000.0
    return 60.0 / mean_ioi_s if mean_ioi_s > 0 else 0.0


def _density_from_ioi(ioi_ms: list[float]) -> str:
    if not ioi_ms:
        return "unknown"
    mean_ioi = sum(ioi_ms) / len(ioi_ms)
    if mean_ioi < 300:
        return "high"
    if mean_ioi < 600:
        return "medium"
    return "low"


def _heuristic_jangdan(bpm: float, density: str) -> str:
    if density == "high" or bpm >= 115:
        return "jajinmori"
    if density == "medium" or bpm >= 75:
        return "gutgeori"
    return "jungmori"


def _sequence_distance(left: list[float], right: list[float]) -> float:
    if not left or not right:
        return float("inf")
    n = max(len(left), len(right))
    left_r = _resample(left, n)
    right_r = _resample(right, n)
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left_r, right_r)))


def _resample(values: list[float], n: int) -> list[float]:
    if len(values) == n:
        return values
    if len(values) == 1:
        return [values[0]] * n
    result = []
    for idx in range(n):
        pos = idx * (len(values) - 1) / max(n - 1, 1)
        lo = int(math.floor(pos))
        hi = min(lo + 1, len(values) - 1)
        frac = pos - lo
        result.append(values[lo] * (1.0 - frac) + values[hi] * frac)
    return result


def _cosine(left: list[float], right: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm <= 0 or right_norm <= 0:
        return 0.0
    return numerator / (left_norm * right_norm)


def _normalize_jo(key: str) -> str | None:
    return _JO_TO_KR.get(key)


def _normalize_jangdan(jangdan: str) -> str | None:
    return _JANGDAN_TO_KR.get(jangdan)


def _public_jangdan(jangdan: str) -> str:
    return _JANGDAN_TO_PUBLIC.get(jangdan, jangdan)
