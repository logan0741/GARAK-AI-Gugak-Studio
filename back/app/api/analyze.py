import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services import ai_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse, response_model_by_alias=True)
def analyze(body: AnalyzeRequest):
    if not body.events:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="events must not be empty",
        )

    events_dicts = [e.model_dump(by_alias=True) for e in body.events]

    try:
        key_result = ai_client.analyze_key(events_dicts)
        jangdan_result = ai_client.analyze_jangdan(events_dicts)
    except Exception as exc:
        logger.exception("AI analysis failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI analysis failed",
        ) from exc

    return AnalyzeResponse(
        key=key_result["key"],
        key_confidence=key_result["confidence"],
        jangdan=jangdan_result["jangdan"],
        estimated_bpm=jangdan_result["estimatedBpm"],
        density=jangdan_result["density"],
    )
