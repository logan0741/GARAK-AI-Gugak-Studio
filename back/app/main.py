from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.db.session import async_session_factory
from app.api.auth import router as auth_router
from app.api.instruments import router as instruments_router
from app.api.jangdan_presets import router as jangdan_presets_router
from app.api.sessions import router as sessions_router
from app.api.tracks import router as tracks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path("static/audio").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="GUKAK STUDIO API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth_router)
app.include_router(instruments_router)
app.include_router(jangdan_presets_router)
app.include_router(sessions_router)
app.include_router(tracks_router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "GUKAK STUDIO API", "version": "1.0.0"}


@app.get("/health")
async def health():
    async with async_session_factory() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "healthy", "db": "connected"}
