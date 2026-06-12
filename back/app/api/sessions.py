from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.schemas.session import (
    SessionCreate,
    SessionCreateResponse,
    SessionDetail,
    SessionSummary,
)
from app.services import session_service

router = APIRouter(prefix="/api", tags=["sessions"])


@router.post("/sessions", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        session = await session_service.save_session(db, body, user_id)
    except IntegrityError as exc:
        orig_str = str(exc.orig) if exc.orig else ""
        if "1062" in orig_str or "Duplicate entry" in orig_str:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session ID already exists")
        if "1452" in orig_str or "foreign key constraint" in orig_str.lower():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid reference: instrument or folk_song not found")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Database constraint violation")
    return SessionCreateResponse(id=session.id, created_at_ms=session.created_at_ms)


@router.get("/sessions", response_model=list[SessionSummary])
async def list_sessions(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await session_service.get_sessions(db, user_id)


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await session_service.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session
