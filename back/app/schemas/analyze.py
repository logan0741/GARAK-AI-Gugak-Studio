from pydantic import BaseModel

from app.schemas.performance_event import PerformanceEventIn


class AnalyzeRequest(BaseModel):
    session_id: str
    events: list[PerformanceEventIn]


class AnalyzeResponse(BaseModel):
    key: str
    key_confidence: float
    jangdan: str
    estimated_bpm: int
    density: str
