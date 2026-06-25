"""Claude API 호출 서비스.

API 키 미발급 시 stub 텍스트 반환. 키 설정 시 실제 Claude 호출.
"""

import anthropic

from app.core.config import settings

_anthropic_client: anthropic.AsyncAnthropic | None = None


def _get_anthropic_client() -> anthropic.AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.claude_api_key)
    return _anthropic_client


async def generate_feedback(
    accuracy_score: float,
    detected_key: str,
    song_name: str,
) -> str:
    """연주 결과를 바탕으로 한국어 피드백 생성."""
    if not settings.claude_api_key:
        return _stub_feedback(accuracy_score, detected_key, song_name)

    try:
        client = _get_anthropic_client()
        prompt = (
            f"국악 연주 피드백을 한국어로 2~3문장으로 작성해주세요.\n"
            f"곡명: {song_name}, 조(key): {detected_key}, 정확도: {accuracy_score:.0f}%"
        )
        message = await client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as exc:
        raise RuntimeError("Claude API 호출 실패") from exc


def _stub_feedback(accuracy_score: float, detected_key: str, song_name: str) -> str:
    score_pct = int(accuracy_score)
    return (
        f"{song_name} 연주 결과 정확도 {score_pct}%를 기록하셨습니다. "
        f"{detected_key} 조의 특성을 잘 살려 연주하셨네요. "
        f"계속 연습하면 더욱 향상될 것입니다!"
    )
