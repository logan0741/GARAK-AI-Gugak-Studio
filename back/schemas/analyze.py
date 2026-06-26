from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    timestamps: List[float] = Field(
        ...,
        description="탭 이벤트 타임스탬프 배열 (초 단위)",
    )
    notes: Optional[List[int]] = Field(
        default=None,
        description="연주 MIDI 노트 번호 배열 (조 감지용, 생략 가능)",
    )


class AnalyzeResponse(BaseModel):
    jo: str
    jangdan: str
    jo_confidence: float
    jangdan_confidence: float
    detected_bpm: float
    ioi_ms: List[float]
