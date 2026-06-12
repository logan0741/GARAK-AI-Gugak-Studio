"""
인증 API 테스트.
BYPASS_AUTH=true 환경에서 실행 (conftest.py에서 설정).
실제 Google idToken 검증은 FE 연동 후 별도 테스트 필요.
"""
import pytest
from httpx import AsyncClient

from app.services.auth_service import create_access_token, create_refresh_token


# ── POST /api/auth/google ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_google_login_bypass(client: AsyncClient):
    """BYPASS_AUTH=true → 임의 idToken으로 dev_user JWT 발급."""
    response = await client.post("/api/auth/google", json={"id_token": "any"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "dev_user"
    assert data["email"] == "dev@example.com"
    assert data["access_token"]
    assert data["refresh_token"]


# ── POST /api/auth/refresh ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_token_valid(client: AsyncClient):
    """유효한 refresh token → 새 access token 발급."""
    refresh = create_refresh_token("user_123")
    response = await client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert response.status_code == 200
    assert response.json()["access_token"]


@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    """잘못된 refresh token → 401."""
    response = await client.post("/api/auth/refresh", json={"refresh_token": "invalid.token.here"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_using_access_token(client: AsyncClient):
    """access token을 refresh endpoint에 사용 → 401 (type 불일치)."""
    access = create_access_token("user_123", "test@example.com")
    response = await client.post("/api/auth/refresh", json={"refresh_token": access})
    assert response.status_code == 401


# ── GET /api/auth/me ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_bypass(client: AsyncClient):
    """BYPASS_AUTH=true → 임의 토큰으로 dev_user 반환."""
    response = await client.get("/api/auth/me", headers={"Authorization": "Bearer any"})
    assert response.status_code == 200
    assert response.json()["user_id"] == "dev_user"


@pytest.mark.asyncio
async def test_me_with_valid_jwt(client: AsyncClient, monkeypatch):
    """BYPASS_AUTH=false 시뮬레이션: 유효한 JWT → user_id + email 반환."""
    import app.core.auth as auth_mod
    import app.api.auth as api_auth_mod

    # monkeypatch로 각 모듈의 settings만 교체 (전역 상태 오염 없음)
    class FakeSettings:
        bypass_auth = False
        jwt_secret_key = "dev-secret-key"
        jwt_expire_minutes = 60
        jwt_refresh_expire_days = 30
        google_client_id = "test-client-id"

    fake = FakeSettings()
    monkeypatch.setattr(auth_mod, "settings", fake)
    monkeypatch.setattr(api_auth_mod, "settings", fake)

    import app.services.auth_service as svc_mod
    monkeypatch.setattr(svc_mod, "settings", fake)

    token = create_access_token("google_uid_999", "user@example.com")
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "google_uid_999"
    assert data["email"] == "user@example.com"


@pytest.mark.asyncio
async def test_me_no_token(client: AsyncClient):
    """Authorization 헤더 없이 요청 → 401 (HTTPBearer auto_error=True)."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 401
