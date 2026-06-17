from typing import Literal

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    session_id: str
    accuracy_score: float = Field(ge=0.0, le=1.0)
    detected_key: str
    song_name: str
    locale: Literal["ko", "en"] = "ko"


class FeedbackResponse(BaseModel):
    feedback_text: str
