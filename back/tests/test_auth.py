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
async def test_me_with_valid_jwt(client: AsyncClient):
    """BYPASS_AUTH=false 환경 시뮬레이션: 유효한 JWT → user_id + email 반환."""
    import os
    os.environ["BYPASS_AUTH"] = "false"

    # lru_cache 때문에 settings 재생성
    from app.core import config as cfg
    cfg.get_settings.cache_clear()
    cfg.settings = cfg.get_settings()

    # auth 모듈도 갱신된 settings 사용하도록
    import app.core.auth as auth_mod
    import app.services.auth_service as svc_mod
    auth_mod.settings = cfg.settings
    svc_mod.settings = cfg.settings

    token = create_access_token("google_uid_999", "user@example.com")
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "google_uid_999"
    assert data["email"] == "user@example.com"

    # 복원
    os.environ["BYPASS_AUTH"] = "true"
    cfg.get_settings.cache_clear()
    cfg.settings = cfg.get_settings()
    auth_mod.settings = cfg.settings
    svc_mod.settings = cfg.settings


@pytest.mark.asyncio
async def test_me_no_token(client: AsyncClient):
    """토큰 없이 요청 → 401 (HTTPBearer 미제공)."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 403 or response.status_code == 401
