from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.instrument import Instrument
from app.models.jangdan import JangdanPreset


async def get_all_instruments(db: AsyncSession) -> list[Instrument]:
    result = await db.execute(
        select(Instrument).options(selectinload(Instrument.units))
    )
    return list(result.scalars().all())


async def get_all_jangdan_presets(db: AsyncSession) -> list[JangdanPreset]:
    result = await db.execute(
        select(JangdanPreset).options(selectinload(JangdanPreset.pattern_events))
    )
    return list(result.scalars().all())
