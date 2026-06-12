import asyncio

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings
from app.services.auth_service import verify_access_token

security = HTTPBearer()


def _verify_google_token(token: str) -> dict:
    """동기 함수. asyncio.to_thread()로 감싸서 호출할 것."""
    return id_token.verify_oauth2_token(
        token,
        google_requests.Request(),
        settings.google_client_id,
    )


async def verify_google_id_token(id_token_str: str) -> dict:
    """Google ID Token 검증. id_info(sub, email 등) 반환."""
    try:
        return await asyncio.to_thread(_verify_google_token, id_token_str)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google ID token",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """백엔드 JWT 검증 후 user_id 반환.

    BYPASS_AUTH=true 이면 검증 없이 dev_user 반환 (로컬 개발용).
    """
    if settings.bypass_auth:
        return "dev_user"

    payload = verify_access_token(credentials.credentials)
    return payload["sub"]


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """백엔드 JWT 검증 후 payload 전체 반환 (email 등 추가 정보가 필요한 엔드포인트용).

    BYPASS_AUTH=true 이면 dev_user payload 반환.
    """
    if settings.bypass_auth:
        return {"sub": "dev_user", "email": "dev@example.com"}

    return verify_access_token(credentials.credentials)
