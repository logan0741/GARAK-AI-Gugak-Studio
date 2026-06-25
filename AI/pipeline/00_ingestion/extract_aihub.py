# -*- coding: utf-8 -*-
"""
AIHub 국악 데이터셋에서 조×장단별 WAV 파일 선별 추출

사용법:
  python AI/pipeline/00_ingestion/extract_aihub.py
  python AI/pipeline/00_ingestion/extract_aihub.py --max-per-combo 30 --output AI/data_aihub
"""
from __future__ import annotations

import argparse
import os
import zipfile
import json
from collections import defaultdict
from typing import List, Tuple, Dict

AIHUB_BASE = r"C:\Users\logan\Downloads\209.국악 악보 및 음원 데이터\01-1.정식개방데이터\Training"
LABEL_ZIPS = [
    os.path.join(AIHUB_BASE, "02.라벨링데이터", "TL_전통국악_F_민속악.zip"),
    os.path.join(AIHUB_BASE, "02.라벨링데이터", "TL_전통국악_E_풍류음악.zip"),
]
WAV_ZIPS = [
    os.path.join(AIHUB_BASE, "01.원천데이터", "TS_전통국악_F_민속악.zip"),
    os.path.join(AIHUB_BASE, "01.원천데이터", "TS_전통국악_E_풍류음악.zip"),
]

# 장단 코드 → 장단명
BEAT_MAP: Dict[str, str] = {
    "QN1202": "중모리",
    "DQ0404": "자진모리",
    "DQ0405": "굿거리",
    "DQ0603": "진양조",
    "EN1001": "엇모리",
    "QN0401": "휘모리",
    "DQ0301": "세마치",
    "DQ0403": "중중모리",  # music_nm에 '중중모리' 포함된 것만 사용
}

# 조 코드 → 조명 (MG=계면조계열, MF=평조계열)
def resolve_jo(mode_cd: str) -> str:
    if mode_cd.startswith("MG"):
        return "계면조"
    if mode_cd.startswith("MF"):
        return "평조"
    return ""

# 장르 선호도 (기악/산조 > 풍류 > 민요 > 기타)
GENRE_PRIORITY = {"F02": 0, "F01": 1, "E01": 2, "E02": 3, "F06": 4, "F07": 5}


def collect_labels(max_per_combo: int) -> Dict[Tuple[str, str], List[str]]:
    """(조, 장단) → [file_id, ...] 딕셔너리 반환 (장르 우선순위 + 개수 제한)"""
    # {(jo, jangdan): [(priority, file_id), ...]}
    candidates: Dict[Tuple[str, str], List[Tuple[int, str]]] = defaultdict(list)

    for lzip in LABEL_ZIPS:
        if not os.path.exists(lzip):
            print(f"[WARN] 라벨 ZIP 없음: {lzip}")
            continue
        with zipfile.ZipFile(lzip, "r") as z:
            for name in z.namelist():
                if not name.endswith(".json"):
                    continue
                try:
                    d = json.loads(z.read(name))
                except Exception:
                    continue

                ann = d.get("annotation_data_info", {})
                src = d.get("music_source_info", {})
                mtype = d.get("music_type_info", {})

                beat_cd = ann.get("gukak_beat_cd", "")
                mode_cd = ann.get("mode_cd", "")
                file_id = src.get("music_src_nm", "")
                music_nm = src.get("music_nm_kor", "")
                genre_cd = mtype.get("music_genre_cd", "")

                if beat_cd not in BEAT_MAP or not file_id:
                    continue

                jangdan = BEAT_MAP[beat_cd]
                # DQ0403은 곡명에 '중중모리' 포함 여부로 필터
                if beat_cd == "DQ0403" and "중중모리" not in music_nm:
                    continue

                jo = resolve_jo(mode_cd)
                if not jo:
                    continue

                priority = GENRE_PRIORITY.get(genre_cd, 99)
                candidates[(jo, jangdan)].append((priority, file_id))

    # 장르 우선순위 정렬 후 상위 max_per_combo개 선택
    result: Dict[Tuple[str, str], List[str]] = {}
    for key, items in candidates.items():
        items.sort(key=lambda x: x[0])
        result[key] = [fid for _, fid in items[:max_per_combo]]

    return result


def extract_wavs(
    file_ids: List[str],
    wav_zips: List[str],
    output_dir: str,
) -> int:
    """WAV ZIP에서 file_ids에 해당하는 .wav 파일을 output_dir에 추출. 추출된 수 반환."""
    needed = set(file_ids)
    extracted = 0

    for wzip in wav_zips:
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
                if os.path.exists(dest):
                    needed.discard(fid)
                    extracted += 1
                    continue
                with z.open(zname) as src, open(dest, "wb") as dst:
                    dst.write(src.read())
                needed.discard(fid)
                extracted += 1

    return extracted


def main() -> None:
    parser = argparse.ArgumentParser(description="AIHub 국악 데이터 선별 추출")
    parser.add_argument("--max-per-combo", type=int, default=20,
                        help="조×장단 조합당 최대 파일 수 (기본 20)")
    parser.add_argument("--output", default="AI/data_aihub",
                        help="출력 디렉토리 (기본 AI/data_aihub)")
    args = parser.parse_args()

    print(f"[1/3] 라벨 수집 중 (조합당 최대 {args.max_per_combo}개)...")
    combo_files = collect_labels(args.max_per_combo)

    if not combo_files:
        print("[ERROR] 수집된 파일 없음. 라벨 ZIP 경로를 확인하세요.")
        return

    print(f"      → {len(combo_files)}개 조합 발견:")
    for (jo, jd), fids in sorted(combo_files.items()):
        print(f"        {jo}/{jd}: {len(fids)}개")

    print("\n[2/3] 폴더 생성 및 WAV 추출 중...")
    summary = []
    for (jo, jangdan), file_ids in sorted(combo_files.items()):
        out_dir = os.path.join(args.output, jo, jangdan)
        os.makedirs(out_dir, exist_ok=True)
        count = extract_wavs(file_ids, WAV_ZIPS, out_dir)
        summary.append((jo, jangdan, len(file_ids), count))
        print(f"  [OK] {jo}/{jangdan}: {count}/{len(file_ids)}개 추출 → {out_dir}")

    print("\n[3/3] 완료 요약")
    print("=" * 60)
    print(f"{'조':<8}{'장단':<10}{'선택':<6}{'추출':<6}")
    print("-" * 60)
    total = 0
    for jo, jd, sel, ext in summary:
        print(f"{jo:<8}{jd:<10}{sel:<6}{ext:<6}")
        total += ext
    print("-" * 60)
    print(f"총 {total}개 WAV 파일 → {args.output}")
    print()
    print("다음 단계:")
    print(f"  python AI/pipeline/02_training/train_markov.py --data-dir {args.output}")


if __name__ == "__main__":
    main()
