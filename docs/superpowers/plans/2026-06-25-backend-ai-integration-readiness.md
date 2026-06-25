# Backend AI Integration Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the Expo frontend so backend, auth/sync, storage, audio export, and AI accompaniment services can be connected through stable code boundaries.

**Architecture:** Keep `garakProductState` as the pure reducer and add an effect boundary around it. UI components dispatch domain actions; the app shell calls `GarakProductServices` for persistence, account sync, share publishing, audio export, and AI accompaniment recommendation, then dispatches explicit completion/failure actions.

**Tech Stack:** Expo Router, React Native, TypeScript, Vitest.

---

### Task 1: Service Port Contract

**Files:**
- Create: `front/src/product/garakProductServices.ts`
- Test: `front/src/product/__tests__/garakProductServices.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';
import {
  createInMemoryGarakProductServices,
  createNoopGarakProductServices,
} from '../garakProductServices';

describe('Garak product service ports', () => {
  test('stores and reloads library snapshots through the public service contract', async () => {
    const services = createInMemoryGarakProductServices();
    await services.library.saveSnapshot({ works: [], exportedAudios: [], practiceResults: [] });

    await expect(services.library.loadSnapshot()).resolves.toEqual({
      works: [],
      exportedAudios: [],
      practiceResults: [],
    });
  });

  test('noop services expose unavailable backend and AI boundaries without throwing', async () => {
    const services = createNoopGarakProductServices();

    await expect(services.account.loginAndLoadLibrary()).resolves.toEqual({ status: 'unavailable' });
    await expect(services.ai.recommendAccompaniment({ events: [] })).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- garakProductServices`

Expected: FAIL because `garakProductServices.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Define `GarakProductServices` with `library`, `account`, `share`, `audio`, and `ai` ports. Add `createNoopGarakProductServices()` and `createInMemoryGarakProductServices()` so UI and tests can run before real backend credentials exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- garakProductServices`

Expected: PASS.

### Task 2: Effect Runner Contract

**Files:**
- Create: `front/src/product/garakProductEffects.ts`
- Test: `front/src/product/__tests__/garakProductEffects.test.ts`
- Modify: `front/src/product/garakProductState.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from 'vitest';
import { createInitialGarakProductState } from '../garakProductState';
import { createInMemoryGarakProductServices } from '../garakProductServices';
import { runGarakProductEffect } from '../garakProductEffects';

test('persists the library snapshot after local library mutations', async () => {
  const services = createInMemoryGarakProductServices();
  const state = createInitialGarakProductState();

  await runGarakProductEffect({ state, action: { type: 'saveCurrentWork' }, services });

  await expect(services.library.loadSnapshot()).resolves.toEqual(state.library);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- garakProductEffects`

Expected: FAIL because the effect runner is not defined.

- [ ] **Step 3: Write minimal implementation**

Create `runGarakProductEffect({ state, action, services })`, initially handling persistence-triggering actions by saving `state.library`. Keep backend/server failures isolated from the reducer.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- garakProductEffects`

Expected: PASS.

### Task 2A: HTTP Backend And AI Adapter Contract

**Files:**
- Create: `front/src/product/garakHttpProductServices.ts`
- Test: `front/src/product/__tests__/garakHttpProductServices.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from 'vitest';
import { createHttpGarakProductServices } from '../garakHttpProductServices';

test('saves library snapshots through the backend JSON contract', async () => {
  const requests: unknown[] = [];
  const services = createHttpGarakProductServices({
    baseUrl: 'https://api.garak.test/v1',
    fetch: async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 204,
        json: async () => undefined,
        text: async () => '',
      };
    },
    getAccessToken: async () => 'access-token',
  });

  await services.library.saveSnapshot({ works: [], exportedAudios: [], practiceResults: [] });

  expect(requests[0]).toMatchObject({
    url: 'https://api.garak.test/v1/library/snapshot',
    init: {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer access-token',
        'content-type': 'application/json',
      },
    },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- garakHttpProductServices`

Expected: FAIL because `garakHttpProductServices.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `createHttpGarakProductServices({ baseUrl, fetch, getAccessToken })` with these endpoint contracts:

```text
GET  /library/snapshot
PUT  /library/snapshot
POST /account/login-sync
POST /share/targets/publish
POST /audio/exports
POST /ai/accompaniment/recommendations
```

Use JSON request bodies, `accept: application/json`, `content-type: application/json`, and optional `authorization: Bearer <token>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- garakHttpProductServices`

Expected: PASS.

### Task 3: App Shell Service Wiring

**Files:**
- Modify: `front/src/product/GarakScreenFlowApp.tsx`
- Test: `front/src/product/__tests__/garakScreenFlowApp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('app shell accepts product services and runs effects after dispatch', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).toContain('services?: GarakProductServices');
  expect(source).toContain('runGarakProductEffect');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- garakScreenFlowApp`

Expected: FAIL until service props and effect runner calls are wired.

- [ ] **Step 3: Write minimal implementation**

Add a `services` prop with `createNoopGarakProductServices()` as the default, and call `runGarakProductEffect` after reducer transitions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- garakScreenFlowApp`

Expected: PASS.

### Task 4: Interaction Test Foundation

**Files:**
- Modify: `front/package.json`
- Create: `front/src/product/__tests__/garakScreenFlowApp.interaction.test.ts`

- [ ] **Step 1: Write the failing test**

```tsx
import { expect, test } from 'vitest';

test('documents the required interaction test dependency', () => {
  const packageJson = require('../../../package.json');
  expect(packageJson.devDependencies['@testing-library/react-native']).toBeDefined();
  expect(packageJson.devDependencies['test-renderer']).toBe('1.1.0');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- garakScreenFlowApp.interaction`

Expected: FAIL until the dependency and test setup are added.

- [ ] **Step 3: Add the dependency contract**

Install `@testing-library/react-native` and `test-renderer@1.1.0`. A full render/tap smoke needs a React Native Flow transform preset, Expo web test path, Detox, or Maestro before it should gate CI.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- garakScreenFlowApp.interaction`

Expected: PASS.

### Task 5: Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- garakProductServices garakProductEffects garakScreenFlowApp
```

Expected: PASS.

- [ ] **Step 2: Run full checks**

Run:

```bash
npm run typecheck
npm test
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-06-25-backend-ai-integration-readiness.md front/src/product front/package.json front/package-lock.json
git commit -m "feat: add backend ai integration boundary"
```
