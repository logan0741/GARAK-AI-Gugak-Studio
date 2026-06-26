from typing import Literal

from pydantic import BaseModel, Field, ConfigDict

from app.schemas.performance_event import PerformanceEventIn, PerformanceEventOut

MAX_EVENTS = 20_000
MAX_DURATION_MS = 3_600_000  # 1시간


class SessionCreate(BaseModel):
    """POST /api/sessions 요청 본문. FE camelCase → snake_case 매핑."""
    id: str
    instrument_id: str = Field(alias="instrumentId")
    sample_asset_manifest_id: str = Field(alias="sampleAssetManifestId")
    title: str
    mode: Literal["creative", "practice"] = "creative"
    folk_song_id: str | None = Field(None, alias="folkSongId")
    schema_version: str = Field("2026.06.mvp", alias="schemaVersion")
    duration_ms: int = Field(alias="durationMs", ge=0, le=MAX_DURATION_MS)
    created_at_ms: int = Field(alias="createdAtMs", gt=0)
    replay_settings: dict | None = Field(None, alias="replaySettings")
    events: list[PerformanceEventIn] = Field(max_length=MAX_EVENTS)

    model_config = ConfigDict(populate_by_name=True)


class SessionCreateResponse(BaseModel):
    id: str
    created_at_ms: int


class SessionSummary(BaseModel):
    """GET /api/sessions 목록용. 이벤트 제외."""
    id: str
    instrument_id: str
    title: str
    mode: str
    folk_song_id: str | None
    duration_ms: int
    created_at_ms: int
    updated_at_ms: int

    model_config = ConfigDict(from_attributes=True)


class SessionDetail(BaseModel):
    """GET /api/sessions/{id} 상세용. 이벤트 포함."""
    id: str
    instrument_id: str
    sample_asset_manifest_id: str
    title: str
    mode: str
    folk_song_id: str | None
    schema_version: str
    duration_ms: int
    created_at_ms: int
    updated_at_ms: int
    replay_settings: dict | None
    events: list[PerformanceEventOut]

    model_config = ConfigDict(from_attributes=True)
