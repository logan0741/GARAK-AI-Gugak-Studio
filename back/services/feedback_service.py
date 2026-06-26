from __future__ import annotations

import os
from typing import Tuple

from schemas.feedback import FeedbackRequest


class FeedbackService:
    def build_feedback(self, req: FeedbackRequest) -> Tuple[str, str]:
        api_key = os.getenv("CLAUDE_API_KEY", "")
        if not api_key:
            return build_fallback_feedback(req), "fallback"

        try:
            import anthropic

            client = anthropic.Anthropic(api_key=api_key)
            message = client.messages.create(
                model=os.getenv("CLAUDE_FEEDBACK_MODEL", "claude-haiku-4-5-20251001"),
                max_tokens=512,
                messages=[{"role": "user", "content": build_feedback_prompt(req)}],
            )
            return message.content[0].text.strip(), "claude"
        except Exception:
            return build_fallback_feedback(req), "fallback"


def build_feedback_prompt(req: FeedbackRequest) -> str:
    acc_pct = round(req.accuracy * 100, 1)
    note_info = f", 총 {req.note_count}음" if req.note_count else ""
    dur_info = f", 연주 시간 {req.duration_sec:.1f}초" if req.duration_sec else ""

    if req.language == "en":
        return (
            "You are a Korean traditional music (gugak) teacher.\n"
            f"A student performed {req.jo} {req.jangdan}.\n"
            f"Accuracy: {acc_pct}%{note_info}{dur_info}\n\n"
            "Write 2-3 sentences of feedback:\n"
            "1. Encouragement or praise for this performance\n"
            "2. A specific improvement point (rhythm, pitch, expression)\n"
            "3. A suggestion for the next practice session\n"
            "Use gugak terminology naturally."
        )

    return (
        f"당신은 한국 전통 국악 연주 교사입니다.\n"
        f"학생이 {req.jo} {req.jangdan}을(를) 연주했습니다.\n"
        f"정확도: {acc_pct}%{note_info}{dur_info}\n\n"
        "다음 형식으로 피드백을 2~3문장으로 작성하세요:\n"
        "1. 이번 연주에 대한 칭찬 또는 격려\n"
        "2. 구체적인 개선점 (장단 박자, 음정, 표현 등)\n"
        "3. 다음 연습 방향 제안\n"
        "전문 용어(장단, 조, 박 등)를 자연스럽게 사용하세요."
    )


def build_fallback_feedback(req: FeedbackRequest) -> str:
    acc_pct = round(req.accuracy * 100, 1)
    if req.language == "en":
        if req.accuracy >= 0.8:
            return (
                f"Your {req.jo} {req.jangdan} performance was stable, "
                f"with an accuracy of {acc_pct}%. Keep the jangdan pulse steady "
                "and focus next on expressive timing between phrases."
            )
        if req.accuracy >= 0.55:
            return (
                f"You kept the main shape of {req.jangdan}, but the accuracy was "
                f"{acc_pct}%. Practice with a slower BPM first, then raise the tempo "
                "once the beat placement feels consistent."
            )
        return (
            f"The {req.jangdan} pulse is not settled yet, with an accuracy of "
            f"{acc_pct}%. Start by clapping the beat cycle, then play only the first "
            "beat of each bar before adding more notes."
        )

    if req.accuracy >= 0.8:
        return (
            f"{req.jo} {req.jangdan}의 흐름이 안정적입니다. 정확도는 {acc_pct}%로 좋고, "
            "다음에는 장단의 큰 박을 유지하면서 프레이즈 사이의 여백과 표현을 더 살려보세요."
        )
    if req.accuracy >= 0.55:
        return (
            f"{req.jangdan}의 기본 흐름은 잡혔지만 박 위치가 조금 흔들립니다. "
            f"정확도는 {acc_pct}%이므로 BPM을 낮춰 큰 박을 먼저 맞춘 뒤 속도를 올리는 연습이 좋습니다."
        )
    return (
        f"{req.jangdan}의 장단 주기가 아직 충분히 고정되지 않았습니다. 정확도는 {acc_pct}%이므로 "
        "먼저 손뼉으로 한 장단을 반복하고, 각 마디의 첫 박만 연주한 뒤 음을 늘려가세요."
    )
