# -*- coding: utf-8 -*-
"""
장구 리듬 세그먼트 → 단타 샘플 추출기

장구 타법:
  궁 (kung)   — 궁편(왼쪽 울림통), 저음 둔탁한 소리
  덕 (deok)   — 채편(오른쪽 채), 중음 가벼운 소리
  따 (dda)    — 채편 강타, 고음 날카로운 소리
  합 (hap)    — 양편 동시, 양쪽 합친 소리

분류 방법:
  onset 검출 → 각 타격의 스펙트럼 무게중심(spectral centroid) 계산
  → 저역(< 400 Hz) 에너지 비율로 궁/덕/따 분류
  → 궁: 저역 비율 높음 / 따: 고역 비율 높고 에너지 큼 / 덕: 나머지

사용법:
  python AI/pipeline/01_preprocessing/extract_janggu_hits.py
  python AI/pipeline/01_preprocessing/extract_janggu_hits.py --segments-dir AI/segments --output back/static/samples/장구
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

TARGET_SR   = 44100
ANALYSIS_SR = 22050
HIT_DUR_S   = 0.5      # 타격 1개 최대 길이 (초)
MIN_DUR_S   = 0.04     # 최소 타격 길이

# 타법 레이블 → 설명
HIT_LABELS = {
    "궁": "궁편(왼쪽) 저음 타격",
    "덕": "채편(오른쪽) 중간 타격",
    "따": "채편 강타 — 고음 날카로운 소리",
    "합": "양편 동시 타격",
}


def _features(y: np.ndarray, sr: int) -> dict:
    """타격 특성 벡터 (low_ratio, centroid, rms)."""
    if len(y) < 64:
        return {"low_ratio": 0.0, "centroid": 2000.0, "rms": 0.0}
    D = np.abs(librosa.stft(y.astype(np.float32)))
    freqs = librosa.fft_frequencies(sr=sr)
    total = float(D.sum()) + 1e-8
    low_ratio = float(D[freqs <= 300].sum()) / total
    cent = float(np.median(librosa.feature.spectral_centroid(y=y.astype(np.float32), sr=sr)))
    rms  = float(np.sqrt(np.mean(y ** 2)))
    return {"low_ratio": low_ratio, "centroid": cent, "rms": rms}


def _collect_all_hits(wav_files: list[Path], min_dur_s: float) -> list[dict]:
    """WAV 목록에서 모든 onset 타격을 수집 (레이블 없이)."""
    all_hits = []
    for wav_path in wav_files:
        try:
            y_full, sr_orig = sf.read(str(wav_path), dtype="float32", always_2d=False)
        except Exception:
            continue
        if y_full.ndim > 1:
            y_full = y_full.mean(axis=1)

        y_an = librosa.resample(
            y_full.astype(np.float64), orig_sr=sr_orig, target_sr=ANALYSIS_SR
        ).astype(np.float32)

        onset_frames = librosa.onset.onset_detect(
            y=y_an, sr=ANALYSIS_SR, backtrack=True, units="frames",
            delta=0.08, wait=2,
        )
        if onset_frames.size < 2:
            continue

        times = librosa.frames_to_time(onset_frames, sr=ANALYSIS_SR)
        n = len(times)
        for i in range(n):
            t_start = times[i]
            t_end   = times[i + 1] if i + 1 < n else t_start + HIT_DUR_S
            dur     = min(t_end - t_start, HIT_DUR_S)
            if dur < min_dur_s:
                continue

            an_s = int(t_start * ANALYSIS_SR)
            an_e = int((t_start + dur) * ANALYSIS_SR)
            y_an_seg = y_an[an_s:an_e]
            feat = _features(y_an_seg, ANALYSIS_SR)
            if feat["rms"] < 1e-4:
                continue

            s_s = int(t_start * sr_orig)
            s_e = int((t_start + dur) * sr_orig)
            y_orig = y_full[s_s:s_e]
            y_target = librosa.resample(
                y_orig.astype(np.float64), orig_sr=sr_orig, target_sr=TARGET_SR
            ).astype(np.float32)

            all_hits.append({**feat, "audio": y_target, "src": wav_path.name})

    return all_hits


def _assign_labels_by_rank(hits: list[dict]) -> list[dict]:
    """
    절대 임계값 대신 분위수(quantile) 기반 상대 분류.
    low_ratio 내림차순 정렬 → 상위 25% = 궁, 하위 25% = 따(rms 높은 것), 나머지 = 덕
    """
    if not hits:
        return hits

    low_ratios = np.array([h["low_ratio"] for h in hits])
    rms_vals   = np.array([h["rms"] for h in hits])

    q75 = np.percentile(low_ratios, 75)  # 이 이상 → 궁
    q25 = np.percentile(low_ratios, 25)  # 이 이하 → 따/덕 후보

    rms_q75 = np.percentile(rms_vals, 75)

    for h in hits:
        if h["low_ratio"] >= q75:
            h["label"] = "궁"
        elif h["low_ratio"] <= q25 and h["rms"] >= rms_q75:
            h["label"] = "따"
        else:
            h["label"] = "덕"

    return hits


def process_segments(
    segments_dir: str,
    output_dir: str,
    max_files: int = 80,
) -> dict[str, str]:
    """
    segments_dir 내 seg_*.wav → 분위수 기반 타법 분류 → 타법별 최고 샘플 저장.
    """
    wav_files = sorted(Path(segments_dir).rglob("seg_*.wav"))[:max_files]
    if not wav_files:
        print(f"  [WARN] seg_*.wav 없음: {segments_dir}")
        return {}

    print(f"  {len(wav_files)}개 세그먼트 분석 중...")
    all_hits = _collect_all_hits(wav_files, MIN_DUR_S)
    print(f"  총 {len(all_hits)}개 타격 수집")

    if len(all_hits) < 4:
        print("  [WARN] 타격 수 부족")
        return {}

    all_hits = _assign_labels_by_rank(all_hits)

    # 레이블별 최고 rms 샘플 선정
    best: dict[str, dict] = {}
    for h in all_hits:
        label = h["label"]
        if label not in best or h["rms"] > best[label]["rms"]:
            best[label] = h

    # 합 = 궁 + 덕 믹스 합성
    if "합" not in best and "궁" in best and "덕" in best:
        g = best["궁"]["audio"]
        d = best["덕"]["audio"]
        n = max(len(g), len(d))
        g2 = np.pad(g, (0, n - len(g)))
        d2 = np.pad(d, (0, n - len(d)))
        mixed = (g2 * 0.65 + d2 * 0.55).astype(np.float32)
        peak = np.max(np.abs(mixed))
        if peak > 1e-6:
            mixed = mixed / peak * 0.90
        best["합"] = {"label": "합", "audio": mixed, "rms": 0.5, "src": "synthesized"}
        print("  [합] 궁+덕 믹스로 합성")

    os.makedirs(output_dir, exist_ok=True)
    saved: dict[str, str] = {}

    for label, h in sorted(best.items()):
        audio = h["audio"].copy()
        peak = np.max(np.abs(audio))
        if peak > 1e-6:
            audio = audio / peak * 0.92
        dest = os.path.join(output_dir, f"{label}.wav")
        sf.write(dest, audio, TARGET_SR)
        saved[label] = dest
        desc = HIT_LABELS.get(label, "")
        print(f"  [OK] {label}.wav  ({desc})  rms={h['rms']:.4f}  src={h.get('src','?')}")

    return saved


def update_manifest(samples_root: str, instrument: str) -> None:
    manifest_path = os.path.join(samples_root, "manifest.json")
    manifest: dict = {}
    if os.path.isfile(manifest_path):
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

    inst_dir = os.path.join(samples_root, instrument)
    manifest[instrument] = {
        p.stem: f"/static/samples/{instrument}/{p.name}"
        for p in sorted(Path(inst_dir).glob("*.wav"))
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nmanifest 업데이트 완료: {sorted(manifest[instrument].keys())}")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    default_seg = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "segments")
    )
    default_out = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "back", "static", "samples", "장구")
    )
    default_samples = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "back", "static", "samples")
    )

    parser = argparse.ArgumentParser(description="장구 세그먼트 → 단타 샘플 추출")
    parser.add_argument("--segments-dir", default=default_seg)
    parser.add_argument("--output",       default=default_out)
    parser.add_argument("--samples-root", default=default_samples)
    parser.add_argument("--max-files",    type=int, default=50)
    args = parser.parse_args()

    print(f"[장구] 세그먼트 → 단타 추출")
    print(f"  소스: {args.segments_dir}")

    saved = process_segments(
        segments_dir=args.segments_dir,
        output_dir=args.output,
        max_files=args.max_files,
    )

    if saved:
        update_manifest(args.samples_root, "장구")
        print(f"\n완료: {len(saved)}개 → {args.output}")
    else:
        print("\n[WARN] 저장된 샘플 없음")


if __name__ == "__main__":
    main()
