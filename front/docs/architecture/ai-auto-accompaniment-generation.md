# AI 자동 반주 생성 기능 문서

상태: 기능 기획 반영, Phase 2 목표 기능
작성일: 2026-06-26
문서 책임: `ai반주.pdf`의 AI 자동 반주 생성 기획을 GARAK 화면, 상태, 데이터 흐름, 구현 파일 기준으로 해석한다.

관련 문서: `ai-model-pipeline-contract.md`, `runtime-architecture.md`, `tech-stack.md`, `multitrack-editing-and-mixing.md`, `../product/screen-flow/current-screen-flow.md`, `../document-authority-index.md`

참고 원문: `C:/Users/cjh51/Downloads/ai반주.pdf`

## 1. 기능 요약

AI 자동 반주 생성은 사용자가 한 악기로 연주를 마친 뒤, GARAK이 해당 연주를 분석해 나머지 2개 악기의 반주를 만들고 3트랙 국악 앙상블을 WAV 결과물로 생성하는 기능이다.

목표 흐름은 다음과 같다.

```text
사용자 연주 완료
  -> PerformanceEvent[] / Take / Work 확보
  -> 명시적 AI 반주 생성 요청
  -> 연주 분석: 조, 장단, BPM, confidence
  -> Markov Chain 기반 반주 패턴 생성
  -> 사용자 트랙 + 생성 트랙 2개 믹싱
  -> WAV 미리듣기
  -> 사용자가 수락하면 Work 또는 내보낸 음원에 반영
```

현재 MVP 문서와의 경계는 명확하다.

- MVP의 S10B는 로컬 장단 프리셋 추천과 시퀀싱을 기본 경로로 유지한다.
- PDF의 Markov Chain 기반 자동 반주 생성은 S10B의 확장 목표이며, MVP 기본 동작을 대체하지 않는다.
- S05 연주 완료 직후 서버로 자동 업로드하지 않는다. AI 요청은 S08/S10B 또는 S07의 명시적 사용자 행동으로만 시작한다.
- 모델 출력은 Work에 즉시 적용하지 않는다. 사용자가 미리듣고 수락해야 반영한다.

## 2. 화면 및 파일 매핑

| 기능 단계 | 스크린 | 사용자 경험 | 현재 구현 파일 | 목표 구현 책임 |
| --- | --- | --- | --- | --- |
| 연주 입력 | S05 `악기 자유연주` | 사용자가 가야금, 대금, 장구 중 하나를 직접 연주하고 녹음한다. | `front/src/product/freeCreationScreens.tsx`, `front/src/product/freePlayPerformanceModel.ts`, `front/src/product/garakProductState.ts` | AI 요청의 원천이 되는 `PerformanceEvent[]`, `Take`, `RecordingSetup`, `InstrumentId`를 안정적으로 보관한다. |
| 작업 편집 | S07 `트랙/레이어 편집` | 저장된 Work에서 트랙을 확인하고 반주 생성 흐름으로 진입한다. | `front/src/product/freeCreationScreens.tsx`, `front/src/product/freeCreationMixEditorModel.ts`, `front/src/product/garakProductState.ts` | AI 반주 후보 수락 후 생성 트랙 또는 믹스 결과를 Work에 반영한다. |
| 트랙 추가 선택 | S08 `트랙 추가` | `장단/반주 추가` 또는 `AI 반주 생성하기` 흐름을 선택한다. | `front/src/product/freeCreationScreens.tsx`, `front/src/screen-flow/screenFlowMachine.ts`, `front/src/screen-flow/screenDefinitions.ts` | S10B로 라우팅하고, 명시적 사용자 요청 시점임을 보장한다. |
| 반주 생성/미리듣기 | S10B `반주 트랙 만들기` | 분석 상태, 생성 후보, WAV 미리듣기, 로컬 fallback을 제공한다. | `front/src/product/freeCreationScreens.tsx`, `front/src/product/jangdanPresetPanelModel.ts`, `front/src/product/garakProductEffects.ts`, `front/src/product/garakProductServices.ts`, `front/src/product/garakHttpProductServices.ts` | AI 서버 응답을 후보로 표시하고, 미리듣기/수락 전까지 Work를 변경하지 않는다. |
| 결과 반영 | S07 `트랙/레이어 편집` | 수락한 반주가 트랙 목록에 추가된 상태로 돌아온다. | `front/src/studio/studioTypes.ts`, `front/src/studio/studioLibrary.ts`, `front/src/product/garakProductState.ts` | 생성된 2개 트랙과 믹스 WAV 메타데이터를 보관할 수 있게 모델을 확장한다. |
| 저장/공유 | S17/S18/S19 | 완성 음원을 보관함에 저장하거나 파일/링크로 공유한다. | `front/src/product/garakProductState.ts`, `front/src/product/garakProductServices.ts`, `front/src/product/libraryScreens.tsx` | 믹스 WAV를 `ExportedAudio` 또는 공유 대상 음원으로 연결한다. |

## 3. 기존 문서와의 정합성

| 기준 문서 | 확인 내용 | 이 문서의 반영 |
| --- | --- | --- |
| `current-screen-flow.md` | S10B는 S08에서 진입하며, 수동 프리셋 선택과 로컬 fallback을 유지한다. 모델 출력은 미리듣고 수락할 수 있는 반주 트랙 후보로 받는다. | AI 자동 반주 생성도 S10B 확장으로 정의하고, 자동 적용을 금지한다. |
| `runtime-architecture.md` | AI 모델 서버 요청은 S10B AI 제안 또는 S07 편곡 요청 같은 명시적 사용자 행동으로만 시작한다. | S05 연주 완료 직후 자동 업로드를 금지하고, S08/S10B 진입 후 요청하도록 정의한다. |
| `tech-stack.md` | Markov Chain 반주 생성은 MVP 기본 경로가 아니라 R&D/Phase 2로 보류된 항목이다. | PDF 기능을 Phase 2 목표 기능으로 분류한다. |
| `ai-model-pipeline-contract.md` | 현재 계약은 S10B 반주 후보 입출력 초안이며, 백엔드/AI 확정이 필요하다. | 아래 목표 요청/응답 계약으로 확장 방향을 제시한다. |

## 4. 입력 데이터

AI 자동 반주 생성 요청은 현재 Work와 선택된 연주 트랙/테이크를 기준으로 만든다.

현재 프론트에 이미 있는 핵심 입력은 다음과 같다.

| 데이터 | 현재 타입/파일 | 사용 목적 |
| --- | --- | --- |
| 연주 이벤트 | `PerformanceEvent[]`, `front/src/domain/performanceEvent.ts` | 터치, 줄 뜯기, 벤딩, 글리산도 같은 연주 행위를 분석한다. |
| 테이크 | `Take`, `front/src/studio/studioTypes.ts` | 이벤트 묶음, 녹음 URI, BPM/장단 설정, 시작 위치를 담는다. |
| 악기 트랙 | `InstrumentTrack`, `front/src/studio/studioTypes.ts` | 사용자가 어떤 악기로 연주했는지 판단한다. |
| 작업 | `Work`, `front/src/studio/studioTypes.ts` | S07/S10B에서 현재 편집 중인 전체 곡 컨텍스트를 제공한다. |
| 장단 설정 | `RecordingSetup`, `front/src/studio/studioTypes.ts` | 사용자가 녹음 직전에 선택한 장단/BPM을 분석 보조값으로 사용한다. |

목표 요청 형태는 다음 필드를 포함해야 한다.

```ts
type AiAutoAccompanimentRequest = {
  requestId: string;
  source: 's10b_auto_accompaniment';
  workId: string;
  sourceTrackId: string;
  sourceTakeId: string;
  sourceInstrument: 'gayageum' | 'daegeum' | 'janggu';
  events: PerformanceEvent[];
  recordingUri?: string;
  recordingSetup?: {
    presetId: 'semachi' | 'jungmori' | 'jajinmori';
    bpm: number;
    beatUnit: string;
  };
  options: {
    outputKind: 'ensemble_wav_candidate';
    maxCandidates: number;
    temperature: number;
  };
};
```

`recordingUri`는 선택 입력이다. 이벤트만으로 분석 가능한 경우에는 `PerformanceEvent[]`를 우선 사용하고, 서버가 오디오 분석을 요구할 때만 업로드 URI를 포함한다.

PDF 기획의 장단 출력에는 `gutgeori`가 포함되어 있지만, 현재 프론트의 `JangdanPresetId`는 `semachi`, `jungmori`, `jajinmori`만 가진다. 구현 시에는 `gutgeori`를 정식 프리셋으로 추가하거나, S10B에서 로컬 fallback 프리셋으로 매핑하는 결정을 먼저 내려야 한다.

## 5. AI 처리 단계

### 5.1 연주 분석

사용자의 터치 이벤트가 백엔드로 전송되면 AI 모듈은 두 가지를 감지한다.

| 분석 항목 | 함수 | 출력 |
| --- | --- | --- |
| 조 감지 | `analyze_key` | `pyeongjo` 또는 `gyemyeonjo` |
| 장단 감지 | `analyze_jangdan` | `jungmori`, `gutgeori`, `jajinmori`와 BPM |

분석 결과는 `confidence`를 포함해야 한다. confidence가 낮으면 S10B는 자동 수락을 유도하지 않고, 감지 결과와 로컬 장단 선택 fallback을 함께 보여준다.

### 5.2 반주 패턴 생성

분석 결과인 조, 장단, BPM을 바탕으로 Markov Chain 기반 생성 모델이 반주 패턴을 만든다.

| 생성기 | 역할 | 입력 | 출력 |
| --- | --- | --- | --- |
| Pitch Markov | 선율 악기의 음고 전이를 생성한다. | 악기, 조, 장단, BPM, temperature | 선율 이벤트 또는 렌더링 가능한 음원 조각 |
| Rhythm Markov | 장구 리듬 트랙을 WAV로 생성한다. | `{jo}_{jangdan}` 세그먼트, BPM | 장구 WAV 트랙 |

Pitch Markov는 국악원 공공 API로 수집한 학습 데이터에서 추출한 음고 전이 행렬을 사용한다. 악기, 조, 장단 조합별 모델을 분리해 조에 맞는 음계를 유지하고, `temperature`로 반복성과 다양성의 균형을 조절한다.

Rhythm Markov는 `{jo}_{jangdan}` 폴더의 장단 세그먼트 파일을 조합해 장구 리듬 트랙을 직접 생성한다. 마디 경계에는 크로스페이드를 적용해 세그먼트 전환이 끊기지 않도록 한다.

### 5.3 악기 조합

사용자가 연주한 악기를 기준으로 나머지 2개 악기를 생성한다.

| 사용자 악기 | 생성 선율 트랙 | 생성 리듬 트랙 |
| --- | --- | --- |
| 가야금 | 대금 | 장구 |
| 대금 | 가야금 | 장구 |
| 장구 | 가야금 | 대금 |

장구가 사용자 악기일 때는 생성 트랙 2개가 모두 선율 트랙이다. 이 경우 리듬 트랙 볼륨 기본값 대신 선율 트랙 기본값을 적용한다.

### 5.4 앙상블 믹싱

`EnsembleGenerator`는 사용자 트랙과 생성된 2개 반주 트랙을 받아 3트랙으로 믹싱한다.

| 트랙 | 역할 | 기본 음량 |
| --- | --- | ---: |
| 사용자 트랙 | 원본 연주 | 0.9 |
| 선율 트랙 | 나머지 선율 악기 자동 생성 | 0.7 |
| 리듬 트랙 | 장구 리듬 자동 생성 | 0.6 |

최종 결과는 앱에서 즉시 재생 가능한 WAV 파일 URI로 반환한다.

## 6. 목표 응답 데이터

S10B는 AI 서버 응답을 바로 Work에 넣지 않고, 먼저 후보 상태로 표시한다.

```ts
type AiAutoAccompanimentCandidate = {
  id: string;
  status: 'ready';
  sourceWorkId: string;
  sourceTrackId: string;
  sourceTakeId: string;
  sourceInstrument: 'gayageum' | 'daegeum' | 'janggu';
  analysis: {
    jo: 'pyeongjo' | 'gyemyeonjo';
    jangdan: 'jungmori' | 'gutgeori' | 'jajinmori';
    bpm: number;
    confidence: number;
  };
  generatedTracks: Array<{
    instrument: 'gayageum' | 'daegeum' | 'janggu';
    role: 'melody' | 'rhythm';
    audioUri: string;
    volume: number;
    startedAtBeat: number;
  }>;
  mixedAudioUri: string;
  durationSeconds: number;
  model: {
    pitchModelId?: string;
    rhythmModelId?: string;
    temperature: number;
  };
};
```

실패 응답은 S10B에서 로컬 fallback을 유지할 수 있게 원인을 구분해야 한다.

```ts
type AiAutoAccompanimentFailure = {
  status: 'error';
  code:
    | 'insufficient_events'
    | 'low_confidence'
    | 'model_unavailable'
    | 'audio_render_failed'
    | 'timeout';
  message: string;
};
```

## 7. 프론트 상태 반영 원칙

S10B에 필요한 상태는 다음처럼 분리한다.

| 상태 | 책임 |
| --- | --- |
| `idle` | S10B에 진입했지만 AI 생성 요청 전이다. 로컬 장단 프리셋 fallback을 보여준다. |
| `analyzing` | 이벤트와 Work 컨텍스트를 서버로 보내 조/장단/BPM을 분석 중이다. |
| `generating` | 분석 결과를 바탕으로 2개 반주 트랙을 생성 중이다. |
| `mixing` | 사용자 트랙과 생성 트랙을 WAV로 믹싱 중이다. |
| `candidateReady` | 미리듣기 가능한 AI 반주 후보가 준비됐다. |
| `failed` | AI 생성에 실패했으며, 로컬 장단 프리셋 fallback으로 계속 작업할 수 있다. |

현재 `AccompanimentTrack`은 `presetId`, `bpm`, `volume` 중심의 로컬 장단 트랙이다. AI 자동 반주 후보를 온전히 담으려면 다음 확장이 필요하다.

- 생성 트랙별 `audioUri`
- 생성 트랙별 `instrument`, `role`, `volume`
- 원본 `sourceWorkId`, `sourceTrackId`, `sourceTakeId`
- 분석 결과 `jo`, `jangdan`, `bpm`, `confidence`
- 믹스 결과 `mixedAudioUri`, `durationSeconds`
- 모델 메타데이터 `pitchModelId`, `rhythmModelId`, `temperature`

## 8. S10B 화면 요구사항

S10B는 기존 수동 프리셋 UI를 보존하면서 AI 후보 영역을 추가한다.

| 상태 | 화면 표시 | 가능한 행동 |
| --- | --- | --- |
| 요청 전 | 현재 Work/악기/테이크 요약, 로컬 장단 프리셋 | AI 반주 생성 시작, 수동 프리셋 미리듣기, 취소 |
| 분석/생성 중 | 단계별 진행 상태 | 취소 |
| 후보 준비 | 감지된 조/장단/BPM, confidence, 생성 악기 2개, WAV 미리듣기 | 후보 미리듣기, 반주 적용, 로컬 프리셋으로 전환, 취소 |
| 실패 | 실패 원인, 로컬 fallback 안내 | 다시 시도, 수동 프리셋 사용, 취소 |

S10B에서 `반주 적용`을 누르면 S07로 돌아간다. S11은 별도 화면으로 만들지 않는다.

## 9. 저장 및 공유 연결

AI 자동 반주가 만든 최종 WAV는 보관함과 공유 기능에서 `ExportedAudio`로 다룰 수 있어야 한다.

| 연결 지점 | 기대 동작 |
| --- | --- |
| S07 `작업 저장` | 생성 트랙 메타데이터와 원본 Work를 로컬 보관함에 저장한다. |
| S07 `Save & Share` | Work 저장 후 믹스 WAV를 내보낸 음원으로 만든다. |
| S17 `공유 준비` | 제목, 길이, 사용 악기, 미리듣기를 표시하고 파일 또는 링크 공유를 선택한다. |
| S18 `보관함` | 작업 목록에는 원본 Work를, 내보낸 음원 목록에는 완성 WAV를 표시한다. |
| S19 `연주 상세/플레이어` | 완성 WAV 재생, 편집으로 열기, 공유 진입을 제공한다. |

## 10. 미흡한 지점과 백로그 후보

이 기능은 현재 문서 기준으로 다음 구현 항목이 남아 있다.

| 항목 | 필요 변경 파일 | 설명 |
| --- | --- | --- |
| AI 자동 반주 서비스 계약 확장 | `front/src/product/garakProductServices.ts`, `front/src/product/garakHttpProductServices.ts` | 현재 `recommendAccompaniment`는 장단 프리셋 추천만 반환한다. 자동 반주 후보 요청/응답 타입이 필요하다. |
| S10B 후보 상태 추가 | `front/src/product/garakProductState.ts`, `front/src/product/garakProductEffects.ts` | `analyzing`, `generating`, `mixing`, `candidateReady`, `failed` 상태와 후속 액션을 추가한다. |
| 생성 트랙 데이터 모델 확장 | `front/src/studio/studioTypes.ts`, `front/src/studio/studioLibrary.ts` | generated audio track 또는 AI candidate metadata를 Work에 저장할 수 있어야 한다. |
| `gutgeori` 장단 처리 | `front/src/studio/studioTypes.ts`, `front/src/product/productFixtures.ts` | PDF 목표 출력에는 굿거리 장단이 포함되지만 현재 MVP 프리셋에는 없다. 정식 프리셋 추가 또는 fallback 매핑이 필요하다. |
| S10B UI 확장 | `front/src/product/freeCreationScreens.tsx`, `front/src/product/jangdanPresetPanelModel.ts` | 분석 결과, 생성 악기, WAV 미리듣기, 로컬 fallback을 함께 보여준다. |
| 저장/공유 연결 | `front/src/product/garakProductState.ts`, `front/src/product/garakProductServices.ts`, `front/src/product/libraryScreens.tsx` | `mixedAudioUri`를 `ExportedAudio`와 공유 대상에 연결한다. |
| 테스트 추가 | `front/src/product/__tests__/`, `front/src/studio/__tests__/` | 요청 입력 생성, 실패 fallback, 후보 수락, 저장/공유 연결을 검증한다. |

### 10.1 2026-06-26 프론트 연동 준비 반영

다음 항목은 실제 AI 서버 API 없이 프론트 준비 작업으로 반영됐다.

- `front/src/product/aiAutoAccompaniment.ts`: S10B 자동 반주 요청 타입, 후보 타입, 실패 코드, 악기별 생성 트랙 계획, Work 기반 요청 생성 함수를 추가했다.
- `front/src/product/garakProductServices.ts`: `generateAutoAccompaniment` 서비스 포트를 추가했다.
- `front/src/product/garakHttpProductServices.ts`: 실제 HTTP endpoint는 아직 호출하지 않고 `unavailable`을 반환한다.
- `front/src/product/garakProductState.ts`: `idle`, `generating`, `candidateReady`, `failed` 상태를 `autoAccompanimentStatus`로 추가했다.
- `front/src/product/garakProductEffects.ts`: S10B 진입 시 자동 반주 후보 생성을 먼저 시도하고, 성공하지 못하면 기존 장단 추천/로컬 프리셋 fallback을 유지한다.
- `front/src/product/jangdanPresetPanelModel.ts`, `front/src/product/freeCreationScreens.tsx`: S10B 화면에 AI 자동 반주 후보/실패 상태를 표시한다.
- `front/src/product/__tests__/aiAutoAccompaniment.test.ts`, `front/src/product/__tests__/aiAutoAccompanimentState.test.ts`: 요청 생성, 악기 조합, 상태 전환, Work 자동 변경 금지를 검증한다.

아직 남은 항목은 실제 서버 endpoint 연결, 생성 후보 수락 시 Work/ExportedAudio에 반영하는 저장 모델 확장, `gutgeori` 정식 프리셋 또는 fallback 매핑 결정, Save & Share에서 `mixedAudioUri`를 우선 사용하는 연결이다.

## 11. 검증 기준

구현 시 다음 조건을 통과해야 한다.

- S05 연주 완료만으로 AI 서버 요청이 발생하지 않는다.
- S08/S10B의 명시적 요청에서만 AI 자동 반주 생성이 시작된다.
- 이벤트가 없는 Work에서는 `insufficient_events` 상태를 보여주고 로컬 fallback을 유지한다.
- AI 후보가 준비되어도 Work는 자동 변경되지 않는다.
- 사용자가 후보를 수락하면 S07로 복귀하고 생성 트랙 또는 완성 WAV가 작업에 연결된다.
- 모델 서버가 없거나 실패해도 기존 S10B 로컬 장단 프리셋 흐름은 그대로 동작한다.
- Save & Share는 생성된 WAV가 있을 때 이를 우선 공유 대상으로 사용하고, 없으면 기존 export fallback을 사용한다.
