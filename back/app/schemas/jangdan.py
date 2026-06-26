from pydantic import BaseModel, ConfigDict


class JangdanPatternEventOut(BaseModel):
    id: str
    step_index: int
    offset_ms: int
    percussion_slot: str
    velocity: float

    model_config = ConfigDict(from_attributes=True)


class JangdanPresetOut(BaseModel):
    id: str
    name: str
    min_bpm: int
    max_bpm: int
    density_range: str
    meter: str
    description: str | None
    pattern_events: list[JangdanPatternEventOut]

    model_config = ConfigDict(from_attributes=True)
