"""
/api/accompaniment + /api/accompaniment/status 엔드포인트 테스트.
"""
from __future__ import annotations

import time
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient

VALID_BODY = {
    "jangdan": "중모리",
    "jo": "평조",
    "bars": 8,
    "bpm": 92.0,
    "temperature": 0.8,
}


@pytest.mark.asyncio
async def test_accompaniment_creates_job(client: AsyncClient):
    """정상 요청 → 200, job_id + pending 반환."""
    response = await client.post(
        "/api/accompaniment",
        json=VALID_BODY,
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_accompaniment_status_done(client: AsyncClient, mock_job_manager):
    """job_id로 status 조회 → done 상태 + audio_url."""
    response = await client.get(
        "/api/accompaniment/status/test-job-001",
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "done"
    assert "audio_url" in data
    assert "pattern_sequence" in data


@pytest.mark.asyncio
async def test_accompaniment_status_not_found(client: AsyncClient, mock_job_manager):
    """존재하지 않는 job_id → 404."""
    mock_job_manager.get.return_value = None
    response = await client.get(
        "/api/accompaniment/status/nonexistent",
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_accompaniment_bpm_zero(client: AsyncClient):
    """bpm=0 → 422."""
    body = {**VALID_BODY, "bpm": 0}
    response = await client.post(
        "/api/accompaniment",
        json=body,
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_accompaniment_temperature_out_of_range(client: AsyncClient):
    """temperature > 2.0 → 422."""
    body = {**VALID_BODY, "temperature": 2.5}
    response = await client.post(
        "/api/accompaniment",
        json=body,
        headers={"Authorization": "Bearer dev-token"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_accompaniment_no_auth(client: AsyncClient):
    """Authorization 헤더 없음 → 422."""
    response = await client.post("/api/accompaniment", json=VALID_BODY)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_accompaniment_available(client: AsyncClient, mock_analyze_service):
    """GET /api/accompaniment/available → 200, 모델 목록."""
    response = await client.get("/api/accompaniment/available")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
