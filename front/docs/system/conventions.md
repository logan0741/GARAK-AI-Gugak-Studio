# Team Conventions

상태: 팀 기준  
범위: 브랜치, 커밋 메시지, 프론트엔드 코드 스타일

이 문서는 GARAK 프론트엔드 작업의 협업 컨벤션이다. 커밋, 브랜치 생성, 코드 구현은 이 문서를 따른다.

## Branch Strategy

- `main`: 배포 브랜치. push 시 GitHub Actions로 배포가 진행된다.
- `develop`: 기능별 브랜치를 merge하는 통합 브랜치.
- 기능별 브랜치에서 개발한 뒤 `develop`으로 PR을 만든다.
- 트랙별 팀원 리뷰가 모두 완료되어야 merge한다.

## Branch Naming

형식:

```text
<type>/<issue-number>-<short-keyword>
```

예시:

```text
feat/1-login
fix/2-login-error
refactor/3-user-service
docs/78-readme-update
```

Allowed branch types:

| type | 의미 | 예시 |
| --- | --- | --- |
| `feat` | 새로운 기능 추가 | `feat/12-login` |
| `fix` | 버그 수정 | `fix/34-token-error` |
| `refactor` | 코드 리팩토링 | `refactor/56-user-service` |
| `docs` | 문서 수정 | `docs/78-readme-update` |
| `style` | 코드 포맷/스타일 | `style/79-format` |
| `test` | 테스트 코드 | `test/80-signup` |
| `deploy` | 배포 관련 | `deploy/81-v1.2.0` |
| `hotfix` | 긴급 패치 | `hotfix/82-critical-bug` |

## Commit Convention

형식:

```text
<type>: <summary>
```

Allowed commit types:

| type | 의미 | 예시 |
| --- | --- | --- |
| `feat` | 새로운 기능 추가 | `feat: 로그인 API 연동` |
| `fix` | 버그 수정 | `fix: 회원가입 시 닉네임 중복 오류 수정` |
| `docs` | 문서 수정 | `docs: 팀 협업 규칙 문서 추가` |
| `style` | 코드 포맷, 세미콜론 등 비기능적 변경 | `style: import 순서 정렬` |
| `refactor` | 기능 변화 없는 코드 리팩토링 | `refactor: useAuth 훅 로직 단순화` |
| `test` | 테스트 코드 추가/수정 | `test: GiftGrid 컴포넌트 렌더링 테스트 추가` |
| `chore` | 빌드, 패키지, 설정 등 기타 작업 | `chore: eslint 룰 업데이트` |
| `perf` | 성능 개선 | `perf: 이미지 업로드 속도 개선` |
| `ci` | CI/CD 관련 설정 변경 | `ci: GitHub Actions 테스트 워크플로 수정` |
| `revert` | 이전 커밋 되돌리기 | `revert: "feat: 회원가입 API 연결"` |

Rules:

- 제목은 한 줄로 쓴다.
- 타입은 위 표에 있는 값만 사용한다.
- 문서만 바꾸는 커밋은 `docs:`를 사용한다.
- 패키지/빌드/설정만 바꾸는 커밋은 `chore:`를 사용한다.
- 테스트만 바꾸는 커밋은 `test:`를 사용한다.

## Repository Layout

프론트엔드 작업 산출물은 저장소의 `front/` 하위에 둔다. 현재 GARAK 프론트엔드 프로젝트의 문서, 앱 코드, 패키지 설정은 `front/` 아래에서 관리한다.

## Front-end Coding Convention

- ESLint와 Prettier를 사용한다.
- TypeScript strict mode를 유지한다.
- 코드 스타일은 Google Style Guide의 일반 원칙을 참고한다: https://google.github.io/styleguide/
- 도메인 코드는 React Native API에 직접 의존하지 않는다.
- UI gesture는 저장소에 직접 기록하지 않고 `GestureMapper`를 통해 `PerformanceEvent`로 정규화한다.
- 오디오 라이브러리는 `SamplerEngine` 구현체 내부에서만 import한다.

