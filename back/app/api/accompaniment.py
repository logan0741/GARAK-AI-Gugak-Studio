from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories import jangdan_repo
from app.schemas.accompaniment import AccompanimentRequest, AccompanimentResponse
from app.services import ai_client

router = APIRouter(prefix="/api", tags=["accompaniment"])


@router.post("/accompaniment", response_model=AccompanimentResponse)
async def accompaniment(
    body: AccompanimentRequest,
    db: AsyncSession = Depends(get_db),
):
    preset = await jangdan_repo.get_jangdan_by_id(db, body.jangdan)
    if preset is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown jangdan: {body.jangdan}",
        )

    try:
        result = ai_client.generate_pattern_sequence(
            key=body.key,
            jangdan=body.jangdan,
            bpm=body.bpm,
            temperature=body.temperature,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Accompaniment generation failed",
        ) from exc

    return AccompanimentResponse(
        pattern_sequence=result["patternSequence"],
        playback_rate=result["playbackRate"],
        crossfade_ms=result["crossfadeMs"],
    )
