from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from middleware.auth import verify_token
from schemas.feedback import FeedbackRequest, FeedbackResponse

router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse)
async def feedback(
    body: FeedbackRequest,
    request: Request,
    user_id: str = Depends(verify_token),
) -> FeedbackResponse:
    service = request.app.state.feedback_service
    feedback_text, source = service.build_feedback(body)
    return FeedbackResponse(
        feedback=feedback_text,
        jo=body.jo,
        jangdan=body.jangdan,
        accuracy_pct=round(body.accuracy * 100, 1),
        source=source,
    )
