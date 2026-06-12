import asyncio

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings

security = HTTPBearer()


def _verify_token(token: str) -> dict:
    """동기 함수. asyncio.to_thread()로 감싸서 호출할 것."""
    return id_token.verify_oauth2_token(
        token,
        google_requests.Request(),
        settings.google_client_id,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Google ID Token 검증 후 user_id(Google UID) 반환.

    BYPASS_AUTH=true 이면 검증 없이 dev_user 반환 (로컬 개발용).
    """
    if settings.bypass_auth:
        return "dev_user"

    try:
        # verify_oauth2_token은 동기 함수 (내부에서 HTTP 요청 가능)
        # 이벤트 루프 블로킹 방지를 위해 스레드풀에서 실행
        id_info = await asyncio.to_thread(_verify_token, credentials.credentials)
        return id_info["sub"]
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable",
        ) from exc
