from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.instrument import Instrument, InstrumentUnit
from app.models.jangdan import JangdanPreset, JangdanRecommendation
from app.models.sample_asset import InstrumentUnitSampleMap, SampleAsset, SampleAssetManifest


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


async def get_jangdan_by_id(db: AsyncSession, jangdan_id: str) -> JangdanPreset | None:
    result = await db.execute(
        select(JangdanPreset).where(JangdanPreset.id == jangdan_id)
    )
    return result.scalar_one_or_none()


async def create_recommendation(db: AsyncSession, rec: JangdanRecommendation) -> JangdanRecommendation:
    db.add(rec)
    await db.flush()
    return rec


async def get_instrument_samples(
    db: AsyncSession, instrument_id: str
) -> list[tuple[InstrumentUnit, InstrumentUnitSampleMap, SampleAsset, SampleAssetManifest]]:
    """악기의 현/음공별 샘플 파일 매핑 반환. unit_index 오름차순."""
    result = await db.execute(
        select(InstrumentUnit, InstrumentUnitSampleMap, SampleAsset, SampleAssetManifest)
        .join(InstrumentUnitSampleMap, InstrumentUnit.id == InstrumentUnitSampleMap.instrument_unit_id)
        .join(SampleAsset, InstrumentUnitSampleMap.sample_asset_id == SampleAsset.id)
        .join(SampleAssetManifest, SampleAsset.manifest_id == SampleAssetManifest.id)
        .where(InstrumentUnit.instrument_id == instrument_id)
        .order_by(InstrumentUnit.unit_index, InstrumentUnitSampleMap.priority)
    )
    return list(result.all())
