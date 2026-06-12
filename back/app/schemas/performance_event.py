from typing import Literal

from pydantic import BaseModel, Field, ConfigDict

EventType = Literal["string_pluck", "string_bend", "string_mute", "glissando_step", "string_release"]


class PerformanceEventIn(BaseModel):
    """FE → 서버. FE camelCase 필드를 DB 컬럼으로 매핑."""
    id: str
    # FE: tsMs → DB: occurred_at_ms
    ts_ms: int = Field(alias="tsMs", ge=0)
    # FE: type → DB: event_type
    type: EventType
    # FE에서만 사용하는 포인터 ID — 서버에서 저장하지 않음
    pointer_id: str | None = Field(None, alias="pointerId", exclude=True)
    # FE: stringIndex → DB: unit_index
    unit_index: int | None = Field(None, alias="stringIndex")
    # FE: cents → DB: pitch_bend_cents
    cents: int | None = None
    velocity: float | None = None
    strength: float | None = None
    payload: dict | None = None

    model_config = ConfigDict(populate_by_name=True)


class PerformanceEventOut(BaseModel):
    """서버 → FE. DB 필드를 그대로 반환."""
    id: str
    occurred_at_ms: int
    event_type: str
    unit_index: int | None
    pitch_bend_cents: int | None
    velocity: float | None
    strength: float | None
    payload: dict | None

    model_config = ConfigDict(from_attributes=True)
