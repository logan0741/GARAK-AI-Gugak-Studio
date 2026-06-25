# 2026-06-23 Google 로그인 연동 백로그

상태: blocked backlog
작성일: 2026-06-23
문서 책임: Google Sign-In A 방식 연동 중 현재 세션에서 실기기, Google Cloud 권한, 백엔드 배포 환경 없이는 완료할 수 없는 항목을 분리한다.

## 남은 항목

| 항목 | 막힘 이유 | 필요한 입력 | 다음 처리 |
| --- | --- | --- | --- |
| Android OAuth 클라이언트 생성 | 네이티브 Google Sign-In은 Android 패키지명과 SHA-1/SHA-256 인증서 지문이 필요하다. | `com.gukakstudio.prototype`에 대한 debug/release SHA-1 또는 EAS credential 정보 | Google Cloud에서 Android OAuth Client ID를 만들고 실제 Android dev build에서 로그인 검증 |
| iOS OAuth 클라이언트 생성 | iOS Google Sign-In은 iOS client ID 또는 `GoogleService-Info.plist`/URL scheme 설정이 필요하다. | `com.gukakstudio.prototype` iOS OAuth Client ID와 reversed client ID | `app.json`의 `@react-native-google-signin/google-signin` plugin 설정에 `iosUrlScheme` 반영 후 iOS dev build 검증 |
| Expo Go 한계 확인 | `@react-native-google-signin/google-signin`은 Expo Go에서 동작하지 않고 dev build가 필요하다. | Android/iOS dev build 설치 환경 | `npx expo run:android` 또는 EAS dev build에서 실제 로그인 확인 |
| Web OAuth origin 등록 | 웹 로그인 확인은 Google Cloud의 승인된 JavaScript origin 등록이 필요하다. | 로컬 Expo web 주소: `http://localhost:8081`, `http://localhost:8098` 등 실제 실행 포트 | Google Cloud Web Client에 origin 추가 후 웹 로그인 프롬프트 확인 |
| 백엔드 운영 환경 설정 | 프론트는 ID token을 전달하지만 백엔드가 같은 audience로 검증해야 한다. | `GOOGLE_CLIENT_ID=917425049370-atrmiltldp0jg5ps2i3mm594fcn8gckv.apps.googleusercontent.com`, `BYPASS_AUTH=false`, `JWT_SECRET_KEY` | 백엔드 환경변수 반영 후 `/api/auth/google`, `/api/auth/me`, `/api/auth/refresh` 실통합 검증 |
| 실제 기기 시각 QA | 현재 세션에서는 실제 폰 safe area, Pretendard 네이티브 렌더링, Google 계정 선택 UI를 직접 확인할 수 없다. | Android/iOS 실기기 또는 에뮬레이터 dev build 화면 캡처 | 온보딩 3종, 로그인, 게스트 진입, 로그인 성공 후 홈 화면을 검증 |
