"""
/api/feedback 엔드포인트 테스트 (DB 불필요, mock 서비스 사용).
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

VALID_BODY = {
    "jo": "평조",
    "jangdan": "중모리",
    "accuracy": 0.85,
    "note_count": 48,
    "duration_sec": 30.0,
    "language": "ko",
}


@pytest.mark.asyncio
async def test_feedback_success(client: AsyncClient):
    """정상 요청 → 200, feedback/source 반환."""
    response = await client.post(
        "/api/feedback",
        json=VALID_BODY,
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["feedback"] == "잘 연주하셨습니다!"
    assert data["source"] == "fallback"
    assert data["jo"] == "평조"
    assert data["jangdan"] == "중모리"
    assert data["accuracy_pct"] == 85.0


@pytest.mark.asyncio
async def test_feedback_english_language(client: AsyncClient):
    """language=en → 200."""
    body = {**VALID_BODY, "language": "en"}
    response = await client.post(
        "/api/feedback",
        json=body,
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_feedback_accuracy_out_of_range(client: AsyncClient):
    """accuracy > 1.0 → 422."""
    body = {**VALID_BODY, "accuracy": 1.5}
    response = await client.post(
        "/api/feedback",
        json=body,
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_feedback_accuracy_negative(client: AsyncClient):
    """accuracy < 0 → 422."""
    body = {**VALID_BODY, "accuracy": -0.1}
    response = await client.post(
        "/api/feedback",
        json=body,
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_feedback_optional_fields_omitted(client: AsyncClient):
    """note_count, duration_sec 생략 → 200 (optional)."""
    body = {"jo": "계면조", "jangdan": "자진모리", "accuracy": 0.6}
    response = await client.post(
        "/api/feedback",
        json=body,
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_feedback_no_auth(client: AsyncClient):
    """Authorization 헤더 없음 → 422."""
    response = await client.post("/api/feedback", json=VALID_BODY)
    assert response.status_code == 422
