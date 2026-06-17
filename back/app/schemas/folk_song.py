from pydantic import BaseModel, ConfigDict

from app.schemas.performance_event import PerformanceEventIn


class FolkSongOut(BaseModel):
    id: str
    title: str
    instrument_id: str
    difficulty: str

    model_config = ConfigDict(from_attributes=True)


class ScoreRequest(BaseModel):
    events: list[PerformanceEventIn]


class ScoreResponse(BaseModel):
    accuracy: float        # 0.0 ~ 100.0
    correct_count: int
    total_count: int
