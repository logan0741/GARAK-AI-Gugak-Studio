# -*- coding: utf-8 -*-
"""
솔로/앙상블 음원 생성 라우터

POST /api/generate/solo      → 1악기 단독 음원
POST /api/generate/ensemble  → 1악기 입력 + 2악기 AI 생성 합성
GET  /api/generate/samples   → 사용 가능한 단음 샘플 목록 (manifest)
GET  /api/generate/preview   → 인증 없이 AI 음원 즉시 생성 (테스트/미리듣기용)
"""
from __future__ import annotations

import io
import time

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse

from middleware.auth import verify_token
from schemas.generate import EnsembleRequest, JobCreated, JobResult, SoloRequest

router = APIRouter(prefix="/generate", tags=["generate"])

# ── 공통 타입 ────────────────────────────────────────────────────────────────

JANGDAN_LIST = [
    "중모리", "중중모리", "자진모리", "굿거리",
    "휘모리", "엇모리", "엇중모리", "세마치", "진양조",
]
INSTRUMENT_LIST = ["가야금", "대금", "해금", "장구"]


# ── 헬퍼 ─────────────────────────────────────────────────────────────────────

def _get_service(request: Request):
    svc = getattr(request.app.state, "generate_service", None)
    if svc is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="generate_service가 초기화되지 않았습니다.",
        )
    return svc


def _get_job_manager(request: Request):
    return request.app.state.job_manager


# ── 엔드포인트 ────────────────────────────────────────────────────────────────

@router.get("/samples", summary="단음 샘플 목록")
async def get_samples(request: Request) -> dict:
    """
    back/static/samples/manifest.json 을 반환.
    { "가야금": { "황": "/static/samples/가야금/황.wav", ... }, ... }
    """
    svc = _get_service(request)
    manifest = svc.load_manifest()
    if not manifest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="샘플 manifest 없음. 먼저 python AI/pipeline/00_ingestion/organize_samples.py 를 실행하세요.",
        )
    return manifest


@router.post("/solo", response_model=JobCreated, summary="1악기 단독 음원 생성")
async def create_solo(
    body: SoloRequest,
    request: Request,
    user_id: str = Depends(verify_token),
) -> JobCreated:
    """
    pitch Markov + 샘플 합성으로 단일 악기 음원 생성 (비동기 Job).
    job_id 를 받아 GET /api/generate/status/{job_id} 로 결과 폴링.
    """
    svc = _get_service(request)
    jm  = _get_job_manager(request)

    job_id = jm.create_job()
    jm.submit(
        job_id,
        svc.generate_solo,
        body.instrument,
        body.jo,
        body.jangdan,
        body.n_bars,
        body.bpm,
        body.temperature,
    )
    return JobCreated(job_id=job_id)


@router.post("/ensemble", response_model=JobCreated, summary="1악기 → 앙상블 음원 생성")
async def create_ensemble(
    body: EnsembleRequest,
    request: Request,
    user_id: str = Depends(verify_token),
) -> JobCreated:
    """
    사용자 노트 이벤트 + 나머지 2악기 AI 생성 → 믹싱된 WAV (비동기 Job).
    """
    svc = _get_service(request)
    jm  = _get_job_manager(request)

    events_dict = [{"pitch": e.pitch, "timestamp": e.timestamp} for e in body.events]

    job_id = jm.create_job()
    jm.submit(
        job_id,
        svc.generate_ensemble,
        events_dict,
        body.source_instrument,
        body.jo,
        body.jangdan,
        body.bpm,
        body.temperature,
    )
    return JobCreated(job_id=job_id)


@router.get("/preview", summary="AI 음원 즉시 생성 (인증 없음, 미리듣기용)")
async def preview_solo(
    request: Request,
    instrument: str   = Query(default="가야금",  description="악기명"),
    jo:        str    = Query(default="평조",    description="조 (평조/계면조)"),
    jangdan:   str    = Query(default="중모리",  description="장단"),
    n_bars:    int    = Query(default=32, ge=4, le=128, description="마디 수 (32마디≈5분)"),
    bpm:       float  = Query(default=80.0, gt=0, le=200),
    temperature: float = Query(default=1.0, ge=0.0, le=2.0),
) -> StreamingResponse:
    """
    인증 없이 AI 솔로 음원을 생성하고 WAV를 스트리밍 반환.
    미리듣기/테스트용. n_bars 기본값 32 ≈ 약 5분 (BPM 80 기준).
    """
    import tempfile, os
    svc = _get_service(request)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        svc.solo.generate(
            instrument=instrument,
            jo=jo,
            jangdan=jangdan,
            n_bars=n_bars,
            bpm=bpm,
            temperature=temperature,
            output_path=tmp_path,
        )
        with open(tmp_path, "rb") as f:
            wav_bytes = f.read()
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return StreamingResponse(
        io.BytesIO(wav_bytes),
        media_type="audio/wav",
    )


@router.get("/status/{job_id}", response_model=JobResult, summary="Job 상태 확인")
async def job_status(
    job_id: str,
    request: Request,
    user_id: str = Depends(verify_token),
) -> JobResult:
    jm  = _get_job_manager(request)
    job = jm.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"job '{job_id}' 없음 (만료 또는 미존재)",
        )

    elapsed_ms = (time.time() - job.created_at) * 1000
    result = job.result or {}

    return JobResult(
        job_id=job.job_id,
        status=job.status.value,
        audio_url=result.get("audio_url"),
        meta={k: v for k, v in result.items() if k != "audio_url"},
        error=job.error,
        elapsed_ms=elapsed_ms,
    )
