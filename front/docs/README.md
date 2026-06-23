# docs 디렉터리 안내

이 파일은 `docs/` 폴더의 입구 안내다. 어떤 질문의 최종 기준이 어느 문서인지는 `document-authority-index.md`를 따른다.

## 주요 경로

| 경로 | 역할 |
| --- | --- |
| `document-authority-index.md` | 질문별 최종 기준 문서를 알려주는 루트 인덱스 |
| `product/` | 제품 기준, 화면 흐름, 공모전/제안 문맥 |
| `design/` | Figma 디자인 시스템 해석, 색상, 로고 후보, 기초 UI 요소 |
| `product/screen-flow/` | 현재 화면 구조와 화면 변경 이력 |
| `domain/` | DDD 도메인 용어, aggregate, invariant |
| `architecture/` | ERD, 런타임 경계, 기술 스택 |
| `adr/` | 되돌리기 어려운 아키텍처 결정 기록 |
| `plans/` | 구현 순서, 파일 경로, 검증 명령 |
| `system/` | 문서화 기준, 브랜치/커밋/협업 컨벤션 |
| `qa/` | 수동 QA와 오디오/기기 검증 기준 |
| `reviews/` | 과거 리뷰와 리스크 점검 기록 |
| `reports/` | 구현 결과와 팀 공유용 보고서 |
| `logs/` | 작업 중단, 실패, handoff 기록 |

## 사용 원칙

- 현재 판단을 찾을 때는 먼저 `document-authority-index.md`를 확인한다.
- 새 문서는 한 가지 책임만 갖도록 만든다.
- 변경 이력은 현재 기준 문서에 섞지 않고 담당 `changes/` 또는 `logs/` 경로에 분리한다.
- 리뷰와 로그의 결론을 현재 기준으로 쓰려면 담당 기준 문서에 반영한다.
- Figma 와이어프레임과 디자인 시스템은 완성본이 아니다. 색상, 로고, UI 요소 해석은 `design/DESIGN.md`를 확인하되 제품/화면 기준과 충돌하면 충돌을 먼저 기록한다.
