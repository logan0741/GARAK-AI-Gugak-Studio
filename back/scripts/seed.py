"""
시드 데이터 삽입 스크립트.
실행: back/ 디렉토리에서 python scripts/seed.py

삽입 대상:
  - instrument (1행)
  - instrument_unit (12행)
  - sample_asset_manifest (1행 — 테스트용 더미, 건희 작업 후 교체)
  - jangdan_preset (3행)
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

INSTRUMENT = {
    "id": "gayageum_12",
    "type": "gayageum",
    "display_name": "가야금 12현",
    "note_unit_count": 12,
    "version": "1.0.0",
}

INSTRUMENT_UNITS = [
    {"id": "12sg_unit_01", "instrument_id": "gayageum_12", "unit_index": 1,  "label": "1현",  "base_note_name": "D3", "base_pitch_cents": 5000, "has_pitch_bend": True},
    {"id": "12sg_unit_02", "instrument_id": "gayageum_12", "unit_index": 2,  "label": "2현",  "base_note_name": "E3", "base_pitch_cents": 5200, "has_pitch_bend": True},
    {"id": "12sg_unit_03", "instrument_id": "gayageum_12", "unit_index": 3,  "label": "3현",  "base_note_name": "G3", "base_pitch_cents": 5500, "has_pitch_bend": True},
    {"id": "12sg_unit_04", "instrument_id": "gayageum_12", "unit_index": 4,  "label": "4현",  "base_note_name": "A3", "base_pitch_cents": 5700, "has_pitch_bend": True},
    {"id": "12sg_unit_05", "instrument_id": "gayageum_12", "unit_index": 5,  "label": "5현",  "base_note_name": "B3", "base_pitch_cents": 5900, "has_pitch_bend": True},
    {"id": "12sg_unit_06", "instrument_id": "gayageum_12", "unit_index": 6,  "label": "6현",  "base_note_name": "D4", "base_pitch_cents": 6200, "has_pitch_bend": True},
    {"id": "12sg_unit_07", "instrument_id": "gayageum_12", "unit_index": 7,  "label": "7현",  "base_note_name": "E4", "base_pitch_cents": 6400, "has_pitch_bend": True},
    {"id": "12sg_unit_08", "instrument_id": "gayageum_12", "unit_index": 8,  "label": "8현",  "base_note_name": "G4", "base_pitch_cents": 6700, "has_pitch_bend": True},
    {"id": "12sg_unit_09", "instrument_id": "gayageum_12", "unit_index": 9,  "label": "9현",  "base_note_name": "A4", "base_pitch_cents": 6900, "has_pitch_bend": True},
    {"id": "12sg_unit_10", "instrument_id": "gayageum_12", "unit_index": 10, "label": "10현", "base_note_name": "B4", "base_pitch_cents": 7100, "has_pitch_bend": True},
    {"id": "12sg_unit_11", "instrument_id": "gayageum_12", "unit_index": 11, "label": "11현", "base_note_name": "D5", "base_pitch_cents": 7400, "has_pitch_bend": True},
    {"id": "12sg_unit_12", "instrument_id": "gayageum_12", "unit_index": 12, "label": "12현", "base_note_name": "E5", "base_pitch_cents": 7600, "has_pitch_bend": True},
]

# 건희 작업 전 테스트용 더미. 실제 샘플이 준비되면 교체할 것.
SAMPLE_ASSET_MANIFEST = {
    "id": "gayageum_samples_2026_06_a",
    "version": "2026.06.a",
    "instrument_id": "gayageum_12",
}

JANGDAN_PRESETS = [
    {"id": "jungmori",  "name": "중모리",  "min_bpm": 60,  "max_bpm": 80,  "density_range": "low",    "meter": "12/8"},
    {"id": "semachi",   "name": "세마치",  "min_bpm": 80,  "max_bpm": 90,  "density_range": "medium", "meter": "12/8"},
    {"id": "jajinmori", "name": "자진모리", "min_bpm": 120, "max_bpm": 160, "density_range": "high",   "meter": "12/8"},
    {"id": "semachi",   "name": "세마치",  "min_bpm": 100, "max_bpm": 140, "density_range": "medium", "meter": "9/8"},
]

STALE_JANGDAN_PRESET_IDS = ("gutgeori",)


async def seed() -> None:
    from sqlalchemy import delete
    from sqlalchemy.dialects.mysql import insert
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.config import settings
    from app.models.instrument import Instrument, InstrumentUnit
    from app.models.jangdan import JangdanPreset
    from app.models.sample_asset import SampleAssetManifest

    engine = create_async_engine(settings.db_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        async with session.begin():
            await session.execute(
                insert(Instrument)
                .values(INSTRUMENT)
                .on_duplicate_key_update(version=INSTRUMENT["version"])
            )
            await session.execute(
                insert(InstrumentUnit)
                .values(INSTRUMENT_UNITS)
                .on_duplicate_key_update(label=InstrumentUnit.label)
            )
            await session.execute(
                insert(SampleAssetManifest)
                .values(SAMPLE_ASSET_MANIFEST)
                .on_duplicate_key_update(version=SAMPLE_ASSET_MANIFEST["version"])
            )
            await session.execute(
                delete(JangdanPreset).where(JangdanPreset.id.in_(STALE_JANGDAN_PRESET_IDS))
            )
            await session.execute(
                insert(JangdanPreset)
                .values(JANGDAN_PRESETS)
                .on_duplicate_key_update(name=JangdanPreset.name)
            )

    await engine.dispose()
    print("시드 완료: instrument 1행, instrument_unit 12행, sample_asset_manifest 1행, jangdan_preset 3행")


if __name__ == "__main__":
    asyncio.run(seed())
