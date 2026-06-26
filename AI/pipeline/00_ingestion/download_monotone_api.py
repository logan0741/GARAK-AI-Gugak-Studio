# -*- coding: utf-8 -*-
"""
국립국악원 국악디지털음원 OpenAPI — 단음(monotone) 다운로더

단음 = 악기별로 각 음(율명)을 하나씩 녹음한 파일.
악구(phrase)와 다르게 합주가 아닌 솔로 단일음이라 샘플 플레이어에 바로 사용 가능.

Endpoint: https://apis.data.go.kr/1371034/monotonedataview2/view
  ※ phrasedataview2 패턴을 따름. 실제 Swagger 문서로 검증 필요.

사용법:
  python AI/pipeline/00_ingestion/download_monotone_api.py --discover           # 응답 필드 탐색
  python AI/pipeline/00_ingestion/download_monotone_api.py --instrument 대금   # 대금 단음 전체 다운로드
  python AI/pipeline/00_ingestion/download_monotone_api.py --instrument 가야금 --dry-run
  python AI/pipeline/00_ingestion/download_monotone_api.py --list-fields        # 첫 페이지 응답 필드명 출력

출력 위치: back/static/samples/{악기}/{율명}.wav
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

API_KEY = os.getenv("GUGAK_API_KEY", "")
WAV_TIMEOUT = 60

# 엔드포인트 후보 목록 (discover 시 순서대로 시도)
ENDPOINT_CANDIDATES = [
    "https://apis.data.go.kr/1371034/monotonedataview2/view",
    "https://apis.data.go.kr/1371034/monotonedataview/view",
    "https://apis.data.go.kr/1371034/monotoneDataView2/view",
]

# 악기별 율명 → pitch class 매핑 (국악 표준)
# 앱 organize_samples.py 의 PC_TO_YUL 과 동일 기준
YUL_PC = {
    "황": 7, "대": 8, "태": 9, "협": 10, "고": 11,
    "중": 0, "유": 1, "임": 2, "이": 3,  "남": 4, "무": 5, "응": 6,
    # 율명 약어 변형 처리
    "황종": 7, "태주": 9, "협종": 10, "고선": 11,
    "중려": 0, "유빈": 1, "임종": 2, "이칙": 3,
    "남려": 4, "무역": 5, "응종": 6,
}

# 대금 기본 음역 (관악기 특성상 복수 옥타브)
DAEGEUM_OCTAVES = ["하", "중", "상", "초과"]  # 하청/중청/상청/초청

# 출력 루트 (백엔드 정적 서빙 경로)
DEFAULT_OUTPUT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "back", "static", "samples")
)


# ── API 호출 헬퍼 ─────────────────────────────────────────────────────────────

def _build_url(endpoint: str, params: dict) -> str:
    """serviceKey 이중인코딩 방지를 위해 직접 조립."""
    qs_parts = [f"serviceKey={API_KEY}"]
    for k, v in params.items():
        if v is not None:
            qs_parts.append(f"{k}={requests.utils.quote(str(v))}")
    return f"{endpoint}?{'&'.join(qs_parts)}"


def _fetch_raw(endpoint: str, params: dict, timeout: int = 15) -> bytes:
    url = _build_url(endpoint, params)
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.content


def _parse_xml(content: bytes) -> tuple[list[dict], int]:
    """XML 파싱 → (items, totalCount)."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        raise ValueError(f"XML 파싱 실패: {e}\n내용: {content[:300]}")

    # 에러 응답 체크
    result_code = root.findtext(".//resultCode", "")
    result_msg  = root.findtext(".//resultMsg", "")
    if result_code and result_code != "00":
        raise ValueError(f"API 에러 [{result_code}]: {result_msg}")

    total = int(root.findtext(".//totalCount", "0"))
    items = [
        {child.tag: (child.text or "").strip() for child in item}
        for item in root.iter("item")
    ]
    return items, total


# ── 엔드포인트 탐색 ───────────────────────────────────────────────────────────

def discover_endpoint(verbose: bool = True) -> str | None:
    """
    ENDPOINT_CANDIDATES 를 순서대로 시도해서 동작하는 엔드포인트 반환.
    성공 시 엔드포인트 URL, 실패 시 None.
    """
    for ep in ENDPOINT_CANDIDATES:
        params = {"pageNo": 1, "numOfRows": 1}
        try:
            content = _fetch_raw(ep, params)
            items, total = _parse_xml(content)
            if verbose:
                print(f"  [OK] 엔드포인트 확인: {ep}")
                print(f"       totalCount={total}")
                if items:
                    print(f"       응답 필드: {sorted(items[0].keys())}")
            return ep
        except Exception as e:
            if verbose:
                print(f"  [FAIL] {ep} → {type(e).__name__}: {e}")
    return None


def list_fields(endpoint: str, instrument_nm: str | None = None) -> None:
    """첫 페이지 응답의 모든 필드명과 샘플값 출력."""
    params: dict = {"pageNo": 1, "numOfRows": 3}
    if instrument_nm:
        params["instrument_nm"] = instrument_nm

    try:
        content = _fetch_raw(endpoint, params)
        items, total = _parse_xml(content)
    except Exception as e:
        print(f"[ERROR] {e}")
        return

    print(f"총 {total}개 항목")
    if not items:
        print("항목 없음")
        return
    for i, item in enumerate(items):
        print(f"\n── 항목 {i+1} ──")
        for k, v in sorted(item.items()):
            preview = v[:80] if len(v) > 80 else v
            print(f"  {k}: {preview}")


# ── 단음 수집 ─────────────────────────────────────────────────────────────────

def _extract_yul(item: dict) -> str | None:
    """
    item dict에서 율명(pitch name)을 추출.
    실제 필드명은 API 응답 확인 후 조정 필요.
    후보 필드: pitch_nm, yul_nm, note_nm, pitch, yul
    """
    for field in ("pitch_nm", "yul_nm", "note_nm", "pitch", "yul", "음높이"):
        val = item.get(field, "").strip()
        if val:
            # 긴 이름 → 짧은 율명 변환 (황종 → 황 등)
            for full, short in [
                ("황종", "황"), ("태주", "태"), ("협종", "협"), ("고선", "고"),
                ("중려", "중"), ("유빈", "유"), ("임종", "임"), ("이칙", "이"),
                ("남려", "남"), ("무역", "무"), ("응종", "응"), ("대려", "대"),
            ]:
                val = val.replace(full, short)
            # 공백, 옥타브 표시 제거 (예: "황 (중청)" → "황")
            val = val.split()[0].strip()
            if val in YUL_PC:
                return val
    return None


def _fetch_page(
    endpoint: str,
    instrument_nm: str | None,
    page: int,
    rows: int = 100,
) -> tuple[list[dict], int]:
    params: dict = {"pageNo": page, "numOfRows": rows}
    if instrument_nm:
        params["instrument_nm"] = instrument_nm
    content = _fetch_raw(endpoint, params)
    return _parse_xml(content)


def collect_monotone(
    endpoint: str,
    instrument_nm: str,
    max_per_yul: int = 3,
) -> dict[str, list[dict]]:
    """
    율명 → [item, ...] 딕셔너리 수집.
    max_per_yul: 율명당 최대 파일 수 (음질 선택용).
    """
    by_yul: dict[str, list[dict]] = {}
    page = 1

    while True:
        try:
            items, total = _fetch_page(endpoint, instrument_nm, page)
        except Exception as e:
            print(f"  [WARN] 페이지 {page} 실패: {e}")
            break

        if not items:
            break

        for it in items:
            wav = it.get("wav_file_path", "").strip()
            if not wav:
                continue
            yul = _extract_yul(it)
            if yul is None:
                # 율명 필드를 못 찾으면 item 전체 출력 (첫 번째만)
                if page == 1 and len(by_yul) == 0:
                    print(f"  [DEBUG] 율명 필드 미발견. item 키: {sorted(it.keys())}")
                continue
            if yul not in by_yul:
                by_yul[yul] = []
            if len(by_yul[yul]) < max_per_yul:
                by_yul[yul].append(it)

        print(f"  페이지 {page}/{(total // 100) + 1}: {len(items)}개 파싱, "
              f"율명 {len(by_yul)}종 수집")
        if page * 100 >= total:
            break
        page += 1
        time.sleep(0.1)

    return by_yul


# ── WAV 다운로드 ──────────────────────────────────────────────────────────────

def download_wav(url: str, dest: str) -> bool:
    try:
        r = requests.get(url, timeout=WAV_TIMEOUT)
        r.raise_for_status()
        if len(r.content) < 1000:
            print(f"    [WARN] 파일 너무 작음 ({len(r.content)}B): {url}")
            return False
        with open(dest, "wb") as f:
            f.write(r.content)
        return True
    except Exception as e:
        print(f"    [WARN] 다운로드 실패: {e}")
        return False


# ── 메인 실행 ─────────────────────────────────────────────────────────────────

def run(
    instrument_nm: str,
    output_dir: str,
    endpoint: str,
    dry_run: bool = False,
    max_per_yul: int = 3,
) -> None:
    print(f"\n[{instrument_nm}] 단음 다운로드 시작")
    print(f"  엔드포인트: {endpoint}")

    by_yul = collect_monotone(endpoint, instrument_nm, max_per_yul)

    if not by_yul:
        print(f"  [WARN] 수집된 항목 없음. instrument_nm='{instrument_nm}' 값을 확인하세요.")
        print("  → --list-fields 옵션으로 실제 필드명/값 확인 권장")
        return

    print(f"\n수집 결과: {len(by_yul)}개 율명")
    for yul, items in sorted(by_yul.items()):
        print(f"  {yul}: {len(items)}개 후보")

    if dry_run:
        print("\n[DRY-RUN] 다운로드 생략")
        return

    inst_dir = os.path.join(output_dir, instrument_nm)
    os.makedirs(inst_dir, exist_ok=True)

    saved = 0
    for yul, items in sorted(by_yul.items()):
        # 첫 번째 후보만 저장 (가장 먼저 나온 것)
        dest = os.path.join(inst_dir, f"{yul}.wav")
        if os.path.exists(dest):
            print(f"  [SKIP] {yul}.wav 이미 존재")
            saved += 1
            continue
        wav_url = items[0].get("wav_file_path", "")
        if not wav_url:
            continue
        if download_wav(wav_url, dest):
            print(f"  [OK] {yul}.wav ← {wav_url[:80]}")
            saved += 1
            time.sleep(0.2)

    print(f"\n완료: {saved}개 저장 → {inst_dir}")

    # manifest.json 업데이트
    _update_manifest(output_dir, instrument_nm)


def _update_manifest(output_dir: str, instrument_nm: str) -> None:
    """back/static/samples/manifest.json 에 악기 항목 추가/갱신."""
    import json
    manifest_path = os.path.join(output_dir, "manifest.json")
    manifest: dict = {}
    if os.path.isfile(manifest_path):
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

    inst_dir = os.path.join(output_dir, instrument_nm)
    manifest[instrument_nm] = {
        p.stem: f"/static/samples/{instrument_nm}/{p.name}"
        for p in sorted(Path(inst_dir).glob("*.wav"))
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"manifest 업데이트: {manifest_path}")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="국악원 단음(monotone) WAV 다운로더")
    parser.add_argument("--instrument", default="대금",
                        help="악기명 (대금/가야금/해금/장구 등, 기본: 대금)")
    parser.add_argument("--output",    default=DEFAULT_OUTPUT,
                        help="출력 루트 디렉토리 (기본: back/static/samples)")
    parser.add_argument("--max-per-yul", type=int, default=1,
                        help="율명당 저장 파일 수 (기본: 1)")
    parser.add_argument("--dry-run",   action="store_true",
                        help="API 조회만 하고 다운로드 안 함")
    parser.add_argument("--discover",  action="store_true",
                        help="동작하는 엔드포인트 자동 탐색")
    parser.add_argument("--list-fields", action="store_true",
                        help="첫 페이지 응답 필드명 출력 (파라미터 확인용)")
    parser.add_argument("--endpoint",  default=None,
                        help="엔드포인트 URL 직접 지정 (기본: 자동 탐색)")
    args = parser.parse_args()

    if not API_KEY:
        print("[ERROR] .env 에 GUGAK_API_KEY 가 없습니다.")
        print("  .env 파일에 GUGAK_API_KEY=발급받은키 를 추가하세요.")
        sys.exit(1)

    # 엔드포인트 결정
    endpoint = args.endpoint
    if endpoint is None:
        print("[1/3] 동작 엔드포인트 탐색 중...")
        endpoint = discover_endpoint()
        if endpoint is None:
            print("[ERROR] 동작하는 엔드포인트를 찾지 못했습니다.")
            print("  가능한 원인:")
            print("  1. API KEY 가 이 서비스에 미승인 상태")
            print("  2. 엔드포인트 경로명이 다름 → --endpoint 로 직접 지정")
            print(f"  현재 시도한 경로: {ENDPOINT_CANDIDATES}")
            sys.exit(1)

    if args.list_fields:
        print(f"\n[필드 탐색] {endpoint}")
        list_fields(endpoint, args.instrument)
        return

    if args.discover:
        return  # discover_endpoint 에서 이미 출력

    run(
        instrument_nm=args.instrument,
        output_dir=os.path.abspath(args.output),
        endpoint=endpoint,
        dry_run=args.dry_run,
        max_per_yul=args.max_per_yul,
    )


if __name__ == "__main__":
    main()
