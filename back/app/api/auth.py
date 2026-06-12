from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import get_current_user_payload, verify_google_id_token
from app.core.config import settings
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    email: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str


class MeResponse(BaseModel):
    user_id: str
    email: str


@router.post("/google", response_model=TokenResponse)
async def google_login(body: GoogleLoginRequest):
    """Google ID Token → 백엔드 JWT 발급.

    BYPASS_AUTH=true 이면 idToken 검증 없이 dev_user JWT 발급.
    """
    if settings.bypass_auth:
        user_id = "dev_user"
        email = "dev@example.com"
    else:
        id_info = await verify_google_id_token(body.id_token)
        user_id = id_info["sub"]
        email = id_info.get("email", "")

    return TokenResponse(
        access_token=create_access_token(user_id, email),
        refresh_token=create_refresh_token(user_id),
        user_id=user_id,
        email=email,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(body: RefreshRequest):
    """Refresh token → 새 access token 발급."""
    user_id = verify_refresh_token(body.refresh_token)
    # refresh token에는 email이 없으므로 access token에 빈 email로 갱신
    # 실제 운영 시 DB에서 email 조회 필요 (MVP는 생략)
    return AccessTokenResponse(access_token=create_access_token(user_id, ""))


@router.get("/me", response_model=MeResponse)
async def me(payload: dict = Depends(get_current_user_payload)):
    """현재 로그인 유저 정보 반환."""
    return MeResponse(user_id=payload["sub"], email=payload.get("email", ""))
