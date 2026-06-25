from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RecordingOut(BaseModel):
    id: str
    session_id: str
    instrument_id: Optional[str]
    file_uri: str
    format: str
    duration_ms: int
    render_status: str
    volume: float
    is_muted: bool
    track_order: int
    created_at_ms: int

    model_config = ConfigDict(from_attributes=True)


class RecordingPatch(BaseModel):
    """PATCH /api/sessions/{id}/recordings/{rec_id} 요청 본문. None 필드는 변경하지 않음."""
    volume: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_muted: Optional[bool] = None
    track_order: Optional[int] = Field(None, ge=0)
