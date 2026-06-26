from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.folk_song import FolkSong


async def get_all_folk_songs(db: AsyncSession) -> list[FolkSong]:
    result = await db.execute(select(FolkSong))
    return list(result.scalars().all())


async def get_folk_song_by_id(db: AsyncSession, folk_song_id: str) -> FolkSong | None:
    result = await db.execute(select(FolkSong).where(FolkSong.id == folk_song_id))
    return result.scalar_one_or_none()
