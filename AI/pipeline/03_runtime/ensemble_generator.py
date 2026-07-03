# -*- coding: utf-8 -*-
"""
1악기 연주 입력 → 나머지 2악기 생성 + 합성 앙상블 음원 생성기

사용자가 한 악기를 연주하면:
  1. 사용자 연주 → 샘플 기반으로 해당 악기 오디오 렌더링
  2. 두 번째 악기(선율) → pitch Markov로 멜로디 생성
  3. 세 번째 악기(장구) → rhythm Markov 세그먼트 조립
  4. 3트랙 믹싱 → 단일 WAV 출력

사용법:
  python AI/pipeline/03_runtime/ensemble_generator.py \\
    --events "67:0.0,69:0.75,67:1.5,71:2.25" \\
    --source 가야금 --jo 평조 --jangdan 중모리 --bpm 80 \\
    --output out_ensemble.wav
"""
from __future__ import annotations

import argparse
import os
import uuid
from pathlib import Path
from typing import Optional

try:
    import numpy as np
    import soundfile as sf
    import librosa
except ImportError as e:
    raise ImportError("pip install numpy soundfile librosa") from e

from pitch_markov import (  # type: ignore
    generate_pitch_sequence,
    load_pitch_model,
    PC_TO_YUL,
    YUL_TO_PC,
)
from solo_generator import (
    JANGDAN_BEATS,
    TARGET_SR,
    _load_sample_map,
    _find_pitch_model,
    _place_sample,
    _nearest_yul,
)

# 악기별 역할 — 사용자가 source를 선택하면 나머지 2개를 자동 배정
INSTRUMENT_ROLES: dict[str, dict] = {
    "가야금": {"melody_partner": "대금",  "rhythm_partner": "장구"},
    "대금":   {"melody_partner": "가야금", "rhythm_partner": "장구"},
    "해금":   {"melody_partner": "가야금", "rhythm_partner": "장구"},
    "장구":   {"melody_partner": "가야금", "rhythm_partner": "대금"},
}

# 트랙별 음량 비율 (user:melody:rhythm)
TRACK_VOLUMES = {"user": 0.9, "melody": 0.7, "rhythm": 0.6}


def _render_note_events(
    events: list[dict],
    sample_map: dict[str, np.ndarray],
    total_samples: int,
    beat_sec: float,
) -> np.ndarray:
    """
    사용자 노트 이벤트를 샘플 기반으로 렌더링.

    events: [{"pitch": int(MIDI), "timestamp": float(초)}, ...]
    """
    buffer = np.zeros(total_samples, dtype=np.float32)
    note_dur = int(beat_sec * 2 * TARGET_SR)

    for ev in events:
        midi  = int(ev["pitch"])
        t_sec = float(ev["timestamp"])
        pc    = midi % 12
        yul   = PC_TO_YUL.get(pc)
        if yul not in sample_map:
            yul = _nearest_yul(pc, sample_map)
        if yul is None:
            continue
        start = int(t_sec * TARGET_SR)
        if start >= total_samples:
            continue
        _place_sample(buffer, sample_map[yul], start, note_dur)

    return buffer


def _render_melody_track(
    instrument: str,
    jo: str,
    jangdan: str,
    n_notes: int,
    timestamps: list[float],
    models_dir: str,
    samples_dir: str,
    total_samples: int,
    temperature: float = 1.0,
) -> np.ndarray:
    """
    pitch Markov로 선율 악기 트랙 생성.
    사용자와 같은 수의 음을 비슷한 타이밍에 배치.
    """
    buffer = np.zeros(total_samples, dtype=np.float32)

    model = _find_pitch_model(models_dir, instrument, jo, jangdan)
    sample_map = _load_sample_map(samples_dir, instrument)

    if model is None or not sample_map:
        print(f"  [SKIP] {instrument} 모델 or 샘플 없음 → 트랙 생략")
        return buffer

    tm   = model["pitch_transition_matrix"]
    hist = model["note_histogram"]
    pitch_seq = generate_pitch_sequence(n_notes, tm, hist, jo=jo, temperature=temperature)

    beat_sec = 60.0 / max(1.0, _estimate_bpm(timestamps))
    note_dur = int(beat_sec * 2 * TARGET_SR)

    for i, ts in enumerate(timestamps):
        if i >= len(pitch_seq):
            break
        pc  = pitch_seq[i]
        yul = PC_TO_YUL.get(pc)
        if yul not in sample_map:
            yul = _nearest_yul(pc, sample_map)
        if yul is None:
            continue
        start = int(ts * TARGET_SR)
        if start >= total_samples:
            continue
        _place_sample(buffer, sample_map[yul], start, note_dur)

    return buffer


def _render_rhythm_track(
    jo: str,
    jangdan: str,
    n_bars: int,
    bpm: float,
    models_dir: str,
    segments_dir: str,
    total_samples: int,
) -> np.ndarray:
    """
    rhythm Markov + 세그먼트 조립으로 장구 트랙 생성.
    기존 MarkovService / audio_service 로직 재사용.
    """
    buffer = np.zeros(total_samples, dtype=np.float32)

    # 세그먼트 폴더 확인
    seg_dir = os.path.join(segments_dir, f"{jo}_{jangdan}")
    if not os.path.isdir(seg_dir):
        print(f"  [SKIP] 장단 세그먼트 없음: {seg_dir}")
        return buffer

    # pattern 폴더 목록
    pattern_dirs = sorted(Path(seg_dir).glob("pattern_*"))
    if not pattern_dirs:
        return buffer

    beats_per_bar = JANGDAN_BEATS.get(jangdan, 12)
    beat_sec = 60.0 / bpm
    bar_sec  = beat_sec * beats_per_bar
    crossfade_samp = max(0, int(bar_sec * TARGET_SR * 0.03))

    # n_bars 만큼 랜덤으로 세그먼트 선택해서 이어붙이기
    rng = np.random.default_rng()
    pos = 0
    for _ in range(n_bars):
        pdir = pattern_dirs[int(rng.integers(len(pattern_dirs)))]
        wavs = sorted(pdir.glob("*.wav"))
        if not wavs:
            continue
        wav_path = str(wavs[int(rng.integers(len(wavs)))])
        try:
            seg, sr = sf.read(wav_path, dtype="float32", always_2d=False)
            if seg.ndim > 1:
                seg = seg.mean(axis=1)
            if sr != TARGET_SR:
                seg = librosa.resample(
                    seg.astype(np.float64), orig_sr=sr, target_sr=TARGET_SR
                ).astype(np.float32)
        except Exception:
            continue

        # 남은 버퍼에 맞게 클리핑
        remaining = total_samples - pos
        if len(seg) > remaining:
            seg = seg[:remaining]
        n = len(seg)
        if n == 0:
            break

        # crossfade
        ov = min(crossfade_samp, pos, n) if pos > 0 else 0
        if ov > 0:
            fade_out = np.linspace(1.0, 0.0, ov, dtype=np.float32)
            fade_in  = np.linspace(0.0, 1.0, ov, dtype=np.float32)
            buffer[pos - ov : pos] = buffer[pos - ov : pos] * fade_out + seg[:ov] * fade_in
            buffer[pos : pos + n - ov] += seg[ov:]
        else:
            buffer[pos : pos + n] += seg

        pos += n
        if pos >= total_samples:
            break

    return buffer


def _estimate_bpm(timestamps: list[float]) -> float:
    if len(timestamps) < 2:
        return 80.0
    ioi = np.diff(sorted(timestamps))
    ioi = ioi[ioi > 0.05]
    if ioi.size == 0:
        return 80.0
    return round(60.0 / float(np.median(ioi)), 1)


def _estimate_bars(timestamps: list[float], jangdan: str, bpm: float) -> int:
    if not timestamps:
        return 4
    duration = max(timestamps) - min(timestamps)
    beats_per_bar = JANGDAN_BEATS.get(jangdan, 12)
    beat_sec = 60.0 / bpm
    bar_sec  = beat_sec * beats_per_bar
    n_bars = max(4, int(np.ceil(duration / bar_sec)) + 2)
    return min(n_bars, 64)


class EnsembleGenerator:
    def __init__(self, models_dir: str, segments_dir: str, samples_dir: str) -> None:
        self.models_dir  = models_dir
        self.segments_dir = segments_dir
        self.samples_dir  = samples_dir

    def generate(
        self,
        user_events: list[dict],
        source_instrument: str = "가야금",
        jo: str = "평조",
        jangdan: str = "중모리",
        bpm: Optional[float] = None,
        temperature: float = 1.0,
        output_path: str = "ensemble_output.wav",
        melody_volume: float = TRACK_VOLUMES["melody"],
        rhythm_volume: float = TRACK_VOLUMES["rhythm"],
        user_volume: float = TRACK_VOLUMES["user"],
    ) -> str:
        """
        user_events: [{"pitch": int, "timestamp": float}, ...]
        jo / jangdan: 미리 감지된 값 (또는 외부에서 전달)
        """
        timestamps = [e["timestamp"] for e in user_events]
        if bpm is None:
            bpm = _estimate_bpm(timestamps)
            print(f"  [AUTO] BPM 추정: {bpm}")

        n_bars  = _estimate_bars(timestamps, jangdan, bpm)
        beats_per_bar = JANGDAN_BEATS.get(jangdan, 12)
        total_sec = (60.0 / bpm) * beats_per_bar * n_bars + 1.0
        total_samp = int(total_sec * TARGET_SR)

        roles = INSTRUMENT_ROLES.get(source_instrument, {
            "melody_partner": "대금",
            "rhythm_partner": "장구",
        })
        melody_inst = roles["melody_partner"]

        print(f"[앙상블] {source_instrument} + {melody_inst} + 장구 | "
              f"{jo} {jangdan} {bpm}BPM {n_bars}마디")

        # ── 트랙 1: 사용자 악기 ──────────────────────────────
        user_samples = _load_sample_map(self.samples_dir, source_instrument)
        beat_sec = 60.0 / bpm
        track_user = np.zeros(total_samp, dtype=np.float32)
        if user_samples and user_events:
            track_user = _render_note_events(user_events, user_samples, total_samp, beat_sec)

        # ── 트랙 2: 선율 파트너 악기 ─────────────────────────
        track_melody = _render_melody_track(
            instrument=melody_inst,
            jo=jo,
            jangdan=jangdan,
            n_notes=max(len(user_events), 8),
            timestamps=timestamps if timestamps else [i * beat_sec for i in range(8)],
            models_dir=self.models_dir,
            samples_dir=self.samples_dir,
            total_samples=total_samp,
            temperature=temperature,
        )

        # ── 트랙 3: 장구 리듬 ────────────────────────────────
        track_rhythm = _render_rhythm_track(
            jo=jo,
            jangdan=jangdan,
            n_bars=n_bars,
            bpm=bpm,
            models_dir=self.models_dir,
            segments_dir=self.segments_dir,
            total_samples=total_samp,
        )

        # ── 믹싱 ─────────────────────────────────────────────
        mixed = (
            track_user   * user_volume
            + track_melody * melody_volume
            + track_rhythm * rhythm_volume
        )
        peak = np.max(np.abs(mixed))
        if peak > 1e-6:
            mixed = mixed / peak * 0.95

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        sf.write(output_path, mixed, TARGET_SR)
        print(f"[OK] 앙상블 음원 저장: {output_path}")
        return output_path


def _parse_events_arg(raw: str) -> list[dict]:
    """CLI 인자 "67:0.0,69:0.75" → [{"pitch":67, "timestamp":0.0}, ...]"""
    events = []
    for item in raw.split(","):
        item = item.strip()
        if ":" not in item:
            continue
        pitch_str, ts_str = item.split(":", 1)
        events.append({"pitch": int(pitch_str), "timestamp": float(ts_str)})
    return events


def main() -> None:
    parser = argparse.ArgumentParser(description="1악기 → 앙상블 음원 생성")
    parser.add_argument("--events",    required=True,
                        help="노트 이벤트 'MIDI:초,MIDI:초,...' (예: 67:0.0,69:0.75)")
    parser.add_argument("--source",    default="가야금", help="사용자 악기")
    parser.add_argument("--jo",        default="평조",   choices=["평조", "계면조"])
    parser.add_argument("--jangdan",   default="중모리", choices=list(JANGDAN_BEATS.keys()))
    parser.add_argument("--bpm",       type=float, default=None)
    parser.add_argument("--temperature", type=float, default=1.0)
    parser.add_argument("--models-dir",   default="AI/models")
    parser.add_argument("--segments-dir", default="AI/segments")
    parser.add_argument("--samples-dir",  default="back/static/samples")
    parser.add_argument("--output",       default="back/static/generated/ensemble_output.wav")
    args = parser.parse_args()

    events = _parse_events_arg(args.events)
    gen = EnsembleGenerator(
        models_dir=os.path.abspath(args.models_dir),
        segments_dir=os.path.abspath(args.segments_dir),
        samples_dir=os.path.abspath(args.samples_dir),
    )
    path = gen.generate(
        user_events=events,
        source_instrument=args.source,
        jo=args.jo,
        jangdan=args.jangdan,
        bpm=args.bpm,
        temperature=args.temperature,
        output_path=os.path.abspath(args.output),
    )
    print(f"생성 완료: {path}")


if __name__ == "__main__":
    main()
