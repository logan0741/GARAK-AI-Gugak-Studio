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
    assert "pattern_sequence" in data
    assert len(data["pattern_sequence"]) > 0
    assert "playback_rate" in data
    assert "crossfade_ms" in data


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
