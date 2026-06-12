import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.models.recording import Recording

AUTH = {"Authorization": "Bearer any"}


def _mock_recording(**kwargs) -> MagicMock:
    defaults = dict(
        id="rec_001",
        session_id="session_001",
        instrument_id="gayageum_12",
        file_uri="/static/audio/session_001/rec_001.aac",
        format="aac",
        duration_ms=5000,
        render_status="done",
        volume=1.0,
        is_muted=False,
        track_order=0,
        created_at_ms=1700000000000,
    )
    m = MagicMock(spec=Recording)
    for k, v in {**defaults, **kwargs}.items():
        setattr(m, k, v)
    return m


def _mock_session():
    m = MagicMock()
    m.id = "session_001"
    return m


# ── POST /api/tracks/upload ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_track_success(client: AsyncClient):
    """AAC 파일 업로드 → 201 + Recording 반환."""
    mock_rec = _mock_recording()
    with (
        patch("app.api.tracks.session_repo.get_session_detail", new_callable=AsyncMock) as mock_session,
        patch("app.api.tracks.recording_repo.create_recording", new_callable=AsyncMock) as mock_create,
        patch("aiofiles.open"),
    ):
        mock_session.return_value = _mock_session()
        mock_create.return_value = mock_rec
        response = await client.post(
            "/api/tracks/upload",
            data={"session_id": "session_001", "duration_ms": "5000"},
            files={"file": ("test.aac", io.BytesIO(b"fake_audio"), "audio/aac")},
            headers=AUTH,
        )
    assert response.status_code == 201
    assert response.json()["id"] == "rec_001"


@pytest.mark.asyncio
async def test_upload_track_invalid_type(client: AsyncClient):
    """mp3 업로드 → 422."""
    with patch("app.api.tracks.session_repo.get_session_detail", new_callable=AsyncMock) as mock_session:
        mock_session.return_value = _mock_session()
        response = await client.post(
            "/api/tracks/upload",
            data={"session_id": "session_001", "duration_ms": "5000"},
            files={"file": ("test.mp3", io.BytesIO(b"fake_audio"), "audio/mpeg3")},
            headers=AUTH,
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_track_session_not_found(client: AsyncClient):
    """없는 세션 → 404."""
    with patch("app.api.tracks.session_repo.get_session_detail", new_callable=AsyncMock) as mock_session:
        mock_session.return_value = None
        response = await client.post(
            "/api/tracks/upload",
            data={"session_id": "nonexistent", "duration_ms": "5000"},
            files={"file": ("test.aac", io.BytesIO(b"fake_audio"), "audio/aac")},
            headers=AUTH,
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_upload_track_no_auth(client: AsyncClient):
    """인증 없이 업로드 → 401."""
    response = await client.post(
        "/api/tracks/upload",
        data={"session_id": "session_001", "duration_ms": "5000"},
        files={"file": ("test.aac", io.BytesIO(b"fake_audio"), "audio/aac")},
    )
    assert response.status_code == 401


# ── PATCH /api/sessions/{id}/recordings/{rec_id} ──────────────────────────────

@pytest.mark.asyncio
async def test_patch_recording_success(client: AsyncClient):
    """volume 변경 → 200 + 업데이트된 Recording 반환."""
    mock_rec = _mock_recording(volume=0.5)
    with (
        patch("app.api.sessions.session_service.get_session", new_callable=AsyncMock) as mock_sess,
        patch("app.api.sessions.recording_repo.get_recording", new_callable=AsyncMock) as mock_get,
        patch("app.api.sessions.recording_repo.patch_recording", new_callable=AsyncMock) as mock_patch,
    ):
        mock_sess.return_value = _mock_session()
        mock_get.return_value = _mock_recording()
        mock_patch.return_value = mock_rec
        response = await client.patch(
            "/api/sessions/session_001/recordings/rec_001",
            json={"volume": 0.5},
            headers=AUTH,
        )
    assert response.status_code == 200
    assert response.json()["volume"] == 0.5


@pytest.mark.asyncio
async def test_patch_recording_volume_out_of_range(client: AsyncClient):
    """volume > 1.0 → 422."""
    response = await client.patch(
        "/api/sessions/session_001/recordings/rec_001",
        json={"volume": 1.5},
        headers=AUTH,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_patch_recording_not_found(client: AsyncClient):
    """없는 Recording → 404."""
    with (
        patch("app.api.sessions.session_service.get_session", new_callable=AsyncMock) as mock_sess,
        patch("app.api.sessions.recording_repo.get_recording", new_callable=AsyncMock) as mock_get,
    ):
        mock_sess.return_value = _mock_session()
        mock_get.return_value = None
        response = await client.patch(
            "/api/sessions/session_001/recordings/nonexistent",
            json={"volume": 0.5},
            headers=AUTH,
        )
    assert response.status_code == 404


# ── DELETE /api/sessions/{id}/recordings/{rec_id} ────────────────────────────

@pytest.mark.asyncio
async def test_delete_recording_success(client: AsyncClient):
    """Recording 삭제 → 204."""
    with (
        patch("app.api.sessions.session_service.get_session", new_callable=AsyncMock) as mock_sess,
        patch("app.api.sessions.recording_repo.get_recording", new_callable=AsyncMock) as mock_get,
        patch("app.api.sessions.recording_repo.delete_recording", new_callable=AsyncMock),
    ):
        mock_sess.return_value = _mock_session()
        mock_get.return_value = _mock_recording()
        response = await client.delete(
            "/api/sessions/session_001/recordings/rec_001",
            headers=AUTH,
        )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_recording_not_found(client: AsyncClient):
    """없는 Recording 삭제 → 404."""
    with (
        patch("app.api.sessions.session_service.get_session", new_callable=AsyncMock) as mock_sess,
        patch("app.api.sessions.recording_repo.get_recording", new_callable=AsyncMock) as mock_get,
    ):
        mock_sess.return_value = _mock_session()
        mock_get.return_value = None
        response = await client.delete(
            "/api/sessions/session_001/recordings/nonexistent",
            headers=AUTH,
        )
    assert response.status_code == 404
