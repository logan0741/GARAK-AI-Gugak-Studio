import uuid
from pathlib import Path
from time import time_ns

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.recording import Recording
from app.repositories import recording_repo, session_repo
from app.schemas.recording import RecordingOut

router = APIRouter(prefix="/api", tags=["tracks"])

ALLOWED_CONTENT_TYPES = {"audio/aac", "audio/x-m4a", "audio/mp4", "audio/mpeg"}
MAX_FILE_BYTES = 50 * 1024 * 1024  # 50MB


def _now_ms() -> int:
    return time_ns() // 1_000_000


@router.post("/tracks/upload", response_model=RecordingOut, status_code=status.HTTP_201_CREATED)
async def upload_track(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    instrument_id: str | None = Form(None),
    duration_ms: int = Form(...),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AAC 녹음 파일 업로드 후 Recording 행 생성."""
    # 세션 소유권 확인
    session = await session_repo.get_session_detail(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # 파일 타입 검사
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type: {file.content_type}. Allowed: aac, m4a, mp4",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File too large (max 50MB)",
        )

    # static/audio/{session_id}/{uuid}.aac 에 저장
    rec_id = str(uuid.uuid4())
    save_dir = Path("static/audio") / session_id
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / f"{rec_id}.aac"

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(contents)

    recording = Recording(
        id=rec_id,
        session_id=session_id,
        instrument_id=instrument_id,
        file_uri=f"/static/audio/{session_id}/{rec_id}.aac",
        format="aac",
        duration_ms=duration_ms,
        render_status="done",
        volume=1.0,
        is_muted=False,
        track_order=0,
        created_at_ms=_now_ms(),
    )
    return await recording_repo.create_recording(db, recording)
