from unittest.mock import patch

import pytest
from httpx import AsyncClient

VALID_BODY = {
    "sessionId": "session_001",
    "events": [
        {"id": "e1", "tsMs": 0, "type": "string_pluck", "stringIndex": 5, "velocity": 0.7},
        {"id": "e2", "tsMs": 500, "type": "string_pluck", "stringIndex": 7, "velocity": 0.8},
        {"id": "e3", "tsMs": 1000, "type": "string_pluck", "stringIndex": 8, "velocity": 0.6},
    ],
}


@pytest.mark.asyncio
async def test_analyze_success(client: AsyncClient):
    """정상 이벤트 → 200, key/jangdan/bpm/density 반환."""
    response = await client.post("/api/analyze", json=VALID_BODY)
    assert response.status_code == 200
    data = response.json()
    assert data["key"] in {"pyeongjo", "gyemyeonjo"}
    assert data["jangdan"] in {
        "jungmori",
        "jungjungmori",
        "jajinmori",
        "gutgeori",
        "hwimori",
        "eotmori",
        "eotjungmori",
        "semachi",
        "jinyangjo",
    }
    assert data["estimatedBpm"] > 0
    assert data["density"] in {"low", "medium", "high"}
    assert "keyConfidence" in data


@pytest.mark.asyncio
async def test_analyze_empty_events(client: AsyncClient):
    """events 빈 배열 → 400."""
    body = {**VALID_BODY, "events": []}
    response = await client.post("/api/analyze", json=body)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_analyze_ai_error(client: AsyncClient):
    """AI 모듈 예외 → 500."""
    with patch("app.api.analyze.ai_client.analyze_key", side_effect=RuntimeError("AI failure")):
        response = await client.post("/api/analyze", json=VALID_BODY)
    assert response.status_code == 500


@pytest.mark.asyncio
async def test_analyze_invalid_event_type(client: AsyncClient):
    """유효하지 않은 이벤트 타입 → 422."""
    body = {
        "sessionId": "session_001",
        "events": [{"id": "e1", "tsMs": 0, "type": "invalid_type"}],
    }
    response = await client.post("/api/analyze", json=body)
    assert response.status_code == 422
