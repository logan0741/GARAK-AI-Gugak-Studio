# Google Auth Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Figma logo/onboarding/login screens???�품 진입?�에 추�??�고 Google ID token 기반 ?�제 백엔??로그???�름???�결?�다.

**Architecture:** ???�단??`GarakAuthEntryApp`???�어 ?�보?? 로그?? 게스??진입, 로그??복원??처리?�다. A 방식?�로 Google Sign-In SDK가 받�? ID token??FastAPI `POST /api/auth/google`�??�달?�고, 발급??GARAK access/refresh token?� 보안 ?�?�소???�?�한?? 기존 `GarakScreenFlowApp`?� ?�증???�용???�는 게스??계정 ?�태�?prop?�로 받아 기존 S01-S23 ?�름???�더링한??

**Tech Stack:** Expo Router, React Native, @react-native-google-signin/google-signin, Google Identity Services for local web, expo-secure-store, react-native-svg, FastAPI CORS middleware, Vitest, Pytest.

---

### Task 1: Backend CORS

**Files:**
- Modify: `back/app/core/config.py`
- Modify: `back/app/main.py`
- Test: `back/tests/test_cors.py`

- [x] Write a failing pytest that sends an `OPTIONS /api/auth/google` preflight from `http://localhost:8098` and expects CORS allow-origin/header output.
- [x] Add `cors_origins` settings with localhost web origins.
- [x] Add `CORSMiddleware` before route registration.
- [x] Run `pytest tests/test_cors.py`.

### Task 2: Frontend Auth API

**Files:**
- Create: `front/src/product/authApi.ts`
- Test: `front/src/product/__tests__/authApi.test.ts`

- [x] Write failing Vitest coverage for Google login POST, `/me`, refresh, HTTP error parsing, and missing API URL validation.
- [x] Implement a small fetch-based auth client using `EXPO_PUBLIC_API_BASE_URL`.
- [x] Run `npm test -- src/product/__tests__/authApi.test.ts`.

### Task 3: Token Storage

**Files:**
- Create: `front/src/product/authSessionStore.ts`
- Test: `front/src/product/__tests__/authSessionStore.test.ts`

- [x] Write failing tests for save/load/clear session serialization against an injected storage port.
- [x] Implement secure-store/localStorage backed storage with injection for tests.
- [x] Run `npm test -- src/product/__tests__/authSessionStore.test.ts`.

### Task 4: Logos And Auth Entry UI

**Files:**
- Add: `front/assets/brand/logo1.svg`
- Add: `front/assets/brand/logo2.svg`
- Add: `front/assets/brand/logo3.svg`
- Create: `front/src/product/GarakLogo.tsx`
- Create: `front/src/product/googleIdentity.ts`
- Create: `front/src/product/authScreens.tsx`
- Create: `front/src/product/GarakAuthEntryApp.tsx`
- Modify: `front/src/product/GarakScreenFlowApp.tsx`
- Modify: `front/app/index.tsx`

- [x] Add SVG logo files exported from Figma.
- [x] Render logos via `react-native-svg` path data.
- [x] Add onboarding 1, onboarding 2, login, loading, error states.
- [x] Wire native Google Sign-In SDK and web Google Identity Services to auth API and session store.
- [x] Replace header text logo with the SVG logo component.

### Task 5: Product Account State

**Files:**
- Modify: `front/src/product/garakProductState.ts`
- Modify: `front/src/product/settingsScreens.tsx`
- Test: `front/src/product/__tests__/garakProductState.test.ts`

- [x] Write failing tests for initialized logged-in account state.
- [x] Add account user fields and logout action.
- [x] Show logged-in email in settings/my screen.

### Task 6: Verification And PR

**Files:**
- Modify docs/backlog as needed.

- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Run focused backend pytest for auth/CORS.
- [x] Run Expo web with `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and verify onboarding/login UI renders.
- [x] Record real Google OAuth credential/device gaps in backlog.
- [x] Commit, push, and update draft PR #33 title/body in Korean.
