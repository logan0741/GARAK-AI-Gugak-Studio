from pydantic import BaseModel, ConfigDict, Field


class AccompanimentRequest(BaseModel):
    key: str
    jangdan: str
    bpm: float = Field(gt=0, le=1000.0)
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    session_id: str | None = Field(None, alias="sessionId")

    model_config = ConfigDict(populate_by_name=True)


class AccompanimentResponse(BaseModel):
    pattern_sequence: list[dict] = Field(alias="patternSequence")
    playback_rate: float = Field(alias="playbackRate")
    crossfade_ms: int = Field(alias="crossfadeMs")

    model_config = ConfigDict(populate_by_name=True)
