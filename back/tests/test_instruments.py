from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_instruments_empty(client: AsyncClient):
    """DB에 악기 없을 때 빈 리스트 반환."""
    with patch("app.api.instruments.jangdan_repo.get_all_instruments", new_callable=AsyncMock) as mock:
        mock.return_value = []
        response = await client.get("/api/instruments")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_instruments_with_data(client: AsyncClient):
    """악기 데이터 있을 때 올바른 스키마로 반환."""
    from app.models.instrument import Instrument, InstrumentUnit
    unit = InstrumentUnit(
        id="u1", instrument_id="gayageum_12", unit_index=0,
        label="1현", base_note_name="G4", base_pitch_cents=0, has_pitch_bend=True,
    )
    instrument = Instrument(
        id="gayageum_12", type="gayageum", display_name="가야금 12현",
        note_unit_count=12, version="1.0", units=[unit],
    )
    with patch("app.api.instruments.jangdan_repo.get_all_instruments", new_callable=AsyncMock) as mock:
        mock.return_value = [instrument]
        response = await client.get("/api/instruments")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "gayageum_12"
    assert data[0]["units"][0]["label"] == "1현"


@pytest.mark.asyncio
async def test_list_instrument_samples_success(client: AsyncClient):
    """샘플 목록 정상 반환 → 200, unit_index/articulation/file_url 포함."""
    from unittest.mock import MagicMock
    from app.models.instrument import InstrumentUnit
    from app.models.sample_asset import InstrumentUnitSampleMap, SampleAsset

    unit = InstrumentUnit(id="u1", instrument_id="gayageum_12", unit_index=1, label="1현",
                          base_note_name="G4", base_pitch_cents=0, has_pitch_bend=True)
    sample_map = MagicMock(spec=InstrumentUnitSampleMap)
    sample_map.articulation = "pluck"
    asset = MagicMock(spec=SampleAsset)
    asset.file_uri = "/static/samples/gayageum_1_pluck.aac"

    with patch("app.api.instruments.jangdan_repo.get_instrument_samples", new_callable=AsyncMock) as mock:
        mock.return_value = [(unit, sample_map, asset)]
        response = await client.get("/api/instruments/gayageum_12/samples")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["unit_index"] == 1
    assert data[0]["label"] == "1현"
    assert data[0]["articulation"] == "pluck"
    assert "/static/samples/gayageum_1_pluck.aac" in data[0]["file_url"]


@pytest.mark.asyncio
async def test_list_instrument_samples_not_found(client: AsyncClient):
    """샘플 없는 악기 → 404."""
    with patch("app.api.instruments.jangdan_repo.get_instrument_samples", new_callable=AsyncMock) as mock:
        mock.return_value = []
        response = await client.get("/api/instruments/nonexistent/samples")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_jangdan_presets_empty(client: AsyncClient):
    """장단 프리셋 없을 때 빈 리스트 반환."""
    with patch("app.api.jangdan_presets.jangdan_repo.get_all_jangdan_presets", new_callable=AsyncMock) as mock:
        mock.return_value = []
        response = await client.get("/api/jangdan-presets")
    assert response.status_code == 200
    assert response.json() == []
