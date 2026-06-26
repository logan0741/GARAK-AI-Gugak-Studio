# -*- coding: utf-8 -*-
"""
SoloGenerator / EnsembleGenerator 를 백엔드에서 쓰는 서비스 래퍼.

FastAPI lifespan 에서 한 번 초기화하고 app.state.generate_service 로 보관.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

_AI_RUNTIME_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "AI", "pipeline", "03_runtime")
)
if _AI_RUNTIME_DIR not in sys.path:
    sys.path.insert(0, _AI_RUNTIME_DIR)

from solo_generator import SoloGenerator           # type: ignore
from ensemble_generator import EnsembleGenerator   # type: ignore


class GenerateService:
    def __init__(
        self,
        models_dir: str,
        segments_dir: str,
        samples_dir: str,
        generated_dir: str,
        base_url: str,
    ) -> None:
        self.generated_dir = generated_dir
        self.base_url      = base_url.rstrip("/")
        self.samples_dir   = samples_dir

        self.solo = SoloGenerator(
            models_dir=models_dir,
            samples_dir=samples_dir,
        )
        self.ensemble = EnsembleGenerator(
            models_dir=models_dir,
            segments_dir=segments_dir,
            samples_dir=samples_dir,
        )

        # manifest 캐시
        self._manifest: dict | None = None

    # ── 샘플 manifest ─────────────────────────────────────────────────────────

    def load_manifest(self) -> dict:
        """back/static/samples/manifest.json 반환 (캐시)."""
        if self._manifest is not None:
            return self._manifest
        path = os.path.join(self.samples_dir, "manifest.json")
        if not os.path.isfile(path):
            return {}
        with open(path, encoding="utf-8") as f:
            self._manifest = json.load(f)
        return self._manifest

    def sample_url(self, instrument: str, yul: str) -> str | None:
        """악기 + 율명 → 정적 서빙 URL. 없으면 None."""
        manifest = self.load_manifest()
        rel = manifest.get(instrument, {}).get(yul)
        if rel is None:
            return None
        return f"{self.base_url}{rel}"

    # ── Solo ──────────────────────────────────────────────────────────────────

    def generate_solo(
        self,
        instrument: str,
        jo: str,
        jangdan: str,
        n_bars: int = 8,
        bpm: float = 80.0,
        temperature: float = 1.0,
    ) -> dict:
        """
        솔로 음원 생성.
        반환: {"audio_url": str, "instrument": str, "jo": str, "jangdan": str}
        """
        import uuid
        fname = f"solo_{uuid.uuid4().hex[:8]}.wav"
        out   = os.path.join(self.generated_dir, fname)

        self.solo.generate(
            instrument=instrument,
            jo=jo,
            jangdan=jangdan,
            n_bars=n_bars,
            bpm=bpm,
            temperature=temperature,
            output_path=out,
        )

        rel_path = os.path.relpath(out, os.path.dirname(self.generated_dir)).replace(os.sep, "/")
        audio_url = f"{self.base_url}/static/{rel_path}"

        return {
            "audio_url": audio_url,
            "instrument": instrument,
            "jo": jo,
            "jangdan": jangdan,
            "bpm": bpm,
            "n_bars": n_bars,
        }

    # ── Ensemble ──────────────────────────────────────────────────────────────

    def generate_ensemble(
        self,
        user_events: list[dict],
        source_instrument: str = "가야금",
        jo: str = "평조",
        jangdan: str = "중모리",
        bpm: float | None = None,
        temperature: float = 1.0,
    ) -> dict:
        """
        앙상블 음원 생성.
        반환: {"audio_url": str, "jo": str, "jangdan": str, "bpm": float}
        """
        import uuid
        fname = f"ensemble_{uuid.uuid4().hex[:8]}.wav"
        out   = os.path.join(self.generated_dir, fname)

        self.ensemble.generate(
            user_events=user_events,
            source_instrument=source_instrument,
            jo=jo,
            jangdan=jangdan,
            bpm=bpm,
            temperature=temperature,
            output_path=out,
        )

        rel_path = os.path.relpath(out, os.path.dirname(self.generated_dir)).replace(os.sep, "/")
        audio_url = f"{self.base_url}/static/{rel_path}"

        return {
            "audio_url": audio_url,
            "source_instrument": source_instrument,
            "jo": jo,
            "jangdan": jangdan,
        }
