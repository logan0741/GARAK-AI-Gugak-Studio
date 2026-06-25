# Save And Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** S07/S17/S18/S19의 `저장`, `Save & Share`, `공유하기`가 실제 로컬 보관, 오디오 export, 공유 publish 상태를 일관되게 반영하도록 만든다.

**Architecture:** `Work`는 편집 가능한 로컬 작업이고, `ExportedAudio`는 공유/재생 가능한 산출물이다. reducer는 화면 상태와 낙관적 UI 상태를 관리하고, `runGarakProductEffect`가 `services.library`, `services.audio`, `services.share`를 호출한 뒤 성공/실패 follow-up action을 dispatch한다.

**Tech Stack:** React Native / Expo, TypeScript, Vitest, `GarakProductState`, `GarakProductServices`, `Work`, `ExportedAudio`, `PracticeResult`

---

## 1. 현재 구현 상태

### 저장

- S05에서 녹음 완료 action `completePerformance`가 `autoSaveTakeAsWork()`로 `Work`를 만들고 `state.library.works`에 추가한다.
- S07의 `작업 저장` 버튼은 `saveCurrentWork`를 dispatch한다.
- 현재 `saveCurrentWork`는 `Work.updatedAt`, `Work.syncState = 'local_only'`, `workSaveStatus = 'saved'`만 갱신한다.
- `GarakScreenFlowApp`에 별도 services가 주입되지 않으면 기본 `createNoopGarakProductServices()`가 쓰인다.
- 따라서 현재 앱 실행 경로에서는 저장이 메모리 state 안에서만 보장되고, 앱 reload/재시작 뒤 복원되는 영속 저장은 없다.

### Save & Share

- S07의 `Save & Share project` 버튼은 `exportCurrentWork`를 dispatch한다.
- 현재 `exportCurrentWork`는 `services.audio.exportWorkAudio()`를 호출하지 않는다.
- 대신 `exportWorkAudioPlaceholder()`로 `audioUri = placeholder://export-1.wav` 형태의 가짜 `ExportedAudio`를 만들고 `state.library.exportedAudios`에 추가한다.
- action 후 `selectedPlayerItem`은 새 `ExportedAudio`가 되고 화면은 S19로 이동한다.

### 공유하기

- S19의 `공유` action은 `shareSelectedPlayerItem`이며 S17 공유 준비 화면으로 이동한다.
- S17의 `공유하기` action은 `publishShareTarget`이다.
- 현재 `publishShareTarget`은 `services.share.publishShareTarget()`를 호출하지 않고, reducer에서 `shareState: 'ready'`를 `shareState: 'shared'`로 바꾼 뒤 S20으로 이동한다.
- S17의 `저장만 하기` action은 `saveShareTargetOnly`이고, `shareState`를 `ready`로 유지한 채 S18로 이동한다.

## 2. 목표 동작

### 저장의 목표

- `Work` 저장은 편집 가능한 작업을 로컬 보관함에 영속화하는 동작이다.
- 저장 성공 후에는 S18 보관함의 `작업` 탭에서 reload 이후에도 같은 `Work`가 보여야 한다.
- 저장 실패 시에는 현재 화면에 남고 `workSaveStatus = 'failed'`와 안내 문구를 표시한다.
- 저장은 공유 가능한 오디오를 만들지 않는다. `library.exportedAudios`는 바뀌면 안 된다.

### Save & Share의 목표

- `Save & Share project`는 현재 `Work`를 먼저 저장 가능한 상태로 확정한 뒤, 공유 가능한 `ExportedAudio`를 생성한다.
- 실제 export는 `services.audio.exportWorkAudio(work)`가 수행한다.
- export 성공 후 `ExportedAudio.audioUri`는 서비스 결과의 실제 URI를 사용한다.
- export 성공 후 S17 공유 준비 화면으로 이동한다.
- export 실패 시 S07에 남고 export 실패 상태와 재시도 버튼을 보여준다.

### 공유하기의 목표

- S17 `공유하기`는 `services.share.publishShareTarget(target)`를 호출한다.
- publish 성공 후 해당 `ExportedAudio` 또는 `PracticeResult`의 `shareState`를 `shared`로 바꾸고 S20으로 이동한다.
- publish 실패 시 S17에 남고 공유 실패 상태와 재시도 버튼을 보여준다.
- S17 `저장만 하기`는 서버 publish를 호출하지 않고 S18로 이동한다.

## 3. 데이터와 State 흐름

### Work

```ts
export type Work = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  source: 'free_creation' | 'remix' | 'synced';
  syncState: 'local_only' | 'synced' | 'account_only' | 'conflict';
  tracks: Track[];
};
```

`Work`는 편집 원본이다. S07에서 볼륨, mute, solo, 트랙 추가, 장단 추가가 바뀌면 `Work`가 바뀐다. 공유 버튼은 `Work` 자체를 공유하지 않고 `ExportedAudio`를 만든다.

### ExportedAudio

```ts
export type ExportedAudio = {
  id: string;
  kind: 'exported_audio';
  workId?: string;
  title: string;
  durationSeconds: number;
  instrumentNames: string[];
  createdAt: string;
  audioUri: string;
  shareState: 'ready' | 'shared';
  sourceShareId?: string;
  authorDisplayName?: string;
  sourceLabel?: string;
  remoteShareId?: string;
  sharedAt?: string;
};
```

`remoteShareId`와 `sharedAt`을 추가한다. `remoteShareId`는 `services.share.publishShareTarget()` 성공 응답의 `remoteId`를 보관한다. `sharedAt`은 S20 피드 정렬과 보관함 공유 상태 표시 기준이다.

### Product state 추가

```ts
export type WorkSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type WorkExportStatus =
  | { status: 'idle' }
  | { status: 'exporting'; workId: string }
  | { status: 'ready'; exportedAudioId: string }
  | { status: 'failed'; workId: string; message: string };

export type SharePublishStatus =
  | { status: 'idle' }
  | { status: 'publishing'; target: ShareTargetReference }
  | { status: 'shared'; target: ShareTargetReference; remoteId: string }
  | { status: 'failed'; target: ShareTargetReference; message: string };
```

`GarakProductState`에는 아래 필드를 둔다.

```ts
workSaveStatus: WorkSaveStatus;
workExportStatus: WorkExportStatus;
sharePublishStatus: SharePublishStatus;
```

초기값은 모두 idle 계열이다.

```ts
workSaveStatus: 'idle',
workExportStatus: { status: 'idle' },
sharePublishStatus: { status: 'idle' },
```

## 4. Service 경계

현재 `GarakProductServices`에는 필요한 경계가 이미 있다.

```ts
export type GarakProductServices = {
  library: {
    loadSnapshot: () => Promise<ProductLibraryState>;
    saveSnapshot: (snapshot: ProductLibraryState) => Promise<void>;
  };
  share: {
    publishShareTarget: (target: ShareTargetReference) => Promise<ServiceResult<{ remoteId: string }>>;
  };
  audio: {
    exportWorkAudio: (work: Work) => Promise<ServiceResult<{ audioUri: string }>>;
    playPerformanceEvents: (
      events: readonly PerformanceEvent[],
    ) => Promise<ServiceResult<{ handledEvents: number }>>;
  };
};
```

구현 원칙은 다음과 같다.

- reducer는 async 서비스를 직접 호출하지 않는다.
- reducer는 요청 action에서 `saving`, `exporting`, `publishing` 상태만 만든다.
- `runGarakProductEffect`가 서비스 호출을 수행한다.
- effect는 성공/실패 follow-up action을 반환한다.
- follow-up action이 최종 데이터와 화면 이동을 확정한다.

## 5. 파일 구조

- Modify: `front/src/studio/studioTypes.ts`
  - `ExportedAudio.remoteShareId`, `ExportedAudio.sharedAt` 추가
- Modify: `front/src/product/garakProductServices.ts`
  - `exportWorkAudio` 결과에 `durationSeconds`를 선택적으로 허용
- Modify: `front/src/product/garakProductState.ts`
  - save/export/share status type과 action 추가
  - `saveCurrentWork`, `saveAndShareCurrentWork`, `completeWorkAudioExport`, `failWorkAudioExport`, `completeSharePublish`, `failSharePublish` reducer 구현
- Modify: `front/src/product/garakProductEffects.ts`
  - `saveCurrentWork`, `saveAndShareCurrentWork`, `publishShareTarget` effect 연결
- Create: `front/src/product/localGarakProductServices.ts`
  - 로컬 library snapshot 영속 저장 adapter
- Modify: `front/src/product/GarakAuthEntryApp.tsx`
  - local services를 만들고 `GarakScreenFlowApp`에 주입
- Modify: `front/src/product/GarakScreenFlowApp.tsx`
  - 앱 시작 시 `services.library.loadSnapshot()` 호출 후 `replaceLibrarySnapshot`
- Modify: `front/src/product/freeCreationScreens.tsx`
  - S07 저장/export 상태별 버튼 label, disabled, 실패 copy 연결
- Modify: `front/src/product/shareScreens.tsx`
  - S17 publish 상태별 버튼 label, disabled, 실패 copy 연결
- Modify: `front/src/product/freeCreationMixEditorModel.ts`
  - save/export button view model 확장
- Modify: `front/src/product/shareScreenModel.ts`
  - share publish 상태 view model 확장
- Test: `front/src/product/__tests__/garakProductState.test.ts`
- Test: `front/src/product/__tests__/garakProductEffects.test.ts`
- Test: `front/src/product/__tests__/garakProductServices.test.ts`
- Test: `front/src/product/__tests__/garakScreenFlowApp.test.ts`
- Test: `front/src/product/__tests__/shareScreenModel.test.ts`
- Test: `front/src/product/__tests__/freeCreationMixEditorModel.test.ts`

## Task 1: 상태 타입과 reducer action 추가

**Files:**
- Modify: `front/src/studio/studioTypes.ts`
- Modify: `front/src/product/garakProductServices.ts`
- Modify: `front/src/product/garakProductState.ts`
- Test: `front/src/product/__tests__/garakProductState.test.ts`

- [ ] **Step 1: Write the failing reducer tests**

Add these tests to `front/src/product/__tests__/garakProductState.test.ts`.

```ts
test('marks current work save as saving before persistence completes', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });

  state = applyProductAction(state, { type: 'saveCurrentWork' });

  expect(state.workSaveStatus).toBe('saving');
  expect(state.library.exportedAudios).toHaveLength(0);
  expect(state.screenFlow.currentScreen).toBe('S07');
});

test('completes current work save after persistence succeeds', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'saveCurrentWork' });

  state = applyProductAction(state, { type: 'completeCurrentWorkSave' });

  expect(state.workSaveStatus).toBe('saved');
  expect(state.library.works[0].syncState).toBe('local_only');
});

test('records current work save failure without leaving S07', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'saveCurrentWork' });

  state = applyProductAction(state, {
    type: 'failCurrentWorkSave',
    message: 'local storage write failed',
  });

  expect(state.workSaveStatus).toBe('failed');
  expect(state.screenFlow.currentScreen).toBe('S07');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/product/__tests__/garakProductState.test.ts -t "current work save"
```

Expected: FAIL because `completeCurrentWorkSave`, `failCurrentWorkSave`, and new status values do not exist.

- [ ] **Step 3: Add types and reducer actions**

In `front/src/studio/studioTypes.ts`, extend `ExportedAudio`.

```ts
export type ExportedAudio = {
  id: string;
  kind: 'exported_audio';
  workId?: string;
  title: string;
  durationSeconds: number;
  instrumentNames: string[];
  createdAt: string;
  audioUri: string;
  shareState: ShareState;
  sourceShareId?: string;
  authorDisplayName?: string;
  sourceLabel?: string;
  remoteShareId?: string;
  sharedAt?: string;
};
```

In `front/src/product/garakProductServices.ts`, update the export service result.

```ts
export type ExportWorkAudioResult = {
  audioUri: string;
  durationSeconds?: number;
};
```

Then use it in `GarakProductServices`.

```ts
audio: {
  exportWorkAudio: (work: Work) => Promise<ServiceResult<ExportWorkAudioResult>>;
  playPerformanceEvents: (
    events: readonly PerformanceEvent[],
  ) => Promise<ServiceResult<{ handledEvents: number }>>;
};
```

In `front/src/product/garakProductState.ts`, add status types.

```ts
export type WorkSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type WorkExportStatus =
  | { status: 'idle' }
  | { status: 'exporting'; workId: string }
  | { status: 'ready'; exportedAudioId: string }
  | { status: 'failed'; workId: string; message: string };

export type SharePublishStatus =
  | { status: 'idle' }
  | { status: 'publishing'; target: ShareTargetReference }
  | { status: 'shared'; target: ShareTargetReference; remoteId: string }
  | { status: 'failed'; target: ShareTargetReference; message: string };
```

Add fields to `GarakProductState`.

```ts
workSaveStatus: WorkSaveStatus;
workExportStatus: WorkExportStatus;
sharePublishStatus: SharePublishStatus;
```

Set initial values in `createInitialGarakProductState`.

```ts
workSaveStatus: 'idle',
workExportStatus: { status: 'idle' },
sharePublishStatus: { status: 'idle' },
```

Add actions.

```ts
| { type: 'completeCurrentWorkSave' }
| { type: 'failCurrentWorkSave'; message: string }
| { type: 'saveAndShareCurrentWork' }
| {
    type: 'completeWorkAudioExport';
    workId: string;
    audioUri: string;
    durationSeconds?: number;
  }
| { type: 'failWorkAudioExport'; workId: string; message: string }
| { type: 'completeSharePublish'; target: ShareTargetReference; remoteId: string }
| { type: 'failSharePublish'; target: ShareTargetReference; message: string }
```

Change `saveCurrentWork`.

```ts
function saveCurrentWork(state: GarakProductState): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const savedWork: Work = {
    ...currentWork,
    updatedAt: state.now(),
    syncState: 'local_only',
  };

  return {
    ...state,
    library: {
      ...state.library,
      works: state.library.works.map((work) => (work.id === savedWork.id ? savedWork : work)),
    },
    workSaveStatus: 'saving',
  };
}
```

Add completion handlers.

```ts
case 'completeCurrentWorkSave':
  return {
    ...state,
    workSaveStatus: 'saved',
  };
case 'failCurrentWorkSave':
  return {
    ...state,
    workSaveStatus: 'failed',
  };
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
npm test -- src/product/__tests__/garakProductState.test.ts -t "current work save"
```

Expected: PASS.

## Task 2: 로컬 library snapshot 영속 저장 연결

**Files:**
- Create: `front/src/product/localGarakProductServices.ts`
- Modify: `front/src/product/GarakAuthEntryApp.tsx`
- Modify: `front/src/product/GarakScreenFlowApp.tsx`
- Test: `front/src/product/__tests__/garakProductServices.test.ts`
- Test: `front/src/product/__tests__/garakScreenFlowApp.test.ts`

- [ ] **Step 1: Add dependency**

Run:

```bash
npm install @react-native-async-storage/async-storage
```

Expected: `package.json` and lockfile include `@react-native-async-storage/async-storage`.

- [ ] **Step 2: Write storage service tests**

Add to `front/src/product/__tests__/garakProductServices.test.ts`.

```ts
import {
  createAsyncStorageGarakProductServices,
  type GarakAsyncStorageLike,
} from '../localGarakProductServices';

test('persists and restores the library snapshot through AsyncStorage', async () => {
  const entries = new Map<string, string>();
  const storage: GarakAsyncStorageLike = {
    getItem: async (key) => entries.get(key) ?? null,
    setItem: async (key, value) => {
      entries.set(key, value);
    },
    removeItem: async (key) => {
      entries.delete(key);
    },
  };
  const services = createAsyncStorageGarakProductServices({ storage });
  const snapshot = {
    works: [],
    exportedAudios: [],
    practiceResults: [],
  };

  await services.library.saveSnapshot(snapshot);

  await expect(services.library.loadSnapshot()).resolves.toEqual(snapshot);
});
```

- [ ] **Step 3: Run test to verify failure**

Run:

```bash
npm test -- src/product/__tests__/garakProductServices.test.ts -t "persists and restores"
```

Expected: FAIL because `localGarakProductServices.ts` does not exist.

- [ ] **Step 4: Create local services adapter**

Create `front/src/product/localGarakProductServices.ts`.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProductLibraryState } from './garakProductState';
import {
  createNoopGarakProductServices,
  type GarakProductServices,
} from './garakProductServices';

const GARAK_LIBRARY_SNAPSHOT_KEY = 'garak.library.snapshot.v1';

export type GarakAsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function createAsyncStorageGarakProductServices({
  storage = AsyncStorage,
}: {
  storage?: GarakAsyncStorageLike;
} = {}): GarakProductServices {
  return {
    ...createNoopGarakProductServices(),
    library: {
      loadSnapshot: async () => {
        const raw = await storage.getItem(GARAK_LIBRARY_SNAPSHOT_KEY);

        if (raw === null) {
          return createEmptyLibrarySnapshot();
        }

        return JSON.parse(raw) as ProductLibraryState;
      },
      saveSnapshot: async (snapshot) => {
        await storage.setItem(GARAK_LIBRARY_SNAPSHOT_KEY, JSON.stringify(snapshot));
      },
    },
  };
}

function createEmptyLibrarySnapshot(): ProductLibraryState {
  return {
    works: [],
    exportedAudios: [],
    practiceResults: [],
  };
}
```

- [ ] **Step 5: Inject local services into product app**

In `front/src/product/GarakAuthEntryApp.tsx`, import and memoize services.

```ts
import { createAsyncStorageGarakProductServices } from './localGarakProductServices';
```

Inside `GarakAuthEntryApp`.

```ts
const productServices = useMemo(() => createAsyncStorageGarakProductServices(), []);
```

Pass it to `GarakScreenFlowApp`.

```tsx
<GarakScreenFlowApp
  key={entryState.account.status === 'loggedIn' ? entryState.account.userId : 'guest'}
  account={entryState.account}
  onLogout={handleLogout}
  sampleManifests={PRODUCT_SAMPLE_MANIFESTS}
  sampleFallbackInstruments={PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS}
  services={productServices}
/>
```

- [ ] **Step 6: Load persisted library on app start**

In `front/src/product/GarakScreenFlowApp.tsx`, add one mount effect.

```ts
useEffect(() => {
  let isMounted = true;

  productServices.library.loadSnapshot()
    .then((library) => {
      if (isMounted) {
        dispatch({ type: 'replaceLibrarySnapshot', library });
      }
    })
    .catch(() => undefined);

  return () => {
    isMounted = false;
  };
}, [dispatch, productServices]);
```

- [ ] **Step 7: Run service and app source tests**

Run:

```bash
npm test -- src/product/__tests__/garakProductServices.test.ts src/product/__tests__/garakScreenFlowApp.test.ts
```

Expected: PASS.

## Task 3: 저장 effect 성공/실패 follow-up 연결

**Files:**
- Modify: `front/src/product/garakProductEffects.ts`
- Test: `front/src/product/__tests__/garakProductEffects.test.ts`

- [ ] **Step 1: Write effect tests**

Add to `front/src/product/__tests__/garakProductEffects.test.ts`.

```ts
test('dispatches save completion after library snapshot persistence succeeds', async () => {
  const services = createInMemoryGarakProductServices();
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  const action = { type: 'saveCurrentWork' } as const;
  const nextState = applyProductAction(state, action);

  const followUpActions = await runGarakProductEffect({
    state: nextState,
    action,
    services,
  });

  expect(followUpActions).toEqual([{ type: 'completeCurrentWorkSave' }]);
});

test('dispatches save failure after library snapshot persistence fails', async () => {
  const services = {
    ...createNoopGarakProductServices(),
    library: {
      loadSnapshot: async () => ({ works: [], exportedAudios: [], practiceResults: [] }),
      saveSnapshot: async () => {
        throw new Error('write failed');
      },
    },
  };
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  const action = { type: 'saveCurrentWork' } as const;
  const nextState = applyProductAction(state, action);

  const followUpActions = await runGarakProductEffect({
    state: nextState,
    action,
    services,
  });

  expect(followUpActions).toEqual([
    { type: 'failCurrentWorkSave', message: 'write failed' },
  ]);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/product/__tests__/garakProductEffects.test.ts -t "library snapshot persistence"
```

Expected: FAIL because `runGarakProductEffect` currently persists silently and does not return save follow-up actions.

- [ ] **Step 3: Return save follow-up actions from effect**

In `front/src/product/garakProductEffects.ts`, change `persistLibrarySnapshot` to return an action when the triggering action is `saveCurrentWork`.

```ts
async function persistLibrarySnapshot(
  state: GarakProductState,
  action: GarakProductAction,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  try {
    await services.library.saveSnapshot(state.library);

    return action.type === 'saveCurrentWork'
      ? { type: 'completeCurrentWorkSave' }
      : undefined;
  } catch (error) {
    return action.type === 'saveCurrentWork'
      ? {
          type: 'failCurrentWorkSave',
          message: error instanceof Error ? error.message : String(error),
        }
      : undefined;
  }
}
```

Update the caller.

```ts
if (LIBRARY_PERSISTENCE_ACTION_TYPES.has(action.type)) {
  const persistenceAction = await persistLibrarySnapshot(state, action, services);
  if (persistenceAction !== undefined) {
    followUpActions.push(persistenceAction);
  }
}
```

- [ ] **Step 4: Run effect tests**

Run:

```bash
npm test -- src/product/__tests__/garakProductEffects.test.ts
```

Expected: PASS.

## Task 4: Save & Share를 실제 export 요청 흐름으로 바꾸기

**Files:**
- Modify: `front/src/product/garakProductState.ts`
- Modify: `front/src/product/garakProductEffects.ts`
- Modify: `front/src/product/freeCreationScreens.tsx`
- Modify: `front/src/product/freeCreationMixEditorModel.ts`
- Test: `front/src/product/__tests__/garakProductState.test.ts`
- Test: `front/src/product/__tests__/garakProductEffects.test.ts`
- Test: `front/src/product/__tests__/freeCreationMixEditorModel.test.ts`

- [ ] **Step 1: Write reducer tests**

Add to `front/src/product/__tests__/garakProductState.test.ts`.

```ts
test('starts save and share export without creating placeholder audio', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });

  state = applyProductAction(state, { type: 'saveAndShareCurrentWork' });

  expect(state.workExportStatus).toEqual({
    status: 'exporting',
    workId: state.currentWorkId,
  });
  expect(state.library.exportedAudios).toHaveLength(0);
  expect(state.screenFlow.currentScreen).toBe('S07');
});

test('completes save and share export and opens S17 share preparation', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  const workId = state.currentWorkId!;
  state = applyProductAction(state, { type: 'saveAndShareCurrentWork' });

  state = applyProductAction(state, {
    type: 'completeWorkAudioExport',
    workId,
    audioUri: 'file://garak/export-1.wav',
    durationSeconds: 31,
  });

  expect(state.screenFlow.currentScreen).toBe('S17');
  expect(state.library.exportedAudios).toHaveLength(1);
  expect(state.library.exportedAudios[0]).toMatchObject({
    id: 'export-1',
    workId,
    audioUri: 'file://garak/export-1.wav',
    durationSeconds: 31,
    shareState: 'ready',
  });
  expect(state.selectedPlayerItem).toEqual({
    kind: 'exportedAudio',
    exportedAudioId: 'export-1',
  });
});
```

- [ ] **Step 2: Run reducer tests to verify failure**

Run:

```bash
npm test -- src/product/__tests__/garakProductState.test.ts -t "save and share export"
```

Expected: FAIL because `saveAndShareCurrentWork` and export completion actions do not exist.

- [ ] **Step 3: Implement reducer flow**

Add helper in `front/src/product/garakProductState.ts`.

```ts
function saveAndShareCurrentWork(state: GarakProductState): GarakProductState {
  const currentWork = findCurrentWork(state);

  if (currentWork === undefined) {
    return state;
  }

  return {
    ...state,
    workSaveStatus: 'saving',
    workExportStatus: {
      status: 'exporting',
      workId: currentWork.id,
    },
    sharePreviewStatus: undefined,
  };
}
```

Add completion helper.

```ts
function completeWorkAudioExport(
  state: GarakProductState,
  input: {
    workId: string;
    audioUri: string;
    durationSeconds?: number;
  },
): GarakProductState {
  const work = state.library.works.find((item) => item.id === input.workId);

  if (work === undefined) {
    return state;
  }

  const nextCounters = incrementCounters(state.counters, ['export']);
  const exported = exportWorkAudioPlaceholder({
    id: `export-${nextCounters.export}`,
    work,
    title: `${work.title} 내보내기`,
    audioUri: input.audioUri,
    durationSeconds: input.durationSeconds ?? 24,
    createdAt: state.now(),
  });

  return {
    ...state,
    counters: nextCounters,
    workSaveStatus: 'saved',
    workExportStatus: {
      status: 'ready',
      exportedAudioId: exported.id,
    },
    library: {
      ...state.library,
      exportedAudios: [...state.library.exportedAudios, exported],
    },
    selectedPlayerItem: {
      kind: 'exportedAudio',
      exportedAudioId: exported.id,
    },
    screenFlow: pushTarget(state.screenFlow, 'S17'),
  };
}
```

Add failure action.

```ts
case 'failWorkAudioExport':
  return {
    ...state,
    workExportStatus: {
      status: 'failed',
      workId: action.workId,
      message: action.message,
    },
  };
```

- [ ] **Step 4: Connect effect to audio service**

Add test to `front/src/product/__tests__/garakProductEffects.test.ts`.

```ts
test('exports current work audio through services for save and share', async () => {
  const services = {
    ...createNoopGarakProductServices(),
    library: {
      loadSnapshot: async () => ({ works: [], exportedAudios: [], practiceResults: [] }),
      saveSnapshot: async () => undefined,
    },
    audio: {
      exportWorkAudio: async () => ({
        status: 'ok' as const,
        value: {
          audioUri: 'file://garak/export-1.wav',
          durationSeconds: 31,
        },
      }),
      playPerformanceEvents: async () => ({ status: 'ok' as const, value: { handledEvents: 0 } }),
    },
  };
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  const workId = state.currentWorkId!;
  const action = { type: 'saveAndShareCurrentWork' } as const;
  const nextState = applyProductAction(state, action);

  const followUpActions = await runGarakProductEffect({
    state: nextState,
    action,
    services,
  });

  expect(followUpActions).toEqual([
    { type: 'completeCurrentWorkSave' },
    {
      type: 'completeWorkAudioExport',
      workId,
      audioUri: 'file://garak/export-1.wav',
      durationSeconds: 31,
    },
  ]);
});
```

Implement effect helper.

```ts
async function exportCurrentWorkAudio(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  const workId = state.workExportStatus.status === 'exporting'
    ? state.workExportStatus.workId
    : state.currentWorkId;
  const work = state.library.works.find((item) => item.id === workId);

  if (work === undefined) {
    return undefined;
  }

  const result = await services.audio.exportWorkAudio(work);

  if (result.status === 'ok') {
    return {
      type: 'completeWorkAudioExport',
      workId: work.id,
      audioUri: result.value.audioUri,
      durationSeconds: result.value.durationSeconds,
    };
  }

  return {
    type: 'failWorkAudioExport',
    workId: work.id,
    message: result.status === 'error' ? result.message : 'audio export unavailable',
  };
}
```

Call it for `saveAndShareCurrentWork`.

```ts
if (action.type === 'saveAndShareCurrentWork') {
  const exportAction = await exportCurrentWorkAudio(state, services);
  if (exportAction !== undefined) {
    followUpActions.push(exportAction);
  }
}
```

- [ ] **Step 5: Change S07 button action**

In `front/src/product/freeCreationScreens.tsx`, change the Save & Share button.

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="프로젝트 저장 및 공유"
  onPress={() => dispatch({ type: 'saveAndShareCurrentWork' })}
  style={styles.freeCreationShareButton}
>
  <ShareOutlineGlyph />
  <Text style={styles.freeCreationShareButtonText}>{'Save & Share project'}</Text>
</Pressable>
```

Disable it while exporting.

```tsx
const isExportingForShare = state.workExportStatus.status === 'exporting';
```

Use that value.

```tsx
disabled={isExportingForShare}
accessibilityState={{ disabled: isExportingForShare }}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- src/product/__tests__/garakProductState.test.ts src/product/__tests__/garakProductEffects.test.ts src/product/__tests__/freeCreationMixEditorModel.test.ts
```

Expected: PASS.

## Task 5: S17 publish를 실제 share service로 연결

**Files:**
- Modify: `front/src/product/garakProductState.ts`
- Modify: `front/src/product/garakProductEffects.ts`
- Modify: `front/src/product/shareScreenModel.ts`
- Modify: `front/src/product/shareScreens.tsx`
- Test: `front/src/product/__tests__/garakProductState.test.ts`
- Test: `front/src/product/__tests__/garakProductEffects.test.ts`
- Test: `front/src/product/__tests__/shareScreenModel.test.ts`

- [ ] **Step 1: Write reducer tests**

Add to `front/src/product/__tests__/garakProductState.test.ts`.

```ts
test('starts share publish without marking target shared first', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'exportCurrentWork' });
  state = applyProductAction(state, { type: 'navigate', target: 'S17' });

  state = applyProductAction(state, { type: 'publishShareTarget' });

  expect(state.sharePublishStatus).toEqual({
    status: 'publishing',
    target: { kind: 'exportedAudio', id: 'export-1' },
  });
  expect(state.library.exportedAudios[0].shareState).toBe('ready');
  expect(state.screenFlow.currentScreen).toBe('S17');
});

test('marks exported audio shared after publish succeeds', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'exportCurrentWork' });
  state = applyProductAction(state, { type: 'navigate', target: 'S17' });
  state = applyProductAction(state, { type: 'publishShareTarget' });

  state = applyProductAction(state, {
    type: 'completeSharePublish',
    target: { kind: 'exportedAudio', id: 'export-1' },
    remoteId: 'remote-share-1',
  });

  expect(state.screenFlow.currentScreen).toBe('S20');
  expect(state.library.exportedAudios[0]).toMatchObject({
    shareState: 'shared',
    remoteShareId: 'remote-share-1',
    sharedAt: '2026-06-26T00:00:00.000Z',
  });
});
```

- [ ] **Step 2: Run reducer tests to verify failure**

Run:

```bash
npm test -- src/product/__tests__/garakProductState.test.ts -t "share publish"
```

Expected: FAIL because publish currently mutates `shareState` immediately.

- [ ] **Step 3: Implement publish reducer**

Change `publishShareTarget`.

```ts
function publishShareTarget(state: GarakProductState): GarakProductState {
  const target = resolveShareTargetReference(state);

  if (target === undefined) {
    return state;
  }

  return {
    ...state,
    sharePreviewStatus: undefined,
    sharePublishStatus: {
      status: 'publishing',
      target,
    },
  };
}
```

Add resolver.

```ts
function resolveShareTargetReference(state: GarakProductState): ShareTargetReference | undefined {
  const selected = resolveShareTargetSelection(state);

  if (selected?.kind === 'exportedAudio') {
    return {
      kind: 'exportedAudio',
      id: selected.exportedAudioId,
    };
  }

  if (selected?.kind === 'practiceResult') {
    return {
      kind: 'practiceResult',
      id: selected.practiceResultId,
    };
  }

  return undefined;
}
```

Add completion handlers.

```ts
case 'completeSharePublish':
  return completeSharePublish(state, action.target, action.remoteId);
case 'failSharePublish':
  return {
    ...state,
    sharePublishStatus: {
      status: 'failed',
      target: action.target,
      message: action.message,
    },
  };
```

Add helper.

```ts
function completeSharePublish(
  state: GarakProductState,
  target: ShareTargetReference,
  remoteId: string,
): GarakProductState {
  const sharedAt = state.now();
  const nextScreenFlow =
    state.screenFlow.currentScreen === 'S17'
      ? transitionScreenFlow(state.screenFlow, { type: 'publishShareTarget' })
      : pushTarget(state.screenFlow, 'S20');

  if (target.kind === 'exportedAudio') {
    return {
      ...state,
      sharePublishStatus: {
        status: 'shared',
        target,
        remoteId,
      },
      library: {
        ...state.library,
        exportedAudios: state.library.exportedAudios.map((audio) =>
          audio.id === target.id
            ? { ...audio, shareState: 'shared', remoteShareId: remoteId, sharedAt }
            : audio,
        ),
      },
      screenFlow: nextScreenFlow,
    };
  }

  return {
    ...state,
    sharePublishStatus: {
      status: 'shared',
      target,
      remoteId,
    },
    library: {
      ...state.library,
      practiceResults: state.library.practiceResults.map((result) =>
        result.id === target.id
          ? { ...result, shareState: 'shared', remoteShareId: remoteId, sharedAt }
          : result,
      ),
    },
    screenFlow: nextScreenFlow,
  };
}
```

- [ ] **Step 4: Connect publish effect**

Add to `front/src/product/__tests__/garakProductEffects.test.ts`.

```ts
test('publishes share target through services and returns completion action', async () => {
  const services = {
    ...createNoopGarakProductServices(),
    share: {
      publishShareTarget: async () => ({
        status: 'ok' as const,
        value: { remoteId: 'remote-share-1' },
      }),
    },
  };
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'exportCurrentWork' });
  state = applyProductAction(state, { type: 'navigate', target: 'S17' });
  const action = { type: 'publishShareTarget' } as const;
  const nextState = applyProductAction(state, action);

  const followUpActions = await runGarakProductEffect({
    state: nextState,
    action,
    services,
  });

  expect(followUpActions).toEqual([
    {
      type: 'completeSharePublish',
      target: { kind: 'exportedAudio', id: 'export-1' },
      remoteId: 'remote-share-1',
    },
  ]);
});
```

Implement effect helper.

```ts
async function publishSelectedShareTarget(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  if (state.sharePublishStatus.status !== 'publishing') {
    return undefined;
  }

  const target = state.sharePublishStatus.target;
  const result = await services.share.publishShareTarget(target);

  if (result.status === 'ok') {
    return {
      type: 'completeSharePublish',
      target,
      remoteId: result.value.remoteId,
    };
  }

  return {
    type: 'failSharePublish',
    target,
    message: result.status === 'error' ? result.message : 'share service unavailable',
  };
}
```

Call it for `publishShareTarget`.

```ts
if (action.type === 'publishShareTarget') {
  const publishAction = await publishSelectedShareTarget(state, services);
  if (publishAction !== undefined) {
    followUpActions.push(publishAction);
  }
}
```

- [ ] **Step 5: Update S17 UI status**

In `front/src/product/shareScreenModel.ts`, add fields to `SharePrepareViewModel`.

```ts
publishStatusLabel: string;
publishErrorMessage?: string;
isPublishing: boolean;
```

Set values.

```ts
const isPublishing = state.sharePublishStatus.status === 'publishing';
const publishErrorMessage =
  state.sharePublishStatus.status === 'failed'
    ? state.sharePublishStatus.message
    : undefined;
```

In `front/src/product/shareScreens.tsx`, disable publish while publishing.

```tsx
<SecondaryPillButton
  disabled={!model.canShare || model.isPublishing}
  label={model.publishStatusLabel}
  onPress={() => dispatch({ type: 'publishShareTarget' })}
  style={styles.prepareActionButton}
/>
```

Render failure copy.

```tsx
{model.publishErrorMessage !== undefined ? (
  <Text style={styles.bodyText}>{model.publishErrorMessage}</Text>
) : null}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- src/product/__tests__/garakProductState.test.ts src/product/__tests__/garakProductEffects.test.ts src/product/__tests__/shareScreenModel.test.ts
```

Expected: PASS.

## Task 6: HTTP service contract tests

**Files:**
- Modify: `front/src/product/garakHttpProductServices.ts`
- Test: `front/src/product/__tests__/garakHttpProductServices.test.ts`

- [ ] **Step 1: Update export response test**

Add to `front/src/product/__tests__/garakHttpProductServices.test.ts`.

```ts
test('exports work audio through the backend audio endpoint', async () => {
  const fetch: GarakFetch = async (url, init) => ({
    ok: true,
    status: 200,
    json: async () => ({ audioUri: 'https://cdn.garak.test/export-1.wav', durationSeconds: 31 }),
    text: async () => '',
  });
  const services = createHttpGarakProductServices({
    baseUrl: 'https://api.garak.test',
    fetch,
  });

  const result = await services.audio.exportWorkAudio({
    id: 'work-1',
    title: '장구 작업 1',
    createdAt: '2026-06-26T00:00:00.000Z',
    updatedAt: '2026-06-26T00:00:00.000Z',
    source: 'free_creation',
    syncState: 'local_only',
    tracks: [],
  });

  expect(result).toEqual({
    status: 'ok',
    value: {
      audioUri: 'https://cdn.garak.test/export-1.wav',
      durationSeconds: 31,
    },
  });
});
```

- [ ] **Step 2: Run HTTP service tests**

Run:

```bash
npm test -- src/product/__tests__/garakHttpProductServices.test.ts
```

Expected: PASS.

## Task 7: End-to-end product behavior tests

**Files:**
- Test: `front/src/product/__tests__/garakProductState.test.ts`
- Test: `front/src/product/__tests__/libraryScreenModel.test.ts`
- Test: `front/src/product/__tests__/shareScreenModel.test.ts`

- [ ] **Step 1: Add save/share happy-path state test**

Add to `front/src/product/__tests__/garakProductState.test.ts`.

```ts
test('runs the full save and share state path from S07 to S20', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-26T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  const workId = state.currentWorkId!;

  state = applyProductAction(state, { type: 'saveAndShareCurrentWork' });
  state = applyProductAction(state, { type: 'completeCurrentWorkSave' });
  state = applyProductAction(state, {
    type: 'completeWorkAudioExport',
    workId,
    audioUri: 'file://garak/export-1.wav',
    durationSeconds: 31,
  });
  state = applyProductAction(state, { type: 'publishShareTarget' });
  state = applyProductAction(state, {
    type: 'completeSharePublish',
    target: { kind: 'exportedAudio', id: 'export-1' },
    remoteId: 'remote-share-1',
  });

  expect(state.screenFlow.currentScreen).toBe('S20');
  expect(state.library.works).toHaveLength(1);
  expect(state.library.exportedAudios).toHaveLength(1);
  expect(state.library.exportedAudios[0]).toMatchObject({
    workId,
    audioUri: 'file://garak/export-1.wav',
    shareState: 'shared',
    remoteShareId: 'remote-share-1',
  });
});
```

- [ ] **Step 2: Run product state test**

Run:

```bash
npm test -- src/product/__tests__/garakProductState.test.ts -t "full save and share"
```

Expected: PASS.

- [ ] **Step 3: Run all affected product tests**

Run:

```bash
npm test -- src/product/__tests__/garakProductState.test.ts src/product/__tests__/garakProductEffects.test.ts src/product/__tests__/libraryScreenModel.test.ts src/product/__tests__/shareScreenModel.test.ts src/product/__tests__/garakScreenFlowApp.test.ts
```

Expected: PASS.

## Task 8: Visual and manual QA

**Files:**
- Modify: `front/docs/qa/save-share-checklist.md`

- [ ] **Step 1: Create QA checklist**

Create `front/docs/qa/save-share-checklist.md`.

```md
# Save And Share QA Checklist

상태: 실행 체크리스트
범위: S07 저장, S07 Save & Share, S17 공유, S18 보관함, S19 플레이어

## S07 작업 저장

- 녹음 완료 후 S07에 진입한다.
- `작업 저장`을 누른다.
- 버튼 상태가 저장 중으로 바뀐다.
- 저장 성공 후 저장됨 상태가 보인다.
- 앱을 reload한 뒤 S18 `작업` 탭에 같은 작업이 남아 있다.
- `작업 저장`만 눌렀을 때 S18 `내보낸 음원/결과` 탭에는 새 항목이 생기지 않는다.

## S07 Save & Share

- 녹음 완료 후 S07에 진입한다.
- `Save & Share project`를 누른다.
- export 중에는 버튼이 중복 입력되지 않는다.
- export 성공 후 S17 공유 준비 화면으로 이동한다.
- S17에는 실제 export URI에서 만들어진 `ExportedAudio` 정보가 표시된다.

## S17 공유하기

- S17에서 `공유하기`를 누른다.
- publish 중에는 공유 버튼이 중복 입력되지 않는다.
- publish 성공 후 S20 공유 피드로 이동한다.
- S20에는 방금 공유한 항목이 공유 가능한 player 대상으로 잡힌다.
- S18 `내보낸 음원/결과` 탭에서 해당 항목의 `shareState`가 shared로 유지된다.

## S17 저장만 하기

- S17에서 `저장만 하기`를 누른다.
- 서버 publish 요청은 발생하지 않는다.
- S18로 이동한다.
- 해당 `ExportedAudio`의 `shareState`는 ready로 유지된다.
```

- [ ] **Step 2: Run full validation**

Run:

```bash
npm run typecheck
npm test
```

Expected: both commands pass.

- [ ] **Step 3: Browser QA**

Run the app and verify the checklist on `localhost:8081`.

```bash
npm start
```

Expected visible states:

- S07 `작업 저장` shows saved state after success.
- S07 `Save & Share project` opens S17 after export success.
- S17 `공유하기` opens S20 after publish success.
- S17 `저장만 하기` opens S18 and leaves the item unshared.

## 6. Backlog Items Produced By This Plan

| ID | 항목 | 근거 | 완료 기준 |
| --- | --- | --- | --- |
| SAVE-01 | 로컬 library snapshot 영속 저장 | 현재 앱은 noop services를 사용한다 | reload 뒤 S18에서 작업과 export가 복원된다 |
| SAVE-02 | 저장 성공/실패 상태 모델 | 현재 `workSaveStatus`는 saved만 표현한다 | saving, saved, failed 상태가 UI와 테스트에 연결된다 |
| SHARE-01 | 실제 audio export service 연결 | 현재 `placeholder://export-1.wav`를 만든다 | `services.audio.exportWorkAudio()` 결과 URI가 `ExportedAudio.audioUri`에 저장된다 |
| SHARE-02 | Save & Share 목적지 정리 | 현재 버튼 label은 share이지만 S19로 이동한다 | export 성공 후 S17 공유 준비로 이동한다 |
| SHARE-03 | 실제 publish service 연결 | 현재 reducer가 바로 `shareState`를 shared로 바꾼다 | `services.share.publishShareTarget()` 성공 후에만 shared가 된다 |
| SHARE-04 | S17 저장만 하기 semantics 보존 | 저장만 하기와 공유하기가 같은 대상에서 갈라진다 | 저장만 하기는 publish API를 호출하지 않고 `shareState = ready`를 유지한다 |

## 7. Self-Review

- Spec coverage: 저장, Save & Share, 공유하기, 저장만 하기, 보관함 복원, 실패 상태를 각각 task로 분리했다.
- Placeholder scan: 이 문서는 `placeholder://`를 현재 제거 대상의 예시로만 언급한다. 구현 단계에는 빈 작업 항목을 남기지 않았다.
- Type consistency: `ShareTargetReference`, `ExportedAudio`, `WorkSaveStatus`, `WorkExportStatus`, `SharePublishStatus`는 task 전반에서 같은 이름을 사용한다.
