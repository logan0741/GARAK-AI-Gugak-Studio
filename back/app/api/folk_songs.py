from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories import folk_song_repo
from app.schemas.folk_song import FolkSongOut, ScoreRequest, ScoreResponse
from app.services.translate_service import translate_batch_to_locale

router = APIRouter(prefix="/api", tags=["folk-songs"])

_TIMING_TOLERANCE_MS = 200  # ±200ms 이내 → 정확


@router.get("/folk-songs", response_model=list[FolkSongOut])
async def list_folk_songs(
    locale: str = Query(default="ko", pattern="^(ko|en)$"),
    db: AsyncSession = Depends(get_db),
):
    songs = await folk_song_repo.get_all_folk_songs(db)
    if locale == "en":
        titles = await translate_batch_to_locale([s.title for s in songs], "en")
        return [
            FolkSongOut.model_validate(song).model_copy(update={"title": title})
            for song, title in zip(songs, titles)
        ]
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
    remaining = list(user_events)  # 이미 매칭된 이벤트는 제거해 중복 매칭 방지
    for ref in reference:
        ref_ts = ref["ts_ms"]
        for i, e in enumerate(remaining):
            if abs(e["ts_ms"] - ref_ts) <= _TIMING_TOLERANCE_MS:
                correct += 1
                remaining.pop(i)
                break

    accuracy = round(correct / total * 100, 1)
    return ScoreResponse(accuracy=accuracy, correct_count=correct, total_count=total)
