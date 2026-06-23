from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FeedbackRequest(BaseModel):
    session_id: str = Field(alias="sessionId")
    accuracy_score: float = Field(alias="accuracyScore", ge=0.0, le=100.0)
    detected_key: str = Field(alias="detectedKey")
    song_name: str = Field(alias="songName")
    locale: Literal["ko", "en"] = "ko"

    model_config = ConfigDict(populate_by_name=True)


class FeedbackResponse(BaseModel):
    feedback_text: str = Field(alias="feedbackText")

    model_config = ConfigDict(populate_by_name=True)
