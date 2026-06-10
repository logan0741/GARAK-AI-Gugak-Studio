import os
import pytest
from httpx import AsyncClient, ASGITransport

os.environ.setdefault("DB_URL", "mysql+aiomysql://root:password@localhost:3306/gukak_test")
os.environ.setdefault("BYPASS_AUTH", "true")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")

from app.main import app  # noqa: E402 — env must be set before import


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
