from __future__ import annotations

import os
import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status

from middleware.auth import verify_token
from schemas.accompaniment import (
    AccompanimentRequest,
    JobCreatedResponse,
    JobStatusResponse,
    ModelInfo,
)
from services.audio_service import JANGDAN_BEATS, assemble_accompaniment

router = APIRouter()


def _generate_accompaniment(
    service,
    jo: str,
    jangdan: str,
    bars: int,
    temperature: float,
    bpm: float,
    generated_dir: str,
    static_dir: str,
    base_url: str,
) -> dict:
    try:
        pattern_sequence = service.generate_sequence(
            jo=jo,
            jangdan=jangdan,
            bars=bars,
            temperature=temperature,
        )
    except KeyError:
        raise ValueError(f"모델을 찾을 수 없습니다: {jo}_{jangdan}")

    segment_paths = service.get_segment_paths(jo, jangdan, pattern_sequence)
    if not segment_paths:
        raise ValueError(
            f"세그먼트가 없습니다: {jo}_{jangdan}. "
            "먼저 'python AI/pipeline/02_training/export_segments.py'를 실행하세요."
        )

    beats_per_bar = JANGDAN_BEATS.get(jangdan, 12)
    wav_path = assemble_accompaniment(
        segment_paths=segment_paths,
        output_dir=generated_dir,
        bpm=bpm,
        beats_per_bar=beats_per_bar,
    )

    rel_path = os.path.relpath(wav_path, static_dir).replace(os.sep, "/")
    audio_url = f"{base_url}/static/{rel_path}"

    return {
        "audio_url": audio_url,
        "pattern_sequence": pattern_sequence,
        "jangdan": jangdan,
        "jo": jo,
        "bpm": bpm,
    }


@router.get("/accompaniment/available", response_model=List[ModelInfo])
async def available(request: Request):
    service = request.app.state.markov_service
    return service.available_models()


@router.post("/accompaniment", response_model=JobCreatedResponse)
async def create_accompaniment(
    body: AccompanimentRequest,
    request: Request,
    user_id: str = Depends(verify_token),
) -> JobCreatedResponse:
    service = request.app.state.markov_service
    job_manager = request.app.state.job_manager
    static_dir = request.app.state.static_dir
    generated_dir = os.path.join(static_dir, "generated")
    base_url = os.getenv("SERVER_BASE_URL", "http://localhost:8000").rstrip("/")

    job_id = job_manager.create_job()
    job_manager.submit(
        job_id,
        _generate_accompaniment,
        service,
        body.jo,
        body.jangdan,
        body.bars,
        body.temperature,
        body.bpm,
        generated_dir,
        static_dir,
        base_url,
    )

    return JobCreatedResponse(job_id=job_id, status="pending")


@router.get("/accompaniment/status/{job_id}", response_model=JobStatusResponse)
async def job_status(
    job_id: str,
    request: Request,
    user_id: str = Depends(verify_token),
) -> JobStatusResponse:
    job_manager = request.app.state.job_manager
    job = job_manager.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"job_id '{job_id}' 없음 (만료되었거나 존재하지 않음)",
        )

    elapsed_ms = (time.time() - job.created_at) * 1000
    result = job.result or {}

    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status.value,
        created_at=job.created_at,
        elapsed_ms=elapsed_ms,
        audio_url=result.get("audio_url"),
        pattern_sequence=result.get("pattern_sequence"),
        jangdan=result.get("jangdan"),
        jo=result.get("jo"),
        bpm=result.get("bpm"),
        error=job.error,
    )
