# -*- coding: utf-8 -*-
from __future__ import annotations

import pickle
import glob
import os
from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    from dtaidistance import dtw as _dtw
    _DTW_AVAILABLE = True
except ImportError:
    _DTW_AVAILABLE = False

MIN_IOI_MS = 50.0

# 평조 (황태중임남) — major pentatonic intervals
_PYEONJO_SCALE = [0, 2, 4, 7, 9]
# 계면조 (황협중임무) — minor pentatonic variant
_GYEMYEONJO_SCALE = [0, 3, 5, 7, 10]


def _make_templates(scale: List[int]) -> List[np.ndarray]:
    """12개 전조(transposition) 템플릿 생성."""
    templates = []
    for root in range(12):
        t = np.zeros(12, dtype=float)
        for s in scale:
            t[(root + s) % 12] += 1.0
        templates.append(t / t.sum())
    return templates


_JO_TEMPLATES: Dict[str, List[np.ndarray]] = {
    "평조": _make_templates(_PYEONJO_SCALE),
    "계면조": _make_templates(_GYEMYEONJO_SCALE),
}


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom > 1e-8 else 0.0


def _dtw_distance(a: np.ndarray, b: np.ndarray) -> float:
    a = np.asarray(a, dtype=np.double)
    b = np.asarray(b, dtype=np.double)
    if a.size == 0 or b.size == 0:
        return float("inf")
    if _DTW_AVAILABLE:
        return float(_dtw.distance_fast(a, b, use_pruning=True))
    # fallback: simple L2 on length-normalized versions
    n = max(len(a), len(b))
    a_r = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(a)), a)
    b_r = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(b)), b)
    return float(np.linalg.norm(a_r - b_r))


class AnalyzeService:
    """조 감지(코사인 유사도) + 장단 감지(DTW)."""

    def __init__(self, models_dir: str) -> None:
        # {(jo, jangdan): {"medoids": np.ndarray}}
        self._models: Dict[Tuple[str, str], Dict] = {}
        self._load_models(models_dir)

    def _load_models(self, models_dir: str) -> None:
        for pkl_path in glob.glob(os.path.join(models_dir, "*.pkl")):
            try:
                with open(pkl_path, "rb") as f:
                    m = pickle.load(f)
                jo = m.get("jo", "")
                jd = m.get("jangdan", "")
                medoids = np.asarray(m.get("medoids", []), dtype=np.double)
                if jo and jd and medoids.ndim == 2 and medoids.shape[0] > 0:
                    self._models[(jo, jd)] = {"medoids": medoids}
            except Exception:
                pass

    def detect_jo(self, notes: List[int]) -> Tuple[str, float]:
        """MIDI 노트 리스트 → (조명, 신뢰도 0~1)."""
        if not notes:
            return "평조", 0.5

        hist = np.zeros(12, dtype=float)
        for n in notes:
            hist[int(n) % 12] += 1.0
        if hist.sum() < 1e-8:
            return "평조", 0.5
        hist /= hist.sum()

        best_jo = "평조"
        best_sim = -1.0
        for jo_name, templates in _JO_TEMPLATES.items():
            for t in templates:
                sim = _cosine(hist, t)
                if sim > best_sim:
                    best_sim = sim
                    best_jo = jo_name

        # normalize cosine [-1,1] → [0,1]
        confidence = round((best_sim + 1.0) / 2.0, 4)
        return best_jo, confidence

    def detect_jangdan(
        self, timestamps: List[float], jo: Optional[str] = None
    ) -> Tuple[str, float, float]:
        """탭 타임스탬프(초) → (장단명, 신뢰도 0~1, 감지된 BPM).

        jo 인자가 주어지면 해당 조의 모델만 사용.
        """
        if len(timestamps) < 2:
            return "중모리", 0.0, 0.0

        ts = np.sort(np.array(timestamps, dtype=float))
        ioi_ms = np.diff(ts) * 1000.0
        ioi_ms = ioi_ms[ioi_ms >= MIN_IOI_MS]
        if ioi_ms.size == 0:
            return "중모리", 0.0, 0.0

        best_jangdan = "중모리"
        best_dist = float("inf")

        for (model_jo, jangdan), model_data in self._models.items():
            if jo and model_jo != jo:
                continue
            medoids: np.ndarray = model_data["medoids"]
            for medoid in medoids:
                d = _dtw_distance(ioi_ms, medoid)
                if d < best_dist:
                    best_dist = d
                    best_jangdan = jangdan

        # 신뢰도: DTW 거리를 0~1 범위로 변환 (경험적 스케일 1000ms)
        confidence = round(1.0 / (1.0 + best_dist / 1000.0), 4)

        # 평균 IOI → BPM 추정
        mean_ioi_s = float(ioi_ms.mean()) / 1000.0
        detected_bpm = round(60.0 / mean_ioi_s, 1) if mean_ioi_s > 0 else 0.0

        return best_jangdan, confidence, detected_bpm

    def available_jos(self) -> List[str]:
        return sorted({jo for jo, _ in self._models})

    def available_jangdans(self, jo: Optional[str] = None) -> List[str]:
        return sorted({
            jd for (j, jd) in self._models
            if jo is None or j == jo
        })
