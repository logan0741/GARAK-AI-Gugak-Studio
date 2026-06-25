from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories import jangdan_repo
from app.schemas.jangdan import JangdanPresetOut

router = APIRouter(prefix="/api", tags=["jangdan"])


@router.get("/jangdan-presets", response_model=List[JangdanPresetOut])
async def list_jangdan_presets(db: AsyncSession = Depends(get_db)):
    return await jangdan_repo.get_all_jangdan_presets(db)
