from __future__ import annotations

import os

from fastapi import Header, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

PUBLIC_PATHS = {"/", "/docs", "/openapi.json", "/health"}

_request_adapter = google_requests.Request()


async def verify_token(authorization: str = Header(...)) -> str:
    """Bearer 토큰 추출 → Google ID 토큰 검증 → user_id(sub) 반환."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization 헤더는 'Bearer {token}' 형식이어야 합니다.",
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 비어 있습니다.",
        )

    client_id = os.getenv("GOOGLE_CLIENT_ID", "")

    # 개발 모드: GOOGLE_CLIENT_ID 미설정 시 토큰 검증 스킵
    if not client_id or client_id == "your-google-client-id-here":
        return token

    try:
        claims = id_token.verify_oauth2_token(
            token, _request_adapter, audience=client_id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"유효하지 않은 토큰입니다: {exc}",
        ) from exc

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에 user_id(sub)가 없습니다.",
        )

    return user_id
