from typing import List

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.performance_event import PerformanceEventIn


class AnalyzeRequest(BaseModel):
    session_id: str = Field(alias="sessionId")
    events: List[PerformanceEventIn]

    model_config = ConfigDict(populate_by_name=True)


class AnalyzeResponse(BaseModel):
    key: str
    key_confidence: float = Field(alias="keyConfidence")
    jangdan: str
    estimated_bpm: int = Field(alias="estimatedBpm")
    density: str

    model_config = ConfigDict(populate_by_name=True)
