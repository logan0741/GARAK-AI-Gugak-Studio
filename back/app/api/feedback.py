from fastapi import APIRouter, HTTPException, status

from app.schemas.feedback import FeedbackRequest, FeedbackResponse
from app.services import claude_client, translate_service

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post("/feedback", response_model=FeedbackResponse)
async def feedback(body: FeedbackRequest):
    try:
        korean_text = await claude_client.generate_feedback(
            accuracy_score=body.accuracy_score,
            detected_key=body.detected_key,
            song_name=body.song_name,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Feedback generation failed",
        ) from exc

    translated = await translate_service.translate_to_locale(korean_text, body.locale)

    return FeedbackResponse(feedback_text=translated)
