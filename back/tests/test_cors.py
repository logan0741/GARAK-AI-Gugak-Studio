import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_preflight_allows_expo_web_origin(client: AsyncClient):
    response = await client.options(
        "/api/auth/google",
        headers={
            "Origin": "http://localhost:8098",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8098"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
