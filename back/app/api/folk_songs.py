from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories import folk_song_repo
from app.schemas.folk_song import FolkSongOut, ScoreRequest, ScoreResponse
from app.services.translate_service import translate_to_locale

router = APIRouter(prefix="/api", tags=["folk-songs"])

_TIMING_TOLERANCE_MS = 200  # ±200ms 이내 → 정확


@router.get("/folk-songs", response_model=list[FolkSongOut])
async def list_folk_songs(
    locale: str = Query(default="ko", pattern="^(ko|en)$"),
    db: AsyncSession = Depends(get_db),
):
    songs = await folk_song_repo.get_all_folk_songs(db)
    if locale == "en":
        result = []
        for song in songs:
            translated_title = await translate_to_locale(song.title, "en")
            out = FolkSongOut.model_validate(song)
            out.title = translated_title
            result.append(out)
        return result
    return songs


@router.post("/folk-songs/{folk_song_id}/score", response_model=ScoreResponse)
async def score_folk_song(
    folk_song_id: str,
    body: ScoreRequest,
    db: AsyncSession = Depends(get_db),
):
    song = await folk_song_repo.get_folk_song_by_id(db, folk_song_id)
    if song is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folk song not found")

    reference = song.reference_events  # list[dict] with ts_ms
    user_events = [e.model_dump() for e in body.events]

    total = len(reference)
    if total == 0:
        return ScoreResponse(accuracy=0.0, correct_count=0, total_count=0)

    correct = 0
    for ref in reference:
        ref_ts = ref["ts_ms"]
        # 기준 이벤트와 ±200ms 이내의 사용자 이벤트가 있으면 정확
        matched = any(
            abs(e["ts_ms"] - ref_ts) <= _TIMING_TOLERANCE_MS
            for e in user_events
        )
        if matched:
            correct += 1

    accuracy = round(correct / total * 100, 1)
    return ScoreResponse(accuracy=accuracy, correct_count=correct, total_count=total)
