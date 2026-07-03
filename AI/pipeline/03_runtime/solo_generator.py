# -*- coding: utf-8 -*-
"""
1개 악기 단독 음원 생성기

pitch Markov(음고 순서) + jangdan 박자 구조를 결합해서
단일 악기 WAV를 생성한다.

사용법:
  python AI/pipeline/03_runtime/solo_generator.py \\
    --instrument 가야금 --jo 평조 --jangdan 중모리 \\
    --bars 8 --bpm 80 --output out_solo.wav
"""
from __future__ import annotations

import argparse
import os
import pickle
from pathlib import Path
from typing import Optional

try:
    import numpy as np
    import soundfile as sf
    import librosa
except ImportError as e:
    raise ImportError("pip install numpy soundfile librosa") from e

from pitch_markov import generate_pitch_sequence, load_pitch_model, PC_TO_YUL  # type: ignore

TARGET_SR = 44100

# 장단별 박 수 (한 마디)
JANGDAN_BEATS: dict[str, int] = {
    "중모리":  12,
    "중중모리": 12,
    "자진모리": 12,
    "굿거리":  12,
    "휘모리":  12,
    "엇모리":   6,
    "엇중모리":  6,
    "세마치":   9,
    "진양조":   6,
}

# 장단별 노트 배치 비율 (0=쉬고 1=치기, 박자 단위)
# 없는 장단은 2박마다 노트
_JANGDAN_NOTE_MASK: dict[str, list[int]] = {
    "중모리":   [1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],   # 12박 중 4박 강조
    "중중모리": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],   # 2박마다
    "자진모리": [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],   # 3박마다
    "굿거리":   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    "휘모리":   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    "엇모리":   [1, 0, 0, 1, 0, 0],
    "엇중모리": [1, 0, 1, 0, 1, 0],
    "세마치":   [1, 0, 0, 1, 0, 0, 1, 0, 0],
    "진양조":   [1, 0, 0, 1, 0, 0],
}


def _load_sample_map(samples_dir: str, instrument: str) -> dict[str, np.ndarray]:
    """
    samples_dir/{악기}/{율명}.wav 를 미리 로드해서
    { 율명: np.ndarray(float32, sr=TARGET_SR) } 반환
    """
    inst_dir = os.path.join(samples_dir, instrument)
    sample_map: dict[str, np.ndarray] = {}

    if not os.path.isdir(inst_dir):
        return sample_map

    for wav_file in sorted(Path(inst_dir).glob("*.wav")):
        yul = wav_file.stem
        try:
            audio, sr = sf.read(str(wav_file), dtype="float32", always_2d=False)
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            if sr != TARGET_SR:
                audio = librosa.resample(
                    audio.astype(np.float64), orig_sr=sr, target_sr=TARGET_SR
                ).astype(np.float32)
            sample_map[yul] = audio
        except Exception as e:
            print(f"  [WARN] 샘플 로드 실패 {wav_file.name}: {e}")

    return sample_map


def _find_pitch_model(models_dir: str, instrument: str, jo: str, jangdan: str) -> Optional[dict]:
    """pitch_{악기}_{조}_{장단}.pkl 로드. 없으면 같은 악기의 다른 조/장단으로 대체."""
    exact = os.path.join(models_dir, f"pitch_{instrument}_{jo}_{jangdan}.pkl")
    if os.path.isfile(exact):
        return load_pitch_model(exact)

    # 같은 악기 + 같은 조 모델 중 첫 번째
    for p in sorted(Path(models_dir).glob(f"pitch_{instrument}_{jo}_*.pkl")):
        print(f"  [FALLBACK] {p.name} 사용")
        return load_pitch_model(str(p))

    # 같은 악기 모델 중 첫 번째
    for p in sorted(Path(models_dir).glob(f"pitch_{instrument}_*.pkl")):
        print(f"  [FALLBACK] {p.name} 사용")
        return load_pitch_model(str(p))

    return None


def _place_sample(
    buffer: np.ndarray,
    sample: np.ndarray,
    start_sample: int,
    note_duration_samples: int,
) -> None:
    """buffer의 start_sample 위치에 sample을 오버레이. 음표 길이로 자르고 fade-out 적용."""
    clipped = sample[: min(len(sample), note_duration_samples)]
    # 5ms fade-out
    fade_len = min(int(TARGET_SR * 0.005), len(clipped))
    if fade_len > 0:
        fade = np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
        clipped = clipped.copy()
        clipped[-fade_len:] *= fade

    end = start_sample + len(clipped)
    if end > len(buffer):
        clipped = clipped[: len(buffer) - start_sample]
        end = len(buffer)
    if len(clipped) > 0:
        buffer[start_sample:end] += clipped


class SoloGenerator:
    def __init__(self, models_dir: str, samples_dir: str) -> None:
        self.models_dir = models_dir
        self.samples_dir = samples_dir

    def generate(
        self,
        instrument: str,
        jo: str,
        jangdan: str,
        n_bars: int = 8,
        bpm: float = 80.0,
        temperature: float = 1.0,
        output_path: str = "solo_output.wav",
    ) -> str:
        """
        단독 음원 생성 → output_path에 WAV 저장 후 경로 반환.

        Parameters
        ----------
        instrument : 악기명 (가야금/대금/해금)
        jo         : 조 (평조/계면조)
        jangdan    : 장단 (중모리 등)
        n_bars     : 마디 수
        bpm        : 빠르기
        temperature: Markov 다양성 (0=보수, 2=창의)
        output_path: 출력 WAV 경로
        """
        beats_per_bar = JANGDAN_BEATS.get(jangdan, 12)
        note_mask = _JANGDAN_NOTE_MASK.get(jangdan, [1, 0] * (beats_per_bar // 2))

        beat_sec = 60.0 / bpm
        bar_sec  = beat_sec * beats_per_bar
        total_beats = beats_per_bar * n_bars

        # 노트가 실제로 발생하는 박 인덱스
        note_beat_indices = [
            i for i in range(total_beats)
            if note_mask[i % len(note_mask)] == 1
        ]
        n_notes = len(note_beat_indices)

        # pitch Markov 로드 & 음고 시퀀스 생성
        model = _find_pitch_model(self.models_dir, instrument, jo, jangdan)
        if model is None:
            raise FileNotFoundError(
                f"pitch 모델 없음: {instrument}/{jo}/{jangdan}\n"
                "먼저 python AI/pipeline/02_training/train_pitch_markov.py 를 실행하세요."
            )

        tm   = model["pitch_transition_matrix"]
        hist = model["note_histogram"]
        pitch_seq = generate_pitch_sequence(n_notes, tm, hist, jo=jo, temperature=temperature)

        # 샘플 맵 로드
        sample_map = _load_sample_map(self.samples_dir, instrument)
        if not sample_map:
            raise FileNotFoundError(
                f"{self.samples_dir}/{instrument}/ 에 WAV 샘플 없음.\n"
                "먼저 python AI/pipeline/00_ingestion/organize_samples.py 를 실행하세요."
            )

        # 출력 버퍼 생성
        total_samples = int((bar_sec * n_bars + beat_sec) * TARGET_SR)
        buffer = np.zeros(total_samples, dtype=np.float32)

        note_dur_samples = int(beat_sec * 2 * TARGET_SR)  # 노트 최대 2박 지속

        # 음고 → 율명 → 샘플 매핑 & 배치
        for idx, beat_i in enumerate(note_beat_indices):
            if idx >= len(pitch_seq):
                break
            pc  = pitch_seq[idx]
            yul = PC_TO_YUL.get(pc)

            # 해당 율명 샘플 없으면 가장 가까운 것으로
            if yul not in sample_map:
                yul = _nearest_yul(pc, sample_map)
            if yul is None:
                continue

            start_sec = beat_i * beat_sec
            start_samp = int(start_sec * TARGET_SR)
            _place_sample(buffer, sample_map[yul], start_samp, note_dur_samples)

        # 피크 정규화
        peak = np.max(np.abs(buffer))
        if peak > 1e-6:
            buffer /= peak

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        sf.write(output_path, buffer, TARGET_SR)
        print(f"[OK] 솔로 음원 저장: {output_path} ({n_bars}마디, {n_notes}음)")
        return output_path


def _nearest_yul(pc: int, sample_map: dict[str, np.ndarray]) -> str | None:
    """sample_map에서 pitch class가 가장 가까운 율명 반환."""
    from pitch_markov import YUL_TO_PC  # type: ignore
    if not sample_map:
        return None
    best, best_dist = None, 999
    for yul in sample_map:
        target_pc = YUL_TO_PC.get(yul, -1)
        dist = min(abs(target_pc - pc), 12 - abs(target_pc - pc))
        if dist < best_dist:
            best_dist = dist
            best = yul
    return best


def main() -> None:
    parser = argparse.ArgumentParser(description="1악기 단독 음원 생성")
    parser.add_argument("--instrument", default="가야금")
    parser.add_argument("--jo",         default="평조",   choices=["평조", "계면조"])
    parser.add_argument("--jangdan",    default="중모리", choices=list(JANGDAN_BEATS.keys()))
    parser.add_argument("--bars",       type=int,   default=8)
    parser.add_argument("--bpm",        type=float, default=80.0)
    parser.add_argument("--temperature", type=float, default=1.0)
    parser.add_argument("--models-dir",  default="AI/models")
    parser.add_argument("--samples-dir", default="back/static/samples")
    parser.add_argument("--output",      default="back/static/generated/solo_output.wav")
    args = parser.parse_args()

    gen = SoloGenerator(
        models_dir=os.path.abspath(args.models_dir),
        samples_dir=os.path.abspath(args.samples_dir),
    )
    path = gen.generate(
        instrument=args.instrument,
        jo=args.jo,
        jangdan=args.jangdan,
        n_bars=args.bars,
        bpm=args.bpm,
        temperature=args.temperature,
        output_path=os.path.abspath(args.output),
    )
    print(f"생성 완료: {path}")


if __name__ == "__main__":
    main()
