# -*- coding: utf-8 -*-
"""
단음 WAV → pitch별 정리 스크립트

monotone/ 폴더의 WAV를 librosa yin으로 분석해서
back/static/samples/{악기}/{율명}.wav 로 복사하고
manifest.json 을 생성한다.

사용법:
  python AI/pipeline/00_ingestion/organize_samples.py
  python AI/pipeline/00_ingestion/organize_samples.py --src monotone --dest back/static/samples
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path

try:
    import librosa
    import numpy as np
except ImportError as e:
    raise ImportError("pip install librosa numpy") from e

# pitch class → 율명 (황 = G 기준)
PC_TO_YUL: dict[int, str] = {
    7:  "황",   # G
    8:  "대",   # G#/Ab
    9:  "태",   # A
    10: "협",   # A#/Bb
    11: "고",   # B
    0:  "중",   # C
    1:  "유",   # C#
    2:  "임",   # D
    3:  "이",   # D#/Eb
    4:  "남",   # E
    5:  "무",   # F
    6:  "응",   # F#
}

# 율명 → MIDI 옥타브 기준값 (pitch shifting 계산용)
YUL_TO_PC: dict[str, int] = {v: k for k, v in PC_TO_YUL.items()}

# 파일명에서 악기 추출
INSTRUMENT_ALIASES: dict[str, str] = {
    "gayageum": "가야금",
    "daegeum":  "대금",
    "janggu":   "장구",
    "haegeum":  "해금",
}

# 장구 타법 (pitch 대신 stroke 타입으로 분류)
JANGGU_STROKES: dict[str, str] = {
    "deong": "덩",
    "kung":  "쿵",
    "dak":   "닥",
    "gideok": "기덕",
}

VELOCITY_PRIORITY = {"mid": 0, "qui": 1, "loud": 2}
TECHNIQUE_PRIORITY = {"sus": 0, "chosung": 1, "shallow": 2, "deep": 3, "break": 4,
                      "gullim": 5, "eaontuigim": 6, "glissando": 7}


def detect_pitch_class(wav_path: str, sr: int = 22050) -> int | None:
    """WAV 파일의 지배적 pitch class (0-11) 반환. 감지 실패 시 None."""
    try:
        y, _ = librosa.load(wav_path, sr=sr, mono=True, duration=3.0)
    except Exception:
        return None

    if y.size < sr * 0.1:
        return None

    try:
        f0 = librosa.yin(
            y,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
            sr=sr,
        )
    except Exception:
        return None

    voiced = f0[f0 > 50]
    if voiced.size == 0:
        return None

    median_f0 = float(np.median(voiced))
    midi = librosa.hz_to_midi(median_f0)
    return int(round(midi)) % 12


def parse_filename(stem: str) -> dict:
    """파일명 stem → {instrument, velocity, technique} 파싱."""
    parts = stem.lower().split("_")

    instrument = ""
    for alias, name in INSTRUMENT_ALIASES.items():
        if alias in parts:
            instrument = name
            break

    velocity = "mid"
    for p in parts:
        if p in VELOCITY_PRIORITY:
            velocity = p
            break

    technique = "other"
    for p in parts:
        if p in TECHNIQUE_PRIORITY:
            technique = p
            break

    return {"instrument": instrument, "velocity": velocity, "technique": technique}


def collect_candidates(src_dir: str) -> dict[str, list[dict]]:
    """
    src_dir 안의 WAV 파일을 분석해서
    instrument → [(pitch_class, yul_name, velocity, technique, path), ...] 반환
    """
    candidates: dict[str, list[dict]] = {}

    for wav_path in sorted(Path(src_dir).glob("*.wav")):
        meta = parse_filename(wav_path.stem)
        instrument = meta["instrument"]
        if not instrument:
            print(f"  [SKIP] 악기 불명: {wav_path.name}")
            continue

        pc = detect_pitch_class(str(wav_path))
        if pc is None:
            print(f"  [SKIP] pitch 감지 실패: {wav_path.name}")
            continue

        yul = PC_TO_YUL[pc]
        entry = {
            "pc":         pc,
            "yul":        yul,
            "velocity":   meta["velocity"],
            "technique":  meta["technique"],
            "path":       str(wav_path),
        }
        candidates.setdefault(instrument, []).append(entry)
        print(f"  [OK] {wav_path.name} → {instrument}/{yul} "
              f"(pc={pc}, vel={meta['velocity']}, tech={meta['technique']})")

    return candidates


def select_best(entries: list[dict]) -> dict:
    """같은 pitch class 내에서 velocity+technique 우선순위로 최선 선택."""
    return min(
        entries,
        key=lambda e: (
            VELOCITY_PRIORITY.get(e["velocity"], 99),
            TECHNIQUE_PRIORITY.get(e["technique"], 99),
        ),
    )


def organize(src_dir: str, dest_dir: str) -> dict:
    """
    src_dir의 WAV를 분석하여 dest_dir에 정리하고 manifest dict 반환.
    manifest 구조:
      { "가야금": { "황": "/static/samples/가야금/황.wav", ... }, ... }
    """
    print(f"[1/3] WAV 분석: {src_dir}")
    candidates = collect_candidates(src_dir)

    manifest: dict[str, dict[str, str]] = {}

    print(f"\n[2/3] 최적 샘플 선택 & 복사: {dest_dir}")
    for instrument, entries in sorted(candidates.items()):
        by_yul: dict[str, list[dict]] = {}
        for e in entries:
            by_yul.setdefault(e["yul"], []).append(e)

        manifest[instrument] = {}
        inst_dir = os.path.join(dest_dir, instrument)
        os.makedirs(inst_dir, exist_ok=True)

        for yul, group in sorted(by_yul.items()):
            best = select_best(group)
            dest_path = os.path.join(inst_dir, f"{yul}.wav")
            shutil.copy2(best["path"], dest_path)
            manifest[instrument][yul] = f"/static/samples/{instrument}/{yul}.wav"
            print(f"  {instrument}/{yul}.wav ← {Path(best['path']).name}")

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="단음 샘플 정리 스크립트")
    parser.add_argument("--src",  default="monotone",           help="원본 WAV 폴더")
    parser.add_argument("--dest", default="back/static/samples", help="출력 폴더")
    args = parser.parse_args()

    src  = os.path.abspath(args.src)
    dest = os.path.abspath(args.dest)

    if not os.path.isdir(src):
        print(f"[ERROR] 원본 폴더 없음: {src}")
        return

    os.makedirs(dest, exist_ok=True)
    manifest = organize(src, dest)

    manifest_path = os.path.join(dest, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[3/3] manifest 저장 → {manifest_path}")
    print("\n완료 요약:")
    for inst, notes in manifest.items():
        print(f"  {inst}: {sorted(notes.keys())}")


if __name__ == "__main__":
    main()
