from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel


class BarAsset(BaseModel):
    index: int
    duration_s: float
    audio_url: str


class RecordingPreprocessResponse(BaseModel):
    session_id: str
    status: str
    original_audio_url: str
    normalized_audio_url: str
    bar_aligned_audio_url: str
    manifest_url: str
    bars: List[BarAsset]
    stats: Dict[str, Any]
    ai_input: Dict[str, Any]
