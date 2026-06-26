from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SoloRequest(BaseModel):
    instrument: str = Field(default="가야금", description="악기명")
    jo: str = Field(default="평조", description="조 (평조/계면조)")
    jangdan: str = Field(default="중모리", description="장단")
    n_bars: int = Field(default=8, ge=1, le=64)
    bpm: float = Field(default=80.0, gt=0, le=300)
    temperature: float = Field(default=1.0, ge=0.0, le=2.0)


class NoteEvent(BaseModel):
    pitch: int = Field(..., ge=0, le=127, description="MIDI 음높이")
    timestamp: float = Field(..., ge=0.0, description="타임스탬프(초)")


class EnsembleRequest(BaseModel):
    events: List[NoteEvent] = Field(..., min_length=1, description="사용자 노트 이벤트 목록")
    source_instrument: str = Field(default="가야금", description="사용자 악기")
    jo: str = Field(default="평조")
    jangdan: str = Field(default="중모리")
    bpm: Optional[float] = Field(default=None, gt=0, le=300, description="생략 시 이벤트에서 자동 추정")
    temperature: float = Field(default=1.0, ge=0.0, le=2.0)


class JobCreated(BaseModel):
    job_id: str
    status: str = "pending"


class JobResult(BaseModel):
    job_id: str
    status: str
    audio_url: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    elapsed_ms: float
