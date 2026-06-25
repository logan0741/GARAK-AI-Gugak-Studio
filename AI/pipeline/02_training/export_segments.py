from __future__ import annotations

import argparse
import glob
import os
import pickle

try:
    import numpy as np
    import librosa
    import soundfile as sf
except ImportError as exc:
    raise ImportError(
        "export_segments requires 'numpy', 'librosa' and 'soundfile'. "
        "Install them with: pip install numpy librosa soundfile"
    ) from exc

from onset_detection import _detect_onset_times, _estimate_tempo
from clustering import assign_pattern_id

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

MIN_IOI_MS = 50.0
WAV_EXTENSIONS = ("*.wav", "*.WAV")


def _find_wav_files(folder: str) -> list[str]:
    files: list[str] = []
    for ext in WAV_EXTENSIONS:
        files.extend(glob.glob(os.path.join(folder, ext)))
    return sorted(set(files))


def get_bar_boundaries(
    wav_path: str, beats_per_bar: int, sr: int = 22050
) -> list[tuple[float, float]]:
    y, sr = librosa.load(wav_path, sr=sr, mono=True)
    if y.size == 0:
        return []

    bpm = _estimate_tempo(y, sr)
    beat_duration_s = 60.0 / bpm
    bar_duration_s = beat_duration_s * beats_per_bar
    if bar_duration_s <= 0:
        return []

    total_duration_s = float(len(y)) / sr
    n_bars = int(total_duration_s // bar_duration_s)
    if n_bars < 1:
        n_bars = 1

    boundaries: list[tuple[float, float]] = []
    for bar_idx in range(n_bars):
        start = bar_idx * bar_duration_s
        end = min(start + bar_duration_s, total_duration_s)
        boundaries.append((start, end))
    return boundaries


def _bar_ioi(onset_times: np.ndarray, start: float, end: float) -> np.ndarray:
    mask = (onset_times >= start) & (onset_times < end)
    bar_onsets = onset_times[mask]
    if bar_onsets.size < 2:
        return np.empty(0, dtype=float)
    ioi_ms = np.diff(bar_onsets) * 1000.0
    return ioi_ms[ioi_ms >= MIN_IOI_MS]


def _export_combination(
    pkl_path: str, data_dir: str, segments_dir: str, sr: int = 22050
) -> dict | None:
    with open(pkl_path, "rb") as f:
        model = pickle.load(f)

    jo = model["jo"]
    jangdan = model["jangdan"]
    medoids = np.asarray(model["medoids"], dtype=np.double)

    if jangdan not in JANGDAN_BEATS:
        print(f"[SKIP] {jo} / {jangdan}: 알 수 없는 장단")
        return None

    beats_per_bar = JANGDAN_BEATS[jangdan]
    folder = os.path.join(data_dir, jo, jangdan)
    if not os.path.isdir(folder):
        print(f"[SKIP] {jo} / {jangdan}: 데이터 폴더 없음 ({folder})")
        return None

    wav_files = _find_wav_files(folder)
    if not wav_files:
        print(f"[SKIP] {jo} / {jangdan}: WAV 파일 없음")
        return None

    out_root = os.path.join(segments_dir, f"{jo}_{jangdan}")
    pattern_counters: dict[int, int] = {}
    total = 0

    for wav_path in wav_files:
        try:
            audio, file_sr = sf.read(wav_path, dtype="float32", always_2d=False)
        except Exception as exc:
            print(f"[WARN] {os.path.basename(wav_path)} 로드 실패: {exc}")
            continue

        if audio.ndim > 1:
            audio = audio.mean(axis=1)

        y_mono, _ = librosa.load(wav_path, sr=sr, mono=True)
        onset_times = _detect_onset_times(y_mono, sr)
        if onset_times.size < 2:
            continue

        boundaries = get_bar_boundaries(wav_path, beats_per_bar, sr=sr)
        for start, end in boundaries:
            ioi = _bar_ioi(onset_times, start, end)
            if ioi.size == 0:
                continue
            try:
                pattern_id = assign_pattern_id(ioi, medoids)
            except Exception as exc:
                print(f"[WARN] pattern 할당 실패: {exc}")
                continue

            start_sample = int(round(start * file_sr))
            end_sample = int(round(end * file_sr))
            start_sample = max(0, min(start_sample, audio.shape[0]))
            end_sample = max(start_sample, min(end_sample, audio.shape[0]))
            segment = audio[start_sample:end_sample]
            if segment.size == 0:
                continue

            pattern_dir = os.path.join(out_root, f"pattern_{pattern_id:02d}")
            os.makedirs(pattern_dir, exist_ok=True)
            idx = pattern_counters.get(pattern_id, 0)
            out_path = os.path.join(pattern_dir, f"seg_{idx:03d}.wav")
            sf.write(out_path, segment, file_sr)
            pattern_counters[pattern_id] = idx + 1
            total += 1

    return {
        "jo": jo,
        "jangdan": jangdan,
        "n_wav": len(wav_files),
        "n_patterns_used": len(pattern_counters),
        "n_segments": total,
    }


def _print_summary(results: list[dict]) -> None:
    print("\n" + "=" * 78)
    print("세그먼트 추출 요약")
    print("=" * 78)
    if not results:
        print("추출된 세그먼트가 없습니다.")
        return

    header = f"{'조':<8}{'장단':<10}{'WAV':>5}{'패턴':>6}{'세그먼트':>8}"
    print(header)
    print("-" * 78)
    grand_total = 0
    for r in results:
        print(
            f"{r['jo']:<8}{r['jangdan']:<10}{r['n_wav']:>5}"
            f"{r['n_patterns_used']:>6}{r['n_segments']:>8}"
        )
        grand_total += r["n_segments"]
    print("-" * 78)
    print(f"총 {grand_total}개 세그먼트 추출 완료.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="학습된 pkl + phrase WAV → 마디 단위 오디오 세그먼트 추출"
    )
    parser.add_argument(
        "--models-dir", default="AI/models", help="모델 .pkl 디렉토리"
    )
    parser.add_argument(
        "--data-dir", default="AI/data", help="phrase WAV 데이터 루트"
    )
    parser.add_argument(
        "--segments-dir", default="AI/segments", help="세그먼트 출력 디렉토리"
    )
    args = parser.parse_args()

    if not os.path.isdir(args.models_dir):
        print(f"[ERROR] 모델 디렉토리가 없습니다: {args.models_dir}")
        return

    os.makedirs(args.segments_dir, exist_ok=True)

    pkl_files = sorted(glob.glob(os.path.join(args.models_dir, "*.pkl")))
    if not pkl_files:
        print(f"[ERROR] pkl 모델이 없습니다: {args.models_dir}")
        return

    results: list[dict] = []
    for pkl_path in pkl_files:
        result = _export_combination(
            pkl_path, args.data_dir, args.segments_dir
        )
        if result is not None:
            print(
                f"[OK]   {result['jo']} / {result['jangdan']}: "
                f"세그먼트 {result['n_segments']}개 "
                f"({result['n_patterns_used']}개 패턴)"
            )
            results.append(result)

    _print_summary(results)


if __name__ == "__main__":
    main()
