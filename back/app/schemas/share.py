from pydantic import BaseModel


class ShareRequest(BaseModel):
    session_id: str
    recording_id: str | None = None


class ShareResponse(BaseModel):
    share_id: str
    share_url: str
