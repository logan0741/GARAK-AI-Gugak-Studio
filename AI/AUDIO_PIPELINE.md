# Audio Pipeline Contract

## 결론

현재 문제는 소리의 크기와 마디 경계가 녹음마다 달라서 AI 학습 입력이 흔들리는 것이다. 해결 기준은 다음과 같다.

1. 유저가 녹음을 시작하기 직전에 `bpm`, `beats_per_bar`, `jangdan`, 선택 악기를 확정한다.
2. 녹음이 끝나면 프론트는 `session`을 만든다. 이 시점에는 로컬 저장이 기본이다.
3. AI 생성, 서버 저장, 보관함 저장을 할 때만 서버로 오디오와 메타데이터를 보낸다.
4. 서버/AI는 원본 wav를 바로 학습하거나 생성에 쓰지 않고, 반드시 `AI/pipeline/01_preprocessing/preprocess_recording.py`를 거친 결과만 사용한다.

## 프론트에서 서버로 보내는 타이밍

권장안은 3번과 4번 중심이다.

| 상황 | 서버 전송 여부 | 이유 |
| --- | --- | --- |
| 녹음 버튼 종료, 세션 생성 | 기본은 전송하지 않음 | 빠른 UX와 로컬 편집을 우선한다. 단, 자동 백업 기능을 만들면 예외 가능 |
| AI에게 반주/편곡 요청 | 전송함 | AI 입력이 필요하므로 선택된 세션 또는 레이어 wav와 메타데이터를 보낸다 |
| 여러 세션을 로컬에서 편집 | 기본은 전송하지 않음 | 자르기, 이동, 볼륨 조정은 로컬에서 가능 |
| 여러 세션을 합쳐 곡 생성 | 전송함 | 보관함에 남길 최종 곡과 레이어 집합은 서버 저장 대상 |
| 보관함 저장 | 전송함 | 최종 곡, 레이어, 메타데이터를 재조회해야 한다 |

## Session Metadata

프론트는 녹음 직전에 아래 값을 확정해야 한다.

```json
{
  "session_id": "uuid-or-local-id",
  "instrument": "gayageum",
  "bpm": 96,
  "beats_per_bar": 12,
  "jangdan": "jajinmori",
  "jo": "pyeongjo",
  "first_bar_offset_s": 0.0,
  "expected_bars": 4
}
```

필수값:

| 필드 | 설명 |
| --- | --- |
| `session_id` | 세션 고유 ID |
| `instrument` | 유저가 선택한 악기 |
| `bpm` | 녹음 직전에 확정한 BPM |
| `beats_per_bar` | 한 마디의 박 수. 예: 자진모리 12, 세마치 9 |
| `first_bar_offset_s` | wav 시작점에서 첫 마디 시작까지의 초 단위 오프셋 |

권장값:

| 필드 | 설명 |
| --- | --- |
| `jangdan` | 장단명. 표준 BPM 추천 UI와 연결 |
| `jo` | 조 정보. 없으면 AI 분석값으로 보완 |
| `expected_bars` | 녹음 목표 마디 수. 있으면 부족한 마지막 마디를 패딩하고 초과분은 버림 |

## Preprocessing

새 전처리 CLI:

```bash
python AI/pipeline/01_preprocessing/preprocess_recording.py \
  --input path/to/recording.wav \
  --output-dir AI/preprocessed/session_001 \
  --session-id session_001 \
  --instrument gayageum \
  --bpm 96 \
  --beats-per-bar 12 \
  --jangdan jajinmori \
  --first-bar-offset 0.0 \
  --expected-bars 4
```

생성물:

| 파일 | 용도 |
| --- | --- |
| `{session_id}_normalized.wav` | 모노, 44.1kHz, RMS/peak 정규화된 전체 오디오 |
| `{session_id}_bars.wav` | 마디 단위로 정렬된 전체 오디오 |
| `bars/{session_id}_bar_001.wav` | 학습/생성에 쓰기 좋은 고정 길이 마디 wav |
| `{session_id}_manifest.json` | 메타데이터, 정규화 통계, 마디 분할 품질 지표 |

정규화 기준:

| 항목 | 기본값 |
| --- | --- |
| sample rate | 44100 Hz |
| channel | mono |
| target RMS | -20 dBFS |
| peak ceiling | 0.95 |
| silence trim | top_db 45 |
| fade | 양 끝 5 ms |

## AI Input

AI 반주/편곡 요청 시 서버가 받아야 하는 최소 구조:

```json
{
  "request_id": "uuid",
  "task": "generate_accompaniment",
  "sessions": [
    {
      "session_id": "session_001",
      "audio_file": "multipart-file-field-name",
      "instrument": "gayageum",
      "bpm": 96,
      "beats_per_bar": 12,
      "jangdan": "jajinmori",
      "jo": "pyeongjo",
      "first_bar_offset_s": 0.0,
      "expected_bars": 4
    }
  ],
  "output": {
    "format": "wav",
    "return_layers": true
  }
}
```

AI 서버는 요청을 받으면 먼저 전처리를 수행하고, `manifest.stats.kept_bars`가 1보다 작거나 마디 길이가 비정상인 파일은 거절해야 한다.

## AI Output

프론트가 받아야 하는 최소 구조:

```json
{
  "request_id": "uuid",
  "status": "done",
  "song_id": "optional-server-song-id",
  "bpm": 96,
  "beats_per_bar": 12,
  "jangdan": "jajinmori",
  "layers": [
    {
      "layer_id": "layer_janggu_001",
      "instrument": "janggu",
      "audio_url": "/static/generated/layer_janggu_001.wav",
      "start_bar": 0,
      "bars": 4,
      "volume": 0.8
    }
  ],
  "mix": {
    "audio_url": "/static/generated/song_mix.wav",
    "duration_s": 30.0
  }
}
```

## 학습 데이터 원칙

1. 학습 데이터도 유저 녹음과 같은 전처리기를 통과시킨다.
2. 자동 BPM 추정값만으로 마디를 자르지 않는다. 데이터셋 폴더나 manifest에서 `bpm`, `beats_per_bar`, `first_bar_offset_s`를 얻는다.
3. 메타데이터가 없는 기존 wav는 임시로 표준 BPM을 넣을 수 있지만, 학습 품질은 낮게 표시한다.
4. Markov, pitch, ensemble 생성기는 원본 wav가 아니라 `bars/*.wav`와 manifest를 입력으로 삼는다.

## 프론트 UX 결정

자유 연주 모드는 악기 선택 후 바로 진입한다. 다만 녹음을 누르면 녹음 직전 모달에서 아래 값을 확정한다.

| 값 | UI |
| --- | --- |
| 장단 | 선택값. 자진모리, 세마치 등 |
| BPM | 장단 표준 BPM을 기본값으로 제시하고 사용자가 조절 |
| 박자/마디 | 장단 선택 시 자동 입력, 필요 시 고급 설정에서 수정 |
| 녹음 마디 수 | 선택값. 없으면 녹음 길이에서 계산 |

이렇게 하면 유저는 단순 연주할 때 고민하지 않고, 녹음/AI 편집에 들어가는 순간부터 데이터 기준이 고정된다.
