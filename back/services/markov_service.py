from __future__ import annotations

import glob
import os
import pickle

try:
    import numpy as np
except ImportError as exc:
    raise ImportError(
        "markov_service requires 'numpy'. Install it with: pip install numpy"
    ) from exc


class MarkovService:
    def __init__(self, models_dir: str, segments_dir: str) -> None:
        self.models_dir = models_dir
        self.segments_dir = segments_dir
        self.models: dict[str, dict] = {}
        self.segments: dict[str, dict[int, list[str]]] = {}
        self._load_models()
        self._load_segments()

    def _key(self, jo: str, jangdan: str) -> str:
        return f"{jo}_{jangdan}"

    def _load_models(self) -> None:
        if not os.path.isdir(self.models_dir):
            print(f"[WARN] 모델 디렉토리가 없습니다: {self.models_dir}")
            return

        all_pkls = sorted(glob.glob(os.path.join(self.models_dir, "*.pkl")))
        pkl_files = [p for p in all_pkls if not os.path.basename(p).startswith("pitch_")]
        for pkl_path in pkl_files:
            try:
                with open(pkl_path, "rb") as f:
                    model = pickle.load(f)
            except Exception as exc:
                print(f"[WARN] 모델 로드 실패 {pkl_path}: {exc}")
                continue
            key = self._key(model["jo"], model["jangdan"])
            model["transition_matrix"] = np.asarray(
                model["transition_matrix"], dtype=np.double
            )
            self.models[key] = model
            print(f"[OK]   모델 로드: {key} (patterns={model['n_patterns']})")

        if not self.models:
            print(f"[WARN] 로드된 모델이 없습니다: {self.models_dir}")

    def _load_segments(self) -> None:
        if not os.path.isdir(self.segments_dir):
            print(
                f"[WARN] 세그먼트 디렉토리가 없습니다: {self.segments_dir} "
                "(export_segments.py 실행 필요). 세그먼트 없이 계속합니다."
            )
            return

        for key in self.models:
            combo_dir = os.path.join(self.segments_dir, key)
            if not os.path.isdir(combo_dir):
                continue
            pattern_map: dict[int, list[str]] = {}
            for pattern_dir in sorted(glob.glob(os.path.join(combo_dir, "pattern_*"))):
                name = os.path.basename(pattern_dir)
                try:
                    pattern_id = int(name.split("_")[1])
                except (IndexError, ValueError):
                    continue
                wavs = sorted(glob.glob(os.path.join(pattern_dir, "*.wav")))
                if wavs:
                    pattern_map[pattern_id] = wavs
            if pattern_map:
                self.segments[key] = pattern_map
                n_seg = sum(len(v) for v in pattern_map.values())
                print(f"[OK]   세그먼트 로드: {key} ({n_seg}개)")

    def available_models(self) -> list[dict]:
        return [
            {"jo": m["jo"], "jangdan": m["jangdan"]}
            for m in self.models.values()
        ]

    def has_segments(self, jo: str, jangdan: str) -> bool:
        return bool(self.segments.get(self._key(jo, jangdan)))

    def generate_sequence(
        self,
        jo: str,
        jangdan: str,
        bars: int = 8,
        temperature: float = 0.8,
    ) -> list[int]:
        key = self._key(jo, jangdan)
        model = self.models.get(key)
        if model is None:
            raise KeyError(f"모델을 찾을 수 없습니다: {key}")

        tm = model["transition_matrix"]
        n = tm.shape[0]
        if bars < 1:
            return []

        current = int(np.argmax(np.diag(tm)))
        sequence = [current]

        for _ in range(bars - 1):
            row = tm[current]
            current = self._sample(row, temperature)
            sequence.append(current)

        return sequence

    def _sample(self, row_probs: np.ndarray, temperature: float) -> int:
        row_probs = np.asarray(row_probs, dtype=np.double)
        if temperature <= 0:
            return int(np.argmax(row_probs))

        logits = np.log(row_probs + 1e-9) / temperature
        logits -= logits.max()
        exp = np.exp(logits)
        probs = exp / exp.sum()
        return int(np.random.choice(len(probs), p=probs))

    def get_segment_paths(
        self, jo: str, jangdan: str, pattern_sequence: list[int]
    ) -> list[str]:
        key = self._key(jo, jangdan)
        pattern_map = self.segments.get(key)
        if not pattern_map:
            return []

        available_ids = sorted(pattern_map.keys())
        paths: list[str] = []
        for pattern_id in pattern_sequence:
            candidates = pattern_map.get(pattern_id)
            if not candidates:
                if not available_ids:
                    continue
                fallback_id = min(
                    available_ids, key=lambda pid: abs(pid - pattern_id)
                )
                candidates = pattern_map[fallback_id]
            choice = candidates[int(np.random.randint(len(candidates)))]
            paths.append(choice)
        return paths
