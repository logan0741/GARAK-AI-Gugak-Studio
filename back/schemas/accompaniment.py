from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AccompanimentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jangdan: str = Field(..., description="장단 이름 (예: 굿거리)")
    jo: str = Field(default="평조", description="조 이름 (평조/계면조)")
    bars: int = Field(default=8, ge=1, le=64)
    bpm: float = Field(default=120.0, gt=0)
    temperature: float = Field(default=0.8, ge=0.0, le=2.0)


class JobCreatedResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    audio_url: Optional[str] = None
    pattern_sequence: Optional[List[int]] = None
    jangdan: Optional[str] = None
    jo: Optional[str] = None
    bpm: Optional[float] = None
    error: Optional[str] = None
    created_at: float
    elapsed_ms: float


class ModelInfo(BaseModel):
    jo: str
    jangdan: str
