# -*- coding: utf-8 -*-
"""
악구(phrase) WAV → 악기별 단음 샘플 추출기

공공 API가 단음(monotone) 엔드포인트를 제공하지 않으므로,
악구 녹음에서 librosa onset + pyin 으로 개별 음을 추출한다.

처리 흐름:
  악구 WAV (합주/솔로) → onset 검출 → 각 음 구간 잘라내기
  → pyin 으로 pitch class 감지 → {율명}.wav 로 저장

사용법:
  # 1. 먼저 대금 악구 다운로드 (악기 필터 추가)
  python AI/pipeline/00_ingestion/download_phrase_api.py --instrument 대금 --dry-run
  python AI/pipeline/00_ingestion/download_phrase_api.py --instrument 대금

  # 2. 추출
  python AI/pipeline/01_preprocessing/extract_notes_from_phrases.py --src AI/data/대금 --instrument 대금
  python AI/pipeline/01_preprocessing/extract_notes_from_phrases.py --src AI/data/대금 --instrument 대금 --min-dur 0.15

출력: back/static/samples/{악기}/{율명}.wav (율명당 가장 좋은 샘플 1개)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Optional

try:
    import numpy as np
    import librosa
    import soundfile as sf
except ImportError as e:
    raise ImportError("pip install librosa soundfile numpy") from e

# 율명 ↔ pitch class (황=G=7 기준, organize_samples.py 와 동일)
PC_TO_YUL: dict[int, str] = {
    7: "황", 8: "대", 9: "태", 10: "협", 11: "고",
    0: "중", 1: "유", 2: "임", 3: "이",  4: "남",  5: "무",  6: "응",
}
YUL_TO_PC: dict[str, int] = {v: k for k, v in PC_TO_YUL.items()}

TARGET_SR   = 44100
ANALYSIS_SR = 22050   # librosa pyin 분석용
MIN_DUR_S   = 0.10    # 최소 음 길이 (초)
MAX_DUR_S   = 3.0     # 최대 음 길이 (초) — 잘라서 저장
SCORE_W_DUR = 0.4     # 긴 음 선호 가중치
SCORE_W_VOL = 0.6     # 큰 볼륨 선호 가중치


def detect_pitch_class(y: np.ndarray, sr: int) -> Optional[int]:
    """
    오디오 배열 → 지배적 pitch class (0-11).
    voiced 프레임이 없으면 None.
    """
    if len(y) < sr * 0.05:
        return None
    try:
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
            sr=sr,
            fill_na=None,
        )
    except Exception:
        return None

    if f0 is None:
        return None

    valid = voiced_flag & ~np.isnan(f0.astype(float))
    voiced_f0 = f0[valid]
    if voiced_f0.size < 3:
        return None

    midi_vals = librosa.hz_to_midi(voiced_f0)
    midi_int  = np.round(midi_vals).astype(int) % 12
    return int(np.bincount(midi_int, minlength=12).argmax())


def _score(y_seg: np.ndarray) -> float:
    """음 샘플의 품질 점수 (길이 + 볼륨 기반)."""
    dur  = len(y_seg) / TARGET_SR
    vol  = float(np.sqrt(np.mean(y_seg ** 2)))   # RMS
    norm_dur = min(dur / MAX_DUR_S, 1.0)
    norm_vol = min(vol / 0.5, 1.0)
    return SCORE_W_DUR * norm_dur + SCORE_W_VOL * norm_vol


def extract_note_segments(
    wav_path: str,
    min_dur_s: float = MIN_DUR_S,
) -> list[dict]:
    """
    WAV → onset 기반 음 구간 리스트.
    반환: [{"pc": int, "yul": str, "audio": np.ndarray(float32, TARGET_SR), "score": float}]
    """
    try:
        y_full, sr_orig = sf.read(wav_path, dtype="float32", always_2d=False)
    except Exception as e:
        print(f"  [WARN] 로드 실패 {Path(wav_path).name}: {e}")
        return []

    if y_full.ndim > 1:
        y_full = y_full.mean(axis=1)

    # 분석용 다운샘플
    y_an = librosa.resample(y_full.astype(np.float64), orig_sr=sr_orig,
                             target_sr=ANALYSIS_SR).astype(np.float32)

    # onset 검출
    onset_frames = librosa.onset.onset_detect(
        y=y_an, sr=ANALYSIS_SR, backtrack=True, units="frames"
    )
    if onset_frames.size < 2:
        return []

    onset_times = librosa.frames_to_time(onset_frames, sr=ANALYSIS_SR)

    segments = []
    n = len(onset_times)
    for i in range(n):
        t_start = onset_times[i]
        t_end   = onset_times[i + 1] if i + 1 < n else t_start + MAX_DUR_S
        dur     = min(t_end - t_start, MAX_DUR_S)

        if dur < min_dur_s:
            continue

        # 원본 SR로 슬라이싱
        s_start = int(t_start * sr_orig)
        s_end   = int((t_start + dur) * sr_orig)
        y_seg_orig = y_full[s_start:s_end]
        if len(y_seg_orig) < int(sr_orig * min_dur_s):
            continue

        # 분석용 슬라이싱
        an_start = int(t_start * ANALYSIS_SR)
        an_end   = int((t_start + dur) * ANALYSIS_SR)
        y_seg_an = y_an[an_start:an_end]

        pc = detect_pitch_class(y_seg_an, ANALYSIS_SR)
        if pc is None:
            continue

        yul = PC_TO_YUL.get(pc)
        if yul is None:
            continue

        # TARGET_SR 로 리샘플
        y_seg_target = librosa.resample(
            y_seg_orig.astype(np.float64), orig_sr=sr_orig, target_sr=TARGET_SR
        ).astype(np.float32)

        segments.append({
            "pc":    pc,
            "yul":   yul,
            "audio": y_seg_target,
            "score": _score(y_seg_target),
        })

    return segments


def process_directory(
    src_dir: str,
    instrument: str,
    output_dir: str,
    min_dur_s: float = MIN_DUR_S,
    max_wavs: int = 200,
) -> dict[str, str]:
    """
    src_dir 내 모든 WAV를 순서대로 처리해서
    율명당 최고점 샘플 하나를 output_dir/{instrument}/{율명}.wav 로 저장.

    반환: {율명: 저장 경로}
    """
    _seen: set[str] = set()
    wav_files = []
    for ext in ("*.wav", "*.WAV"):
        for p in Path(src_dir).rglob(ext):
            key = str(p).lower()
            if key not in _seen:
                _seen.add(key)
                wav_files.append(p)
    wav_files = sorted(wav_files)[:max_wavs]

    if not wav_files:
        print(f"  [WARN] WAV 파일 없음: {src_dir}")
        return {}

    # 율명 → 최고점 세그먼트
    best: dict[str, dict] = {}

    for wav_path in wav_files:
        print(f"  분석: {wav_path.name}", end="", flush=True)
        segs = extract_note_segments(str(wav_path), min_dur_s)
        new = 0
        for seg in segs:
            yul = seg["yul"]
            if yul not in best or seg["score"] > best[yul]["score"]:
                best[yul] = seg
                new += 1
        print(f" → {len(segs)}음 ({', '.join(sorted(best))})")

    if not best:
        print("  [WARN] 추출된 음 없음")
        return {}

    # 저장
    inst_dir = os.path.join(output_dir, instrument)
    os.makedirs(inst_dir, exist_ok=True)
    saved: dict[str, str] = {}

    for yul, seg in sorted(best.items()):
        dest = os.path.join(inst_dir, f"{yul}.wav")
        audio = seg["audio"]
        # 피크 정규화
        peak = np.max(np.abs(audio))
        if peak > 1e-6:
            audio = audio / peak * 0.95
        sf.write(dest, audio, TARGET_SR)
        saved[yul] = dest
        print(f"  [OK] {yul}.wav (score={seg['score']:.3f})")

    return saved


def update_manifest(output_dir: str, instrument: str) -> None:
    """back/static/samples/manifest.json 갱신."""
    manifest_path = os.path.join(output_dir, "manifest.json")
    manifest: dict = {}
    if os.path.isfile(manifest_path):
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

    inst_dir = os.path.join(output_dir, instrument)
    manifest[instrument] = {
        p.stem: f"/static/samples/{instrument}/{p.name}"
        for p in sorted(Path(inst_dir).glob("*.wav"))
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nmanifest 업데이트: {manifest_path}")
    print(f"{instrument} 음: {sorted(manifest[instrument].keys())}")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    default_out = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "back", "static", "samples")
    )

    parser = argparse.ArgumentParser(description="악구 WAV → 단음 샘플 추출")
    parser.add_argument("--src",        required=True,
                        help="악구 WAV 가 있는 디렉토리 (예: AI/data/대금)")
    parser.add_argument("--instrument", required=True,
                        help="악기명 (예: 대금, 해금)")
    parser.add_argument("--output",     default=default_out,
                        help="출력 루트 (기본: back/static/samples)")
    parser.add_argument("--min-dur",    type=float, default=MIN_DUR_S,
                        help=f"최소 음 길이(초) (기본: {MIN_DUR_S})")
    parser.add_argument("--max-wavs",   type=int,   default=200,
                        help="처리할 최대 WAV 파일 수 (기본: 200)")
    args = parser.parse_args()

    src = os.path.abspath(args.src)
    if not os.path.isdir(src):
        print(f"[ERROR] 디렉토리 없음: {src}")
        sys.exit(1)

    print(f"[{args.instrument}] 단음 추출 시작")
    print(f"  소스: {src}")
    print(f"  최소 음 길이: {args.min_dur}초")

    saved = process_directory(
        src_dir=src,
        instrument=args.instrument,
        output_dir=os.path.abspath(args.output),
        min_dur_s=args.min_dur,
        max_wavs=args.max_wavs,
    )

    if saved:
        update_manifest(os.path.abspath(args.output), args.instrument)
        print(f"\n완료: {len(saved)}개 율명 → {args.output}/{args.instrument}/")
    else:
        print("\n[WARN] 저장된 샘플 없음")


if __name__ == "__main__":
    main()
