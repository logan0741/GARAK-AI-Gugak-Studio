"""AI 모듈 호출 인터페이스.

현재는 stub 반환. 건희 ai/ 모듈 준비 시 아래 주석 처리된 실제 import로 교체.
"""

# --- 실제 연결 시 아래 주석 해제 ---
# import sys
# from app.core.config import settings
# sys.path.insert(0, settings.ai_module_path)
# from analyzer import analyze_key, analyze_jangdan
# from accompaniment import generate_pattern_sequence


def analyze_key(events: list[dict]) -> dict:
    """연주 이벤트로 조(key) 감지. stub: 항상 pyeongjo 반환."""
    return {"key": "pyeongjo", "confidence": 0.87}


def analyze_jangdan(events: list[dict]) -> dict:
    """연주 이벤트로 장단 감지. stub: 항상 gutgeori 반환."""
    return {
        "jangdan": "gutgeori",
        "score": 0.82,
        "estimatedBpm": 92,
        "density": "medium",
    }


def generate_pattern_sequence(
    key: str,
    jangdan: str,
    bpm: float,
    temperature: float = 0.7,
) -> dict:
    """장단 반주 패턴 시퀀스 생성. stub: 고정 패턴 반환."""
    return {
        "patternSequence": [
            {"step": 0, "slot": "gung", "velocity": 0.9, "offsetMs": 0},
            {"step": 2, "slot": "deok", "velocity": 0.6, "offsetMs": 500},
            {"step": 4, "slot": "gung", "velocity": 0.8, "offsetMs": 1000},
            {"step": 6, "slot": "gung", "velocity": 0.7, "offsetMs": 1500},
        ],
        "playbackRate": 1.0,
        "crossfadeMs": 80,
    }
