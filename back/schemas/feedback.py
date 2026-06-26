from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    jo: str = Field(..., description="감지된 조 (평조/계면조)")
    jangdan: str = Field(..., description="감지된 장단 (예: 중모리)")
    accuracy: float = Field(..., ge=0.0, le=1.0, description="정확도 점수 0~1")
    note_count: Optional[int] = Field(default=None, description="연주한 총 노트 수")
    duration_sec: Optional[float] = Field(default=None, description="연주 시간(초)")
    language: str = Field(default="ko", description="피드백 언어 ko/en")


class FeedbackResponse(BaseModel):
    feedback: str
    jo: str
    jangdan: str
    accuracy_pct: float
    source: str = "fallback"
