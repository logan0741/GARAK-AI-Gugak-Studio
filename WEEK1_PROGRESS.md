# RYUL — 1주차 진행상황 보고

**팀명:** HANTONE  
**공모전:** 문화체육관광부 AI·데이터 활용 공모전  
**앱명:** RYUL (율)  
**보고일:** 2026-06-10  
**담당:** AI / 백엔드 개발

---

## 1. 프로젝트 개요

### 앱 컨셉
스마트폰으로 한국 전통 국악기(가야금·장구·대금)를 직접 연주하고,  
AI가 실시간으로 반주를 생성하며 연주 피드백을 제공하는 모바일 앱

### 핵심 차별점
| 기능 | 내용 |
|------|------|
| 가상 악기 연주 | 터치 → 10ms 이하 레이턴시 소리 재생 |
| AI 반주 생성 | 마르코프 체인으로 장단에 맞는 반주 자동 생성 |
| 연주 분석 | 조(평조/계면조)·장단(8종) 자동 감지 |
| AI 피드백 | Claude API로 맞춤 연주 지도 텍스트 생성 |

---

## 2. 1주차 완료 내역

### 2-1. 개발 환경 구성
- Python 의존성 관리 (`requirements.txt` — AI/백엔드 분리)
- 환경변수 설정 (`.env` — Google OAuth, DB, Claude API Key)
- `.gitignore` 설정 (WAV 학습 데이터, 모델 .pkl 파일 제외)

### 2-2. AI 파이프라인 구현 (5개 모듈)

```
WAV 음원
  ↓ onset_detection.py    → 타격 타임스탬프 추출 (librosa)
  ↓ clustering.py         → DTW + k-medoids 클러스터링 (16패턴)
  ↓ markov_builder.py     → Laplace smoothing 전이행렬 생성
  ↓ train_markov.py       → 조×장단별 .pkl 모델 저장
  ↓ export_segments.py    → 마디 단위 WAV 세그먼트 추출
```

추가 도구:
- `separate_ensemble.py` — Demucs로 합주 음원에서 장구 트랙 분리
- `extract_aihub.py` — AIHub ZIP에서 조×장단별 WAV 선별 추출

### 2-3. 학습 데이터 수집

| 출처 | 내용 | 파일 수 |
|------|------|---------|
| 국립국악원 공개 프레이즈 | 닐리리야, 도라지, 아리랑 등 민요 | 22개 |
| 가야금 산조 음원 | 가야금 산조 WAV + Demucs 분리 | 4개 |
| AIHub 국악 악보 및 음원 데이터 | 민속악 + 풍류음악 (ZIP에서 선별) | 290개 |

### 2-4. 학습 결과

**총 16개 모델 (8 장단 × 2 조) — 완성도 100%**

| 조 | 굿거리 | 세마치 | 자진모리 | 진양조 | 중모리 | 중중모리 | 엇모리 | 휘모리 |
|----|:------:|:------:|:-------:|:------:|:------:|:-------:|:------:|:------:|
| 평조 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 계면조 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

- 학습 데이터: 조합당 평균 18개 WAV
- 패턴 수: 조합당 16개 클러스터
- **세그먼트 총계: 649개** (반주 생성용 마디 단위 오디오)

### 2-5. 백엔드 API 구현 (FastAPI)

| 엔드포인트 | 메서드 | 기능 | 상태 |
|-----------|--------|------|------|
| `/api/accompaniment` | POST | 마르코프 체인 반주 생성 (비동기 Job) | ✅ 완성 |
| `/api/accompaniment/status/{id}` | GET | 반주 생성 Job 상태 조회 | ✅ 완성 |
| `/api/accompaniment/available` | GET | 사용 가능한 모델 목록 | ✅ 완성 |
| `/api/analyze` | POST | 탭 이벤트로 조·장단 자동 감지 | ✅ 완성 |
| `/api/feedback` | POST | Claude API 연주 피드백 생성 | ✅ 완성 |

---

## 3. 기술 스택 요약

### AI / 데이터 처리
| 라이브러리 | 역할 |
|-----------|------|
| librosa | 오디오 로드, 온셋 감지, BPM 추정 |
| dtaidistance | DTW(동적 시간 왜곡) 거리 계산 |
| scikit-learn-extra | k-medoids 클러스터링 |
| numpy | 전이행렬, 벡터 연산 |
| soundfile | WAV 세그먼트 읽기/쓰기 |
| demucs | 합주 음원에서 장구 트랙 분리 |

### 백엔드
| 라이브러리 | 역할 |
|-----------|------|
| FastAPI | REST API 서버 |
| uvicorn | ASGI 서버 |
| anthropic | Claude API (연주 피드백 텍스트) |
| google-auth | Google ID 토큰 검증 |
| SQLAlchemy + aiomysql | DB ORM (다음 주 작업) |

---

## 4. 핵심 알고리즘 설명

### 마르코프 체인 반주 생성
```
학습: IOI 패턴 → DTW k-medoids 클러스터링 → 16개 패턴 ID
      패턴 시퀀스 → Laplace smoothing 전이행렬

추론: temperature 파라미터로 다양성 조절
      softmax(log(p) / T) → 다음 패턴 샘플링 → 세그먼트 조합
```

### 조·장단 감지 (/api/analyze)
```
조(調) 감지:
  MIDI 노트 → 12차원 pitch class 히스토그램
  → 평조/계면조 스케일 템플릿 12종 전조 비교 (코사인 유사도)

장단 감지:
  탭 타임스탬프 → IOI 배열 (ms)
  → DTW 거리: 입력 IOI vs 16개 학습 medoid 패턴
  → 최소 거리 장단 반환
```

### Claude AI 피드백 (/api/feedback)
```
입력: 조, 장단, 정확도 점수
→ Claude Haiku 프롬프트 (국악 교사 페르소나)
→ 칭찬 + 개선점 + 다음 연습 방향 (2~3문장)
→ 한국어/영어 지원
```

---

## 5. 반주 생성 흐름 (전체)

```
[프론트] 사용자 연주 탭 이벤트
    ↓
POST /api/analyze
→ 조·장단 자동 감지 + BPM 추출
    ↓
POST /api/accompaniment { jo, jangdan, bpm, bars }
→ job_id 즉시 반환 (비동기)
    ↓
GET /api/accompaniment/status/{job_id}
→ 마르코프 패턴 시퀀스 생성
→ 세그먼트 선택 + 크로스페이드 조합
→ audio_url 반환
    ↓
[프론트] 반주 오디오 스트리밍 재생
    ↓
POST /api/feedback { jo, jangdan, accuracy }
→ Claude API 피드백 텍스트 표시
```

---

## 6. 데이터 폴더 구조

```
AI/
├── data/               국립국악원 원본 데이터 (평조 4개 장단)
├── data_aihub/         AIHub 선별 데이터 (16개 조합, 290 WAV)
├── models/             학습된 .pkl 파일 (16개)
└── segments/           반주용 마디 오디오 (649개)

back/
├── main.py             FastAPI 앱 진입점
├── routers/            accompaniment / analyze / feedback
├── services/           MarkovService / AnalyzeService / AudioService / JobManager
└── middleware/         Google 인증 (개발 모드 bypass 지원)
```

---

## 7. 2주차 계획

| 우선순위 | 작업 | 담당 |
|---------|------|------|
| 1 | 단음 샘플 슬라이싱 (국립국악원 monotone WAV → 1~2초 단음) | AI |
| 2 | DB 연동 (SQLAlchemy + MySQL — Track 업로드/조회) | 백엔드 |
| 3 | `/api/tracks/upload` 녹음 파일 업로드 엔드포인트 | 백엔드 |
| 4 | `/api/share` 공유 링크 생성 엔드포인트 | 백엔드 |
| 5 | 프론트 가야금 UI + 소리 연동 | 프론트 |
| 6 | 실제 CLAUDE_API_KEY 설정 후 feedback 통합 테스트 | AI |

---

## 8. 현재 미완성 항목 및 제약

| 항목 | 내용 |
|------|------|
| 조 감지 정확도 | 평조/계면조는 전조 시 pitch class가 동일 → 히스토그램만으로 구분 한계. 프론트에서 조 직접 선택 UI 보완 권장 |
| 평조_중중모리 | 학습 데이터 3개 (AIHub에 해당 데이터 부족) |
| Claude API 키 | 실제 키 설정 전까지 /api/feedback 503 오류 |
| DB 미연동 | Track 업로드/조회 엔드포인트 미구현 (2주차) |
| 프론트 미연동 | 백엔드 API 개발 완료, 프론트 연동 대기 중 |
