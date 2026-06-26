from __future__ import annotations

from dataclasses import dataclass


TARGET_SR = 44100

JANGDAN_BEATS: dict[str, int] = {
    "중모리": 12,
    "중중모리": 12,
    "자진모리": 12,
    "굿거리": 12,
    "휘모리": 12,
    "엇모리": 6,
    "엇중모리": 6,
    "세마치": 9,
    "진양조": 6,
}

JANGDAN_DEFAULT_BPM: dict[str, float] = {
    "진양조": 40.0,
    "중모리": 80.0,
    "중중모리": 96.0,
    "굿거리": 96.0,
    "세마치": 96.0,
    "자진모리": 120.0,
    "휘모리": 150.0,
    "엇모리": 80.0,
    "엇중모리": 90.0,
}

SUPPORTED_INSTRUMENTS = ("가야금", "대금", "해금", "장구")

PC_TO_YUL: dict[int, str] = {
    7: "황",
    8: "대",
    9: "태",
    10: "협",
    11: "고",
    0: "중",
    1: "유",
    2: "임",
    3: "이",
    4: "남",
    5: "무",
    6: "응",
}
YUL_TO_PC: dict[str, int] = {v: k for k, v in PC_TO_YUL.items()}


@dataclass(frozen=True)
class JangdanPreset:
    name: str
    beats_per_bar: int
    default_bpm: float


def get_jangdan_preset(name: str) -> JangdanPreset:
    return JangdanPreset(
        name=name,
        beats_per_bar=JANGDAN_BEATS.get(name, 12),
        default_bpm=JANGDAN_DEFAULT_BPM.get(name, 80.0),
    )


def list_jangdan_presets() -> list[JangdanPreset]:
    return [
        get_jangdan_preset(name)
        for name in sorted(JANGDAN_BEATS.keys())
    ]
