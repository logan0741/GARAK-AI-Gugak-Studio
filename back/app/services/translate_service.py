"""Google Translate API v2 호출 서비스.

API 키 미설정 시 원문 그대로 반환 (fallback).
locale이 "ko"이면 번역 없이 반환.
"""

import httpx

from app.core.config import settings


async def translate_to_locale(text: str, locale: str) -> str:
    """locale이 "ko"이면 원문, "en"이면 영어로 번역."""
    if locale == "ko":
        return text

    if not settings.google_translate_api_key:
        return text  # 키 없으면 원문 fallback

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://translation.googleapis.com/language/translate/v2",
                params={"key": settings.google_translate_api_key},
                json={"q": text, "source": "ko", "target": "en", "format": "text"},
                timeout=5.0,
            )
            response.raise_for_status()
            return response.json()["data"]["translations"][0]["translatedText"]
    except Exception:
        return text  # 번역 실패 시 한국어 원문 fallback
