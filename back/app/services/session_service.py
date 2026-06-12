from time import time_ns

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.performance_event import PerformanceEvent
from app.models.session_model import Session
from app.repositories import session_repo
from app.schemas.session import SessionCreate


def _now_ms() -> int:
    return time_ns() // 1_000_000


async def save_session(
    db: AsyncSession,
    body: SessionCreate,
    user_id: str,
) -> Session:
    now = _now_ms()
    session = Session(
        id=body.id,
        user_id=user_id,
        instrument_id=body.instrument_id,
        sample_asset_manifest_id=body.sample_asset_manifest_id,
        title=body.title,
        mode=body.mode,
        folk_song_id=body.folk_song_id,
        schema_version=body.schema_version,
        duration_ms=body.duration_ms,
        created_at_ms=body.created_at_ms,
        updated_at_ms=now,
        replay_settings=body.replay_settings,
    )
    events = [
        PerformanceEvent(
            id=e.id,
            session_id=body.id,
            occurred_at_ms=e.ts_ms,
            event_type=e.type,
            unit_index=e.unit_index,
            pitch_bend_cents=e.cents,
            velocity=e.velocity,
            strength=e.strength,
            payload=e.payload,
        )
        for e in body.events
    ]
    return await session_repo.create_session(db, session, events)


async def get_sessions(db: AsyncSession, user_id: str) -> list[Session]:
    return await session_repo.list_sessions(db, user_id)


async def get_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> Session | None:
    return await session_repo.get_session_detail(db, session_id, user_id)
