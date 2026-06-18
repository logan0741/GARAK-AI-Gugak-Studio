from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.repositories import jangdan_repo
from app.schemas.instrument import InstrumentOut, SampleEntryOut

router = APIRouter(prefix="/api", tags=["instruments"])


# 공개 엔드포인트 — 앱 시작 시 인증 없이 악기 목록 로딩 (CLAUDE.md 명세 참조)
@router.get("/instruments", response_model=list[InstrumentOut])
async def list_instruments(db: AsyncSession = Depends(get_db)):
    return await jangdan_repo.get_all_instruments(db)


@router.get("/instruments/{instrument_id}/samples", response_model=list[SampleEntryOut])
async def list_instrument_samples(instrument_id: str, db: AsyncSession = Depends(get_db)):
    """악기의 현/음공별 샘플 파일 URL 목록 반환. 앱 시작 시 1회 호출해 음원 다운로드에 사용."""
    rows = await jangdan_repo.get_instrument_samples(db, instrument_id)
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instrument not found or no samples registered")

    return [
        SampleEntryOut(
            unit_index=unit.unit_index,
            label=unit.label,
            articulation=sample_map.articulation,
            file_url=f"{settings.server_base_url}{asset.file_uri}",
        )
        for unit, sample_map, asset in rows
    ]
