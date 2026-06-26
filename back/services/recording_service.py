from __future__ import annotations

import os
from typing import Any

from core.audio_preprocessing import PreprocessConfig, RecordingMeta, preprocess_recording


class RecordingService:
    def __init__(self, static_dir: str, base_url: str) -> None:
        self.static_dir = os.path.abspath(static_dir)
        self.base_url = base_url.rstrip("/")
        self.recordings_dir = os.path.join(self.static_dir, "recordings")
        self.preprocessed_dir = os.path.join(self.static_dir, "preprocessed")
        os.makedirs(self.recordings_dir, exist_ok=True)
        os.makedirs(self.preprocessed_dir, exist_ok=True)

    def session_recording_dir(self, session_id: str) -> str:
        return os.path.join(self.recordings_dir, _safe_name(session_id))

    def session_preprocessed_dir(self, session_id: str) -> str:
        return os.path.join(self.preprocessed_dir, _safe_name(session_id))

    def original_path(self, session_id: str, suffix: str = ".wav") -> str:
        safe_session = _safe_name(session_id)
        suffix = suffix if suffix.startswith(".") else f".{suffix}"
        return os.path.join(
            self.session_recording_dir(session_id),
            f"{safe_session}_original{suffix.lower()}",
        )

    def preprocess(
        self,
        input_path: str,
        meta: RecordingMeta,
        config: PreprocessConfig | None = None,
    ) -> dict[str, Any]:
        manifest = preprocess_recording(
            input_path=input_path,
            output_dir=self.session_preprocessed_dir(meta.session_id),
            meta=meta,
            config=config or PreprocessConfig(),
        )
        return self._to_response(manifest)

    def _to_response(self, manifest: dict[str, Any]) -> dict[str, Any]:
        bars = [
            {
                "index": bar["index"],
                "duration_s": bar["duration_s"],
                "audio_url": self._static_url(bar["path"]),
            }
            for bar in manifest["bars"]
        ]
        meta = manifest["meta"]
        stats = manifest["stats"]
        normalized_url = self._static_url(manifest["normalized_path"])
        bar_aligned_url = self._static_url(manifest["bar_aligned_path"])
        manifest_url = self._static_url(manifest["manifest_path"])

        return {
            "session_id": meta["session_id"],
            "status": "ready",
            "normalized_audio_url": normalized_url,
            "bar_aligned_audio_url": bar_aligned_url,
            "manifest_url": manifest_url,
            "bars": bars,
            "stats": stats,
            "ai_input": {
                "session_id": meta["session_id"],
                "instrument": meta["instrument"],
                "bpm": meta["bpm"],
                "beats_per_bar": meta["beats_per_bar"],
                "jangdan": meta.get("jangdan"),
                "jo": meta.get("jo"),
                "first_bar_offset_s": meta["first_bar_offset_s"],
                "expected_bars": meta.get("expected_bars"),
                "normalized_audio_url": normalized_url,
                "bar_aligned_audio_url": bar_aligned_url,
                "bar_audio_urls": [bar["audio_url"] for bar in bars],
                "manifest_url": manifest_url,
            },
        }

    def _static_url(self, path: str) -> str:
        abs_path = os.path.abspath(path)
        rel = os.path.relpath(abs_path, self.static_dir).replace(os.sep, "/")
        return f"{self.base_url}/static/{rel}"


def _safe_name(value: str) -> str:
    allowed = [c if c.isalnum() or c in ("-", "_") else "_" for c in value.strip()]
    safe = "".join(allowed).strip("_")
    return safe or "session"
