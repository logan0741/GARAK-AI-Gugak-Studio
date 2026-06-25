# -*- coding: utf-8 -*-
"""
가야금/대금 음고 마르코프 학습 파이프라인 CLI

사용법:
  python AI/pipeline/02_training/train_pitch_markov.py                                   # 전체 학습
  python AI/pipeline/02_training/train_pitch_markov.py --instrument 가야금               # 가야금만
  python AI/pipeline/02_training/train_pitch_markov.py --instrument 가야금 --jangdan 중모리
  python AI/pipeline/02_training/train_pitch_markov.py --data-dir AI/data_instruments --output-dir AI/models
"""
from __future__ import annotations

import argparse
import glob
import os
import sys
import time

RUNTIME_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "03_runtime"))
if RUNTIME_DIR not in sys.path:
    sys.path.insert(0, RUNTIME_DIR)

from pitch_markov import (
    extract_note_sequence,
    build_pitch_transition_matrix,
    save_pitch_model,
)

INSTRUMENTS  = ["가야금", "대금"]
JO_LIST      = ["평조", "계면조"]
JANGDAN_LIST = [
    "중모리", "중중모리", "자진모리", "굿거리",
    "휘모리", "엇모리", "세마치", "진양조",
]
MIN_WAV_FILES   = 3
MIN_SEQUENCES   = 2
WAV_EXTENSIONS  = ("*.wav", "*.WAV")


def _find_wav_files(folder: str) -> list[str]:
    files: list[str] = []
    for ext in WAV_EXTENSIONS:
        files.extend(glob.glob(os.path.join(folder, ext)))
    return sorted(set(files))


def _train_combination(
    instrument: str,
    jo: str,
    jangdan: str,
    data_dir: str,
    output_dir: str,
) -> dict | None:
    folder = os.path.join(data_dir, instrument, jo, jangdan)
    if not os.path.isdir(folder):
        return None

    wav_files = _find_wav_files(folder)
    if len(wav_files) < MIN_WAV_FILES:
        if wav_files:
            print(f"[SKIP] {instrument}/{jo}/{jangdan}: {len(wav_files)}개 (최소 {MIN_WAV_FILES}개)")
        return None

    print(f"\n[{instrument}/{jo}/{jangdan}] {len(wav_files)}개 WAV — 음고 추출 시작")
    t0 = time.time()

    sequences: list[list[int]] = []
    failed = 0
    for i, wav_path in enumerate(wav_files, 1):
        try:
            seq = extract_note_sequence(wav_path)
            if len(seq) >= 2:
                sequences.append(seq)
            else:
                failed += 1
        except Exception as exc:
            print(f"  [WARN] {os.path.basename(wav_path)}: {exc}")
            failed += 1

        # 5개마다 진행 상황 출력
        if i % 5 == 0 or i == len(wav_files):
            elapsed = time.time() - t0
            avg_s = elapsed / i
            remain = avg_s * (len(wav_files) - i)
            print(f"  {i}/{len(wav_files)} 완료 | "
                  f"경과 {elapsed:.0f}s | 예상 잔여 {remain:.0f}s | "
                  f"유효 시퀀스 {len(sequences)}개")

    if len(sequences) < MIN_SEQUENCES:
        print(f"  [SKIP] 유효 시퀀스 {len(sequences)}개 — 학습 불가")
        return None

    transition_matrix, note_histogram = build_pitch_transition_matrix(sequences)
    saved_path = save_pitch_model(
        transition_matrix, note_histogram,
        instrument, jo, jangdan,
        len(sequences), output_dir,
    )

    elapsed = time.time() - t0
    return {
        "instrument":  instrument,
        "jo":          jo,
        "jangdan":     jangdan,
        "n_wav":       len(wav_files),
        "n_sequences": len(sequences),
        "n_failed":    failed,
        "elapsed_s":   elapsed,
        "path":        saved_path,
    }


def _print_summary(results: list[dict]) -> None:
    print("\n" + "=" * 80)
    print("음고 마르코프 학습 요약")
    print("=" * 80)
    if not results:
        print("학습된 모델이 없습니다.")
        return

    header = f"{'악기':<8}{'조':<8}{'장단':<10}{'WAV':>5}{'시퀀스':>7}{'실패':>5}  저장 경로"
    print(header)
    print("-" * 80)
    for r in results:
        print(
            f"{r['instrument']:<8}{r['jo']:<8}{r['jangdan']:<10}"
            f"{r['n_wav']:>5}{r['n_sequences']:>7}{r['n_failed']:>5}  {r['path']}"
        )
    print("-" * 80)
    print(f"총 {len(results)}개 음고 모델 저장 완료.")
    total_s = sum(r["elapsed_s"] for r in results)
    print(f"총 소요 시간: {total_s/60:.1f}분")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="가야금/대금 음고 마르코프 학습")
    parser.add_argument("--data-dir",   default="AI/data_instruments", help="WAV 데이터 루트")
    parser.add_argument("--output-dir", default="AI/models",           help="모델 출력 디렉토리")
    parser.add_argument("--instrument", choices=INSTRUMENTS,           help="특정 악기만 학습")
    parser.add_argument("--jo",         choices=JO_LIST,               help="특정 조만 학습")
    parser.add_argument("--jangdan",    choices=JANGDAN_LIST,          help="특정 장단만 학습")
    args = parser.parse_args()

    if not os.path.isdir(args.data_dir):
        print(f"[ERROR] 데이터 디렉토리 없음: {args.data_dir}")
        print("먼저 실행: python AI/pipeline/00_ingestion/extract_instruments.py")
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)

    target_instruments = [args.instrument] if args.instrument else INSTRUMENTS
    target_jo          = [args.jo]         if args.jo         else JO_LIST
    target_jangdan     = [args.jangdan]    if args.jangdan    else JANGDAN_LIST

    total_combos = len(target_instruments) * len(target_jo) * len(target_jangdan)
    print(f"학습 대상: {total_combos}개 조합")
    print("pyin 음고 추출은 파일당 수 초가 소요됩니다.")
    print()

    results: list[dict] = []
    combo_idx = 0
    for instrument in target_instruments:
        for jo in target_jo:
            for jangdan in target_jangdan:
                combo_idx += 1
                print(f"[{combo_idx}/{total_combos}]", end=" ")
                result = _train_combination(
                    instrument, jo, jangdan,
                    args.data_dir, args.output_dir,
                )
                if result:
                    print(
                        f"  [OK] {result['instrument']}/{result['jo']}/{result['jangdan']}: "
                        f"{result['n_sequences']}개 시퀀스 → {result['path']}"
                    )
                    results.append(result)

    _print_summary(results)


if __name__ == "__main__":
    main()
