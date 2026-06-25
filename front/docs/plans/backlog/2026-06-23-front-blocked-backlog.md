# 2026-06-23 Front Blocked Backlog

상태: blocked backlog
범위: `front/` 화면 셸 이후 남은 프론트엔드 작업 중 현재 에이전트가 사용자 추가 도움 없이 끝낼 수 없는 항목
관련 문서: `../../reports/2026-06-18-s01-s23-screen-flow-implementation-report.md`, `../../architecture/tech-stack.md`, `../../qa/README.md`, `../../architecture/ai-model-pipeline-contract.md`

이 문서는 구현 가능한 작업과 blocked 작업을 섞지 않기 위한 백로그다. 각 항목은 unblock 조건이 충족되면 별도 구현 계획 또는 PR로 승격한다.

## Blocked Items

| ID | 항목 | 막힌 이유 | Unblock 조건 | 다음 PR 단위 |
| --- | --- | --- | --- | --- |
| FB-01 | 실기기 오디오 지연 검증과 최종 엔진 선택 | 에뮬레이터나 웹으로는 터치-발음 지연, pitch bend, mute release 품질을 판단할 수 없다. | 실제 iOS/Android dev build, 테스트 기기명/OS, Day 2-5 smoke/probe 기록 | `qa:day5-readiness` 입력 파일 작성 후 엔진 선택 기록 갱신 |
| FB-02 | 실제 샘플 다운로드와 캐시 | 현재 repo에는 가야금 synthetic dev fixture만 있고, 장구/대금 release asset 및 라이선스가 없다. | release 후보 샘플 파일, 출처/라이선스, 악기별 `SampleAssetManifest` 계약 | 악기별 샘플 manifest와 캐시 상태 UI 연결 |
| FB-03 | 실제 오디오 인코딩과 OS 공유 시트 | 현재 `ExportedAudio`는 placeholder URI이며, 네이티브 인코딩/파일 저장/공유 권한 검증이 필요하다. | 선택한 오디오 엔진의 export API, 저장 위치 정책, iOS/Android 공유 동작 확인 | S07 내보내기 -> S17/S19 실제 파일 URI 연결 |
| FB-04 | 로그인 제공자와 계정 동기화 | S22/S23은 선택 로그인 화면 셸만 있고 인증 provider/API 계약이 확정되지 않았다. | 인증 provider, 토큰 갱신 정책, 계정 보관함 API, 충돌 해결 기준 | S23 로그인/동기화 상태 머신과 storage adapter 연결 |
| FB-05 | 실제 커뮤니티 피드 백엔드 | S20/S21은 데모 피드이며 공개 콘텐츠 moderation, share link API, feed API가 필요하다. | 공유 링크 API, feed read API, 신고/비공개 정책 | S20/S21 원격 피드 adapter와 오류/빈 상태 연결 |
| FB-06 | 장구/대금 정교한 연주 엔진 | 제품 범위에는 포함되어 있으나 현재 기술 검증은 가야금 12현 중심이다. | 장구/대금 입력 모델, 샘플 매핑, 실기기 연주 QA 기준 | 악기별 `PerformanceEvent` planner와 연주 surface 확장 |
| FB-07 | AI 모델 서버 실연동 | 프론트는 로컬 fallback을 유지해야 하며, 모델 서버 입력/출력 계약 없이는 자동 연결할 수 없다. | 분석/장단/피드백 API 계약과 실패 응답 형태 확정 | S10B/S16에서 AI 추천/피드백 adapter 연결 |

## Not Blocked

아래 항목은 현재 코드에서 이미 처리되어 있거나 별도 코드 PR로 처리 가능한 범위다.

| 항목 | 현재 상태 |
| --- | --- |
| S07 작업/내보낸 음원 분리 | `Work`, `ExportedAudio`, `PracticeResult` 모델과 보관함 섹션 분리 구현됨 |
| S10A/S10B 장단 책임 분리 | 라이브 장단 가이드와 반주 트랙 생성을 분리해 구현됨 |
| 새 트랙 시작 박자 | `playheadBeat`가 제공되면 트랙의 `startedAtBeat`에 반영됨 |
| S07 mute/solo 제어 | 별도 프론트 코드 PR에서 처리 |

## Promotion Rule

blocked 항목을 구현 작업으로 승격할 때는 다음을 먼저 채운다.

1. 입력 자료: 기기명/OS, API 계약, 샘플 파일, 라이선스, 테스트 계정 중 필요한 항목
2. 변경 파일: `src/`, `docs/qa/`, `docs/architecture/` 중 실제 수정 경로
3. 검증 명령: 자동 테스트, 타입체크, 실기기 QA 명령 또는 수동 체크리스트
4. fallback: 외부 API, 네이티브 기능, 샘플 로딩 실패 시 유지할 사용자 흐름
