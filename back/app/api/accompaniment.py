import asyncio
import uuid
from functools import partial
from time import time_ns

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.jangdan import JangdanRecommendation
from app.repositories import jangdan_repo
from app.schemas.accompaniment import AccompanimentRequest, AccompanimentResponse
from app.services import ai_client

router = APIRouter(prefix="/api", tags=["accompaniment"])


@router.post("/accompaniment", response_model=AccompanimentResponse, response_model_by_alias=True)
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
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            partial(
                ai_client.generate_pattern_sequence,
                key=body.key,
                jangdan=body.jangdan,
                bpm=body.bpm,
                temperature=body.temperature,
            ),
        )
        pattern_sequence = result["patternSequence"]
        playback_rate = result["playbackRate"]
        crossfade_ms = result["crossfadeMs"]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Accompaniment generation failed",
        ) from exc

    if body.session_id:
        rec = JangdanRecommendation(
            id=str(uuid.uuid4()),
            session_id=body.session_id,
            jangdan_preset_id=body.jangdan,
            score=result.get("score", 0.0),
            estimated_bpm=int(body.bpm),
            density=result.get("density", 0.0),
            beat_stability=result.get("beatStability", 0.0),
            decision_status="proposed",
            reason={"key": body.key, "temperature": body.temperature},
            created_at_ms=time_ns() // 1_000_000,
        )
        try:
            await jangdan_repo.create_recommendation(db, rec)
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sessionId: {body.session_id}",
            ) from exc

    return AccompanimentResponse(
        pattern_sequence=pattern_sequence,
        playback_rate=playback_rate,
        crossfade_ms=crossfade_ms,
    )
