"""
/api/analyze 엔드포인트 테스트 (DB 불필요, mock 서비스 사용).
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analyze_success(client: AsyncClient, mock_analyze_service):
    """정상 timestamps → 200, jo/jangdan/detected_bpm 반환."""
    response = await client.post(
        "/api/analyze",
        json={"timestamps": [0.0, 0.5, 1.0, 1.5], "notes": [62, 67, 69, 74]},
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["jo"] == "평조"
    assert data["jangdan"] == "중모리"
    assert data["detected_bpm"] == 92.0
    assert "jo_confidence" in data
    assert "jangdan_confidence" in data
    assert "ioi_ms" in data


@pytest.mark.asyncio
async def test_analyze_without_notes(client: AsyncClient):
    """notes 생략 → 200 (notes는 optional)."""
    response = await client.post(
        "/api/analyze",
        json={"timestamps": [0.0, 0.65, 1.3]},
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_analyze_too_few_timestamps(client: AsyncClient):
    """timestamps 1개 이하 → 422."""
    response = await client.post(
        "/api/analyze",
        json={"timestamps": [0.0]},
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_no_timestamps(client: AsyncClient):
    """timestamps 빈 배열 → 422."""
    response = await client.post(
        "/api/analyze",
        json={"timestamps": []},
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_no_auth(client: AsyncClient):
    """Authorization 헤더 없음 → 422 (Header required)."""
    response = await client.post(
        "/api/analyze",
        json={"timestamps": [0.0, 0.5, 1.0]},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_ioi_ms_length(client: AsyncClient):
    """ioi_ms 길이는 timestamps 길이 - 1."""
    timestamps = [0.0, 0.5, 1.2, 2.0]
    response = await client.post(
        "/api/analyze",
        json={"timestamps": timestamps},
        headers={"Authorization": "Bearer dev-token"},
    )
    data = response.json()
    assert len(data["ioi_ms"]) == len(timestamps) - 1
