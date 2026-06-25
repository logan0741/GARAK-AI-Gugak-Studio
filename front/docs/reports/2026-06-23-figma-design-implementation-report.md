# 2026-06-23 Figma Design Implementation Report

상태: 1차 이식/구조 정리 반영, Figma 완전 일치 전 추가 보정 필요
소스: Figma `2026 솔챌`, page `Idea`

## 확인한 Figma 범위

- `180:999` 디자인 시스템: 색상 토큰, 346x48 pill button, quick access, 로그인 샘플, 상태바/홈 인디케이터, 악기 패널 조각.
- `288:294` 디자인: 온보딩, 로그인, 홈, 자유창작 흐름, 믹스/플레이어, 쉐어, 마이/라이브러리, 플레잉 홍보 화면.
- 사용자 제외 조건: `플레잉` 배경에 비치는 iPhone mockup 화면은 앱 UI로 복제하지 않는다.

## 이식한 디자인 시스템

- 핵심 색상: `#1A1C2D`, `#B51A14`, `#E59100`, `#F9F7F3`.
- 공통 UI: GARAK wordmark, pill button, segmented mode control, dark quick access pill, rounded visual hero, mini player, progress bar, instrument chips.
- 공통 토큰/매핑 위치: `src/product/garakDesignSystem.ts`, `src/product/garakUi.tsx`.
- 피그마 기본 악기 표시는 장구로 맞췄고, 기본값으로 시작할 때 상태도 장구로 확정되도록 연결했다.

## 화면 매핑

| Figma 요소 | 앱 화면 | 처리 |
| --- | --- | --- |
| 온보딩 / 로고 변형 | `S01`, 빈 상태, 로그인 동기화 | 필수 관문이 아니라 브랜드 순간으로 흡수 |
| 로그인 | `S23` | 첫 실행 관문 아님. 보관함 동기화가 필요할 때만 제안 |
| 홈 | `S01` | mode segmented control, hero, PLAY, quick access 반영 |
| 자유창작 악기 선택 | `S04`, `S04A` | MVP 악기 3개와 잠금 슬롯 반영 |
| 자유연주 / 트랙 / 반주 | `S05`, `S07`, `S08`, `S09`, `S10A`, `S10B` | 기존 로컬 연주/장단/레이어 기능에 연결 |
| 마이 | `S18`, `S22` | Figma의 playlist 성격은 보관함으로, 계정 설정은 `S22`로 분리 |
| 쉐어 | `S17`, `S20`, `S21` | 카테고리, 추천 카드, 내 GARAK 공유, 최근 재생 반영 |
| 플레잉 iPhone mockup | 없음 | 사용자 지시에 따라 제외 |

## 연결하지 못했거나 보류한 항목

- Figma의 `AI 반주 생성` 느낌은 실제 생성형 오디오로 구현하지 않았다. 현재 앱의 AI 범위는 로컬 장단 추천/프리셋 시퀀싱으로 제한한다.
- 실제 오디오 믹싱, 파일 내보내기, 원격 공유 피드 업로드는 placeholder 상태다. 화면은 연결했지만 백엔드/오디오 파이프라인 완성은 별도 작업이다.
- 로그인은 디자인처럼 큰 진입 화면으로 강제하지 않았다. 제품 문서 기준대로 게스트 홈 진입을 유지했다.
- 잠금 악기 슬롯은 결제/권한 기능이 아니라 이후 악기 확장을 위한 비활성 placeholder다.
- Figma의 실제 이미지 에셋은 export하지 않았다. 앱은 React Native 도형 기반 악기 비주얼로 피그마의 구도와 색을 우선 모사한다.

## 시각 QA에서 수정한 항목

- 악기 선택 화면에서 장구가 선택된 것처럼 보이는데 `Next`가 비활성화되던 문제를 수정했다.
- JSX 속성 문자열의 `\n`이 화면에 그대로 노출되던 헤딩들을 실제 줄바꿈 문자열로 변경했다.
- `마이 -> 쉐어`, `쉐어 -> 마이/홈`, `설정 -> 홈/쉐어` quick access 이동이 상태 머신에서 막히던 문제를 전이 정의와 self navigation 허용으로 수정했다.

## 디자인 리뷰 메모

- 정보구조: 8/10. Figma의 홈/마이/쉐어 축을 제품 문서의 `S01`, `S18`, `S20`에 맞춰 흡수했다.
- 디자인 시스템 일관성: 8/10. 색과 버튼/카드 규칙은 코드 토큰화했다. 실제 이미지 에셋 export 전이라 완전 복제는 아니다.
- 기능 연결성: 7/10. 기존 상태 머신과 라이브러리 모델에 연결했지만 믹싱/공유/생성 오디오는 아직 placeholder다.
- 반응형/시각 QA: 8/10. Expo Web에서 393x852 모바일과 1280x720 데스크톱을 확인했다. 네이티브 디바이스/에뮬레이터 검증은 별도 작업이다.
- 제품 제약 준수: 9/10. 로그인 강제, 전역 하단 탭, 생성형 오디오 과장, MVP 악기 확장을 피했다.

## 2026-06-23 재점검 및 리팩터링 메모

- 이식 마무리 여부: 마무리로 보기는 어렵다. 홈/마이/쉐어의 핵심 분위기와 일부 bitmap artwork는 Figma에 가까워졌지만, 전체 프레임의 spacing, 상태바/홈 인디케이터 정밀도, 모든 세부 아이콘/텍스트/화면 전환까지 pixel 수준으로 맞춘 상태는 아니다.
- 구조 정리: `GARAK_SCREEN_ASSETS`를 `src/product/garakScreenAssets.ts`로 분리하고, 큰 bitmap artwork와 투명 hit zone은 `src/product/garakArtworkPanels.tsx`로 이동했다. 화면 파일은 이제 화면 흐름과 dispatch 연결에 집중하도록 줄였다.
- 로고: 현재 repo 안에서 확인되는 SVG는 보고서용 `s01-s23-screen-flow-wireframe.svg`뿐이고, 제공된 GARAK 로고 SVG 파일은 없다. 공통 `GarakWordmark`는 `src/product/garakScreenAssets.ts`의 `brand.wordmark`를 통해 PNG fallback을 사용한다. 실제 로고 SVG가 assets에 들어오면 이 매핑 한 곳에서 교체할 수 있다.
- SVG 적용 제약: Expo/React Native에서 SVG를 공통 로고로 쓰려면 `react-native-svg` 및 SVG transformer 같은 로딩 경로가 필요하다. web 전용 `Image` 처리로 우회할 수도 있지만 native까지 같은 에셋을 쓰려면 별도 의존성 추가가 맞다.
- 시각 확인: Expo Web `http://localhost:8081`에서 홈, `마이` 탭의 라이브러리, 쉐어 화면을 캡처해 리팩터링 후 렌더가 유지되는 것을 확인했다. 캡처는 `.codex-runlogs/garak-refactor-visual-check/`에 있다.
- 남은 리팩터링: 현재 artwork 일부는 이미지 위 투명 hit zone으로 동작한다. 이미지가 바뀌어도 좌표를 많이 고치지 않으려면 장기적으로는 sliced asset 또는 실제 RN 컴포넌트 조합으로 더 분해해야 한다.
