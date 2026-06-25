from typing import List

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.performance_event import PerformanceEventIn


class FolkSongOut(BaseModel):
    id: str
    title: str
    instrument_id: str = Field(serialization_alias="instrumentId")
    difficulty: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ScoreRequest(BaseModel):
    events: List[PerformanceEventIn]


class ScoreResponse(BaseModel):
    accuracy: float        # 0.0 ~ 100.0
    correct_count: int = Field(serialization_alias="correctCount")
    total_count: int = Field(serialization_alias="totalCount")

    model_config = ConfigDict(populate_by_name=True)
