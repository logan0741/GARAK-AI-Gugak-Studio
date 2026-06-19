# S01-S23 화면 구조 시각 지도

상태: 팀 리뷰용 시각 자료
작성일: 2026-06-18
관련 문서: `2026-06-18-s01-s23-screen-flow-implementation-report.md`, `../product/screen-flow/current-screen-flow.md`

이 문서는 S01-S23 화면 구조를 팀이 빠르게 훑어볼 수 있도록 시각화한 자료다. 현재 기준 문서는 `../product/screen-flow/current-screen-flow.md`이며, 이 문서는 보고와 리뷰를 위한 보조 자료다.

## 1. 전체 화면 지도

```mermaid
flowchart TD
    App["앱 실행"] --> S01["S01 홈<br/>게스트 기본 진입"]

    S01 --> S02["S02 언어 전환"]
    S01 --> S03["S03 입문 가이드"]
    S01 --> FreeGate["자유창작 모드 선택"]
    S01 --> PracticeGate["따라하기 모드 선택"]
    S01 --> S18["S18 보관함"]
    S01 --> S20["S20 쉐어 / 둘러보기"]
    S01 --> S22["S22 마이 / 설정"]

    FreeGate --> S04["S04 악기 선택"]
    S04 --> S04A["S04A 연주 기본 설정"]
    S04A --> S05["S05 악기 자유연주"]

    S05 --> S10A["S10A 라이브 장단 가이드"]
    S10A --> S05
    S05 --> AutoSave["작업 자동 저장"]
    AutoSave --> S07["S07 트랙/레이어 편집"]

    S07 --> S08["S08 트랙 추가"]
    S08 --> S09["S09 추가 악기 녹음"]
    S08 --> S10B["S10B 반주 트랙 만들기"]
    S09 --> S07
    S10B --> S07
    S07 --> S19["S19 연주 상세 / 플레이어"]
    S07 --> S18

    PracticeGate --> S13["S13 민요 선택"]
    S13 --> S14["S14 따라하기 악기 선택"]
    S14 --> S15["S15 따라하기 연주"]
    S15 --> S16["S16 결과 / AI 피드백"]
    S16 --> S17["S17 공유 준비"]
    S16 --> S18

    S18 --> S07
    S18 --> S19
    S18 --> S17
    S19 --> S07
    S19 --> S17

    S20 --> S21["S21 공유 곡 상세"]
    S21 --> S07
    S21 --> S18

    S22 --> S23["S23 로그인 / 보관함 동기화"]
    S22 --> S02
    S23 --> S18
    S23 --> S22

    X06["S06 제외<br/>완료 화면 없음"]
    X11["S11 제외<br/>S10B 후 S07 복귀"]
    X12["S12 제외<br/>S01 토글 상태로 흡수"]

    classDef required fill:#E6E6E6,stroke:#777,color:#333;
    classDef recommended fill:#F2F2F2,stroke:#999,color:#555,stroke-dasharray: 5 4;
    classDef excluded fill:#FFFFFF,stroke:#B55D4C,color:#B55D4C,stroke-dasharray: 3 3;
    class S01,S02,S04,S04A,S05,S07,S08,S09,S10A,S10B,S13,S14,S15,S16,S17,S18,S19,S22 required;
    class S03,S20,S21,S23 recommended;
    class X06,X11,X12 excluded;
```

## 2. 자유창작 흐름

```mermaid
flowchart LR
    S01["S01 홈"] --> Mode["자유창작 모드"]
    Mode --> S04["S04 악기 선택<br/>가야금 / 장구 / 대금"]
    S04 --> S04A["S04A 연주 기본 설정<br/>악기별 설정"]
    S04A --> S05["S05 악기 자유연주<br/>녹음 / 장단 / 레이어 / 완료"]

    S05 --> Guide["S10A 라이브 장단 가이드<br/>트랙 생성 없음"]
    Guide --> S05

    S05 --> Complete["완료"]
    Complete --> Work["Work 자동 저장<br/>편집 가능한 작업"]
    Work --> S07["S07 트랙/레이어 편집"]

    S07 --> S08["S08 트랙 추가"]
    S08 --> InstrumentAdd["악기 연주 추가"]
    InstrumentAdd --> S09["S09 추가 악기 녹음"]
    S09 --> NewTrack["InstrumentTrack 추가"]
    NewTrack --> S07

    S08 --> AccompanimentAdd["장단/반주 추가"]
    AccompanimentAdd --> S10B["S10B 반주 트랙 만들기"]
    S10B --> AccompanimentTrack["AccompanimentTrack 추가"]
    AccompanimentTrack --> S07

    S08 --> ImportLocked["가져오기<br/>잠금"]

    S07 --> Export["내보내기"]
    Export --> ExportedAudio["ExportedAudio<br/>공유 가능"]
    ExportedAudio --> S19["S19 플레이어"]
    S19 --> S17["S17 공유 준비"]
```

## 3. 따라하기와 공유 흐름

```mermaid
flowchart LR
    S01["S01 홈"] --> PracticeMode["따라하기 모드"]
    PracticeMode --> S13["S13 민요 선택<br/>아리랑 / 도라지 / 뱃노래"]
    S13 --> S14["S14 따라하기 악기 선택<br/>추천 배지, 강제 없음"]
    S14 --> S15["S15 따라하기 연주<br/>가이드 하이라이트"]
    S15 --> S16["S16 결과 / AI 피드백<br/>로컬 템플릿 fallback"]

    S16 --> Retry["다시 연주"]
    Retry --> S15

    S16 --> SaveResult["저장"]
    SaveResult --> PracticeResultA["PracticeResult 생성"]
    PracticeResultA --> S18["S18 보관함"]

    S16 --> ShareResult["공유"]
    ShareResult --> PracticeResultB["PracticeResult 생성<br/>공유 대상"]
    PracticeResultB --> S17["S17 공유 준비"]
    S17 --> S20["S20 쉐어 / 둘러보기"]
```

## 4. 보관함과 로그인 흐름

```mermaid
flowchart TD
    S18["S18 보관함"] --> Works["작업 탭<br/>Work"]
    S18 --> Shareables["내보낸 음원 / 결과<br/>ExportedAudio + PracticeResult"]

    Works --> OpenWork["작업 열기"]
    OpenWork --> S07["S07 트랙/레이어 편집"]

    Shareables --> Listen["들어보기"]
    Listen --> S19["S19 연주 상세 / 플레이어"]
    S19 --> S17["S17 공유 준비"]

    S22["S22 마이 / 설정"] --> LoginReason["로그인하고 내 곡 불러오기"]
    LoginReason --> S23["S23 로그인 / 보관함 동기화"]
    S23 --> PreserveLocal["로컬 보관함 유지"]
    PreserveLocal --> Merge["계정 보관함 병합 / 선택 동기화"]
    Merge --> S18
```

## 5. 산출물 기준

```mermaid
flowchart TD
    S05["S05 자유연주 완료"] --> Work["Work<br/>편집 가능, 직접 공유 불가"]
    Work --> S07["S07 편집"]
    S07 --> Export["내보내기"]
    Export --> ExportedAudio["ExportedAudio<br/>공유 가능"]

    S15["S15 따라하기 연주"] --> S16["S16 결과"]
    S16 --> PracticeResult["PracticeResult<br/>공유 가능"]

    ExportedAudio --> S17["S17 공유 준비"]
    PracticeResult --> S17

    Work -. "직접 공유하지 않음" .-> Blocked["공유 대상 아님"]
```

## 6. 팀 리뷰 체크포인트

| 확인할 점 | 현재 구조 |
| --- | --- |
| 첫 실행 로그인 | 없음. S01 홈으로 바로 진입 |
| 홈 1차 선택 | 자유창작 모드 / 따라하기 모드 |
| MVP 악기 | 가야금, 장구, 대금 |
| 완료 후 이동 | S05 완료 -> Work 자동 저장 -> S07 |
| 라이브 장단과 반주 트랙 | S10A와 S10B로 책임 분리 |
| 공유 대상 | `ExportedAudio`, `PracticeResult` |
| 작업 공유 | 자동 저장된 `Work`는 직접 공유하지 않음 |
| 제외 화면 | S06, S11, S12 |
