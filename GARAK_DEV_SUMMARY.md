# GARAK — AI GUGAK STUDIO 개발 완료 보고서

> 문화체육관광부 AI·데이터 활용 공모전 출품작  
> 팀: GDG | 최종 개발 완료: 2026-07-03

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [모노레포 구조](#3-모노레포-구조)
4. [프런트엔드 아키텍처](#4-프런트엔드-아키텍처)
5. [백엔드 API 명세](#5-백엔드-api-명세)
6. [AI 파이프라인](#6-ai-파이프라인)
7. [오디오 샘플 시스템](#7-오디오-샘플-시스템)
8. [개발 완료 항목 전체 이력](#8-개발-완료-항목-전체-이력)
9. [실행 방법](#9-실행-방법)
10. [환경변수 레퍼런스](#10-환경변수-레퍼런스)

---

## 1. 프로젝트 개요

**GARAK**은 국악 입문자를 위한 AI 기반 모바일 국악 창작 스튜디오입니다.

| 항목 | 내용 |
|------|------|
| 공식 명칭 | GARAK — AI GUGAK STUDIO |
| 플랫폼 | iOS / Android (Expo) |
| MVP 악기 | 가야금(12현), 장구, 대금 |
| AI 기능 | 조·장단 자동 감지, 마르코프 체인 반주 생성, Claude 연습 피드백 |
| 데이터 | 국립국악원 공공데이터 기반 단음 샘플·AI 훈련 데이터 |

### 핵심 플로우

```
사용자 연주(터치) → PerformanceEvent 스트림
        ↓
  AI 분석 (조·장단·BPM 감지)
        ↓
  장단 프리셋 추천 → 사용자 미리듣기·수락
        ↓
  Claude API 연습 피드백 생성
        ↓
  세션 저장 / 공유
```

---

## 2. 기술 스택

| 레이어 | 기술 |
|--------|------|
| 모바일 앱 | Expo (React Native), TypeScript |
| 오디오 엔진 | expo-audio (녹음), react-native-audio-api (저지연 재생 <10ms) |
| 상태관리 | 순수 함수형 Reducer (`applyProductAction`) + Effect 시스템 |
| 백엔드 | FastAPI (Python 3.8), Uvicorn |
| DB | MySQL + SQLAlchemy 2.x (async), Alembic 마이그레이션 |
| AI/ML | librosa, scikit-learn, DTW (조·장단 감지), Markov Chain (반주 생성) |
| LLM | Anthropic Claude API (연습 피드백) |
| 인증 | Google OAuth + JWT (RS256) |
| 번역 | Google Translate API (AI 생성 텍스트 런타임 번역) |
| 테스트 | Vitest (프런트), pytest + pytest-asyncio (백엔드) |

---

## 3. 모노레포 구조

```
GARAK-AI-Gugak-Studio/
├── front/                  # Expo 모바일 앱
│   └── src/
│       ├── domain/         # PerformanceEvent, Session, SampleManifest 등 핵심 도메인 타입
│       ├── product/        # 앱 상태머신 + 모든 화면 컨텐츠 컴포넌트
│       ├── screen-flow/    # 화면 FSM (S01–S23)
│       ├── studio/         # Work/Track/Take 데이터 모델
│       ├── audio/          # 샘플러 엔진 (ExpoAudio / RNAA 구현)
│       ├── interaction/    # 터치·제스처 → PerformanceEvent 변환
│       └── prototype/      # QA 도구, 세션 리플레이, 핸드오프
│
├── back/                   # FastAPI 백엔드 (AI 중심)
│   ├── main.py             # 앱 진입점, 라이프사이클, static 파일 서빙
│   ├── routers/            # API 라우터 (analyze, accompaniment, feedback, generate, recordings)
│   ├── services/           # 비즈니스 로직 (AnalyzeService, MarkovService, FeedbackService 등)
│   ├── schemas/            # Pydantic 요청·응답 스키마
│   ├── middleware/         # JWT 인증 미들웨어
│   ├── static/
│   │   └── samples/        # 단음 WAV 파일 (가야금 12개, 장구 4개, 대금 12개)
│   ├── app/                # SQLAlchemy ORM 레이어 (구 백엔드 — 세션 영속성)
│   │   ├── models/         # ORM 모델 (Session, PerformanceEvent, Recording 등)
│   │   ├── repositories/   # 비동기 DB 쿼리
│   │   └── alembic/        # DB 마이그레이션
│   └── tests_api/          # API 단위 테스트 (pytest)
│
└── AI/
    ├── pipeline/
    │   ├── 00_ingestion/   # 데이터 수집·정리
    │   ├── 01_preprocessing/  # 오디오 전처리 (librosa)
    │   ├── 02_training/    # Markov 모델 훈련 → .pkl
    │   └── 03_runtime/     # 런타임 서비스 (AnalyzeService, MarkovService)
    └── models/             # 훈련된 .pkl 모델 파일 (조·장단 × 16조합)
```

---

## 4. 프런트엔드 아키텍처

### 화면 흐름 (Screen FSM)

```
S01 홈
 └─ S03 모드 선택
      ├─ 자유창작 모드
      │    ├─ S04 악기 선택 → S05 자유연주
      │    ├─ S07 레이어 에디터 → S08 반주 트랙
      │    └─ S09 장단 추천 결과
      └─ 연습 모드
           ├─ S13 곡 선택 → S14 연습 연주
           └─ S15 결과 · Claude 피드백
```

### 상태관리 패턴

```typescript
// 순수 함수형 — Zustand/Redux 라이브러리 미사용
GarakProductState  ──applyProductAction──>  GarakProductState
                   ──runGarakProductEffect─> GarakProductServices 호출
```

### 서비스 레이어

| 구현체 | 용도 |
|--------|------|
| `garakHttpProductServices.ts` | 실제 백엔드 HTTP 연동 |
| `createNoopGarakProductServices()` | 백엔드 없이 개발 시 no-op 스텁 |

### 오디오 샘플 시스템

`SampleAssetManifest` 포맷으로 stringIndex 1–12 → 서버 WAV URL 매핑:

```
String 1 (황, G3, 196Hz)  →  /static/samples/가야금/황.wav
String 2 (대, Ab3, 207Hz) →  /static/samples/가야금/대.wav
...
String 12 (응, B4, 494Hz) →  /static/samples/가야금/응.wav
```

`ExpoAudioSamplerEngine`이 앱 시작 시 12개 파일을 preload → 터치 발생 즉시 재생.

---

## 5. 백엔드 API 명세

### 활성 백엔드: `back/main.py` (AI 중심)

Base URL: `http://localhost:8000`  
인증: `Authorization: Bearer {JWT}` (개발: `BYPASS_AUTH=true`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | `/` | - | 헬스체크 + 로드된 모델 목록 |
| GET | `/health` | - | 단순 헬스체크 |
| POST | `/api/analyze` | 필요 | 연주 이벤트 → 조·장단·BPM 감지 |
| POST | `/api/accompaniment` | 필요 | 비동기 반주 생성 Job 생성 |
| GET | `/api/accompaniment/status/{job_id}` | 필요 | Job 상태 폴링 |
| POST | `/api/feedback` | 필요 | Claude API 연습 피드백 생성 |
| GET | `/api/generate/samples` | - | 단음 샘플 manifest 반환 |
| POST | `/api/generate/solo` | 필요 | 1악기 단독 음원 생성 (Job) |
| POST | `/api/generate/ensemble` | 필요 | 앙상블 음원 생성 (Job) |
| POST | `/api/recordings` | 필요 | 녹음 파일 업로드 |
| GET | `/api/recordings/{id}` | 필요 | 녹음 파일 다운로드 |
| GET | `/static/**` | - | WAV 파일 직접 서빙 |

### 주요 요청·응답 포맷

#### POST /api/analyze
```json
// 요청
{ "timestamps": [0.0, 0.5, 1.0], "notes": [55, 57, 60] }

// 응답
{
  "jo": "평조",
  "jangdan": "굿거리",
  "jo_confidence": 0.91,
  "jangdan_confidence": 0.84,
  "detected_bpm": 88.0,
  "ioi_ms": [500.0, 500.0]
}
```

#### POST /api/feedback
```json
// 요청
{ "jo": "평조", "jangdan": "굿거리", "accuracy": 0.78, "note_count": 42, "duration_sec": 30.5, "language": "ko" }

// 응답
{ "feedback": "장단 흐름이 안정적이에요. ...", "jo": "평조", "jangdan": "굿거리", "accuracy_pct": 78, "source": "claude" }
```

### 구 백엔드 ORM 레이어: `back/app/` (세션 영속성)

세션 저장·조회·공유 등 DB 관련 기능은 `back/app/api/` 라우터에서 처리. Alembic으로 MySQL 스키마 관리.

---

## 6. AI 파이프라인

### 조(調) 감지 — DTW 기반

```
입력: MIDI 음 목록
 ↓
코사인 유사도 + DTW (Dynamic Time Warping)
평조 스케일 템플릿 vs 계면조 스케일 템플릿 비교
 ↓
출력: "평조" | "계면조" + confidence
```

### 장단(長短) 감지 — IOI 분석

```
입력: 타임스탬프 배열 (초)
 ↓
IOI(Inter-Onset Interval) 추출 → BPM 추정
사전 훈련된 장단별 IOI 패턴과 DTW 비교 (9종)
 ↓
출력: 장단명 + confidence + detected_bpm
```

### 마르코프 반주 생성

```
훈련: AI/pipeline/02_training/train_markov.py
 → 16개 모델 (조 × 장단 조합) → .pkl 파일

런타임: POST /api/accompaniment
 → MarkovService.generate_pattern(jo, jangdan, bpm)
 → 장단 패턴 시퀀스 + WAV 합성 (단음 샘플 스티칭)
 → 비동기 Job (최대 30초 폴링)
```

### Claude 피드백

- `FeedbackService` → Anthropic Claude API 호출
- 연주 정확도·조·장단 정보 → 맞춤형 국악 연습 피드백
- 언어 파라미터 (`ko` / `en`) 지원 — 영어는 Google Translate API 경유

---

## 7. 오디오 샘플 시스템

### 가야금 12현 율명 매핑

| 현(String) | 율명 | 근사 음고 | MIDI | 파일 |
|-----------|------|----------|------|------|
| 1 | 황(黃) | G3, 196Hz | 55 | 황.wav |
| 2 | 대(大) | Ab3, 208Hz | 56 | 대.wav |
| 3 | 태(太) | A3, 220Hz | 57 | 태.wav |
| 4 | 협(夾) | Bb3, 233Hz | 58 | 협.wav |
| 5 | 고(姑) | B3, 247Hz | 59 | 고.wav |
| 6 | 중(仲) | C4, 262Hz | 60 | 중.wav |
| 7 | 유(蕤) | D4, 294Hz | 62 | 유.wav |
| 8 | 임(林) | E4, 330Hz | 64 | 임.wav |
| 9 | 이(夷) | F4, 349Hz | 65 | 이.wav |
| 10 | 남(南) | G4, 392Hz | 67 | 남.wav |
| 11 | 무(無) | A4, 440Hz | 69 | 무.wav |
| 12 | 응(應) | B4, 494Hz | 71 | 응.wav |

파일 위치: `back/static/samples/가야금/` (서버 서빙) + `back/static/samples/장구/` + `back/static/samples/대금/`

---

## 8. 개발 완료 항목 전체 이력

### 프런트엔드

| 항목 | 파일 | 내용 |
|------|------|------|
| API 포맷 통일 | `garakHttpProductServices.ts` | `AnalyzeResponse` 타입을 실제 백엔드 응답 포맷에 맞게 수정 |
| 반주 추천 개선 | `garakHttpProductServices.ts` | `/api/accompaniment` 불필요 호출 제거 — `/api/analyze`만으로 presetId·BPM 매핑 완결 |
| 피드백 API 연동 | `garakHttpProductServices.ts` | 요청 필드 (`accuracy`, `language`, `jo`, `jangdan`) 및 응답 필드 (`feedback`) 교정 |
| 장단 이름 매핑 | `garakHttpProductServices.ts` | 백엔드 한국어 장단명 → 프런트 presetId (`세마치`→`semachi` 등) |
| 폴링 버그 수정 | `garakHttpProductServices.ts` | Job 상태 `'error'` → `'failed'` 오타 수정 |
| MIDI 매핑 교정 | `garakHttpProductServices.ts` | 잘못된 D4~E6 범위 → 실제 12율 G3(55)~B4(71) |
| 단음 샘플 연결 | `productionSampleManifest.ts` (신규) | 서버 WAV 파일 기반 `SampleAssetManifest` 생성 |
| 샘플 교체 | `productSampleReadinessConfig.ts` | dev 합성음 → 국립국악원 단음 파일로 교체 |
| 테스트 동기화 | `garakHttpProductServices.test.ts` | 구 API 포맷 기반 테스트 전면 재작성 |

### 백엔드

| 항목 | 파일 | 내용 |
|------|------|------|
| 비동기 래핑 | `routers/analyze.py` | CPU 블로킹 DTW 호출을 `loop.run_in_executor()` 로 래핑 (Python 3.8 호환) |
| selectinload 적용 | `app/repositories/session_repo.py` | `events` + `recordings` + `jangdan_recommendations` 관계 eager load |
| Python 3.8 호환 | `app/models/*.py` (9개 파일) | `X \| None` → `Optional[X]`, `list[X]` → `List[X]`, `from __future__ import annotations` 추가 |
| Python 3.8 호환 | `app/core/config.py` | `list[str]` → `List[str]`, `models_dir`/`segments_dir` 필드 추가 |
| 모델 임포트 수정 | `app/models/__init__.py` | `DataReferenceManifest`, `DataReference` 누락 임포트 추가 (Alembic autogenerate 오탐 방지) |
| Alembic 정리 | `alembic/versions/` | 잘못 생성된 빈 migration 파일 2개 삭제, DB ↔ 모델 동기화 확인 |

### 백엔드 API 테스트 (신규)

| 파일 | 테스트 수 | 커버리지 |
|------|----------|----------|
| `tests_api/conftest.py` | - | FastAPI 테스트 앱 + 서비스 Mock 픽스처 |
| `tests_api/test_analyze_api.py` | 6 | `/api/analyze` 전체 케이스 |
| `tests_api/test_accompaniment_api.py` | 7 | `/api/accompaniment` + 상태 폴링 |
| `tests_api/test_feedback_api.py` | 6 | `/api/feedback` 전체 케이스 |

### 최종 테스트 결과

```
프런트엔드 (Vitest):  70 파일, 654 테스트 — 전체 통과
백엔드   (pytest):   19 테스트           — 전체 통과
타입 검사 (tsc):     오류 없음
```

---

## 9. 실행 방법

### 백엔드 (FastAPI)

```bash
cd back
cp .env.example .env       # DB_URL, CLAUDE_API_KEY 등 설정
pip install -r requirements.txt
uvicorn main:app --reload  # http://localhost:8000
```

개발 시 인증 우회:
```bash
BYPASS_AUTH=true uvicorn main:app --reload
```

API 문서: `http://localhost:8000/docs`

### 프런트엔드 (Expo)

```bash
cd front
cp .env.example .env       # EXPO_PUBLIC_API_BASE_URL 설정
npm install
npm start                  # Expo Metro 서버
npm run android            # Android 실행
npm run ios                # iOS 실행
npm test                   # 단위 테스트
npm run typecheck          # 타입 검사
```

Android 에뮬레이터 접속 시 `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000` 사용.

### AI 모델 훈련

```bash
cd AI
pip install -r requirements.txt
python pipeline/02_training/train_markov.py   # → AI/models/*.pkl
```

---

## 10. 환경변수 레퍼런스

### 백엔드 (`back/.env`)

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `DB_URL` | 필수 | - | `mysql+aiomysql://user:pw@host/gukak` |
| `CLAUDE_API_KEY` | 필수 | - | Anthropic API 키 |
| `GOOGLE_CLIENT_ID` | 권장 | - | Google OAuth 클라이언트 ID |
| `JWT_SECRET_KEY` | 권장 | `dev-secret-key` | JWT 서명 키 (배포 시 반드시 교체) |
| `SERVER_BASE_URL` | - | `http://localhost:8000` | 오디오 파일 URL 프리픽스 |
| `MODELS_DIR` | - | `../AI/models` | Markov .pkl 파일 경로 |
| `SEGMENTS_DIR` | - | `../AI/segments` | 세그먼트 데이터 경로 |
| `SAMPLES_DIR` | - | `../back/static/samples` | 단음 WAV 샘플 경로 |
| `BYPASS_AUTH` | - | `false` | `true` 시 JWT 검증 건너뜀 (개발용) |

### 프런트엔드 (`front/.env`)

| 변수 | 필수 | 설명 |
|------|------|------|
| `EXPO_PUBLIC_API_BASE_URL` | 필수 | 백엔드 URL (Android: `http://10.0.2.2:8000`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | 권장 | Google 로그인용 OAuth 클라이언트 ID |

---

*GARAK — AI GUGAK STUDIO | GDG Team | 2026*
