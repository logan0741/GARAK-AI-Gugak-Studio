# GARAK Runtime Architecture

상태: MVP 기준 canonical architecture document  
관련 문서: `../domain/README.md`, `tech-stack.md`, `gukak-studio-erd.md`

이 문서는 GARAK MVP의 런타임 경계와 데이터 흐름을 정의한다. 구현자는 오디오, 제스처, 세션, 장단 추천 작업 전에 이 문서를 확인한다.

## Runtime Principle

MVP의 정상 연주 경로는 네트워크를 타지 않는다. 공공데이터 API와 분석 데이터는 앱 실행 중 실시간 호출 대상이 아니라, 사전에 생성된 manifest와 로컬 에셋을 만드는 입력이다.

2026-06-19 회의 기준으로도 이 원칙은 유지한다. 사용자가 S05에서 녹음을 끝냈다는 이유만으로 프론트가 즉시 서버에 파일을 보내지 않는다. 서버 저장은 보관함 동기화, 완성 Work 저장, 내보낸 음원 저장처럼 사용자가 만든 곡을 보존하거나 공유해야 하는 시점에 백엔드 API 계약으로 연결한다.

## Storage And Audio Asset Strategy

GARAK은 저장공간을 아끼기 위해 악기별 레이어를 긴 오디오 파일로 보존하지 않는다. 편집 가능한 기준 데이터는 `Work`, `Track`, `Take`, `Session`, `PerformanceEvent[]`, `SampleAssetManifest` 버전이다. 실제 소리는 재생 시점에 샘플러가 manifest의 샘플을 preload한 뒤 이벤트를 다시 dispatch해서 낸다.

```text
Instrument Track
  -> instrument id
  -> sample manifest version
  -> PerformanceEvent[]
  -> volume / mute / solo / start beat
  -> no default rendered layer audio

Export
  -> render current Work
  -> create compressed ExportedAudio
  -> upload or sync when backend contract is available
  -> keep local copy as cache, not as the editable source
```

### Storage Budget Guidelines

| Data category | Preferred form | Expected local footprint |
| --- | --- | --- |
| Minimum bundled samples | Short WAV samples for first-play instruments | about 20-50 MB for MVP if kept conservative |
| High-quality or extended sample packs | Downloaded cache keyed by `SampleAssetManifest.version` | opt-in cache, removable |
| Instrument layer data | `PerformanceEvent[]` plus track metadata | usually KBs to low MBs per Work |
| Session fallback | JSON event log | small enough to copy/debug |
| Recording probe or optional live capture | compressed audio when available | cache only; not required for replay |
| ExportedAudio | AAC/M4A or equivalent compressed render | about 1-1.5 MB per minute at common mobile bitrates |
| WAV mixdown | Avoid for long user exports | about 5 MB/min mono or 10 MB/min stereo |

The app should avoid this default shape:

```text
gayageum-layer.wav
janggu-layer.wav
daegeum-layer.wav
accompaniment-layer.wav
mixdown.wav
```

That shape multiplies storage by track count and makes a few short Works consume tens or hundreds of MB. It is acceptable only for temporary render caches or explicit export/debug artifacts.

### Asset Source Boundary

- Technical tests may use synthetic local fixture WAV files and do not require AI or backend-generated audio.
- Release-quality samples should come from owned, licensed, or rights-cleared sources and be published through `SampleAssetManifest`.
- AI-generated audio is not the MVP default path. If used for throwaway fixtures, it must not be confused with release-ready samples.
- Backend responsibilities, when introduced, are asset preparation, rights/source metadata, manifest publication, and optional export upload/storage. Runtime instrument play must still work from local preload/cache.

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
