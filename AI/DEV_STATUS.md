# RYUL AI 개발 현황 (AI 파트)

> 최종 업데이트: 2026-06-13  
> 담당: 김건희 (AI 파트)

---

## 1. 전체 완료 현황

| 항목 | 상태 | 상세 |
|------|------|------|
| 훈련 데이터 수집 | ✅ 완료 | 국악원 API 306개 WAV |
| 마르코프 모델 학습 | ✅ 완료 | 16/16 모델 (8 장단 × 2 조) |
| 세그먼트 추출 | ✅ 완료 | 888개 마디 WAV |
| `/api/analyze` 엔드포인트 | ✅ 완료 | 조+장단 감지 |
| `/api/feedback` 엔드포인트 | ✅ 완료 | Claude API 연주 피드백 |
| `/api/accompaniment` 엔드포인트 | ✅ 완료 | 마르코프 반주 생성 |

---

## 2. 데이터 구조

### 2-1. 폴더 구조

```
AI/
├── data/                          ← 훈련용 원본 WAV (gitignore)
│   ├── 계면조/
│   │   ├── 중모리/    api_중모리_000.wav ~ 019.wav  (20개)
│   │   ├── 자진모리/  20개
│   │   ├── 굿거리/    20개
│   │   ├── 세마치/    20개
│   │   ├── 중중모리/  20개
│   │   ├── 휘모리/    20개
│   │   ├── 엇모리/    20개
│   │   └── 진양조/    20개    → 소계 160개
│   └── 평조/
│       ├── 중모리/    19개
│       ├── 자진모리/  21개
│       ├── 굿거리/    25개
│       ├── 세마치/    21개
│       ├── 중중모리/  15개
│       ├── 휘모리/    15개
│       ├── 엇모리/    15개
│       └── 진양조/    15개    → 소계 146개
│                               → 합계 306개
│
├── data_aihub/                    ← AIHub 원본 추출본 (gitignore, 초기 학습용)
│   └── {조}/{장단}/*.wav          290개 (국악원 API 데이터로 대체됨)
│
├── models/                        ← 학습된 마르코프 모델 (gitignore, 재생성 가능)
│   ├── 계면조_중모리.pkl
│   ├── 계면조_자진모리.pkl
│   ├── ...
│   └── 평조_진양조.pkl            → 16개 .pkl
│
├── segments/                      ← 반주용 마디 단위 오디오 (gitignore, 재생성 가능)
│   ├── 계면조_중모리/
│   │   ├── pattern_00/ seg_000.wav, seg_001.wav ...
│   │   ├── pattern_01/ ...
│   │   └── pattern_15/
│   └── ...                        → 16개 조합 × 최대 16개 패턴, 총 888개
│
├── clustering.py
├── download_phrase_api.py
├── export_segments.py
├── extract_aihub.py
├── markov_builder.py
├── onset_detection.py
├── separate_ensemble.py
├── train_markov.py
└── requirements.txt
```

### 2-2. 데이터 출처

| 출처 | 파일 수 | 특징 | 현재 사용 여부 |
|------|---------|------|----------------|
| **국립국악원 국악디지털음원 공공API** | 306개 | 전문 연주자 녹음, 장단/조 레이블 정확, 악구 단위(4~16마디) | **메인 훈련 데이터** |
| AIHub 국악 악보 및 음원 데이터셋 | 290개 | 전체 곡 녹음, JSON 레이블로 조/장단 식별, 민속악+풍류음악 | 초기 학습에 사용, 국악원 API 데이터로 대체됨 |

**국악원 API 파라미터:**
```
endpoint        : https://apis.data.go.kr/1371034/phrasedataview2/view
serviceKey      : URL에 직접 삽입 (params dict 사용 시 이중 인코딩 버그)
rhythm          : 장단명 (중모리, 자진모리, ...)
tranditional_key: 조명 (평조/계면조) ← 스펙 오타 그대로 사용
응답 형식       : XML / <wav_file_path> 필드에 실제 WAV URL
```

### 2-3. 학습 모델 파일 (.pkl) 내부 구조

```python
{
    "transition_matrix": np.ndarray,  # shape (N, N), N = 최대 16
    #   [i][j] = "패턴 i 다음에 패턴 j가 올 확률"
    #   행 합계 = 1.0 (Laplace smoothing α=1e-6 적용)

    "medoids":           np.ndarray,  # shape (N, L)
    #   각 패턴 클러스터의 대표 IOI 배열 (ms 단위)
    #   L = 해당 모델에서 가장 긴 마디 패턴의 길이

    "jo":        str,   # "평조" | "계면조"
    "jangdan":   str,   # "중모리" | "자진모리" | ...
    "n_patterns": int,  # 실제 클러스터 수 (≤ 16, 데이터 부족 시 감소)
    "created_at": str,  # ISO 8601 UTC 타임스탬프
}
```

### 2-4. 세그먼트 폴더 구조

```
segments/계면조_중모리/
├── pattern_00/
│   ├── seg_000.wav   ← 패턴 0에 해당하는 마디 오디오
│   └── seg_001.wav
├── pattern_01/
│   └── ...
└── pattern_15/
```

반주 생성 시 마르코프 체인이 `다음 패턴 ID`를 샘플링하면, 해당 `pattern_XX/` 폴더에서 WAV를 무작위 선택해 이어붙임.

### 2-5. 학습 모델 현황 (2026-06-13 기준)

훈련 데이터: 국립국악원 공공API (계면조 160개 + 평조 146개 = 306개)

| 모델명 | WAV 수 | 패턴 수 | 세그먼트 수 |
|--------|--------|---------|------------|
| 계면조_굿거리.pkl | 20 | 16 | 26 |
| 계면조_세마치.pkl | 20 | 16 | 61 |
| 계면조_자진모리.pkl | 20 | 16 | 24 |
| 계면조_진양조.pkl | 20 | 16 | 64 |
| 계면조_중모리.pkl | 20 | 16 | 29 |
| 계면조_중중모리.pkl | 20 | 16 | 22 |
| 계면조_엇모리.pkl | 20 | 16 | 44 |
| 계면조_휘모리.pkl | 20 | 16 | 23 |
| 평조_굿거리.pkl | 25 | 16 | 34 |
| 평조_세마치.pkl | 21 | 16 | 66 |
| 평조_자진모리.pkl | 21 | 16 | 26 |
| 평조_진양조.pkl | 15 | 16 | 52 |
| 평조_중모리.pkl | 19 | 16 | 53 |
| 평조_중중모리.pkl | 15 | 16 | 19 |
| 평조_엇모리.pkl | 15 | 16 | 31 |
| 평조_휘모리.pkl | 15 | 15 | 15 |
| **합계** | **306** | | **589** |

**완성도: 16/16 (100%)**

---

## 3. Python 파일별 역할

### download_phrase_api.py
국립국악원 공공API에서 훈련용 WAV를 내려받는 스크립트.

```
공공데이터포털 API (XML 메타데이터)
    → wav_file_path 추출
    → 국악원 서버에서 WAV 직접 다운로드
    → AI/data/{조}/{장단}/api_{장단}_{번호}.wav 저장
```

구현 포인트:
- `serviceKey`를 URL에 직접 삽입 (requests params= 사용 시 이미 인코딩된 키가 이중 인코딩되는 버그)
- 조 필터(`tranditional_key`) 결과 부족 시 필터 없이 같은 장단으로 보완 (`_collect_items`)
- 이미 다운로드된 파일은 건너뜀 (재실행 안전)

```bash
python AI/pipeline/00_ingestion/download_phrase_api.py              # 전체
python AI/pipeline/00_ingestion/download_phrase_api.py --jo 계면조  # 특정 조만
python AI/pipeline/00_ingestion/download_phrase_api.py --dry-run    # API 응답 확인만
```

---

### onset_detection.py
WAV → 음 시작 시점(onset) → IOI(Inter-Onset Interval, ms) 추출 라이브러리.

| 함수 | 입력 | 출력 |
|------|------|------|
| `extract_ioi(wav_path)` | WAV 경로 | 전체 파일의 IOI 배열 (ms) |
| `extract_bar_patterns(wav_path, beats_per_bar)` | WAV + 박자 수 | 마디별 IOI 배열 목록 |

내부 흐름:
```
librosa.load(mono, sr=22050)
    → onset_detect(backtrack=True)    # 음 시작 시점 배열
    → feature.rhythm.tempo            # BPM 추정
    → bar_duration = (60/BPM) × beats_per_bar
    → 마디 경계로 onset 분할
    → np.diff × 1000                  # IOI (ms)
    → 50ms 미만 제거 (노이즈 필터)
```

---

### clustering.py
마디별 IOI 패턴들을 DTW 거리 기반 k-medoids로 클러스터링.

| 함수 | 사용 시점 | 역할 |
|------|-----------|------|
| `build_pattern_db(patterns, n_clusters=16)` | 학습 시 | DTW 거리 행렬 → k-medoids → (labels, medoids) |
| `assign_pattern_id(ioi, medoids)` | 추론 시 | 입력 IOI ↔ 각 medoid DTW 거리 → argmin |

DTW k-medoids를 사용하는 이유:
- 리듬 패턴은 길이가 가변적이고 시간이 늘어나거나 줄어들 수 있어 유클리드 거리보다 DTW가 적합
- medoid는 실제 데이터 포인트이므로 centroid보다 해석 가능하고 반주 세그먼트로 직접 사용 가능

---

### markov_builder.py
패턴 ID 시퀀스로 전이 행렬을 만들고 저장.

```python
# 파일 경계는 넘지 않음 (각 파일이 독립된 시퀀스)
counts[current_pattern][next_pattern] += 1.0

# Laplace smoothing — 미관측 전이에도 0이 아닌 확률 부여 (dead-end 방지)
counts += 1e-6
transition_matrix = counts / counts.sum(axis=1, keepdims=True)  # 행 합 = 1
```

---

### train_markov.py
전체 학습 파이프라인 진입점.

```
AI/data/{조}/{장단}/*.wav
    ↓  extract_bar_patterns     마디별 IOI 추출
    ↓  build_pattern_db         DTW k-medoids 클러스터링
    ↓  build_transition_matrix  전이 횟수 → 확률 행렬
    ↓  save_model
AI/models/{조}_{장단}.pkl
```

```bash
python AI/pipeline/02_training/train_markov.py --data-dir AI/data --output-dir AI/models
python AI/pipeline/02_training/train_markov.py --jo 계면조 --jangdan 중모리  # 단일 조합
```

---

### export_segments.py
학습된 모델의 medoids로 각 마디를 패턴 ID에 따라 분류해 오디오 조각을 저장.

```
AI/models/{조}_{장단}.pkl  +  AI/data/{조}/{장단}/*.wav
    ↓  각 마디 IOI → assign_pattern_id → 패턴 ID
    ↓  해당 시간 구간 오디오 잘라내기 (soundfile)
AI/segments/{조}_{장단}/pattern_{ID:02d}/seg_{번호:03d}.wav
```

```bash
python AI/pipeline/02_training/export_segments.py --data-dir AI/data --segments-dir AI/segments
```

---

### extract_aihub.py
AIHub ZIP에서 조×장단 레이블을 읽어 WAV를 선별 추출 (현재는 국악원 API 데이터로 대체, 재실행 불필요).

- 라벨 JSON `gukak_beat_cd` → 장단명 (QN1202=중모리, DQ0404=자진모리 ...)
- `mode_cd`: MG* → 계면조, MF* → 평조
- 장르 우선순위: 기악(F02) > 산조(F01) > 풍류(E01) > 기타

---

### separate_ensemble.py
합주 음원에서 Demucs(딥러닝 음원 분리)로 장구 트랙만 분리. 향후 합주 음원을 추가 훈련 데이터로 쓸 때 사용.

```bash
python AI/pipeline/01_preprocessing/separate_ensemble.py --input AI/data_ensemble
```

---

## 4. 전체 학습 파이프라인

```
[1단계: 데이터 수집]
python AI/pipeline/00_ingestion/download_phrase_api.py
    공공데이터포털 XML API → wav_file_path 추출
    → 국악원 서버에서 WAV 다운로드
    → AI/data/{조}/{장단}/api_*.wav (306개)

[2단계: 모델 학습]
python AI/pipeline/02_training/train_markov.py --data-dir AI/data
    WAV 로드 (librosa, sr=22050)
    → onset_detect → BPM 추정 → 마디 경계 계산
    → 마디별 IOI(ms) 배열 추출
    → 전체 패턴 간 DTW 거리 행렬 계산
    → k-medoids(k=16) 클러스터링
    → 파일 순서대로 패턴 ID 시퀀스 생성
    → 전이 횟수 카운트 + Laplace smoothing → 확률 정규화
    → AI/models/{조}_{장단}.pkl (16개)

[3단계: 세그먼트 추출]
python AI/pipeline/02_training/export_segments.py
    pkl에서 medoids 로드
    → 각 WAV를 마디 단위로 자르며 패턴 ID 할당
    → AI/segments/{조}_{장단}/pattern_{ID}/seg_*.wav (888개)
```

---

## 5. 백엔드 API 연동

### `/api/analyze` — 조+장단 감지

```
POST body: { notes: [MIDI 번호], timestamps: [float, ...] }

[조 감지 — back/services/analyze_service.py]
notes → 12차원 pitch class histogram (0~11)
→ 평조 템플릿 [0,2,4,7,9] 12전위, 계면조 [0,3,5,7,10] 12전위와 cosine 유사도
→ 최대 유사도 조 선택

[장단 감지]
timestamps → IOI 배열 (ms)
→ 16개 pkl 모델의 medoids와 DTW 거리 계산
→ 최소 거리 모델의 장단 반환
```

한계: 평조 루트+3 전위 = 계면조 루트+0 → 피치 히스토그램만으로 구별 불가. 프론트에서 조 선택 UI 제공 권장.

### `/api/feedback` — 연주 피드백

```
POST body: { jo, jangdan, accuracy, notes, timestamps }
→ Claude API (claude-haiku-4-5-20251001) 호출
→ 한국어 피드백 텍스트 반환
```

### `/api/accompaniment` — 반주 생성

```
POST body: { jo, jangdan, n_bars, bpm }
→ pkl 로드
→ 현재 패턴에서 전이 행렬 확률 샘플링
→ 패턴 ID 시퀀스 생성
→ 각 패턴의 세그먼트 WAV 선택 + 이어붙이기 (3% crossfade)
→ 오디오 파일 URL 반환
```

---

## 6. 주요 하이퍼파라미터

| 파라미터 | 값 | 위치 | 의미 |
|---------|-----|------|------|
| `N_CLUSTERS` | 16 | train_markov.py | 패턴 클러스터 수 |
| `MIN_WAV_FILES` | 3 | train_markov.py | 학습 최소 WAV 수 |
| `LAPLACE_ALPHA` | 1e-6 | markov_builder.py | 0 확률 방지 스무딩 |
| `MIN_IOI_MS` | 50 | onset_detection.py | 노이즈 제거 임계값 |
| `crossfade_ratio` | 0.03 | accompaniment_service | 세그먼트 연결 크로스페이드 |

---

## 7. 장단별 박자 설정

| 장단 | beats_per_bar | 특징 |
|------|:---:|------|
| 중모리 | 12 | 기본 느린 장단 |
| 중중모리 | 12 | 중모리보다 약간 빠름 |
| 자진모리 | 12 | 빠른 3박 계열 |
| 굿거리 | 12 | 무속/민요 대표 장단 |
| 휘모리 | 12 | 매우 빠름 |
| 엇모리 | 6 | 5박 계열 (엇박) |
| 세마치 | 9 | 3박 × 3 |
| 진양조 | 6 | 가장 느린 장단 |

---

## 8. 환경변수

**AI/.env**
```
GUGAK_API_KEY=...    # 국립국악원 공공데이터 API 키 (URL 인코딩된 값)
```

**back/.env**
```
GOOGLE_CLIENT_ID=...
DB_URL=mysql+aiomysql://...
CLAUDE_API_KEY=...
SERVER_BASE_URL=http://localhost:8000
```

---

## 9. 남은 작업

- [ ] 단음 WAV 슬라이싱 (국악원 단음 음원 → 1~2초 단일 노트 WAV, 프론트 악기 연주용)
- [ ] back/ 담당자와 DB 스키마 + 업로드 엔드포인트 연동 확인
- [ ] 조 감지 개선 (현재 피치 히스토그램 한계 — 프론트 UI 조 선택으로 보완 예정)
- [ ] librosa 1.0 릴리즈 후 `beat.tempo` fallback 코드 제거
