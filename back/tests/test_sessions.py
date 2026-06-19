from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient


AUTH = {"Authorization": "Bearer any"}

VALID_SESSION = {
    "id": "session_001",
    "instrumentId": "gayageum_12",
    "sampleAssetManifestId": "manifest_001",
    "title": "테스트 연주",
    "mode": "creative",
    "durationMs": 10000,
    "createdAtMs": 1700000000000,
    "events": [
        {"id": "e1", "tsMs": 0, "type": "string_pluck", "stringIndex": 0, "velocity": 0.8},
        {"id": "e2", "tsMs": 500, "type": "string_release", "stringIndex": 0},
    ],
}


# ── POST /api/sessions ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_session_success(client: AsyncClient):
    """유효한 세션 → 201 + id 반환."""
    mock_session = MagicMock(id="session_001", created_at_ms=1700000000000)
    with patch("app.api.sessions.session_service.save_session", new_callable=AsyncMock) as mock:
        mock.return_value = mock_session
        response = await client.post("/api/sessions", json=VALID_SESSION, headers=AUTH)
    assert response.status_code == 201
    assert response.json()["id"] == "session_001"


@pytest.mark.asyncio
async def test_create_session_events_over_limit(client: AsyncClient):
    """이벤트 20,000개 초과 → 422."""
    body = {**VALID_SESSION, "events": [
        {"id": f"e{i}", "tsMs": i, "type": "string_pluck", "stringIndex": 0}
        for i in range(20_001)
    ]}
    response = await client.post("/api/sessions", json=body, headers=AUTH)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_session_duration_over_limit(client: AsyncClient):
    """duration 1시간 초과 → 422."""
    body = {**VALID_SESSION, "durationMs": 3_600_001}
    response = await client.post("/api/sessions", json=body, headers=AUTH)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_session_invalid_event_type(client: AsyncClient):
    """유효하지 않은 이벤트 타입 → 422."""
    body = {**VALID_SESSION, "events": [
        {"id": "e1", "tsMs": 0, "type": "invalid_type", "stringIndex": 0},
    ]}
    response = await client.post("/api/sessions", json=body, headers=AUTH)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_session_missing_required_fields(client: AsyncClient):
    """필수 필드 누락 → 422."""
    response = await client.post("/api/sessions", json={"title": "제목만"}, headers=AUTH)
    assert response.status_code == 422


# ── GET /api/sessions ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_sessions_empty(client: AsyncClient):
    """세션 없을 때 빈 리스트 반환."""
    with patch("app.api.sessions.session_service.get_sessions", new_callable=AsyncMock) as mock:
        mock.return_value = []
        response = await client.get("/api/sessions", headers={"Authorization": "Bearer any"})
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_sessions_no_auth(client: AsyncClient, monkeypatch):
    """인증 없이 요청 → 401 (BYPASS_AUTH=false 환경)."""
    import app.core.auth as auth_mod

    class FakeSettings:
        bypass_auth = False
        jwt_secret_key = "dev-secret-key"
        jwt_expire_minutes = 60
        jwt_refresh_expire_days = 30
        google_client_id = "test-client-id"

    monkeypatch.setattr(auth_mod, "settings", FakeSettings())
    response = await client.get("/api/sessions")
    assert response.status_code == 401


# ── GET /api/sessions/{id} ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_session_not_found(client: AsyncClient):
    """존재하지 않는 세션 → 404."""
    with patch("app.api.sessions.session_repo.get_session_by_id", new_callable=AsyncMock) as mock_exists:
        mock_exists.return_value = None
        response = await client.get(
            "/api/sessions/nonexistent",
            headers={"Authorization": "Bearer any"},
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_session_forbidden(client: AsyncClient):
    """다른 사용자 세션 조회 → 403."""
    other_session = MagicMock()
    other_session.user_id = "other_user"
    with patch("app.api.sessions.session_repo.get_session_by_id", new_callable=AsyncMock) as mock_exists:
        mock_exists.return_value = other_session
        response = await client.get(
            "/api/sessions/session_001",
            headers={"Authorization": "Bearer any"},
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_session_success(client: AsyncClient):
    """존재하는 세션 → 200 + 이벤트 포함."""
    from app.models.session_model import Session
    from app.models.performance_event import PerformanceEvent

    event = PerformanceEvent(
        id="e1", session_id="session_001", occurred_at_ms=0,
        event_type="string_pluck", unit_index=0,
        pitch_bend_cents=None, velocity=0.8, strength=None, payload=None,
    )
    mock_session = MagicMock(spec=Session)
    mock_session.id = "session_001"
    mock_session.user_id = "dev_user"  # BYPASS_AUTH=true 시 user_id
    mock_session.instrument_id = "gayageum_12"
    mock_session.sample_asset_manifest_id = "manifest_001"
    mock_session.title = "테스트 연주"
    mock_session.mode = "creative"
    mock_session.folk_song_id = None
    mock_session.schema_version = "2026.06.mvp"
    mock_session.duration_ms = 10000
    mock_session.created_at_ms = 1700000000000
    mock_session.updated_at_ms = 1700000001000
    mock_session.replay_settings = None
    mock_session.events = [event]

    with patch("app.api.sessions.session_repo.get_session_by_id", new_callable=AsyncMock) as mock_exists, \
         patch("app.api.sessions.session_service.get_session", new_callable=AsyncMock) as mock_get:
        mock_exists.return_value = mock_session
        mock_get.return_value = mock_session
        response = await client.get(
            "/api/sessions/session_001",
            headers={"Authorization": "Bearer any"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "session_001"
    assert len(data["events"]) == 1
    assert data["events"][0]["event_type"] == "string_pluck"
