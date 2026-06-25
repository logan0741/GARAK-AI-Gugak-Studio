"""Google Translate API v2 호출 서비스.

API 키 미설정 시 원문 그대로 반환 (fallback).
locale이 "ko"이면 번역 없이 반환.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_http_client: httpx.AsyncClient | None = None


def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(timeout=5.0)
    return _http_client


async def translate_batch_to_locale(texts: list[str], locale: str) -> list[str]:
    """여러 텍스트를 한 번의 API 호출로 번역."""
    if locale == "ko" or not texts:
        return texts

    if not settings.google_translate_api_key:
        return texts

    try:
        response = await _get_http_client().post(
            "https://translation.googleapis.com/language/translate/v2",
            params={"key": settings.google_translate_api_key},
            json={"q": texts, "source": "ko", "target": "en", "format": "text"},
        )
        response.raise_for_status()
        translations = response.json()["data"]["translations"]
        if len(translations) != len(texts):
            raise ValueError("Translation count mismatch")
        return [t["translatedText"] for t in translations]
    except Exception as exc:
        logger.warning("Batch translate API failed, returning original texts: %s", exc)
        return texts



async def translate_to_locale(text: str, locale: str) -> str:
    """locale이 "ko"이면 원문, "en"이면 영어로 번역."""
    if locale == "ko":
        return text

    if not settings.google_translate_api_key:
        return text  # 키 없으면 원문 fallback

    try:
        response = await _get_http_client().post(
            "https://translation.googleapis.com/language/translate/v2",
            params={"key": settings.google_translate_api_key},
            json={"q": text, "source": "ko", "target": "en", "format": "text"},
        )
        response.raise_for_status()
        return response.json()["data"]["translations"][0]["translatedText"]
    except Exception as exc:
        logger.warning("Translate API failed, returning original text: %s", exc)
        return text  # 번역 실패 시 한국어 원문 fallback
