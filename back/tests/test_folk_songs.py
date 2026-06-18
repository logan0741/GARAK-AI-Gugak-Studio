from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient


def _make_song(title="아리랑"):
    song = MagicMock()
    song.id = "arirang"
    song.title = title
    song.instrument_id = "12_string_gayageum"
    song.difficulty = "easy"
    song.reference_events = [
        {"ts_ms": 0, "type": "string_pluck"},
        {"ts_ms": 500, "type": "string_pluck"},
        {"ts_ms": 1000, "type": "string_pluck"},
    ]
    return song


SCORE_BODY = {
    "events": [
        {"id": "e1", "tsMs": 0, "type": "string_pluck", "stringIndex": 5},
        {"id": "e2", "tsMs": 510, "type": "string_pluck", "stringIndex": 5},
        {"id": "e3", "tsMs": 1300, "type": "string_pluck", "stringIndex": 5},
    ]
}


@pytest.mark.asyncio
async def test_list_folk_songs(client: AsyncClient):
    """GET /api/folk-songs → 200, 목록 반환."""
    with patch("app.api.folk_songs.folk_song_repo.get_all_folk_songs", new_callable=AsyncMock, return_value=[_make_song()]):
        response = await client.get("/api/folk-songs")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "아리랑"


@pytest.mark.asyncio
async def test_list_folk_songs_en(client: AsyncClient):
    """locale=en → 번역된 title 반환."""
    with patch("app.api.folk_songs.folk_song_repo.get_all_folk_songs", new_callable=AsyncMock, return_value=[_make_song()]), \
         patch("app.api.folk_songs.translate_batch_to_locale", new_callable=AsyncMock, return_value=["Arirang"]):
        response = await client.get("/api/folk-songs?locale=en")
    assert response.status_code == 200
    assert response.json()[0]["title"] == "Arirang"


@pytest.mark.asyncio
async def test_score_perfect(client: AsyncClient):
    """±200ms 이내 이벤트 2개 정확, 1개 부정확 → accuracy 66.7."""
    with patch("app.api.folk_songs.folk_song_repo.get_folk_song_by_id", new_callable=AsyncMock, return_value=_make_song()):
        response = await client.post("/api/folk-songs/arirang/score", json=SCORE_BODY)
    assert response.status_code == 200
    data = response.json()
    assert data["correct_count"] == 2
    assert data["total_count"] == 3
    assert data["accuracy"] == pytest.approx(66.7, abs=0.1)


@pytest.mark.asyncio
async def test_score_folk_song_not_found(client: AsyncClient):
    """존재하지 않는 민요 → 404."""
    with patch("app.api.folk_songs.folk_song_repo.get_folk_song_by_id", new_callable=AsyncMock, return_value=None):
        response = await client.post("/api/folk-songs/unknown/score", json=SCORE_BODY)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_validation_unit_index_out_of_range(client: AsyncClient):
    """stringIndex 13 → 422 (범위 초과)."""
    body = {"events": [{"id": "e1", "tsMs": 0, "type": "string_pluck", "stringIndex": 13}]}
    with patch("app.api.folk_songs.folk_song_repo.get_folk_song_by_id", new_callable=AsyncMock, return_value=_make_song()):
        response = await client.post("/api/folk-songs/arirang/score", json=body)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_validation_velocity_out_of_range(client: AsyncClient):
    """velocity 1.5 → 422."""
    body = {"events": [{"id": "e1", "tsMs": 0, "type": "string_pluck", "stringIndex": 5, "velocity": 1.5}]}
    with patch("app.api.folk_songs.folk_song_repo.get_folk_song_by_id", new_callable=AsyncMock, return_value=_make_song()):
        response = await client.post("/api/folk-songs/arirang/score", json=body)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_validation_cents_out_of_range(client: AsyncClient):
    """cents 150 → 422."""
    body = {"events": [{"id": "e1", "tsMs": 0, "type": "string_bend", "stringIndex": 5, "cents": 150}]}
    with patch("app.api.folk_songs.folk_song_repo.get_folk_song_by_id", new_callable=AsyncMock, return_value=_make_song()):
        response = await client.post("/api/folk-songs/arirang/score", json=body)
    assert response.status_code == 422
