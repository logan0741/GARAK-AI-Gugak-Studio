from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.db.session import async_session_factory
from app.api.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path("static/audio").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="GUKAK STUDIO API", version="1.0.0", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth_router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "GUKAK STUDIO API", "version": "1.0.0"}


@app.get("/health")
async def health():
    async with async_session_factory() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "healthy", "db": "connected"}
