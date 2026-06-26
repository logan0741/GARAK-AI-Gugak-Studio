from __future__ import annotations

import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from core.audio_preprocessing import PreprocessConfig, RecordingMeta
from middleware.auth import verify_token
from schemas.recording import RecordingPreprocessResponse

router = APIRouter(prefix="/recordings", tags=["recordings"])


@router.post("/preprocess", response_model=RecordingPreprocessResponse)
async def preprocess_recording_upload(
    request: Request,
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(default=None),
    instrument: str = Form(...),
    bpm: float = Form(..., gt=0, le=300),
    beats_per_bar: int = Form(..., gt=0, le=32),
    jangdan: Optional[str] = Form(default=None),
    jo: Optional[str] = Form(default=None),
    first_bar_offset_s: float = Form(default=0.0),
    expected_bars: Optional[int] = Form(default=None, gt=0, le=256),
    target_rms_db: float = Form(default=-20.0, ge=-40.0, le=-6.0),
    peak_ceiling: float = Form(default=0.95, gt=0.0, le=1.0),
    user_id: str = Depends(verify_token),
) -> RecordingPreprocessResponse:
    service = getattr(request.app.state, "recording_service", None)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="recording_service가 초기화되지 않았습니다.",
        )

    sid = session_id or uuid.uuid4().hex[:12]
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    if suffix.lower() not in {".wav", ".wave", ".m4a", ".mp3", ".aac"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="지원하지 않는 오디오 확장자입니다. wav/m4a/mp3/aac만 허용합니다.",
        )

    original_path = service.original_path(sid, suffix=suffix)
    os.makedirs(os.path.dirname(original_path), exist_ok=True)
    await _save_upload(file, original_path)

    meta = RecordingMeta(
        session_id=sid,
        instrument=instrument,
        bpm=bpm,
        beats_per_bar=beats_per_bar,
        jangdan=jangdan,
        jo=jo,
        first_bar_offset_s=first_bar_offset_s,
        expected_bars=expected_bars,
    )
    config = PreprocessConfig(
        target_rms_db=target_rms_db,
        peak_ceiling=peak_ceiling,
    )

    try:
        result = service.preprocess(original_path, meta=meta, config=config)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"녹음 전처리에 실패했습니다: {exc}",
        ) from exc

    result["original_audio_url"] = service._static_url(original_path)
    return RecordingPreprocessResponse(**result)


async def _save_upload(file: UploadFile, path: str) -> None:
    with open(path, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
