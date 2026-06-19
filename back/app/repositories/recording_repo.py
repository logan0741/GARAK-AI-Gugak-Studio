from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recording import Recording


async def create_recording(db: AsyncSession, recording: Recording) -> Recording:
    try:
        db.add(recording)
        await db.commit()
        await db.refresh(recording)
    except Exception:
        await db.rollback()
        raise
    return recording


async def get_recording(
    db: AsyncSession,
    rec_id: str,
    session_id: str,
) -> Recording | None:
    result = await db.execute(
        select(Recording).where(
            Recording.id == rec_id,
            Recording.session_id == session_id,
        )
    )
    return result.scalar_one_or_none()


async def patch_recording(
    db: AsyncSession,
    recording: Recording,
    updates: dict,
) -> Recording:
    for key, value in updates.items():
        setattr(recording, key, value)
    try:
        await db.commit()
        await db.refresh(recording)
    except Exception:
        await db.rollback()
        raise
    return recording


async def delete_recording(db: AsyncSession, recording: Recording) -> None:
    try:
        await db.delete(recording)
        await db.commit()
    except Exception:
        await db.rollback()
        raise
