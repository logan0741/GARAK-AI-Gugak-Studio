from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# echo=True로 바꾸면 ORM이 실행하는 SQL 쿼리를 콘솔에서 볼 수 있다 (디버깅용)
engine = create_async_engine(settings.db_url, echo=False)


class Base(DeclarativeBase):
    pass
