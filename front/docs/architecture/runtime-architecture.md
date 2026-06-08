# Runtime Architecture

상태: MVP 기준 canonical architecture document  
관련 문서: `../domain/README.md`, `tech-stack.md`, `gukak-studio-erd.md`

이 문서는 GUKAK STUDIO MVP의 런타임 경계와 데이터 흐름을 정의한다. 구현자는 오디오, 제스처, 세션, 장단 추천 작업 전에 이 문서를 확인한다.

## Runtime Principle

MVP의 정상 연주 경로는 네트워크를 타지 않는다. 공공데이터 API와 분석 데이터는 앱 실행 중 실시간 호출 대상이 아니라, 사전에 생성된 manifest와 로컬 에셋을 만드는 입력이다.

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
| Demo inspector | source/explanation display | runtime dependency on public APIs |

## Failure And Fallback

| Failure mode | Required behavior |
| --- | --- |
| Sample missing | Disable affected string or use explicit fallback sample; do not perform runtime file search. |
| Audio capture fails | Preserve `PerformanceEvent[]` session; Recording remains absent or failed. |
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
