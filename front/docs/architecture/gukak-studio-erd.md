# GARAK ERD

이 문서는 팀원 공유를 위한 GARAK MVP의 도메인 데이터 모델이다.

현재 MVP에서 이 ERD는 반드시 관계형 DB를 만들겠다는 뜻이 아니다. 로컬 JSON, SQLite, IndexedDB, Supabase, Firebase 등 어떤 저장소를 쓰더라도 유지해야 하는 엔티티 관계와 직렬화 구조를 정의한다.

문서 책임: 저장소 독립적인 엔티티 관계와 직렬화 구조를 정의한다. 도메인 용어와 불변조건은 `../domain/README.md`를 따르고, 구체 기술 스택은 `tech-stack.md`를 따른다.

현재 ERD의 상세 입력면은 가야금 프로토타입에서 출발한다. 제품 기준의 MVP 악기 범위는 가야금, 장구, 대금이며, 세 악기는 같은 `Session`과 `PerformanceEvent` 경계를 공유한다.

## 모델링 원칙

- `Session`이 사용자의 연주 데이터를 보존하는 기준 데이터다.
- `PerformanceEvent`는 리플레이 가능한 연주의 최소 기록 단위다.
- `Recording`은 `Session`에서 렌더링된 선택적 산출물이며, 기준 데이터가 아니다.
- `SampleAssetManifest`는 실제 재생 가능한 오디오 에셋 목록이다.
- `DataReferenceManifest`는 분석/검증/심사용 근거 데이터 목록이며, 재생 에셋과 섞지 않는다.
- 장단 AI는 오디오 생성 모델이 아니라 `PerformanceEvent`를 분석해 `JangdanPreset`을 추천하는 계층이다.
- MVP에서는 사용자 계정, 클라우드 라이브러리, 커뮤니티 피드 엔티티를 제외한다. 단, `Session`은 추후 계정 기반 저장소로 이전할 수 있도록 직렬화 가능해야 한다.

## Core ERD

```mermaid
erDiagram
    INSTRUMENT ||--o{ INSTRUMENT_CONTROL_SURFACE : exposes
    INSTRUMENT ||--o{ INSTRUMENT_STRING : has
    INSTRUMENT ||--o{ SESSION : selected_for

    SESSION ||--o{ PERFORMANCE_EVENT : records
    SESSION ||--o{ RECORDING : renders_to
    SESSION ||--o{ JANGDAN_RECOMMENDATION : receives
    SESSION }o--|| SAMPLE_ASSET_MANIFEST : uses
    SESSION }o--o| DATA_REFERENCE_MANIFEST : cites_for_demo

    SAMPLE_ASSET_MANIFEST ||--o{ SAMPLE_ASSET : includes
    SAMPLE_ASSET ||--o{ INSTRUMENT_CONTROL_SURFACE_SAMPLE_MAP : mapped_by
    INSTRUMENT_CONTROL_SURFACE ||--o{ INSTRUMENT_CONTROL_SURFACE_SAMPLE_MAP : uses
    SAMPLE_ASSET ||--o{ INSTRUMENT_STRING_SAMPLE_MAP : mapped_by
    INSTRUMENT_STRING ||--o{ INSTRUMENT_STRING_SAMPLE_MAP : uses

    DATA_REFERENCE_MANIFEST ||--o{ DATA_REFERENCE : includes

    JANGDAN_PRESET ||--o{ JANGDAN_PATTERN_EVENT : contains
    JANGDAN_PRESET ||--o{ JANGDAN_PRESET_ASSET : uses
    SAMPLE_ASSET ||--o{ JANGDAN_PRESET_ASSET : used_by
    JANGDAN_PRESET ||--o{ JANGDAN_RECOMMENDATION : recommended_as

    INSTRUMENT {
        string id PK
        string type
        string display_name
        int string_count
        string default_tuning_mode
        string version
    }

    INSTRUMENT_CONTROL_SURFACE {
        string id PK
        string instrument_id FK
        string surface_type
        string label
        int order_index
        string pitch_role "nullable"
        json input_schema
    }

    INSTRUMENT_STRING {
        string id PK
        string instrument_id FK
        int string_index
        string label
        string base_note_name
        int base_pitch_cents
    }

    SESSION {
        string id PK
        string instrument_id FK
        string sample_asset_manifest_id FK
        string data_reference_manifest_id FK "nullable"
        string title
        int created_at_ms
        int updated_at_ms
        int duration_ms
        string schema_version
        json replay_settings
    }

    PERFORMANCE_EVENT {
        string id PK
        string session_id FK
        int occurred_at_ms
        string event_type
        int string_index "nullable"
        string control_surface_id "nullable"
        string active_voice_id "nullable"
        int pitch_bend_cents "nullable"
        float velocity "nullable"
        json payload
    }

    RECORDING {
        string id PK
        string session_id FK
        string file_uri
        string format
        int duration_ms
        string render_status
        int created_at_ms
    }

    SAMPLE_ASSET_MANIFEST {
        string id PK
        string version
        string instrument_id FK
        int created_at_ms
        string source_policy
    }

    SAMPLE_ASSET {
        string id PK
        string manifest_id FK
        string source_layer
        string file_uri
        string license
        string attribution
        string base_note_name
        int base_pitch_cents
        json envelope
        json quality_flags
    }

    INSTRUMENT_CONTROL_SURFACE_SAMPLE_MAP {
        string id PK
        string control_surface_id FK
        string sample_asset_id FK
        string articulation
        int priority
        bool is_fallback
    }

    INSTRUMENT_STRING_SAMPLE_MAP {
        string id PK
        string instrument_string_id FK
        string sample_asset_id FK
        string articulation
        int priority
        bool is_fallback
    }

    DATA_REFERENCE_MANIFEST {
        string id PK
        string version
        int created_at_ms
        string usage_scope
    }

    DATA_REFERENCE {
        string id PK
        string manifest_id FK
        string reference_layer
        string provider
        string dataset_name
        string license_note
        string usage_note
        json extracted_features
    }

    JANGDAN_PRESET {
        string id PK
        string name
        int min_bpm
        int max_bpm
        string meter
        string description
    }

    JANGDAN_PATTERN_EVENT {
        string id PK
        string jangdan_preset_id FK
        int step_index
        int offset_ms
        string percussion_slot
        float velocity
    }

    JANGDAN_PRESET_ASSET {
        string id PK
        string jangdan_preset_id FK
        string sample_asset_id FK
        string percussion_slot
    }

    JANGDAN_RECOMMENDATION {
        string id PK
        string session_id FK
        string jangdan_preset_id FK
        float score
        int estimated_bpm
        float density
        float beat_stability
        string decision_status
        int created_at_ms
        int accepted_at_ms "nullable"
        json reason
    }
```

## Entity Notes

| 엔티티 | 역할 | MVP 구현 메모 |
| --- | --- | --- |
| `Instrument` | 가야금, 장구, 대금 등 악기 정의 | MVP 제품 범위는 `12_string_gayageum`, `janggu`, `daegeum`이다. |
| `InstrumentControlSurface` | 악기별 입력면과 발음 제어 영역 | 가야금 현, 장구 북편/채편, 대금 지공/호흡 입력 영역을 같은 방식으로 식별한다. |
| `InstrumentString` | 가야금 전용 현별 기준 음고와 표시 정보 | 현재 가야금 프로토타입 호환을 위한 세부 엔티티다. 범용 입력면 기준은 `InstrumentControlSurface`를 따른다. |
| `Session` | 연주의 기준 데이터 | 로컬 저장의 최상위 JSON 문서가 될 수 있다. |
| `PerformanceEvent` | 연주 이벤트 로그 | 가야금은 `string_index`, 장구와 대금은 `control_surface_id`와 `payload`로 악기별 입력을 표현한다. |
| `Recording` | 오디오 렌더링 결과 | 실패해도 `Session` 리플레이는 보존되어야 한다. |
| `SampleAssetManifest` | 재생 에셋 버전 목록 | 리플레이 시 같은 샘플 환경을 찾기 위해 `Session`에 버전을 남긴다. |
| `SampleAsset` | 실제 소리 파일과 메타데이터 | `source_layer`는 `public_asset` 또는 `own_asset`만 허용한다. |
| `DataReferenceManifest` | 분석/검증 데이터 버전 목록 | 재생 에셋과 분리한다. 심사용 인스펙터가 참조할 수 있다. |
| `DataReference` | 공공데이터/AI Hub 등 참조 데이터 | 원본을 앱에 통배포하지 않고 추출 특징과 활용 메모를 기록한다. |
| `JangdanPreset` | 장단 프리셋 | 중모리, 굿거리, 자진모리 등 제한된 로컬 프리셋으로 시작한다. |
| `JangdanRecommendation` | 장단 추천 결과 | 자동 적용하지 않고 `proposed -> previewed -> accepted/rejected` 흐름을 따른다. |

## Session JSON Shape

MVP에서는 아래 가야금 예시처럼 `Session`을 하나의 직렬화 가능한 문서로 저장할 수 있다.

```json
{
  "id": "session_001",
  "schemaVersion": "2026.06.mvp",
  "instrumentId": "12_string_gayageum",
  "sampleAssetManifestId": "gayageum_samples_2026_06_a",
  "dataReferenceManifestId": "gukak_references_2026_06_a",
  "title": "first-arirang-session",
  "createdAtMs": 1790940000000,
  "durationMs": 28000,
  "replaySettings": {
    "baseBpm": 90,
    "tuningMode": "mvp_default"
  },
  "events": [
    {
      "id": "event_001",
      "occurredAtMs": 0,
      "eventType": "string_pluck",
      "stringIndex": 5,
      "velocity": 0.74,
      "payload": {}
    },
    {
      "id": "event_002",
      "occurredAtMs": 320,
      "eventType": "string_bend",
      "stringIndex": 5,
      "pitchBendCents": 22,
      "payload": {
        "gestureAxis": "y"
      }
    }
  ],
  "jangdanRecommendations": [
    {
      "id": "recommendation_001",
      "jangdanPresetId": "gutgeori",
      "score": 0.82,
      "estimatedBpm": 92,
      "density": 0.38,
      "beatStability": 0.71,
      "decisionStatus": "proposed",
      "reason": {
        "primarySignal": "estimated_bpm",
        "message": "BPM과 터치 밀도가 굿거리 범위에 가깝다."
      }
    }
  ],
  "recordings": []
}
```

## Relationship Rules

- `Session`은 반드시 하나의 `Instrument`와 하나의 `SampleAssetManifest`를 참조한다.
- `Session`은 `DataReferenceManifest`를 선택적으로 참조한다. 일반 런타임에는 없어도 되지만, 데모 인스펙터와 심사용 근거 표시에는 유용하다.
- `PerformanceEvent`는 반드시 `Session`에 속한다. 세션 밖의 독립 이벤트는 저장하지 않는다.
- `Recording`은 반드시 `Session`에서 파생된다. `Recording`만으로는 연주 맥락을 복구할 수 없다.
- `SampleAsset`은 반드시 하나의 `SampleAssetManifest`에 속한다.
- `DataReference`는 반드시 하나의 `DataReferenceManifest`에 속한다.
- `JangdanRecommendation`은 반드시 `Session`에 속하며, 하나의 `JangdanPreset` 후보를 가리킨다.
- 추천된 장단은 자동 적용하지 않는다. `decision_status`가 `accepted`일 때만 `LocalSequencer`가 해당 프리셋을 세션 반주로 사용한다.

## MVP Exclusions

아래 엔티티는 MVP ERD에서 제외한다.

- `User`, `Account`, `AuthProvider`: MVP는 로컬 세션 중심으로 검증한다.
- `CommunityPost`, `Comment`, `Like`: 내부 커뮤니티 피드는 MVP 범위가 아니다.
- `RemoteCollaborationRoom`: 실시간 원격 합주는 MVP 범위가 아니다.
- `NotationScore`, `JeongganboEditor`: 정간보 편집기는 MVP 범위가 아니다.
- `DawTrack`, `MidiNote`, `TimelineClip`: Studio는 DAW가 아니므로 MVP 데이터 모델에 두지 않는다.

## Future Extension Points

추후 확장 시 아래 관계를 추가할 수 있다.

```mermaid
erDiagram
    USER ||--o{ SESSION : owns
    SESSION ||--o{ SHARE_LINK : exposes
    SESSION ||--o{ MISSION_ATTEMPT : submitted_as
    MISSION ||--o{ MISSION_ATTEMPT : receives

    USER {
        string id PK
        string display_name
        string locale
        int created_at_ms
    }

    SHARE_LINK {
        string id PK
        string session_id FK
        string recording_id FK "nullable"
        string visibility
        int created_at_ms
        int expires_at_ms "nullable"
    }

    MISSION {
        string id PK
        string title
        string target_instrument_id FK
        string target_jangdan_preset_id FK "nullable"
        json success_criteria
    }

    MISSION_ATTEMPT {
        string id PK
        string mission_id FK
        string session_id FK
        string user_id FK
        float score
        int submitted_at_ms
    }
```

이 확장 엔티티들은 MVP에서 구현하지 않는다. 다만 현재 `Session` 구조가 JSON 직렬화와 외부 저장소 이전을 전제로 설계되어야 하는 이유를 보여주는 참조 모델로만 둔다.
