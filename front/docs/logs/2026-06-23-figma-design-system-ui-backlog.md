# 2026-06-23 Figma 디자인 시스템 UI 후속 백로그

상태: blocked backlog
작성일: 2026-06-23
문서 책임: 이번 Figma 디자인 시스템 반영 작업에서 자동화와 로컬 웹 검증만으로 완료할 수 없는 후속 항목을 분리 기록한다.

관련 문서: `../design/DESIGN.md`, `../product/screen-flow/screen-composition-standards.md`, `../qa/README.md`

## 항목

| 항목 | 막힌 이유 | 필요한 입력 | 다음 처리 |
| --- | --- | --- | --- |
| 실제 Android/iOS 기기 시각 QA | 현재 세션에서는 실제 기기 화면, Pretendard 네이티브 로딩, safe area, 터치 영역을 직접 확인할 수 없다. | dev build가 설치된 실제 기기와 화면 캡처 | S01, S04, S05, S07, S18의 Pretendard 렌더링, 텍스트 겹침, 터치 대상 44px 이상 여부를 확인한다. |
| 실제 기기 오디오/연주 몰입 QA | 이번 변경은 UI 색상/문서 반영이며, 오디오 지연과 연주 몰입은 기기에서만 판단할 수 있다. | 실제 기기에서 샘플 재생, 녹음, 리플레이 확인 | 기존 `docs/qa/` 기준에 따라 오디오 지연, 글리산도, bend, mute/release를 검증한다. |
| Figma 로고 원본 에셋 export | 스크린샷을 앱 에셋으로 쓰면 품질과 권리/버전 관리가 불명확하다. | Figma 원본에서 승인된 SVG 또는 3x PNG export | `assets/brand/logo1.*`, `logo2.*`, `logo3.*` 경로를 확정한 뒤 앱에 연결한다. |
| Figma 변수/스타일 승격 여부 확인 | 현재 파일에는 로컬 변수와 로컬 스타일이 정의되어 있지 않아 레이어 fill 기준으로 토큰을 추출했다. | 디자인 팀이 Figma variables/styles를 생성하거나 확정했다는 확인 | 토큰 이름은 유지하고 `src/product/designTokens.ts`의 값만 갱신한다. |
| 로그인/게스트 버튼 좌측 아이콘 정리 | D-2 MVP 핵심 기능이 아니어서 즉시 구현하지 않는다. 현재 `Google로 계속하기`는 텍스트 `G` 마크이고 `Guest Mode`는 좌측 아이콘이 없다. | Google 브랜드 가이드에 맞는 공식 G 로고 에셋 사용 허용 여부와 게스트 아이콘 후보 | 로그인 화면 polish 작업 때 Google 버튼은 공식 멀티컬러 G 로고로 교체하고 Guest Mode에도 좌측 아이콘을 추가한다. |
| 저장/편집 화면 하단 CTA 박스 레이아웃 정리 | D-2 핵심 오디오 검증보다 낮은 우선순위지만, 저장/편집 화면 하단의 `작업 저장` / `Save & Share Project` 박스가 위쪽 `Mix` 버튼과 크기가 달라 시각적으로 어긋난다. | S07/S17 화면의 하단 CTA 영역 캡처와 모바일 가로/세로 기준 크기 | 저장/편집 화면 polish 때 하단 CTA 박스와 상단/인접 `Mix` 버튼의 폭, 높이, radius, 내부 여백을 같은 컴포넌트 규칙으로 정렬한다. |
| S05/S09 좌상단 live audio 상태 UI 정리 | 현재 pre-tap `소리 준비 완료` 배지는 숨김 처리했고 `Garak live audio ready` QA/accessibility anchor만 남긴다. 다만 `Live audio sent: N events`처럼 연주 후 상태를 좌상단에 보여주는 표시도 최종 사용자에게는 구현 상태 노출에 가깝다. | app-flow/device-smoke가 사용할 숨김 accessibility/QA anchor 유지 여부와 발표 후에도 사용자에게 남길 피드백 범위 | polish 작업 때 좌상단 visible readiness/playback evidence badge를 제거하거나 QA-only로 전환하고, 필요한 경우 실패/재시도처럼 사용자가 조치해야 하는 상태만 노출한다. |
