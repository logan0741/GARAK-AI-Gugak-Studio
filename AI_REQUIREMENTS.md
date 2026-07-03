# AI 요구사항 정의서

## 1. 문서 목적

GARAK AI Gugak Studio의 AI 영역에서 제공해야 하는 기능, 입력/출력 데이터, 백엔드 연동 조건, 운영 파이프라인을 정의한다. 이 문서는 현재 코드 구조(`AI/pipeline`, `back/routers`, `back/services`)를 기준으로 작성한다.

## 2. AI 기능 범위

AI 기능은 다음 5개 영역으로 구분한다.

| 영역 | 목적 | 주요 위치 |
| --- | --- | --- |
| 데이터 수집 | 국악 API/AIHub/악기 샘플 데이터 확보 | `AI/pipeline/00_ingestion` |
| 전처리 | 녹음/음원 정규화, 마디 분할, 음/타격 샘플 추출 | `AI/pipeline/01_preprocessing`, `back/core/audio_preprocessing.py` |
| 학습 | 장단 패턴 Markov, 음고 Markov, 세그먼트 export | `AI/pipeline/02_training` |
| 런타임 생성 | 독주 생성, 앙상블/이어치기 생성, 반주 생성 | `AI/pipeline/03_runtime`, `back/services` |
| 분석/피드백 | 조/장단/BPM 추정, 연주 피드백 생성 | `back/services/analyze_service.py`, `back/services/feedback_service.py` |

## 3. 사용자 관점 주요 기능

### FR-AI-01. 연주 녹음 전처리

- 사용자가 업로드한 오디오를 AI 입력용으로 정규화해야 한다.
- 지원 확장자: `wav`, `wave`, `m4a`, `mp3`, `aac`.
- 입력 메타데이터:
  - `session_id`
  - `instrument`
  - `bpm`
  - `beats_per_bar`
  - `jangdan`
  - `jo`
  - `first_bar_offset_s`
  - `expected_bars`
- 처리 결과:
  - 원본 오디오 URL
  - 정규화 오디오 URL
  - 마디 정렬 오디오 URL
  - 마디별 오디오 URL 목록
  - AI 입력용 manifest
- API:
  - `POST /api/recordings/preprocess`

### FR-AI-02. BPM과 마디 박자 변환

- AI는 BPM과 `beats_per_bar`를 함께 받아 시간 기반 연주 데이터를 마디 단위로 해석해야 한다.
- 예시:
  - 4/4 계열: `beats_per_bar=4`
  - 중모리/자진모리 등 국악 장단: 코드상 장단별 beat 수 사용
- 현재 장단 preset은 주로 국악 장단 기준이다.
  - 12박: 중모리, 중중모리, 자진모리, 굿거리, 휘모리
  - 9박: 세마치
  - 6박: 엇모리, 엇중모리, 진양조
- 프런트는 사용자가 선택한 박자 정보를 `bpm`과 `beats_per_bar`로 확정해서 백엔드에 전달해야 한다.

### FR-AI-03. 조/장단/BPM 분석

- 사용자의 note timestamp 배열과 선택적으로 MIDI note 배열을 받아 조, 장단, BPM을 추정해야 한다.
- 조 분석은 note pitch histogram 기반으로 수행한다.
- 장단 분석은 timestamp의 IOI 배열과 학습된 Markov medoid 패턴을 비교해 수행한다.
- 출력:
  - `jo`
  - `jangdan`
  - `jo_confidence`
  - `jangdan_confidence`
  - `detected_bpm`
  - `ioi_ms`
- API:
  - `POST /api/analyze`

### FR-AI-04. 독주 음원 생성

- 악기, 조, 장단, 마디 수, BPM, temperature를 받아 1개 악기 독주 WAV를 생성해야 한다.
- pitch Markov 모델과 단음 샘플을 사용한다.
- 비동기 Job으로 실행하고, 상태 조회 API로 결과 URL을 받는다.
- API:
  - `POST /api/generate/solo`
  - `GET /api/generate/status/{job_id}`
  - `GET /api/generate/preview`

### FR-AI-05. 사용자의 연주를 기반으로 AI가 이어서 앙상블 생성

- 사용자가 연주한 note event 목록을 받아, 곡 흐름에 맞는 나머지 악기 파트를 생성해야 한다.
- 입력 event 형식:
  - `pitch`: MIDI note number
  - `timestamp`: 초 단위 발생 시점
- 입력:
  - `events`
  - `source_instrument`
  - `jo`
  - `jangdan`
  - `bpm`
  - `temperature`
- 동작:
  - 사용자 연주 파트 렌더링
  - pitch Markov 기반 melody partner 생성
  - rhythm/segment 기반 rhythm partner 생성
  - 3트랙 믹싱 후 WAV 생성
- API:
  - `POST /api/generate/ensemble`
  - `GET /api/generate/status/{job_id}`
- 프런트 요구사항:
  - 사용자의 실시간 연주를 `pitch/timestamp` 이벤트로 누적해야 한다.
  - 사용자가 “AI 이어 만들기”를 누르면 현재까지의 이벤트와 선택된 조/장단/BPM을 전송해야 한다.

### FR-AI-06. 장단 기반 반주 생성

- 조, 장단, 마디 수, BPM, temperature를 받아 학습된 장단 패턴 기반 반주 WAV를 생성해야 한다.
- Markov transition matrix로 pattern sequence를 만들고, `AI/segments`의 마디 WAV를 조립한다.
- API:
  - `GET /api/accompaniment/available`
  - `POST /api/accompaniment`
  - `GET /api/accompaniment/status/{job_id}`

### FR-AI-07. 샘플 manifest 조회

- 런타임 생성에 사용할 악기별 단음 샘플 manifest를 조회할 수 있어야 한다.
- API:
  - `GET /api/generate/samples`
- manifest가 없으면 `AI/pipeline/00_ingestion/organize_samples.py`를 먼저 실행해야 한다.

### FR-AI-08. 피드백 생성

- 분석된 조, 장단, 정확도, note count, duration을 기반으로 사용자 피드백을 생성해야 한다.
- Claude API 연동이 없거나 실패할 경우 fallback 피드백을 제공해야 한다.
- API:
  - `POST /api/feedback`

## 4. 데이터 및 모델 요구사항

| 산출물 | 경로 | 용도 |
| --- | --- | --- |
| phrase WAV | `AI/data` | 장단/반주 Markov 학습 |
| instrument WAV | `AI/data_instruments` | pitch Markov 학습 |
| Markov model | `AI/models/*.pkl` | 장단 sequence 생성, 장단 분석 |
| pitch model | `AI/models/pitch_*.pkl` | 음고 sequence 생성 |
| segment WAV | `AI/segments` | 반주/리듬 트랙 조립 |
| runtime samples | `back/static/samples` | 독주/앙상블 렌더링 |
| generated audio | `back/static/generated` | API 결과 WAV 제공 |

## 5. AI 파이프라인 요구사항

### 5.1 데이터 수집

- 국악 phrase API에서 조/장단별 WAV를 수집한다.
- 단음 API 또는 phrase 추출을 통해 악기별 단음 샘플을 확보한다.
- AIHub 데이터는 보조 학습 데이터로 추출 가능해야 한다.

실행 위치:

- `AI/pipeline/00_ingestion/download_phrase_api.py`
- `AI/pipeline/00_ingestion/download_monotone_api.py`
- `AI/pipeline/00_ingestion/extract_aihub.py`
- `AI/pipeline/00_ingestion/extract_instruments.py`
- `AI/pipeline/00_ingestion/organize_samples.py`

### 5.2 전처리

- 원본 녹음은 RMS/peak 정규화, silence trim, fade, 마디 분할을 거쳐야 한다.
- 앙상블 음원은 Demucs 기반 분리를 통해 학습 가능한 WAV로 정리할 수 있어야 한다.
- phrase WAV에서 onset과 pitch를 감지해 악기별 단음 샘플을 추출할 수 있어야 한다.

실행 위치:

- `AI/pipeline/01_preprocessing/preprocess_recording.py`
- `AI/pipeline/01_preprocessing/separate_ensemble.py`
- `AI/pipeline/01_preprocessing/extract_notes_from_phrases.py`
- `AI/pipeline/01_preprocessing/extract_janggu_hits.py`

### 5.3 학습

- 장단 모델은 onset IOI 패턴을 clustering하고 Markov transition matrix로 저장해야 한다.
- pitch 모델은 pyin 기반 pitch class sequence를 학습하고 12x12 전이행렬로 저장해야 한다.
- 반주 생성을 위해 학습 모델과 원본 WAV를 연결한 segment를 export해야 한다.

실행 위치:

- `AI/pipeline/02_training/train_markov.py`
- `AI/pipeline/02_training/train_pitch_markov.py`
- `AI/pipeline/02_training/export_segments.py`

### 5.4 런타임

- 백엔드는 `AI/pipeline/03_runtime`만 직접 import한다.
- 런타임 폴더에는 API 다운로드, 대량 학습, 장시간 batch 작업을 넣지 않는다.
- 런타임 생성은 모델/샘플/세그먼트 artifact가 이미 준비되어 있다는 전제로 동작한다.

실행 위치:

- `AI/pipeline/03_runtime/pitch_markov.py`
- `AI/pipeline/03_runtime/solo_generator.py`
- `AI/pipeline/03_runtime/ensemble_generator.py`

## 6. API 연동 요약

| 기능 | Method | Endpoint | 인증 | 결과 |
| --- | --- | --- | --- | --- |
| 녹음 전처리 | POST | `/api/recordings/preprocess` | 필요 | 전처리 파일 URL, bars, stats |
| 조/장단 분석 | POST | `/api/analyze` | 필요 | 조/장단/BPM/confidence |
| 피드백 | POST | `/api/feedback` | 필요 | 피드백 문장 |
| 샘플 조회 | GET | `/api/generate/samples` | 없음 | 샘플 manifest |
| 독주 생성 | POST | `/api/generate/solo` | 필요 | job_id |
| 앙상블 생성 | POST | `/api/generate/ensemble` | 필요 | job_id |
| 생성 상태 | GET | `/api/generate/status/{job_id}` | 필요 | audio_url, meta, error |
| 미리듣기 생성 | GET | `/api/generate/preview` | 없음 | WAV stream |
| 반주 가능 모델 | GET | `/api/accompaniment/available` | 없음 | 조/장단 목록 |
| 반주 생성 | POST | `/api/accompaniment` | 필요 | job_id |
| 반주 상태 | GET | `/api/accompaniment/status/{job_id}` | 필요 | audio_url, pattern_sequence |

## 7. 프런트 연동 요구사항

- 녹음 시작 직전에 `bpm`, `beats_per_bar`, `instrument`, `jangdan`, `jo`를 확정해야 한다.
- 사용자의 연주는 로컬에서 `pitch/timestamp` 이벤트로 보존해야 한다.
- “AI 이어 만들기” 기능은 `/api/generate/ensemble`로 현재 이벤트 목록을 전송해야 한다.
- 단순 반주가 필요한 경우 `/api/accompaniment`를 사용한다.
- 독주 미리듣기나 기본 AI 생성은 `/api/generate/solo` 또는 `/api/generate/preview`를 사용한다.
- Job 기반 API는 생성 요청 후 status endpoint를 polling해야 한다.
- 생성 결과의 `audio_url`은 서버의 `/static/generated` 아래 파일을 가리킨다.

## 8. 운영 및 품질 요구사항

- 모델/세그먼트/샘플 artifact가 없는 경우 API는 명확한 준비 명령을 안내해야 한다.
- 생성 작업은 비동기 Job으로 처리해 API timeout을 방지해야 한다.
- `temperature`는 `0.0~2.0` 범위로 제한한다.
- `bpm`은 양수이며 API별 상한을 지켜야 한다.
- 생성 파일은 `back/static/generated`에 저장하고 URL로 반환한다.
- 학습/수집 파이프라인과 런타임 코드는 분리해 운영 중 의도치 않은 batch 실행을 방지한다.

## 9. 현재 확인된 주의사항

- 프런트가 사용자의 실제 연주를 AI 이어치기에 쓰려면 MIDI pitch와 timestamp event 변환 로직이 필요하다.
- 국악 장단 preset은 구현되어 있지만, 서양식 4/4 preset 이름은 별도 상수로 정리되어 있지 않다. 다만 전처리 API는 `beats_per_bar=4` 입력을 받을 수 있다.
- `/api/generate/ensemble`은 raw audio 자체가 아니라 note event 목록을 입력으로 받는다.
- 런타임 생성은 `AI/models`, `AI/segments`, `back/static/samples/manifest.json` 준비 상태에 의존한다.
- 현재 일부 기존 소스 파일의 한글 주석/문자열은 콘솔에서 깨져 보일 수 있으므로, 기능 설명 문서는 UTF-8 기준으로 유지한다.
