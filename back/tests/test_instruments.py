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
    """샘플 목록 정상 반환 → 200, { version, assets: [...] } 형태."""
    from unittest.mock import MagicMock
    from app.models.instrument import InstrumentUnit
    from app.models.sample_asset import InstrumentUnitSampleMap, SampleAsset, SampleAssetManifest

    unit = InstrumentUnit(id="u1", instrument_id="gayageum_12", unit_index=1, label="1현",
                          base_note_name="G4", base_pitch_cents=5000, has_pitch_bend=True)
    sample_map = MagicMock(spec=InstrumentUnitSampleMap)
    sample_map.articulation = "pluck"
    asset = MagicMock(spec=SampleAsset)
    asset.id = "asset_001"
    asset.file_uri = "/static/samples/gayageum_1_pluck.aac"
    asset.source_layer = "public_asset"
    asset.license = "CC BY 4.0"
    asset.attribution = None
    asset.base_pitch_cents = 5000
    manifest = MagicMock(spec=SampleAssetManifest)
    manifest.version = "2026.06.a"

    with patch("app.api.instruments.jangdan_repo.get_instrument_samples", new_callable=AsyncMock) as mock:
        mock.return_value = [(unit, sample_map, asset, manifest)]
        response = await client.get("/api/instruments/gayageum_12/samples")

    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "2026.06.a"
    assert len(data["assets"]) == 1
    entry = data["assets"][0]
    assert entry["stringIndex"] == 1
    assert entry["sourceName"] == "1현"
    assert entry["fileUri"] == "/static/samples/gayageum_1_pluck.aac"
    assert entry["sourceLayer"] == "public_asset"


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
