# AI 고정값 제거 및 실제 모델 연결 검증

## 목적

이 문서는 AI 관련 코드에 남아 있던 stub, placeholder, hardcoded value 문제를 확인하고,
현재 코드가 실제 학습 모델과 사용자 이벤트 기반 로직으로 연결되어 있는지 검증하기 위한 문서다.

## 핵심 문제

기존 AI/프런트 일부 흐름에는 다음 문제가 있었다.

- 조 분석 결과가 항상 고정값으로 반환됨
- 장단/BPM 분석 결과가 실제 연주 이벤트와 무관하게 고정됨
- 반주 패턴 sequence가 고정 패턴으로 반환됨
- 연습 결과 점수와 피드백이 하드코딩됨
- 내보내기 결과가 실제 작업 길이와 무관한 placeholder 값으로 생성됨
- 공유 가능 여부가 항상 false로 막힘

## 현재 반영된 개선 사항

### 1. 백엔드 AI client stub 제거

대상 파일:

- `back/app/services/ai_client.py`
- `back/services/analyze_service.py`
- `back/services/markov_service.py`

개선 내용:

| 기능 | 기존 문제 | 현재 동작 |
| --- | --- | --- |
| `analyze_key()` | 항상 같은 조/신뢰도 반환 | MIDI note histogram을 `AnalyzeService.detect_jo()`에 전달 |
| `analyze_jangdan()` | 항상 같은 장단/BPM 반환 | timestamp IOI를 `AnalyzeService.detect_jangdan()`에 전달 |
| `generate_pattern_sequence()` | 고정 sequence 반환 | `MarkovService.generate_sequence()`로 학습된 Markov transition 사용 |

검증 기준:

- `AI/models/*.pkl`이 있으면 `AnalyzeService`가 모델을 로드해야 한다.
- `AI/segments`가 있으면 `MarkovService`가 pattern segment를 로드해야 한다.
- 모델이 없는 경우에도 API가 죽지 않도록 fallback을 반환해야 한다.

### 2. 프런트 연습 점수 고정값 제거

대상 파일:

- `front/src/product/garakProductState.ts`

개선 내용:

- `accuracyScore = 82`, `timingScore = 78` 같은 고정 점수 제거
- `evaluatePracticePerformance()`에서 실제 performance event 기반으로 계산
- 점수 계산 요소:
  - 사용한 현의 다양성
  - pluck 이벤트 간격 안정성
  - 이벤트 밀도
- 점수 구간에 따라 피드백 문구를 동적으로 선택

검증 기준:

- 이벤트가 없으면 낮은 기본 점수와 재시도 피드백을 반환해야 한다.
- 이벤트가 많고 박자가 안정적이면 더 높은 점수가 나와야 한다.
- 같은 입력 이벤트에 대해 deterministic하게 같은 점수가 나와야 한다.

### 3. 내보내기 placeholder 개선

대상 파일:

- `front/src/product/garakProductState.ts`

개선 내용:

- `placeholder://export-1.wav` 같은 완료된 것처럼 보이는 URI 제거
- 실제 렌더링 전 상태를 표현하는 `pending://export-{id}.wav` 사용
- `estimateWorkDuration()`으로 현재 work의 이벤트 길이를 기반으로 duration 추정

검증 기준:

- 빈 작업은 기본 duration을 사용해야 한다.
- 연주 이벤트가 있는 작업은 마지막 이벤트 시점 이후까지 duration이 잡혀야 한다.

### 4. 공유 가능 여부 고정값 제거

대상 파일:

- `front/src/studio/studioLibrary.ts`

개선 내용:

- `return false` 제거
- `work.tracks.length > 0`이면 공유 가능하도록 변경

검증 기준:

- track이 없는 work는 공유 불가
- track이 1개 이상 있는 work는 공유 가능

## AI 파이프라인 정리 상태

AI 코드는 현재 목적별로 다음 구조로 정리되어 있다.

| 경로 | 역할 |
| --- | --- |
| `AI/pipeline/00_ingestion` | API 다운로드, AIHub 추출, 샘플 정리 |
| `AI/pipeline/01_preprocessing` | 녹음/음원 전처리, 음 추출, 장구 hit 추출 |
| `AI/pipeline/02_training` | Markov 학습, pitch 학습, segment export |
| `AI/pipeline/03_runtime` | 백엔드에서 사용하는 runtime 생성 모듈 |

## 남은 확인 사항

현재 코드가 완전히 안전하려면 아래 항목은 추가 확인이 필요하다.

- `back/app/services/ai_client.py`가 새 `AI/pipeline/03_runtime` 구조와 충돌하지 않는지 확인
- `back/app` 기반 API와 `back/services` 기반 legacy API가 중복으로 존재하는 구조 정리
- 프런트에서 AI 이어 만들기 요청 시 raw audio가 아니라 `pitch/timestamp` event를 넘기는지 확인
- `AI/models`, `AI/segments`, `back/static/samples/manifest.json` 없는 환경에서 fallback 메시지가 명확한지 확인
- vitest와 백엔드 테스트를 실제로 실행해서 기존 하드코딩 제거가 테스트로 고정됐는지 확인

## 결론

이 문서는 단순 설명 문서가 아니라, AI 기능에서 고정값으로 동작하던 부분을 실제 모델/사용자 이벤트 기반으로 바꿨는지 확인하는 검증 문서다.
따라서 삭제하거나 요구사항 문서로 대체하지 말고, 고정값 제거 체크리스트로 유지한다.
