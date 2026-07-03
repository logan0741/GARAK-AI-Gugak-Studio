import asyncio
import functools

from fastapi import APIRouter, Depends, HTTPException, Request, status

from middleware.auth import verify_token
from schemas.analyze import AnalyzeRequest, AnalyzeResponse

router = APIRouter()


async def _run_sync(fn, *args, **kwargs):
    """Python 3.8 호환 asyncio.to_thread 대체."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    body: AnalyzeRequest,
    request: Request,
    user_id: str = Depends(verify_token),
) -> AnalyzeResponse:
    if len(body.timestamps) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="timestamps는 최소 2개 이상이어야 합니다.",
        )

    import numpy as np

    svc = request.app.state.analyze_service

    notes = body.notes or []
    jo, jo_conf = await _run_sync(svc.detect_jo, notes)
    jangdan, jd_conf, detected_bpm = await _run_sync(
        svc.detect_jangdan, body.timestamps, jo
    )

    ts = np.sort(np.array(body.timestamps, dtype=float))
    ioi_ms = [round(float(v), 2) for v in np.diff(ts) * 1000.0]

    return AnalyzeResponse(
        jo=jo,
        jangdan=jangdan,
        jo_confidence=jo_conf,
        jangdan_confidence=jd_conf,
        detected_bpm=detected_bpm,
        ioi_ms=ioi_ms,
    )
