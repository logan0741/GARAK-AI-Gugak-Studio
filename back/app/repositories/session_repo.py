from __future__ import annotations

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.performance_event import PerformanceEvent
from app.models.session_model import Session


async def create_session(
    db: AsyncSession,
    session: Session,
    event_dicts: list[dict],
) -> Session:
    try:
        db.add(session)
        await db.flush()  # session.id FK 참조를 위해 먼저 flush
        if event_dicts:
            await db.execute(insert(PerformanceEvent).values(event_dicts))
        await db.commit()
        await db.refresh(session)
    except Exception:
        await db.rollback()
        raise
    return session


async def list_sessions(db: AsyncSession, user_id: str) -> list[Session]:
    # TODO: 세션이 많아지면 cursor 기반 페이지네이션으로 교체 필요
    result = await db.execute(
        select(Session)
        .where(Session.user_id == user_id)
        .order_by(Session.created_at_ms.desc())
    )
    return list(result.scalars().all())


async def get_session_by_id(db: AsyncSession, session_id: str) -> Session | None:
    """소유권 무관하게 session_id로만 조회 (존재 여부 확인용)."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    return result.scalar_one_or_none()


async def get_session_detail(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> Session | None:
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == user_id)
        .options(selectinload(Session.events))
    )
    return result.scalar_one_or_none()
