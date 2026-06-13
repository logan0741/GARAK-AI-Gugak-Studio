# -*- coding: utf-8 -*-
"""
AIHub 국악 데이터셋에서 가야금/대금 WAV 파일을 악기×조×장단별로 추출

사용법:
  python AI/extract_instruments.py
  python AI/extract_instruments.py --instrument 가야금 --max-per-combo 30
  python AI/extract_instruments.py --output AI/data_instruments
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

AIHUB_BASE = r"C:\Users\logan\Downloads\209.국악 악보 및 음원 데이터\01-1.정식개방데이터\Training"
LABEL_ZIPS = [
    os.path.join(AIHUB_BASE, "02.라벨링데이터", "TL_전통국악_F_민속악.zip"),
    os.path.join(AIHUB_BASE, "02.라벨링데이터", "TL_전통국악_E_풍류음악.zip"),
]
WAV_ZIPS = [
    os.path.join(AIHUB_BASE, "01.원천데이터", "TS_전통국악_F_민속악.zip"),
    os.path.join(AIHUB_BASE, "01.원천데이터", "TS_전통국악_E_풍류음악.zip"),
]

# instrument_cd → 악기명
INSTRUMENT_MAP = {
    "PN01": "가야금",  # 가야금 산조
    "SP01": "가야금",  # 가야금 산조 (다른 류)
    "WN01": "대금",    # 대금 산조
}

# gukak_beat_cd → 장단명
BEAT_MAP: Dict[str, str] = {
    "QN1202": "중모리",
    "DQ0404": "자진모리",
    "DQ0405": "굿거리",
    "DQ0603": "진양조",
    "EN1001": "엇모리",
    "QN0401": "휘모리",
    "DQ0301": "세마치",
    "DQ0403": "중중모리",
}


def _resolve_jo(mode_cd: str, instrument_cd: str) -> str:
    if mode_cd.startswith("MG"):
        return "계면조"
    if mode_cd.startswith("MF"):
        return "평조"
    # mode_cd 없는 산조 파일 → 산조는 계면조가 압도적 다수
    if instrument_cd in ("PN01", "SP01", "WN01"):
        return "계면조"
    return ""


def collect_labels(
    max_per_combo: int,
    filter_instrument: str | None,
) -> Dict[Tuple[str, str, str], List[str]]:
    """(악기, 조, 장단) → [file_id, ...] 딕셔너리"""
    candidates: Dict[Tuple[str, str, str], List[str]] = defaultdict(list)

    for lzip in LABEL_ZIPS:
        if not os.path.exists(lzip):
            print(f"[WARN] 라벨 ZIP 없음: {lzip}")
            continue

        with zipfile.ZipFile(lzip, "r") as z:
            json_entries = [n for n in z.namelist() if n.endswith(".json")]
            print(f"  {Path(lzip).name}: {len(json_entries)}개 JSON 스캔 중...")

            for name in json_entries:
                try:
                    d = json.loads(z.read(name))
                except Exception:
                    continue

                mtype = d.get("music_type_info", {})
                ann   = d.get("annotation_data_info", {})
                src   = d.get("music_source_info", {})

                inst_cd    = mtype.get("instrument_cd", "")
                instrument = INSTRUMENT_MAP.get(inst_cd, "")
                if not instrument:
                    continue
                if filter_instrument and instrument != filter_instrument:
                    continue

                beat_cd = ann.get("gukak_beat_cd", "")
                if beat_cd not in BEAT_MAP:
                    continue
                jangdan = BEAT_MAP[beat_cd]

                # 중중모리: 곡명에 '중중모리' 포함 여부 체크
                if beat_cd == "DQ0403":
                    music_nm = src.get("music_nm_kor", "")
                    if "중중모리" not in music_nm:
                        continue

                mode_cd = ann.get("mode_cd", "")
                jo = _resolve_jo(mode_cd, inst_cd)
                if not jo:
                    continue

                file_id = src.get("music_src_nm", "")
                if not file_id:
                    continue

                key = (instrument, jo, jangdan)
                if len(candidates[key]) < max_per_combo:
                    candidates[key].append(file_id)

    return dict(candidates)


def extract_wavs(file_ids: List[str], output_dir: str) -> int:
    needed = set(file_ids)
    extracted = 0
    os.makedirs(output_dir, exist_ok=True)

    for wzip in WAV_ZIPS:
        if not os.path.exists(wzip) or not needed:
            continue
        with zipfile.ZipFile(wzip, "r") as z:
            members = {
                os.path.splitext(os.path.basename(n))[0]: n
                for n in z.namelist()
                if n.lower().endswith(".wav")
            }
            for fid in list(needed):
                zname = members.get(fid)
                if not zname:
                    continue
                dest = os.path.join(output_dir, fid + ".wav")
                if not os.path.exists(dest):
                    with z.open(zname) as src_f, open(dest, "wb") as dst_f:
                        dst_f.write(src_f.read())
                needed.discard(fid)
                extracted += 1

    return extracted


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="AIHub 가야금/대금 WAV 추출")
    parser.add_argument("--instrument", choices=["가야금", "대금"], help="특정 악기만 추출")
    parser.add_argument("--max-per-combo", type=int, default=30, help="조합당 최대 파일 수")
    parser.add_argument("--output", default="AI/data_instruments", help="출력 디렉토리")
    args = parser.parse_args()

    print("[1/3] 라벨 수집 중...")
    combo_files = collect_labels(args.max_per_combo, args.instrument)

    if not combo_files:
        print("[ERROR] 수집된 파일 없음. AIHub ZIP 경로를 확인하세요.")
        return

    print(f"\n발견된 조합 ({len(combo_files)}개):")
    for (inst, jo, jd), fids in sorted(combo_files.items()):
        print(f"  {inst}/{jo}/{jd}: {len(fids)}개")

    print("\n[2/3] WAV 추출 중 (시간이 걸립니다)...")
    total = 0
    summary = []
    for (instrument, jo, jangdan), file_ids in sorted(combo_files.items()):
        out_dir = os.path.join(args.output, instrument, jo, jangdan)
        count = extract_wavs(file_ids, out_dir)
        total += count
        summary.append((instrument, jo, jangdan, count))
        print(f"  [OK] {instrument}/{jo}/{jangdan}: {count}개 → {out_dir}")

    print("\n[3/3] 완료 요약")
    print("=" * 60)
    print(f"{'악기':<8}{'조':<8}{'장단':<10}{'파일 수':>6}")
    print("-" * 60)
    for inst, jo, jd, cnt in summary:
        print(f"{inst:<8}{jo:<8}{jd:<10}{cnt:>6}")
    print("-" * 60)
    print(f"총 {total}개 WAV 추출 완료 → {args.output}")
    print(f"\n다음: python AI/train_pitch_markov.py --data-dir {args.output}")


if __name__ == "__main__":
    main()
