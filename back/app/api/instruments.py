from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories import jangdan_repo
from app.schemas.instrument import InstrumentOut

router = APIRouter(prefix="/api", tags=["instruments"])


@router.get("/instruments", response_model=list[InstrumentOut])
async def list_instruments(db: AsyncSession = Depends(get_db)):
    return await jangdan_repo.get_all_instruments(db)
