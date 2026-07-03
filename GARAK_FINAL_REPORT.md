# GARAK — AI GUGAK STUDIO
### 문화체육관광부 AI·데이터 활용 공모전 최종 개발 보고서

---

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [전체 시스템 구조도](#2-전체-시스템-구조도)
3. [데이터 플로우](#3-데이터-플로우)
4. [유스케이스 다이어그램](#4-유스케이스-다이어그램)
5. [화면 플로우](#5-화면-플로우)
6. [AI 파이프라인](#6-ai-파이프라인)
7. [개발 완료 항목](#7-개발-완료-항목)
8. [가야금 12율 샘플 매핑](#8-가야금-12율-샘플-매핑)
9. [실행 방법](#9-실행-방법)
10. [환경 변수](#10-환경-변수)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **앱 이름** | GARAK (가락) — AI GUGAK STUDIO |
| **공모전** | 문화체육관광부 AI·데이터 활용 공모전 |
| **핵심 가치** | 국악 대중화 · 전통문화 디지털화 · AI 접목 |
| **주요 악기** | 산조가야금 12현, 장구 (궁·덕·따·합), 대금 12음 |
| **AI 기능** | 조(調) 감지, 장단 추천, 마르코프 체인 반주 생성 |
| **플랫폼** | iOS / Android (Expo React Native) |
| **백엔드** | FastAPI + MySQL |
| **AI 모듈** | Python (librosa, sklearn, DTW, 마르코프 체인) |

---

## 2. 전체 시스템 구조도

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GARAK 모노레포 구조                          │
│                                                                     │
│  ┌────────────────┐    ┌─────────────────┐    ┌──────────────────┐  │
│  │   front/       │    │    back/         │    │     AI/          │  │
│  │  (Expo RN)     │    │  (FastAPI)       │    │  (Python ML)     │  │
│  │                │    │                  │    │                  │  │
│  │ ┌────────────┐ │    │ ┌──────────────┐ │    │ ┌──────────────┐ │  │
│  │ │  domain/   │ │    │ │   api/       │ │    │ │  pipeline/   │ │  │
│  │ │PerformEvt  │ │    │ │  /analyze    │ │    │ │ 00_ingestion │ │  │
│  │ │ SampleMnft │ │    │ │  /accomp     │ │    │ │ 01_preproc   │ │  │
│  │ │ ReplayPlan │ │    │ │  /sessions   │ │    │ │ 02_training  │ │  │
│  │ └────────────┘ │    │ │  /share      │ │    │ └──────────────┘ │  │
│  │                │    │ │  /instruments│ │    │                  │  │
│  │ ┌────────────┐ │    │ │  /feedback   │ │    │ ┌──────────────┐ │  │
│  │ │ product/   │ │    │ └──────────────┘ │    │ │   models/    │ │  │
│  │ │ GarakState │ │    │                  │    │ │ 41개 .pkl    │ │  │
│  │ │ GarakEffct │◄├────┤ ┌──────────────┐ │◄───┤ │(8장단×조×악기│ │  │
│  │ │ GarakSvc   │ │HTTP│ │  services/   │ │    │ └──────────────┘ │  │
│  │ └────────────┘ │    │ │ ai_client.py │ │    │                  │  │
│  │                │    │ │ claude_client│ │    │ ┌──────────────┐ │  │
│  │ ┌────────────┐ │    │ └──────────────┘ │    │ │  segments/   │ │  │
│  │ │screen-flow/│ │    │                  │    │ │ IOI 학습데이터│ │  │
│  │ │ S01↔S23   │ │    │ ┌──────────────┐ │    │ └──────────────┘ │  │
│  │ └────────────┘ │    │ │   models/    │ │    └──────────────────┘  │
│  │                │    │ │ Session      │ │                          │
│  │ ┌────────────┐ │    │ │ PerfEvent    │ │                          │
│  │ │  audio/    │ │    │ │ Recording    │ │                          │
│  │ │ RNAA engine│ │    │ │ JangdanRec   │ │                          │
│  │ │ <10ms 응답 │ │    │ └──────────────┘ │                          │
│  │ └────────────┘ │    │                  │                          │
│  │                │    │ ┌──────────────┐ │                          │
│  │ ┌────────────┐ │    │ │static/samples│ │                          │
│  │ │ studio/    │ │    │ │ 가야금 12wav  │ │                          │
│  │ │ Work/Track │ │    │ │ 장구 4wav    │ │                          │
│  │ │ Take/Export│ │    │ │ 대금 12wav   │ │                          │
│  │ └────────────┘ │    │ └──────────────┘ │                          │
│  └────────────────┘    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 프론트엔드 레이어 구조

```
GarakAuthEntryApp (진입점)
│
├── createRuntimeGarakProductServices  ← 프로덕션 서비스 합성
│   ├── createHttpGarakProductServices ← FastAPI 백엔드 연동
│   └── createLocalGarakProductServices ← 로컬 저장소 / 오디오 엔진
│
└── GarakScreenFlowApp (메인 앱)
    ├── GarakProductState  ← Redux-스타일 순수 함수 상태 머신
    ├── applyProductAction ← 리듀서 (불변 상태 전환)
    ├── runGarakProductEffect ← 비동기 사이드이펙트 처리기
    └── Screen Components  ← S01 ~ S23 화면 컴포넌트
```

---

## 3. 데이터 플로우

### 3-1. 자유 창작 모드 — 연주 → AI 분석 → 장단 추천

```
사용자 터치
    │
    ▼
GestureMapper (interaction/)
    │  PerformanceEvent 변환
    ▼
appendFreePlayPerformanceEvents (action)
    │
    ▼
GarakProductState.pendingFreePlayTake.events[]
    │  completePerformance 액션
    ▼
Take → Track → Work (studio/)
    │
    ▼
recommendAccompaniment (GarakProductEffects)
    │  HTTP POST /api/analyze
    ▼
FastAPI analyze endpoint
    │
    ├── ai_client.analyze_key(events)
    │       │
    │       ▼
    │   DTW 거리 계산 (librosa)
    │   vs 평조/계면조 스케일 템플릿
    │   → 조(調) + confidence 반환
    │
    └── ai_client.analyze_jangdan(events)
            │
            ▼
        IOI(Inter-Onset-Interval) 추출
        마르코프 모델 스코어링 (41개 .pkl)
        → 장단 + BPM + density 반환
    │
    ▼
AccompanimentRecommendation {
  presetId: '자진모리' | '중모리' | '세마치',
  bpm: number,
  volume: 0.72,
  reason: 'AI가 XX(XX)을(를) 감지했습니다.'
}
    │
    ▼
GarakProductState.autoAccompanimentStatus = 'ready'
사용자에게 장단 프리셋 추천 제안 (자동 적용 없음)
```

### 3-2. 오디오 샘플 로딩 플로우

```
앱 시작
    │
    ▼
productSampleReadinessConfig.ts
PRODUCT_SAMPLE_MANIFESTS = {
  gayageum: productionGayageumSampleManifest
}
    │
    ▼
productionGayageumSampleManifest (12개 에셋)
[
  { id: 'gayageum-황', stringIndex: 1, pitchHz: 196.0,
    fileUri: '{API_BASE}/static/samples/가야금/황.wav' },
  ...
  { id: 'gayageum-응', stringIndex: 12, pitchHz: 493.88,
    fileUri: '{API_BASE}/static/samples/가야금/응.wav' }
]
    │
    ▼
ExpoAudioSamplerEngine.loadManifest()
    │  downloadAudioSource({uri}) per asset
    ▼
AudioContext (react-native-audio-api)
GainNode → Speaker

사용자 터치 → string_pluck 이벤트 → 해당 GainNode 트리거 → <10ms 응답
```

### 3-3. 연습 모드 — 피드백 플로우

```
곡 선택 (S13) → 악기 선택 (S14) → 연습 연주 (S15)
    │
    ▼
PracticeAttempt {
  guideEvents: PracticeGuideEvent[],  ← 정답 이벤트 시퀀스
  inputEvents: PerformanceEvent[],    ← 사용자 입력
  timingErrorsMs: number[]            ← 타이밍 오차 (ms)
}
    │  finishPractice 액션
    ▼
evaluatePracticeResult()
    │  정확도, BPM 일치도, 리듬 안정성 계산
    ▼
buildPracticeResultFeedback()
    │
    ▼
S16 연습 결과 화면
  ├── 점수 시각화
  ├── 타이밍 오차 분포 그래프
  └── AI 피드백 텍스트 (practiceAiFeedback)
```

### 3-4. 라이브러리 저장 / 로드 플로우

```
saveCurrentWork (action)
    │
    ▼
runGarakProductEffect → library.saveSnapshot()
    │
    ├── [토큰 있음] PUT {API}/library/snapshot
    │       ├── 성공 → workSaveStatus = 'saved'
    │       └── 실패 → localGarakProductServices.saveSnapshot()
    │                   (AuthStoragePort localStorage)
    │
    └── [토큰 없음] localGarakProductServices.saveSnapshot()

앱 재시작 / loginAndLoadLibrary
    │
    ▼
GET {API}/library/snapshot
    ├── 성공 → replaceLibrarySnapshot(remote)
    └── 실패 → localGarakProductServices.loadSnapshot()
               (로컬 라이브러리로 폴백)
```

---

## 4. 유스케이스 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       GARAK 유스케이스 다이어그램                        │
│                                                                         │
│                                                                         │
│  ┌──────────┐                                                           │
│  │          │   UC-01 자유 창작 연주                                     │
│  │          ├──────────────────────────────────► (가야금 터치 연주)       │
│  │          │                                                           │
│  │          │   UC-02 AI 장단 추천                                       │
│  │          ├──────────────────────────────────► (분석 요청 → 장단 제안) │
│  │          │                                                           │
│  │          │   UC-03 반주 트랙 추가                                     │
│  │          ├──────────────────────────────────► (장단 프리셋 적용)       │
│  │          │                                                           │
│  │          │   UC-04 다중 트랙 편집                                     │
│  │          ├──────────────────────────────────► (레이어 에디터 S07)     │
│  │  일반    │                                                           │
│  │  사용자  │   UC-05 연습 모드                                          │
│  │          ├──────────────────────────────────► (곡 선택 → 연습 → 결과) │
│  │          │                                                           │
│  │          │   UC-06 연주 녹음 & 내보내기                               │
│  │          ├──────────────────────────────────► (AAC 녹음 → 파일 저장) │
│  │          │                                                           │
│  │          │   UC-07 공유                                              │
│  │          ├──────────────────────────────────► (공유 링크 생성 S17)   │
│  │          │                                                           │
│  │          │   UC-08 라이브러리 조회                                    │
│  │          ├──────────────────────────────────► (나의 작품 목록 S18)   │
│  └──────────┘                                                           │
│                                                                         │
│  ┌──────────┐                                                           │
│  │          │   UC-09 구글 로그인                                        │
│  │ 로그인   ├──────────────────────────────────► (Google OAuth S23)     │
│  │ 사용자   │                                                           │
│  │          │   UC-10 클라우드 동기화                                    │
│  │          ├──────────────────────────────────► (서버 라이브러리 동기화) │
│  └──────────┘                                                           │
│                                                                         │
│  ┌──────────┐                                                           │
│  │  AI      │   UC-11 조(調) 분석                                       │
│  │  시스템  ├──────────────────────────────────► (DTW 스케일 매칭)      │
│  │          │                                                           │
│  │          │   UC-12 장단 감지                                          │
│  │          ├──────────────────────────────────► (마르코프 IOI 분석)    │
│  │          │                                                           │
│  │          │   UC-13 반주 생성                                          │
│  │          ├──────────────────────────────────► (마르코프 패턴 생성)   │
│  └──────────┘                                                           │
│                                                                         │
│  ┌──────────┐                                                           │
│  │  Claude  │   UC-14 AI 연습 피드백                                    │
│  │   API    ├──────────────────────────────────► (자연어 연습 평가)     │
│  └──────────┘                                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 유스케이스 상세

| UC | 이름 | 주요 액터 | 사전조건 | 성공 시나리오 |
|----|------|-----------|----------|---------------|
| UC-01 | 자유 창작 연주 | 사용자 | 악기 선택 완료, 샘플 로드됨 | 가야금 터치 → PerformanceEvent → 오디오 재생(<10ms) |
| UC-02 | AI 장단 추천 | 사용자, AI | 2개 이상 연주 이벤트 | POST /analyze → 조/장단 결과 → 프리셋 추천 |
| UC-03 | 반주 트랙 추가 | 사용자 | 장단 추천 수신 | 사용자 확인 → addAccompanimentTrack → 반주 재생 |
| UC-04 | 다중 트랙 편집 | 사용자 | Work 생성됨 | S07 레이어 에디터 → 볼륨/뮤트/삭제 |
| UC-05 | 연습 모드 | 사용자 | 연습곡 선택 | 가이드 이벤트와 입력 비교 → 타이밍 오차 계산 → 점수 |
| UC-06 | 녹음 & 내보내기 | 사용자 | 연주 완료 | expo-audio AAC 녹음 → POST /api/audio-exports |
| UC-07 | 공유 | 사용자 | 녹음 또는 결과 존재 | POST /api/share → 공유 링크 생성 |
| UC-08 | 라이브러리 조회 | 사용자 | - | GET /api/sessions → Work 목록 표시 |
| UC-09 | 구글 로그인 | 사용자 | - | Google ID Token → POST /api/auth/google → JWT |
| UC-10 | 클라우드 동기화 | 로그인 사용자 | JWT 보유 | PUT /library/snapshot → 서버 저장 |
| UC-11 | 조 분석 | AI | 연주 이벤트 배열 | DTW(librosa) → 평조/계면조 + confidence |
| UC-12 | 장단 감지 | AI | 타임스탬프 배열 | IOI 추출 → 마르코프 스코어링 → 장단 + BPM |
| UC-13 | 반주 생성 | AI | 장단 모델 로드됨 | 마르코프 체인 → 리듬 패턴 시퀀스 |
| UC-14 | AI 피드백 | Claude API | 연습 완료 | 연주 데이터 → Anthropic API → 자연어 피드백 |

---

## 5. 화면 플로우

```
                        ┌─────────────────────────────────────────┐
                        │          S01 홈 (GARAK 메인화면)          │
                        │  [자유 창작] [연습하기] [라이브러리] [피드]  │
                        └──────┬──────────┬───────────────────────┘
                               │          │
              ┌────────────────┘          └──────────────┐
              ▼                                          ▼
   ┌──────────────────┐                      ┌──────────────────┐
   │ S03 모드 가이드   │                      │  S18 라이브러리   │
   └────────┬─────────┘                      │  (나의 작품 목록)  │
            │                                └──────────────────┘
            ▼
   ┌──────────────────┐       ┌─────────────────────────────────┐
   │  S04 악기 선택    │       │           연습 모드              │
   │ [가야금] [장구]   │       │                                  │
   │ [대금]           │       │  S13 연습곡 선택                  │
   └────────┬─────────┘       │      ↓                          │
            │                 │  S14 연습 악기 선택               │
            ▼                 │      ↓                          │
   ┌──────────────────┐       │  S15 연습 연주 (가이드 표시)      │
   │  S05 자유 연주    │       │      ↓                          │
   │  가야금 12현 UI   │       │  S16 연습 결과 & AI 피드백        │
   │  실시간 오디오    │       └─────────────────────────────────┘
   └────────┬─────────┘
            │ completePerformance
            ▼
   ┌──────────────────┐
   │  S07 레이어 에디터│  ←── 트랙 볼륨/뮤트/삭제
   │  Work 편집        │
   └──────┬───────────┘
          │
   ┌──────┴────────────────────────────────────────┐
   │                                               │
   ▼                                               ▼
S08 트랙 추가 선택                        S10A/S10B 반주 설정
   │ [악기 트랙] [반주 트랙]              AI 장단 추천 표시
   │                                    [프리셋 적용] [직접 설정]
   ▼
S09 추가 악기 녹음

   ─────── 공유 플로우 ───────
S17 공유 준비 → S20 공유 피드 → S21 공유 상세
S22 마이·설정 → S23 로그인 & 동기화
S02 언어 설정 (ko / en)
```

### 화면 ID 매핑

| 화면 ID | 이름 | 설명 |
|---------|------|------|
| S01 | Home | 진입점, 모드 선택 |
| S02 | Language Switch | 언어 설정 (ko/en) |
| S03 | Mode Guide | 자유창작 vs 연습 안내 |
| S04 | Instrument Select | 가야금/장구/대금 선택 |
| S04A | Future Instrument | 미지원 악기 안내 |
| S05 | Free Performance | 가야금 연주 메인 화면 |
| S07 | Track & Layer Edit | 다중 트랙 편집기 |
| S08 | Add Track | 트랙 추가 (악기/반주) |
| S09 | Record Extra Instrument | 추가 악기 녹음 |
| S10A | AI 반주 분석 중 | AI 장단 분석 로딩 |
| S10B | 반주 설정 | 장단 프리셋 선택/조정 |
| S13 | Practice Song Select | 연습곡 목록 |
| S14 | Practice Instrument Select | 연습 악기 선택 |
| S15 | Practice Performance | 가이드 연주 화면 |
| S16 | Practice Result | 결과 & AI 피드백 |
| S17 | Share Preparation | 공유 준비 |
| S18 | Library | 나의 작품 목록 |
| S19 | Recording Detail Player | 녹음 재생 상세 |
| S20 | Share Feed | 공유 피드 |
| S21 | Shared Recording Detail | 공유 상세 |
| S22 | My & Settings | 마이/설정 |
| S23 | Login & Library Sync | 로그인 & 동기화 |

---

## 6. AI 파이프라인

### 6-1. 전체 AI 파이프라인

```
공공데이터 (국악 단음 샘플, AI Hub 국악 데이터셋)
    │
    ▼
00_ingestion/ (데이터 수집)
├── download_monotone_api.py    ← 국립국악원 API 단음 다운로드
├── download_phrase_api.py      ← 악구 단위 다운로드
├── extract_aihub.py            ← AI Hub 국악 데이터셋 추출
├── extract_instruments.py      ← 악기별 분류
└── organize_samples.py         ← back/static/samples/ 정리
    │
    ▼
01_preprocessing/ (전처리)
├── audio_preprocess.py         ← 오디오 정규화, WAV 변환
├── extract_janggu_hits.py      ← 장구 타격음 세그멘테이션
├── extract_notes_from_phrases.py ← 악구에서 단음 추출
├── preprocess_recording.py     ← 녹음 데이터 전처리
└── separate_ensemble.py        ← Demucs 음원 분리
    │
    ▼
02_training/ (학습)
├── onset_detection.py          ← 발음 시점(onset) 검출 (librosa)
├── markov_builder.py           ← 마르코프 전이행렬 구축
├── train_markov.py             ← 장단별 IOI 마르코프 학습
└── train_pitch_markov.py       ← 조별 음고 마르코프 학습
    │
    ▼
AI/models/ (41개 .pkl 모델)
├── pitch_가야금_평조_자진모리.pkl
├── pitch_가야금_계면조_굿거리.pkl
├── ioi_자진모리.pkl
├── ioi_중모리.pkl
└── ... (8장단 × 2조 × 악기)
    │
    ▼
back/app/services/ai_client.py (런타임 추론)
```

### 6-2. 조(調) 감지 알고리즘

```
입력: PerformanceEvent[] (string_pluck 이벤트)
    │
    ▼
stringIndex → 12율 MIDI 번호 변환
(황=55, 대=56, 태=57, 협=58, 고=59, 중=60,
 유=62, 임=64, 이=65, 남=67, 무=69, 응=71)
    │
    ▼
음고 히스토그램 생성 (12 피치 클래스)
    │
    ▼
DTW 거리 계산 (librosa.sequence.dtw)
vs 평조 스케일 템플릿
vs 계면조 스케일 템플릿
    │
    ▼
argmin(거리) → 조 판별 + confidence 점수
```

### 6-3. 장단 감지 알고리즘

```
입력: timestamps[] (발음 시점, 초 단위)
    │
    ▼
IOI (Inter-Onset-Interval) 추출
    │
    ▼
각 장단 마르코프 모델과 로그 확률 비교
(자진모리, 굿거리, 중모리, 중중모리,
 휘모리, 엇모리, 엇중모리, 세마치, 진양조)
    │
    ▼
argmax(로그확률) → 장단 판별
BPM 추정 (IOI 중앙값 기반)
density 계산 (단위 시간당 발음 수)
```

---

## 7. 개발 완료 항목

### 프론트엔드

| 항목 | 상태 | 비고 |
|------|------|------|
| GarakProductState 상태 머신 | ✅ 완료 | 2484줄, 711개 테스트 통과 |
| GarakProductEffects 비동기 이펙트 | ✅ 완료 | 저장/내보내기/공유/반주 생성 |
| GarakProductServices 인터페이스 | ✅ 완료 | library/account/share/audio/ai |
| createHttpGarakProductServices | ✅ 완료 | FastAPI 백엔드 연동 |
| createRuntimeGarakProductServices | ✅ 완료 | 로컬 폴백 + HTTP 합성 |
| createLocalGarakProductServices | ✅ 완료 | 오프라인 로컬 스토리지 |
| productionGayageumSampleManifest | ✅ 완료 | 서버 WAV 파일 12율 매핑 |
| MIDI 매핑 수정 | ✅ 완료 | D4-E6(오류) → G3-B4(12율 정확) |
| 화면 플로우 S01-S23 | ✅ 완료 | FSM 기반 화면 전환 |
| 자유 창작 연주 UI | ✅ 완료 | 가야금 12현 터치 |
| 연습 모드 UI | ✅ 완료 | 가이드 이벤트 + 타이밍 오차 |
| 라이브러리 UI | ✅ 완료 | Work/ExportedAudio/PracticeResult |
| 공유 플로우 UI | ✅ 완료 | 링크 공유 |
| i18n (ko/en) | ✅ 완료 | react-i18next |
| TypeScript 타입 체크 | ✅ 0 에러 | strict mode |
| Vitest 테스트 | ✅ 711/711 통과 | |

### 백엔드

| 항목 | 상태 | 비고 |
|------|------|------|
| FastAPI 기본 구조 | ✅ 완료 | async SQLAlchemy |
| /api/analyze | ✅ 완료 | 조+장단 동시 분석 |
| /api/accompaniment | ✅ 완료 | 마르코프 반주 생성 |
| /api/sessions CRUD | ✅ 완료 | selectinload 이거 로딩 |
| /api/auth/google | ✅ 완료 | Google ID Token → JWT |
| /api/share | ✅ 완료 | 공유 링크 |
| /api/feedback | ✅ 완료 | Claude API 연동 |
| /api/instruments | ✅ 완료 | 악기 목록 + 샘플 매니페스트 |
| static/samples/ WAV 서빙 | ✅ 완료 | StaticFiles 마운트 |
| Alembic 마이그레이션 | ✅ 완료 | DataReference 모델 수정 |
| selectinload 최적화 | ✅ 완료 | N+1 쿼리 제거 |

### AI 파이프라인

| 항목 | 상태 | 비고 |
|------|------|------|
| 데이터 수집 파이프라인 | ✅ 완료 | 국악 데이터셋 |
| 전처리 파이프라인 | ✅ 완료 | 정규화, 세그멘테이션 |
| 조(調) 감지 모델 | ✅ 완료 | DTW + librosa |
| 장단 감지 모델 | ✅ 완료 | 마르코프 IOI |
| 마르코프 반주 생성 | ✅ 완료 | 41개 .pkl 모델 |
| 가야금 단음 WAV | ✅ 완료 | 12율 실제 녹음 파일 |
| 장구 단음 WAV | ✅ 완료 | 궁/덕/따/합 4종 |
| 대금 단음 WAV | ✅ 완료 | 12음 |

---

## 8. 가야금 12율 샘플 매핑

| # | 율명(律名) | 피치 | MIDI | WAV 파일 | 비고 |
|---|-----------|------|------|----------|------|
| 1 | 황(黃) | G3 | 55 | 가야금/황.wav | 최저음 |
| 2 | 대(大) | Ab3 | 56 | 가야금/대.wav | |
| 3 | 태(太) | A3 | 57 | 가야금/태.wav | |
| 4 | 협(夾) | Bb3 | 58 | 가야금/협.wav | |
| 5 | 고(姑) | B3 | 59 | 가야금/고.wav | |
| 6 | 중(仲) | C4 | 60 | 가야금/중.wav | 중간 C |
| 7 | 유(柔) | D4 | 62 | 가야금/유.wav | |
| 8 | 임(林) | E4 | 64 | 가야금/임.wav | |
| 9 | 이(夷) | F4 | 65 | 가야금/이.wav | |
| 10 | 남(南) | G4 | 67 | 가야금/남.wav | |
| 11 | 무(無) | A4 | 69 | 가야금/무.wav | A440 기준음 |
| 12 | 응(應) | B4 | 71 | 가야금/응.wav | 최고음 |

> **음원 출처**: 국립국악원 산조가야금 단음 샘플 (공공데이터 포털 국악 데이터 활용)  
> **참고**: 중/대/이/태는 녹음 길이 0.28~0.35초로 다소 짧으나 MVP 수준에서 사용 가능

### 장단 9종

| 장단 | 박자 | 빠르기 | 특징 |
|------|------|--------|------|
| 진양조 | 6/4박 | ♩=30~50 | 가장 느림, 정중 |
| 중모리 | 12/8박 | ♩=60~80 | 보통 빠르기 |
| 중중모리 | 12/8박 | ♩=80~100 | 중모리보다 빠름 |
| 자진모리 | 12/8박 | ♩=120~160 | 빠름, 활기참 |
| 휘모리 | 4/4박 | ♩=160+ | 매우 빠름 |
| 엇모리 | 10/8박 | ♩=100~130 | 5+5 불규칙 |
| 엇중모리 | 6/8박 | ♩=80~100 | 엇모리 계열 |
| 세마치 | 9/8박 | ♩=90~120 | 3+3+3 |
| 굿거리 | 12/8박 | ♩=80~100 | 흥겨움 |

---

## 9. 실행 방법

### 백엔드

```bash
# 환경 설정
cd back
cp .env.example .env   # DB_URL, CLAUDE_API_KEY 등 설정

# 서버 실행
uvicorn app.main:app --reload          # 개발
uvicorn app.main:app --host 0.0.0.0    # 배포

# 테스트
BYPASS_AUTH=true pytest
BYPASS_AUTH=true pytest tests/test_sessions.py
```

### 프론트엔드

```bash
cd front
npm install
npm start               # Expo Metro 서버
npm run android         # Android 빌드
npm run ios             # iOS 빌드
npm test                # Vitest 단위 테스트 (711개)
npm run typecheck       # TypeScript 타입 체크
```

### AI 모델 재훈련

```bash
cd AI
pip install -r requirements.txt
python pipeline/02_training/train_markov.py      # 장단 모델
python pipeline/02_training/train_pitch_markov.py  # 조 모델
```

---

## 10. 환경 변수

### 백엔드 (`back/.env`)

| 변수 | 예시 | 설명 |
|------|------|------|
| `DB_URL` | `mysql+aiomysql://root:pw@localhost/gukak` | MySQL 연결 |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google OAuth |
| `JWT_SECRET_KEY` | `strong-secret-key` | JWT 서명 키 |
| `JWT_EXPIRE_MINUTES` | `60` | 액세스 토큰 TTL |
| `CLAUDE_API_KEY` | `sk-ant-xxx` | Anthropic API |
| `BYPASS_AUTH` | `true` | 개발용 인증 우회 |
| `AI_MODULE_PATH` | `../AI` | AI 모듈 경로 |
| `MODELS_DIR` | `../AI/models` | .pkl 모델 경로 |
| `SERVER_BASE_URL` | `http://localhost:8000` | 파일 URL 기준 |

### 프론트엔드 (`front/.env`)

| 변수 | 예시 | 설명 |
|------|------|------|
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8000` | 백엔드 서버 URL |

---

## 기술 스택 요약

```
Frontend              Backend               AI
─────────────────     ─────────────────     ─────────────────
Expo (React Native)   FastAPI               Python 3.10+
TypeScript            SQLAlchemy (async)    librosa
react-native-audio-   MySQL                 scikit-learn
  api (저지연 오디오)  Alembic              numpy / scipy
expo-audio (녹음)     Pydantic v2           Demucs (분리)
Vitest (테스트)       JWT / Google OAuth    markov chain
react-i18next         Anthropic Claude API  DTW
                      StaticFiles (WAV)     IOI analysis
```

---

*Generated: 2026-07-04 | GARAK AI Gugak Studio Team | GDG Contest Submission*
