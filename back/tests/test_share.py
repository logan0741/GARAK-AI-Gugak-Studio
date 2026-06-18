from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

AUTH = {"Authorization": "Bearer any"}
VALID_BODY = {"session_id": "session_001"}


@pytest.mark.asyncio
async def test_share_success(client: AsyncClient):
    """정상 요청 → 201, share_url 반환."""
    mock_session = MagicMock()
    mock_session.user_id = "dev_user"
    mock_share = MagicMock()
    mock_share.id = "share_abc"

    with patch("app.api.share.session_repo.get_session_by_id", new_callable=AsyncMock, return_value=mock_session), \
         patch("app.api.share.share_repo.create_share_link", new_callable=AsyncMock, return_value=mock_share):
        response = await client.post("/api/share", json=VALID_BODY, headers=AUTH)

    assert response.status_code == 201
    data = response.json()
    assert "share_url" in data
    assert "/s/" in data["share_url"]


@pytest.mark.asyncio
async def test_share_session_not_found(client: AsyncClient):
    """존재하지 않는 세션 → 404."""
    with patch("app.api.share.session_repo.get_session_by_id", new_callable=AsyncMock, return_value=None):
        response = await client.post("/api/share", json=VALID_BODY, headers=AUTH)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_share_forbidden(client: AsyncClient):
    """다른 사용자 세션 → 403."""
    mock_session = MagicMock()
    mock_session.user_id = "other_user"
    with patch("app.api.share.session_repo.get_session_by_id", new_callable=AsyncMock, return_value=mock_session):
        response = await client.post("/api/share", json=VALID_BODY, headers=AUTH)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_share_success(client: AsyncClient):
    """공유 링크 조회 → 200, share 정보 반환."""
    mock_link = MagicMock()
    mock_link.id = "share_abc"
    mock_link.session_id = "session_001"
    mock_link.recording_id = None
    mock_link.visibility = "public"
    mock_link.created_at_ms = 1700000000000

    with patch("app.api.share.share_repo.get_share_link", new_callable=AsyncMock, return_value=mock_link):
        response = await client.get("/api/share/share_abc")

    assert response.status_code == 200
    data = response.json()
    assert data["share_id"] == "share_abc"
    assert data["session_id"] == "session_001"
    assert "/s/share_abc" in data["share_url"]


@pytest.mark.asyncio
async def test_get_share_not_found(client: AsyncClient):
    """존재하지 않는 공유 링크 → 404."""
    with patch("app.api.share.share_repo.get_share_link", new_callable=AsyncMock, return_value=None):
        response = await client.get("/api/share/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_share_no_auth(client: AsyncClient, monkeypatch):
    """인증 없이 요청 → 401."""
    import app.core.auth as auth_mod

    class FakeSettings:
        bypass_auth = False
        jwt_secret_key = "dev-secret-key"
        jwt_expire_minutes = 60
        jwt_refresh_expire_days = 30
        google_client_id = "test-client-id"

    monkeypatch.setattr(auth_mod, "settings", FakeSettings())
    response = await client.post("/api/share", json=VALID_BODY)
    assert response.status_code == 401
