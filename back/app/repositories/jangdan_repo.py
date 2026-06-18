from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.instrument import Instrument, InstrumentUnit
from app.models.jangdan import JangdanPreset
from app.models.sample_asset import InstrumentUnitSampleMap, SampleAsset


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


async def get_instrument_samples(
    db: AsyncSession, instrument_id: str
) -> list[tuple[InstrumentUnit, InstrumentUnitSampleMap, SampleAsset]]:
    """악기의 현/음공별 샘플 파일 매핑 반환. unit_index 오름차순."""
    result = await db.execute(
        select(InstrumentUnit, InstrumentUnitSampleMap, SampleAsset)
        .join(InstrumentUnitSampleMap, InstrumentUnit.id == InstrumentUnitSampleMap.instrument_unit_id)
        .join(SampleAsset, InstrumentUnitSampleMap.sample_asset_id == SampleAsset.id)
        .where(InstrumentUnit.instrument_id == instrument_id)
        .order_by(InstrumentUnit.unit_index, InstrumentUnitSampleMap.priority)
    )
    return list(result.all())
