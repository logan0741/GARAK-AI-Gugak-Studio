# GARAK Runtime Architecture

상태: MVP 기준 canonical architecture document  
관련 문서: `../domain/README.md`, `tech-stack.md`, `gukak-studio-erd.md`

이 문서는 GARAK MVP의 런타임 경계와 데이터 흐름을 정의한다. 구현자는 오디오, 제스처, 세션, 장단 추천 작업 전에 이 문서를 확인한다.

## Runtime Principle

MVP의 정상 연주 경로는 네트워크를 타지 않는다. 공공데이터 API와 분석 데이터는 앱 실행 중 실시간 호출 대상이 아니라, 사전에 생성된 manifest와 로컬 에셋을 만드는 입력이다.

2026-06-19 회의 기준으로도 이 원칙은 유지한다. 사용자가 S05에서 녹음을 끝냈다는 이유만으로 프론트가 즉시 서버에 파일을 보내지 않는다. 서버 저장은 보관함 동기화, 완성 Work 저장, 내보낸 음원 저장처럼 사용자가 만든 곡을 보존하거나 공유해야 하는 시점에 백엔드 API 계약으로 연결한다.

## Runtime Flow

```text
Public / own source data
        |
        v
Asset preprocessing
  - rights check
  - trim / normalize
  - envelope metadata
  - source attribution
        |
        v
SampleAssetManifest + local audio files
        |
        v
Instrument screen preload
        |
        +-------------------------------+
        |                               |
        v                               v
Touch input                     Demo inspector
        |                       source/license/quality
        v
GestureMapper
        |
        v
PerformanceEvent stream
        |
        +------------------+---------------------+
        |                  |                     |
        v                  v                     v
Voice scheduler      SessionRecorder      JangdanMatcher
        |                  |                     |
        v                  v                     v
SamplerEngine        Session JSON         JangdanRecommendation
                           |
                           v
                      Work / Track / Take
        |                                        |
        v                                        v
Audio output                           Preview / accept
                                                 |
                                                 v
                                          LocalSequencer
                                                 |
                                                 v
                                           SamplerEngine
```

## Boundaries

| Boundary | Owns | Must not own |
| --- | --- | --- |
| UI | layout, touch capture, visual feedback | session persistence, raw audio library calls |
| `GestureMapper` | raw gesture to `PerformanceEvent` mapping | audio playback, storage |
| Domain | event vocabulary, session rules, recommendation rules | React Native APIs, network calls |
| `SamplerEngine` | voice allocation, sample playback, gain, bend, mute | UI decisions, domain naming changes |
| Session storage | serializable session document | audio engine internals |
| Work storage | editable track/layer document, sync state | low-latency audio scheduling |
| Demo inspector | source/explanation display | runtime dependency on public APIs |

## Server And AI Boundary

```text
S05 recording complete
  -> local Session / Take preserved
  -> local Work updated
  -> S07 edit
  -> user saves, exports, syncs, or requests AI accompaniment
  -> optional backend / model-server request
```

- Instrument play, touch handling, sampler scheduling, and local recording fallback must not wait for network.
- A recording-complete event is a local persistence boundary, not a mandatory upload boundary.
- If the backend stores library data, the preferred payload is `Work` plus `Track`/`Take` metadata, and optionally `ExportedAudio`.
- Whether raw `Session` documents are also stored on the server is an API decision still open.
- If an AI model server creates accompaniment or arrangement suggestions, the request should be triggered by an explicit user action such as S10B AI suggestion or S07 arrange action.
- Model input should be a structured package of selected `Work`, `Track`, `Take`, `PerformanceEvent[]`, BPM, meter, jangdan preset, and any required audio URI; the exact contract is pending backend/AI documentation.
- Model output should be shown as a candidate recommendation or track that the user can preview and accept. It must not mutate the saved Work automatically.
- Model-server failure, timeout, or missing port must fall back to manual local jangdan selection and local sequencing.

## Failure And Fallback

| Failure mode | Required behavior |
| --- | --- |
| Sample missing | Disable affected string or use explicit fallback sample; do not perform runtime file search. |
| Audio capture fails | Preserve `PerformanceEvent[]` session; Recording remains absent or failed. |
| Session replay requested | Build a deterministic `ReplaySchedule` from `Session.events` and the matching `SampleAssetManifest`, preview readiness in the prototype inspector, then dispatch replay events through the current `SamplerEngine` boundary without changing the saved session. |
| Audio engine fails Day 5 criteria | Keep domain/UI boundary and swap `SamplerEngine` implementation. |
| Jangdan recommendation uncertain | Show manual selection or low-confidence recommendation; do not auto-start accompaniment. |
| Network unavailable | Normal instrument play still works. Demo inspector uses bundled manifest metadata. |
| Voice budget exceeded | Fade out oldest or quietest voice before allocating new voice. |

## Observability

MVP implementation should record debug-only metrics without making them part of the domain model.

| Metric | Purpose |
| --- | --- |
| touch timestamp | Estimate touch-to-event latency. |
| audio scheduled timestamp | Estimate scheduling delay. |
| event batch dispatch latency | Debug-only delay from first `PerformanceEvent.tsMs` in a handled batch to `SamplerEngine` dispatch completion; not proof of touch-to-sound latency. |
| active voice count | Confirm polyphony and voice stealing behavior. |
| dropped/missing sample count | Detect manifest or asset packaging errors. |
| jangdan recommendation score | Explain recommendation confidence. |

These metrics are debug/QA data. They are not part of the core Session unless explicitly serialized under a debug namespace.
