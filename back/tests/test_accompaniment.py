from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

VALID_BODY = {
    "key": "pyeongjo",
    "jangdan": "gutgeori",
    "bpm": 92.0,
    "temperature": 0.7,
}


@pytest.mark.asyncio
async def test_accompaniment_success(client: AsyncClient):
    """정상 요청 → 200, patternSequence 반환."""
    mock_preset = MagicMock()
    with patch("app.api.accompaniment.jangdan_repo.get_jangdan_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_preset
        response = await client.post("/api/accompaniment", json=VALID_BODY)
    assert response.status_code == 200
    data = response.json()
    assert "patternSequence" in data
    assert len(data["patternSequence"]) > 0
    assert "playbackRate" in data
    assert "crossfadeMs" in data


@pytest.mark.asyncio
async def test_accompaniment_invalid_jangdan(client: AsyncClient):
    """존재하지 않는 jangdan → 400."""
    with patch("app.api.accompaniment.jangdan_repo.get_jangdan_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        response = await client.post("/api/accompaniment", json={**VALID_BODY, "jangdan": "unknown"})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_accompaniment_ai_error(client: AsyncClient):
    """AI 모듈 예외 → 500."""
    mock_preset = MagicMock()
    with patch("app.api.accompaniment.jangdan_repo.get_jangdan_by_id", new_callable=AsyncMock) as mock_get, \
         patch("app.api.accompaniment.ai_client.generate_pattern_sequence", side_effect=RuntimeError("AI failure")):
        mock_get.return_value = mock_preset
        response = await client.post("/api/accompaniment", json=VALID_BODY)
    assert response.status_code == 500


@pytest.mark.asyncio
async def test_accompaniment_invalid_bpm(client: AsyncClient):
    """bpm 0 이하 → 422."""
    response = await client.post("/api/accompaniment", json={**VALID_BODY, "bpm": 0})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_accompaniment_saves_recommendation(client: AsyncClient):
    """session_id 포함 시 JangdanRecommendation DB 저장 호출."""
    mock_preset = MagicMock()
    with patch("app.api.accompaniment.jangdan_repo.get_jangdan_by_id", new_callable=AsyncMock) as mock_get, \
         patch("app.api.accompaniment.jangdan_repo.create_recommendation", new_callable=AsyncMock) as mock_save:
        mock_get.return_value = mock_preset
        response = await client.post("/api/accompaniment", json={**VALID_BODY, "sessionId": "session_001"})
    assert response.status_code == 200
    mock_save.assert_called_once()


@pytest.mark.asyncio
async def test_accompaniment_semachi(client: AsyncClient):
    """semachi 장단 → 200."""
    mock_preset = MagicMock()
    with patch("app.api.accompaniment.jangdan_repo.get_jangdan_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_preset
        response = await client.post("/api/accompaniment", json={**VALID_BODY, "jangdan": "semachi"})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_accompaniment_no_session_skips_save(client: AsyncClient):
    """session_id 없으면 DB 저장 안 함."""
    mock_preset = MagicMock()
    with patch("app.api.accompaniment.jangdan_repo.get_jangdan_by_id", new_callable=AsyncMock) as mock_get, \
         patch("app.api.accompaniment.jangdan_repo.create_recommendation", new_callable=AsyncMock) as mock_save:
        mock_get.return_value = mock_preset
        response = await client.post("/api/accompaniment", json=VALID_BODY)
    assert response.status_code == 200
    mock_save.assert_not_called()
