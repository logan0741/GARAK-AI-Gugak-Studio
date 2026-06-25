from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.base import engine

async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    # commit은 각 서비스 레이어에서 명시적으로 호출한다.
    # 예외 발생 시에만 여기서 롤백 처리.
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
