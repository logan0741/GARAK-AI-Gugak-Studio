from pydantic import BaseModel, Field


class AccompanimentRequest(BaseModel):
    key: str
    jangdan: str
    bpm: float = Field(gt=0)
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    session_id: str | None = None  # 제공 시 JangdanRecommendation DB 저장


class AccompanimentResponse(BaseModel):
    pattern_sequence: list[dict]
    playback_rate: float
    crossfade_ms: int
