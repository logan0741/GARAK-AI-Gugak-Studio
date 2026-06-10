from __future__ import annotations

import argparse
import os
import sys
import glob

try:
    import numpy as np
except ImportError as exc:
    raise ImportError(
        "train_markov requires 'numpy'. Install it with: pip install numpy"
    ) from exc

from onset_detection import extract_bar_patterns
from clustering import build_pattern_db
from markov_builder import build_transition_matrix, save_model

JANGDAN_BEATS = {
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

JO_LIST = ["평조", "계면조"]

MIN_WAV_FILES = 3
N_CLUSTERS = 16
WAV_EXTENSIONS = ("*.wav", "*.WAV")


def _find_wav_files(folder: str) -> list[str]:
    files: list[str] = []
    for ext in WAV_EXTENSIONS:
        files.extend(glob.glob(os.path.join(folder, ext)))
    return sorted(set(files))


def _train_combination(
    jo: str, jangdan: str, data_dir: str, output_dir: str
) -> dict | None:
    folder = os.path.join(data_dir, jo, jangdan)
    if not os.path.isdir(folder):
        return None

    wav_files = _find_wav_files(folder)
    if len(wav_files) == 0:
        return None

    if len(wav_files) < MIN_WAV_FILES:
        print(
            f"[SKIP] {jo} / {jangdan}: WAV {len(wav_files)}개 "
            f"(최소 {MIN_WAV_FILES}개 필요)"
        )
        return None

    beats_per_bar = JANGDAN_BEATS[jangdan]
    all_patterns: list[np.ndarray] = []
    per_file_counts: list[int] = []

    for wav_path in wav_files:
        try:
            patterns = extract_bar_patterns(wav_path, beats_per_bar)
        except Exception as exc:
            print(f"[WARN] {os.path.basename(wav_path)} 처리 실패: {exc}")
            patterns = []
        per_file_counts.append(len(patterns))
        all_patterns.extend(patterns)

    if len(all_patterns) < 2:
        print(
            f"[SKIP] {jo} / {jangdan}: 추출된 마디 패턴 {len(all_patterns)}개 "
            f"(클러스터링 불가)"
        )
        return None

    labels, medoids = build_pattern_db(all_patterns, n_clusters=N_CLUSTERS)
    n_patterns = int(medoids.shape[0])

    pattern_sequences: list[list[int]] = []
    cursor = 0
    for count in per_file_counts:
        if count > 0:
            seq = labels[cursor : cursor + count].tolist()
            pattern_sequences.append(seq)
        cursor += count

    transition_matrix = build_transition_matrix(pattern_sequences, n_patterns)
    saved_path = save_model(transition_matrix, medoids, jo, jangdan, output_dir)

    return {
        "jo": jo,
        "jangdan": jangdan,
        "n_wav": len(wav_files),
        "n_patterns": n_patterns,
        "path": saved_path,
    }


def _print_summary(results: list[dict]) -> None:
    print("\n" + "=" * 78)
    print("학습 요약")
    print("=" * 78)
    if not results:
        print("학습된 모델이 없습니다.")
        return

    header = f"{'조':<8}{'장단':<10}{'WAV':>5}{'패턴':>6}  저장 경로"
    print(header)
    print("-" * 78)
    for r in results:
        print(
            f"{r['jo']:<8}{r['jangdan']:<10}{r['n_wav']:>5}"
            f"{r['n_patterns']:>6}  {r['path']}"
        )
    print("-" * 78)
    print(f"총 {len(results)}개 모델 저장 완료.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="국악 장단 Markov Chain 학습 파이프라인"
    )
    parser.add_argument(
        "--data-dir", default="AI/data", help="WAV 데이터 루트 디렉토리"
    )
    parser.add_argument(
        "--output-dir", default="AI/models", help="모델 .pkl 출력 디렉토리"
    )
    parser.add_argument(
        "--jo", choices=JO_LIST, help="특정 조만 학습 (생략 시 전체)"
    )
    parser.add_argument(
        "--jangdan",
        choices=list(JANGDAN_BEATS.keys()),
        help="특정 장단만 학습 (생략 시 전체)",
    )
    args = parser.parse_args()

    if not os.path.isdir(args.data_dir):
        print(f"[ERROR] 데이터 디렉토리가 없습니다: {args.data_dir}")
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)

    target_jo = [args.jo] if args.jo else JO_LIST
    target_jangdan = [args.jangdan] if args.jangdan else list(JANGDAN_BEATS.keys())

    results: list[dict] = []
    for jo in target_jo:
        for jangdan in target_jangdan:
            result = _train_combination(
                jo, jangdan, args.data_dir, args.output_dir
            )
            if result is not None:
                print(
                    f"[OK]   {jo} / {jangdan}: "
                    f"WAV {result['n_wav']}개, 패턴 {result['n_patterns']}개 "
                    f"→ {result['path']}"
                )
                results.append(result)

    _print_summary(results)


if __name__ == "__main__":
    main()
