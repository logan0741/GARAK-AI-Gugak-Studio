"""
새 백엔드(back/main.py) 테스트용 conftest.
DB 없이 실행 가능 — 서비스는 mock으로 주입.
"""
from __future__ import annotations

import os
import sys
import time
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

# back/ 를 sys.path 에 추가 (routers/services 임포트용)
_BACK_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACK_DIR not in sys.path:
    sys.path.insert(0, _BACK_DIR)

# AI runtime 경로도 추가
_AI_RUNTIME = os.path.join(_BACK_DIR, "..", "AI", "pipeline", "03_runtime")
if os.path.isdir(_AI_RUNTIME) and _AI_RUNTIME not in sys.path:
    sys.path.insert(0, os.path.abspath(_AI_RUNTIME))

# GOOGLE_CLIENT_ID 미설정 → verify_token이 토큰 검증 스킵
os.environ.setdefault("GOOGLE_CLIENT_ID", "")
os.environ.setdefault("SERVER_BASE_URL", "http://testserver")


def _make_app(
    *,
    analyze_service,
    markov_service,
    job_manager,
    feedback_service,
) -> FastAPI:
    from routers.accompaniment import router as accompaniment_router
    from routers.analyze import router as analyze_router
    from routers.feedback import router as feedback_router

    app = FastAPI()
    # state를 lifespan 없이 직접 설정 (test 환경)
    app.state.analyze_service = analyze_service
    app.state.markov_service = markov_service
    app.state.job_manager = job_manager
    app.state.feedback_service = feedback_service
    app.state.static_dir = os.path.join(_BACK_DIR, "static")

    app.include_router(analyze_router, prefix="/api")
    app.include_router(accompaniment_router, prefix="/api")
    app.include_router(feedback_router, prefix="/api")

    return app


@pytest.fixture
def mock_analyze_service():
    svc = MagicMock()
    svc.detect_jo.return_value = ("평조", 0.85)
    svc.detect_jangdan.return_value = ("중모리", 0.78, 92.0)
    return svc


@pytest.fixture
def mock_feedback_service():
    svc = MagicMock()
    svc.build_feedback.return_value = ("잘 연주하셨습니다!", "fallback")
    return svc


@pytest.fixture
def mock_job_manager():
    mgr = MagicMock()
    mgr.create_job.return_value = "test-job-001"

    job = MagicMock()
    job.job_id = "test-job-001"
    job.status.value = "done"
    job.result = {
        "audio_url": "http://testserver/static/generated/test.wav",
        "pattern_sequence": [0, 1, 2, 3],
        "jangdan": "중모리",
        "jo": "평조",
        "bpm": 92.0,
    }
    job.error = None
    job.created_at = time.time()
    mgr.get.return_value = job
    return mgr


@pytest.fixture
def mock_markov_service():
    svc = MagicMock()
    svc.available_models.return_value = [
        {"jo": "평조", "jangdan": "중모리"},
        {"jo": "계면조", "jangdan": "자진모리"},
    ]
    return svc


@pytest.fixture
async def client(mock_analyze_service, mock_feedback_service, mock_job_manager, mock_markov_service):
    app = _make_app(
        analyze_service=mock_analyze_service,
        markov_service=mock_markov_service,
        job_manager=mock_job_manager,
        feedback_service=mock_feedback_service,
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        yield ac
