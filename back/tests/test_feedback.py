from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

VALID_BODY = {
    "sessionId": "session_001",
    "accuracyScore": 78,
    "detectedKey": "pyeongjo",
    "songName": "아리랑",
    "locale": "ko",
}


@pytest.mark.asyncio
async def test_feedback_ko(client: AsyncClient):
    """locale=ko → 200, 한국어 피드백 반환."""
    with patch(
        "app.api.feedback.claude_client.generate_feedback",
        new_callable=AsyncMock,
        return_value="아리랑 연주 결과 78%를 기록하셨습니다.",
    ):
        response = await client.post("/api/feedback", json=VALID_BODY)
    assert response.status_code == 200
    data = response.json()
    assert "feedbackText" in data
    assert len(data["feedbackText"]) > 0


@pytest.mark.asyncio
async def test_feedback_en_translates(client: AsyncClient):
    """locale=en, 번역 서비스 호출 확인."""
    with patch(
        "app.api.feedback.claude_client.generate_feedback",
        new_callable=AsyncMock,
        return_value="아리랑 연주 결과입니다.",
    ), patch(
        "app.api.feedback.translate_service.translate_to_locale",
        new_callable=AsyncMock,
        return_value="Great performance!",
    ):
        response = await client.post("/api/feedback", json={**VALID_BODY, "locale": "en"})
    assert response.status_code == 200
    assert response.json()["feedbackText"] == "Great performance!"


@pytest.mark.asyncio
async def test_feedback_claude_error(client: AsyncClient):
    """Claude API 오류 → 500."""
    with patch(
        "app.api.feedback.claude_client.generate_feedback",
        new_callable=AsyncMock,
        side_effect=RuntimeError("Claude API 호출 실패"),
    ):
        response = await client.post("/api/feedback", json=VALID_BODY)
    assert response.status_code == 500


@pytest.mark.asyncio
async def test_feedback_translate_error_fallback(client: AsyncClient):
    """번역 API 오류 → 200, 한국어 원문 fallback."""
    korean_text = "아리랑 연주 결과입니다."
    with patch(
        "app.api.feedback.claude_client.generate_feedback",
        new_callable=AsyncMock,
        return_value=korean_text,
    ), patch(
        "app.services.translate_service.httpx.AsyncClient",
        side_effect=Exception("network error"),
    ):
        response = await client.post("/api/feedback", json={**VALID_BODY, "locale": "en"})
    assert response.status_code == 200
    assert response.json()["feedbackText"] == korean_text


@pytest.mark.asyncio
async def test_feedback_invalid_locale(client: AsyncClient):
    """유효하지 않은 locale → 422."""
    response = await client.post("/api/feedback", json={**VALID_BODY, "locale": "ja"})
    assert response.status_code == 422
