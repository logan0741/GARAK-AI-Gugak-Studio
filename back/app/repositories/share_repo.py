from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.share_link import ShareLink


async def create_share_link(db: AsyncSession, share_link: ShareLink) -> ShareLink:
    db.add(share_link)
    await db.commit()
    await db.refresh(share_link)
    return share_link


async def get_share_link(db: AsyncSession, share_id: str) -> ShareLink | None:
    result = await db.execute(select(ShareLink).where(ShareLink.id == share_id))
    return result.scalar_one_or_none()
