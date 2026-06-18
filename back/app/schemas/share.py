from pydantic import BaseModel


class ShareRequest(BaseModel):
    session_id: str
    recording_id: str | None = None


class ShareResponse(BaseModel):
    share_id: str
    share_url: str


class ShareLinkOut(BaseModel):
    share_id: str
    share_url: str
    session_id: str
    recording_id: str | None
    visibility: str
    created_at_ms: int
