import uuid
from time import time_ns

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.share_link import ShareLink
from app.repositories import session_repo, share_repo
from app.schemas.share import ShareLinkOut, ShareRequest, ShareResponse

router = APIRouter(prefix="/api", tags=["share"])


@router.post("/share", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_share(
    body: ShareRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await session_repo.get_session_by_id(db, body.session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    share_id = str(uuid.uuid4())
    share_link = ShareLink(
        id=share_id,
        session_id=body.session_id,
        recording_id=body.recording_id,
        visibility="public",
        created_at_ms=time_ns() // 1_000_000,
    )
    await share_repo.create_share_link(db, share_link)

    return ShareResponse(
        share_id=share_id,
        share_url=f"{settings.server_base_url}/s/{share_id}",
    )


@router.get("/share/{share_id}", response_model=ShareLinkOut)
async def get_share(
    share_id: str,
    db: AsyncSession = Depends(get_db),
):
    """공유 링크 조회. 인증 불필요 — 링크를 받은 누구나 접근 가능."""
    link = await share_repo.get_share_link(db, share_id)
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found")

    return ShareLinkOut(
        share_id=link.id,
        share_url=f"{settings.server_base_url}/s/{link.id}",
        session_id=link.session_id,
        recording_id=link.recording_id,
        visibility=link.visibility,
        created_at_ms=link.created_at_ms,
    )
