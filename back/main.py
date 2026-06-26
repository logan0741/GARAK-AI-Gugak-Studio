from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager

from dotenv import load_dotenv

_BACK_DIR = os.path.dirname(os.path.abspath(__file__))
_AI_RUNTIME_DIR = os.path.join(_BACK_DIR, "..", "AI", "pipeline", "03_runtime")
if _AI_RUNTIME_DIR not in sys.path:
    sys.path.insert(0, os.path.abspath(_AI_RUNTIME_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers.accompaniment import router as accompaniment_router
from routers.analyze import router as analyze_router
from routers.feedback import router as feedback_router
from routers.generate import router as generate_router
from routers.recordings import router as recordings_router
from services.analyze_service import AnalyzeService
from services.feedback_service import FeedbackService
from services.generate_service import GenerateService
from services.job_manager import JobManager
from services.markov_service import MarkovService
from services.recording_service import RecordingService

load_dotenv(os.path.join(_BACK_DIR, ".env"))

STATIC_DIR = os.path.join(_BACK_DIR, "static")
GENERATED_DIR = os.path.join(STATIC_DIR, "generated")


def _resolve(path: str) -> str:
    if os.path.isabs(path):
        return path
    return os.path.abspath(os.path.join(_BACK_DIR, path))


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(GENERATED_DIR, exist_ok=True)

    models_dir = _resolve(os.getenv("MODELS_DIR", "../AI/models"))
    segments_dir = _resolve(os.getenv("SEGMENTS_DIR", "../AI/segments"))

    print(f"[INIT] MODELS_DIR={models_dir}")
    print(f"[INIT] SEGMENTS_DIR={segments_dir}")

    service = MarkovService(models_dir=models_dir, segments_dir=segments_dir)
    app.state.markov_service = service
    app.state.static_dir = STATIC_DIR

    job_manager = JobManager(max_workers=4, ttl_seconds=3600)
    app.state.job_manager = job_manager

    analyze_svc = AnalyzeService(models_dir=models_dir)
    app.state.analyze_service = analyze_svc
    print(f"[INIT] AnalyzeService: {len(analyze_svc._models)}개 모델 로드")

    app.state.feedback_service = FeedbackService()
    print("[INIT] FeedbackService")

    samples_dir = _resolve(os.getenv("SAMPLES_DIR", "../back/static/samples"))
    base_url    = os.getenv("SERVER_BASE_URL", "http://localhost:8000").rstrip("/")
    gen_svc = GenerateService(
        models_dir=models_dir,
        segments_dir=segments_dir,
        samples_dir=samples_dir,
        generated_dir=GENERATED_DIR,
        base_url=base_url,
    )
    app.state.generate_service = gen_svc
    print(f"[INIT] GenerateService: samples={samples_dir}")

    recording_svc = RecordingService(static_dir=STATIC_DIR, base_url=base_url)
    app.state.recording_service = recording_svc
    print(f"[INIT] RecordingService: recordings={recording_svc.recordings_dir}")

    yield

    job_manager.shutdown()


app = FastAPI(title="RYUL Accompaniment API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(GENERATED_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(accompaniment_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")
app.include_router(feedback_router, prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(recordings_router, prefix="/api")


@app.get("/")
async def root() -> dict:
    service = getattr(app.state, "markov_service", None)
    models = service.available_models() if service else []
    return {"status": "ok", "models": models}


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy"}
