from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ShareRequest(BaseModel):
    session_id: str = Field(alias="sessionId")
    recording_id: Optional[str] = Field(None, alias="recordingId")

    model_config = ConfigDict(populate_by_name=True)


class ShareResponse(BaseModel):
    share_id: str = Field(alias="shareId")

    model_config = ConfigDict(populate_by_name=True)


class ShareLinkOut(BaseModel):
    share_id: str = Field(serialization_alias="shareId")
    session_id: str = Field(serialization_alias="sessionId")
    recording_id: Optional[str] = Field(serialization_alias="recordingId")
    visibility: str
    created_at_ms: int = Field(serialization_alias="createdAtMs")

    model_config = ConfigDict(populate_by_name=True)
