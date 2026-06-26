# 멀티트랙 편집 및 믹싱 기능 문서

상태: 기능 기획 반영, 구현 기준 문서
작성일: 2026-06-26
문서 책임: `2.4 멀티트랙 편집 & 믹싱` 기획을 GARAK 화면, 상태, 데이터 흐름, 구현 파일 기준으로 해석한다.

관련 문서: `free-play-performance-flow.md`, `free-play-recording-flow.md`, `ai-auto-accompaniment-generation.md`, `runtime-architecture.md`, `../product/screen-flow/current-screen-flow.md`, `../document-authority-index.md`

## 1. 기능 요약

멀티트랙 편집 및 믹싱은 사용자가 S05에서 첫 연주를 녹음한 뒤 S07에서 작업을 열고, S08에서 추가 트랙 유형을 선택해 직접 연주 트랙 또는 AI 반주 트랙을 쌓은 다음, 전체 구성을 `가락 미리듣기`로 확인하고 저장/공유로 이어가는 기능이다.

목표 흐름은 다음과 같다.

```text
S05 첫 악기 연주/녹음 완료
  -> Work / InstrumentTrack / Take 자동 생성
  -> S07 트랙/레이어 편집
  -> S08 트랙 추가
      -> S09 악기 트랙 직접 녹음
      -> S10B AI 반주 트랙 생성
  -> S07 가락 미리듣기 / 믹스 편집
  -> S17/S18/S19 저장, 보관, 공유
```

이 기능의 기준은 다음과 같다.

- `Work`는 편집 가능한 원본 작업이고, 여러 `Track`을 가진다.
- 악기 트랙은 사용자가 직접 연주/녹음한 `InstrumentTrack`이다.
- AI 반주 트랙은 장단 패턴 또는 AI 자동 반주 결과로 생성되는 트랙이다.
- 믹싱은 트랙별 볼륨, mute, solo, 삭제, 시작 위치, 재생 헤드를 조정한 뒤 전체 미리듣기와 export로 이어진다.
- 공유 가능한 결과물은 `Work` 자체가 아니라 `ExportedAudio`다.

## 2. 화면 및 파일 매핑

| 기능 단계 | 스크린 | 사용자 경험 | 현재 구현 파일 | 목표 구현 책임 |
| --- | --- | --- | --- | --- |
| 첫 연주 입력 | S05 `악기 자유연주` | 사용자가 첫 악기를 자유롭게 연주하고 녹음 완료 시 작업이 자동 생성된다. | `front/src/product/freeCreationScreens.tsx`, `front/src/product/garakProductState.ts`, `front/src/studio/studioLibrary.ts` | `Work`, 첫 `InstrumentTrack`, 첫 `Take`를 생성하고 S07로 이동한다. |
| 믹스 편집 진입 | S07 `트랙/레이어 편집` | 현재 작업의 플레이어, 트랙 컨트롤, 저장, 트랙 추가, Save & Share를 제공한다. | `front/src/product/freeCreationScreens.tsx`, `front/src/product/freeCreationMixEditorModel.ts`, `front/src/product/garakProductState.ts` | 트랙별 볼륨, mute, solo, 삭제, 재생 헤드, 저장/export 상태를 표시하고 갱신한다. |
| 트랙 유형 선택 | S08 `트랙 추가` | `악기 트랙`과 `AI 반주 생성하기` 중 하나를 선택한다. | `front/src/product/freeCreationScreens.tsx`, `front/src/screen-flow/screenDefinitions.ts`, `front/src/screen-flow/screenFlowMachine.ts` | 추가 트랙 유형을 명시적으로 선택하게 하고 S09 또는 S10B로 라우팅한다. |
| 악기 트랙 추가 | S09 `추가 악기 녹음` | 기존 작업 위에 다른 악기를 직접 연주해 두 번째 악기 트랙을 만든다. | `front/src/product/freeCreationScreens.tsx`, `front/src/product/garakProductState.ts`, `front/src/studio/studioLibrary.ts` | 새 `InstrumentTrack`과 `Take`를 현재 `Work`에 추가하고 기본 볼륨 1.0으로 시작한다. |
| AI 반주 트랙 추가 | S10B `반주 트랙 만들기` | 장단/AI 반주를 미리듣고 작업에 반주 트랙으로 추가한다. | `front/src/product/freeCreationScreens.tsx`, `front/src/product/jangdanPresetPanelModel.ts`, `front/src/product/aiAutoAccompaniment.ts`, `front/src/product/garakProductEffects.ts`, `front/src/studio/studioLibrary.ts` | 로컬 장단 반주 또는 AI 후보를 Work에 반영한다. 장단 패턴 기본 볼륨은 0.6이다. |
| 전체 믹스 확인 | S07 `가락 미리듣기` | 트랙 구성이 완료되면 전체 플레이어와 트랙 스택으로 완성본을 확인한다. | `front/src/product/freeCreationScreens.tsx`, `front/src/product/freeCreationCompletedPreviewModel.ts`, `front/src/product/freeCreationMixEditorModel.ts` | 전체 트랙을 하나의 곡처럼 미리듣고, 저장 또는 export로 이어간다. |
| 저장/공유 | S17/S18/S19 | 완성된 믹스를 저장하고, 보관함에서 다시 열거나 파일/링크로 공유한다. | `front/src/product/shareScreens.tsx`, `front/src/product/libraryScreens.tsx`, `front/src/product/garakProductServices.ts`, `front/src/product/garakProductState.ts` | `Work` 저장과 `ExportedAudio` export/publish를 분리한다. |

## 3. 기존 문서와의 정합성

| 기준 문서 | 확인 내용 | 이 문서의 반영 |
| --- | --- | --- |
| `current-screen-flow.md` | S07은 트랙/레이어 편집, S08은 트랙 추가, S09는 추가 악기 녹음, S10B는 반주 트랙 만들기다. | 멀티트랙 편집의 중심을 S07로 두고, S08/S09/S10B를 트랙 생성 하위 흐름으로 둔다. |
| `free-play-recording-flow.md` | S05 녹음 완료 시 `Work`, `InstrumentTrack`, `Take`가 자동 생성된다. | 멀티트랙의 시작점은 S05 완료 후 생성된 첫 Work로 정의한다. |
| `ai-auto-accompaniment-generation.md` | AI 자동 반주 후보는 S10B에서 생성되고 수락 전까지 Work를 자동 변경하지 않는다. | AI 반주 트랙은 멀티트랙의 한 트랙 유형으로 다루며, 후보 수락 후에만 Work에 반영한다. |
| `2026-06-26-save-share-implementation-plan.md` | `Work`는 편집 원본이고 `ExportedAudio`는 공유 가능한 산출물이다. | 믹싱 결과의 저장/공유 경계를 `Work`와 `ExportedAudio`로 분리한다. |

## 4. 핵심 데이터 모델

현재 멀티트랙 편집의 중심 데이터는 `front/src/studio/studioTypes.ts`의 `Work`와 `Track`이다.

```text
Work
  id
  title
  source
  syncState
  tracks[]

Track
  InstrumentTrack
    instrument
    takes[]
    startedAtBeat
    volume
    mute
    solo

  AccompanimentTrack
    presetId
    bpm
    startedAtBeat
    volume
    mute
    solo

  ReferenceTrack
    sourceShareId
    title
    authorDisplayName
    startedAtBeat
    volume
    mute
    solo
```

트랙 종류별 목표 기본값은 다음과 같다.

| 트랙 종류 | 생성 방식 | 초기 볼륨 | 현재 타입 |
| --- | --- | ---: | --- |
| 악기 트랙 | 직접 연주 후 녹음 업로드 또는 로컬 이벤트 저장 | 1.0 | `InstrumentTrack` |
| 로컬 장단/AI 반주 트랙 | S10B에서 장단 선택 또는 AI 후보 수락 | 0.6 | `AccompanimentTrack` |
| AI 자동 반주 선율 트랙 | AI 후보 수락 시 생성 악기 트랙으로 반영 | 0.7 | 목표 확장 필요 |
| 참조 트랙 | 공유 음원을 리믹스 대상으로 가져옴 | 0.8 | `ReferenceTrack` |

현재 `AccompanimentTrack`은 장단 프리셋 기반 트랙이다. AI 자동 반주가 만든 실제 오디오 트랙을 온전히 저장하려면 generated audio track 또는 `AccompanimentTrack` 확장이 필요하다.

## 5. 기능별 흐름

### 5.1 S07 믹스 편집

S07은 현재 작업을 편집하는 중심 화면이다.

```text
S07 진입
  -> currentWorkId로 Work 조회
  -> getFreeCreationMixEditorModel(state)
  -> 플레이어 제목, 재생 헤드, 트랙 컨트롤 생성
  -> 사용자가 볼륨/mute/solo/delete 조작
  -> garakProductState reducer가 Work.tracks 갱신
```

S07에서 제공해야 하는 조작은 다음과 같다.

| 조작 | action | 데이터 변경 |
| --- | --- | --- |
| 볼륨 낮추기/높이기 | `adjustWorkTrackVolume` | 대상 `Track.volume`을 0.0-1.0 사이로 clamp한다. |
| 음소거 | `toggleWorkTrackMute` | 대상 `Track.mute`를 토글한다. |
| 솔로 | `toggleWorkTrackSolo` | 대상 `Track.solo`를 토글한다. 현재 구현은 단순 토글이며, `studioLibrary.toggleWorkTrackSolo`는 단일 solo 정책을 가진다. |
| 삭제 | `deleteWorkTrack` | 작업에 두 개 이상의 트랙이 있을 때 대상 트랙을 제거한다. |
| 재생 헤드 이동 | `setWorkPlayheadBeat` | S09/S10B에서 새 트랙을 붙일 기준 박을 바꾼다. |
| 작업 저장 | `saveCurrentWork` | 현재 Work를 로컬 보관 상태로 확정한다. |
| Save & Share | `saveAndShareCurrentWork` | Work 저장 후 export/share 준비 흐름으로 이어진다. |

### 5.2 S08 트랙 추가 선택

S08은 트랙을 실제로 만들지 않고 유형 선택만 담당한다.

```text
S07 addTrack
  -> S08
  -> 악기 트랙 선택: chooseInstrumentTrack -> S09
  -> AI 반주 생성 선택: chooseAccompanimentTrack -> S10B
  -> 가져오기 선택: MVP에서는 locked notice
```

S08의 결정은 Work를 즉시 변경하지 않는다. Work 변경은 S09 녹음 적용 또는 S10B 반주 적용 시점에만 발생한다.

### 5.3 S09 악기 트랙 추가

S09는 기존 Work 위에 두 번째 또는 이후 악기 연주를 녹음해 `InstrumentTrack`을 추가한다.

```text
S09 추가 악기 녹음
  -> pendingFreePlayTake에 이벤트 누적
  -> applyInstrumentTrack
  -> addInstrumentTrack(currentWork, ...)
  -> Work.tracks += InstrumentTrack
  -> S07 복귀
```

기본 원칙은 다음과 같다.

- 새 악기 트랙의 기본 볼륨은 1.0이다.
- 새 트랙의 `startedAtBeat`는 S07의 `workPlayheadBeat`를 따른다.
- 적용 전까지 Work를 변경하지 않는다.
- 취소하면 `pendingFreePlayTake`를 비우고 S07로 돌아간다.

### 5.4 S10B AI/장단 반주 트랙 추가

S10B는 직접 녹음이 아니라 반주 트랙을 만든다.

현재 MVP 경로는 다음과 같다.

```text
S10B 진입
  -> 로컬 장단 프리셋 추천/선택
  -> previewJangdanPreset
  -> addAccompanimentTrack
  -> Work.tracks += AccompanimentTrack
  -> S07 복귀
```

AI 자동 반주 확장 경로는 다음과 같다.

```text
S10B 진입
  -> generateAutoAccompaniment 후보 요청
  -> candidateReady
  -> 사용자가 후보 미리듣기
  -> 후보 수락
  -> 생성 트랙 또는 mixedAudioUri를 Work/ExportedAudio에 연결
  -> S07 복귀
```

AI 서버가 없거나 실패해도 로컬 장단 프리셋 fallback은 계속 가능해야 한다.

### 5.5 S07 가락 미리듣기

기획 이미지의 `가락 미리듣기`는 S07의 완료형 믹스 상태로 해석한다. 현재 구현은 `Work`에 반주 트랙이 있으면 `FreeCreationCompletedPreviewContent`를 보여준다.

```text
S07
  -> hasAccompanimentTrack === true
  -> FreeCreationCompletedPreviewContent
  -> 전체 플레이어
  -> TrackControlStack
  -> 작업 저장 또는 GO(export)
```

완성형 미리듣기는 단순히 화면을 바꾸는 것이 아니라, 아래 조건을 만족해야 한다.

- Work의 모든 트랙을 같은 재생 헤드 기준으로 재생할 수 있어야 한다.
- mute 트랙은 출력에서 제외된다.
- solo 트랙이 하나 이상 있으면 solo 트랙만 출력된다.
- 각 트랙의 volume이 믹스 gain으로 반영된다.
- export 시 같은 믹스 규칙이 적용된다.

## 6. 프론트 상태 책임

| state/action | 책임 |
| --- | --- |
| `currentWorkId` | 현재 편집 중인 Work를 가리킨다. |
| `workPlayheadBeat` | 새 트랙을 추가할 시작 박 기준이다. |
| `trackAddSelection` | S08에서 악기 트랙 선택 UI가 열려 있는지 나타낸다. |
| `trackAddNotice` | 가져오기 같은 locked 상태를 안내한다. |
| `pendingFreePlayTake` | S09 추가 악기 녹음 중인 임시 take다. |
| `previewingJangdanPreset` | S10B 로컬 장단 미리듣기 상태다. |
| `autoAccompanimentStatus` | S10B AI 자동 반주 후보 생성 상태다. |
| `workSaveStatus` | S07/S07 완료형 미리듣기의 저장 상태다. |
| `workExportStatus` | export 또는 Save & Share의 export 상태다. |

Reducer는 Work의 구조 변경만 담당하고, 실제 오디오 export/publish 같은 비동기는 `garakProductEffects.ts`와 `GarakProductServices` 경계가 담당한다.

## 7. 믹싱 규칙

멀티트랙 믹싱은 화면 상태와 export 결과에서 같은 규칙을 따라야 한다.

| 규칙 | 설명 |
| --- | --- |
| 볼륨 | 각 트랙의 `volume`을 gain으로 적용한다. |
| mute | `mute = true`인 트랙은 재생/export에서 제외한다. |
| solo | 하나 이상의 `solo = true` 트랙이 있으면 solo 트랙만 재생/export한다. |
| 시작 위치 | `startedAtBeat`를 기준으로 타임라인에 배치한다. |
| 길이 | 각 트랙의 `durationBeats` 또는 오디오 길이를 기준으로 전체 길이를 계산한다. |
| 비파괴 편집 | 볼륨/mute/solo/delete 전에는 원본 take 이벤트를 직접 변형하지 않는다. |

현재 UI 모델은 볼륨/mute/solo/delete 상태를 Work에 반영한다. 실제 오디오 렌더러는 이 규칙을 읽어 동일한 결과를 만들어야 한다.

## 8. 현재 반영된 구현

이미 코드에 반영된 항목은 다음과 같다.

- `front/src/studio/studioTypes.ts`: `Work`, `InstrumentTrack`, `AccompanimentTrack`, `ReferenceTrack`, `ExportedAudio` 타입이 있다.
- `front/src/studio/studioLibrary.ts`: 첫 Work 생성, 악기 트랙 추가, 반주 트랙 추가, mute/solo 토글, Work 기반 mix plan 생성, placeholder export 생성 함수가 있다.
- `front/src/product/freeCreationMixEditorModel.ts`: S07 플레이어, 재생 헤드, 트랙 컨트롤, 저장 상태 view model이 있다.
- `front/src/product/freeCreationCompletedPreviewModel.ts`: 반주 트랙이 추가된 뒤의 `가락 미리듣기` view model이 있다.
- `front/src/product/freeCreationScreens.tsx`: S07 믹스 화면, S08 트랙 추가 화면, S09 추가 악기 녹음 화면, S10B 반주 화면, S07 완료형 미리듣기 화면이 연결되어 있다.
- `front/src/product/garakProductState.ts`: 트랙 볼륨, mute, solo, 삭제, 트랙 추가, 반주 추가, export 상태 action이 있다.
- `front/src/product/aiAutoAccompaniment.ts`: AI 자동 반주 후보 생성 준비 타입과 악기별 생성 트랙 계획이 있다.

## 9. 남은 구현 항목

| 항목 | 필요 변경 파일 | 완료 기준 |
| --- | --- | --- |
| 실제 멀티트랙 오디오 믹서 | `front/src/audio/`, `front/src/product/garakProductServices.ts`, `front/src/product/garakProductEffects.ts` | `createWorkMixPlan`을 사용해 Work의 모든 트랙을 volume/mute/solo/startedAtBeat 기준으로 실제 재생하고 export한다. |
| S09 녹음 메타데이터 정교화 | `front/src/product/garakProductState.ts`, `front/src/studio/studioLibrary.ts` | 추가 악기 트랙에도 `recordingSetup`, `recordingUri`, 정확한 `durationBeats`가 저장된다. |
| solo 정책 통일 | `front/src/product/garakProductState.ts`, `front/src/studio/studioLibrary.ts` | UI reducer와 library helper가 동일하게 단일 solo 또는 다중 solo 정책을 따른다. |
| AI 후보 수락 후 Work 반영 | `front/src/product/aiAutoAccompaniment.ts`, `front/src/product/garakProductState.ts`, `front/src/studio/studioTypes.ts` | S10B AI 후보를 수락하면 generated track 또는 mixed audio metadata가 Work에 연결된다. |
| S08 가져오기 경로 | `front/src/product/freeCreationScreens.tsx`, `front/src/product/garakProductState.ts`, `front/src/studio/studioTypes.ts` | 공유 음원 또는 로컬 오디오를 `ReferenceTrack`으로 추가할 수 있다. |
| 전체 믹스 미리듣기 | `front/src/product/freeCreationScreens.tsx`, `front/src/product/freeCreationMixEditorModel.ts`, `front/src/product/garakProductServices.ts` | S07 플레이어가 placeholder UI가 아니라 실제 Work 믹스를 재생한다. |
| export 결과와 보관함 연결 고도화 | `front/src/product/garakProductState.ts`, `front/src/product/libraryScreens.tsx`, `front/src/product/shareScreens.tsx` | export된 `ExportedAudio`가 S17/S18/S19에서 같은 믹스 URI와 메타데이터로 표시된다. |

## 10. 구현 태스크

### Task 1: 멀티트랙 믹서 도메인 규칙 고정

**Files**

- Modify: `front/src/studio/studioLibrary.ts`
- Test: `front/src/studio/__tests__/studioLibrary.test.ts`

검증할 규칙은 볼륨 clamp, mute 제외, solo 우선, startedAtBeat 정렬이다. 이 태스크는 실제 오디오 렌더링이 아니라 렌더러에 넘길 track mix plan을 만드는 순수 함수를 목표로 한다.

2026-06-26 반영: `front/src/studio/studioLibrary.ts`에 `createWorkMixPlan`을 추가해 unmuted 트랙, solo 우선, 시작 박 정렬, 볼륨 clamp 규칙을 순수 함수로 고정했다. 테스트는 `front/src/studio/__tests__/studioLibrary.test.ts`의 `work mix plan` 케이스에서 검증한다.

### Task 2: S07 믹스 플레이어를 실제 Work 재생 요청에 연결

**Files**

- Modify: `front/src/product/freeCreationScreens.tsx`
- Modify: `front/src/product/garakProductServices.ts`
- Modify: `front/src/product/garakProductEffects.ts`
- Test: `front/src/product/__tests__/garakProductEffects.test.ts`

S07 플레이 버튼은 현재 시각 UI에 가깝다. 목표는 `services.audio.playWorkMix(work, mixOptions)` 같은 서비스 포트를 만들고, Work의 트랙 상태를 반영해 재생을 요청하는 것이다.

2026-06-26 반영: S07 기본 믹스 화면과 완료형 `가락 미리듣기`의 플레이 버튼이 `playCurrentWorkMix` 액션을 dispatch한다. `front/src/product/garakProductEffects.ts`는 현재 Work를 `createWorkMixPlan`으로 변환해 `services.audio.playWorkMix(work, mixPlan)`에 전달하며, 서비스 포트와 HTTP 준비 endpoint(`/audio/work-mixes/play`)를 추가했다.

### Task 3: S09 추가 악기 녹음 데이터 완성

**Files**

- Modify: `front/src/product/garakProductState.ts`
- Modify: `front/src/studio/studioLibrary.ts`
- Test: `front/src/product/__tests__/garakProductState.test.ts`

S09에서 생성되는 추가 악기 트랙도 첫 S05 녹음과 같은 수준의 `recordingSetup`, `durationBeats`, `recordingUri`를 가져야 한다.

2026-06-26 반영: `PendingFreePlayTake`가 `recordingUri`를 보관하고, S09 `applyInstrumentTrack`은 pending take의 `recordingSetup`으로 `durationBeats`를 계산해 `addInstrumentTrack`에 전달한다. 테스트는 `front/src/product/__tests__/garakProductState.test.ts`의 S09 recording metadata 케이스에서 검증한다.

### Task 4: AI 후보 수락을 멀티트랙 Work에 연결

**Files**

- Modify: `front/src/product/aiAutoAccompaniment.ts`
- Modify: `front/src/studio/studioTypes.ts`
- Modify: `front/src/studio/studioLibrary.ts`
- Modify: `front/src/product/garakProductState.ts`
- Test: `front/src/product/__tests__/aiAutoAccompanimentState.test.ts`
- Test: `front/src/studio/__tests__/studioLibrary.test.ts`

S10B에서 `candidateReady`가 된 AI 후보를 수락하면 Work에 generated audio track metadata 또는 mixed audio reference가 반영되어야 한다.

### Task 5: export가 실제 믹스 결과를 사용하게 연결

**Files**

- Modify: `front/src/product/garakProductServices.ts`
- Modify: `front/src/product/garakHttpProductServices.ts`
- Modify: `front/src/product/garakProductEffects.ts`
- Modify: `front/src/product/garakProductState.ts`
- Test: `front/src/product/__tests__/garakProductEffects.test.ts`
- Test: `front/src/product/__tests__/garakHttpProductServices.test.ts`

`placeholder://export-N.wav`를 실제 `exportWorkAudio` 결과 URI로 대체하고, export 시점의 믹스 규칙을 반영한다.

## 11. 검증 기준

구현 완료 시 다음 조건을 통과해야 한다.

- S05 첫 녹음 완료 후 S07에 첫 `InstrumentTrack`이 보인다.
- S08에서 악기 트랙을 선택하면 S09로 이동하고, 적용 후 S07에 새 `InstrumentTrack`이 추가된다.
- S08에서 AI 반주를 선택하면 S10B로 이동하고, 반주 적용 후 S07에 반주 트랙이 추가된다.
- 악기 트랙 기본 볼륨은 1.0, 장단/AI 반주 트랙 기본 볼륨은 0.6으로 시작한다.
- S07에서 볼륨, mute, solo, 삭제를 조작해도 화면을 떠나지 않는다.
- Work에 두 개 이상의 트랙이 있으면 각 트랙의 컨트롤이 독립적으로 표시된다.
- 전체 믹스 미리듣기와 export는 같은 volume/mute/solo/startedAtBeat 규칙을 사용한다.
- Work 저장은 편집 원본을 보관하고, Save & Share는 공유 가능한 `ExportedAudio`를 만든다.
