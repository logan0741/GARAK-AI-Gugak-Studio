import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import {
  EXCLUDED_SCREEN_IDS,
  IMPLEMENTED_SCREEN_IDS,
  directNavigationTargets,
  excludedScreenDefinitions,
  implementedScreenDefinitions,
  isDirectNavigationTarget,
} from '../screenDefinitions';
import { createInitialScreenFlowState, transitionScreenFlow } from '../screenFlowMachine';

test('defines the S01-S23 implementation boundary without standalone excluded screens', () => {
  const expectedImplementedScreens = new Set([
    'S01',
    'S02',
    'S03',
    'S04',
    'S04A',
    'S05',
    'S07',
    'S08',
    'S09',
    'S10A',
    'S10B',
    'S13',
    'S14',
    'S15',
    'S16',
    'S17',
    'S18',
    'S19',
    'S20',
    'S21',
    'S22',
    'S23',
  ]);

  expect(new Set(IMPLEMENTED_SCREEN_IDS)).toEqual(expectedImplementedScreens);
  expect(new Set(EXCLUDED_SCREEN_IDS)).toEqual(new Set(['S06', 'S11', 'S12']));
  expect(new Set(Object.keys(implementedScreenDefinitions))).toEqual(expectedImplementedScreens);
});

test('keeps excluded screens out of direct navigation targets', () => {
  expect(directNavigationTargets).not.toContain('S06');
  expect(directNavigationTargets).not.toContain('S11');
  expect(directNavigationTargets).not.toContain('S12');

  expect(isDirectNavigationTarget('S06')).toBe(false);
  expect(isDirectNavigationTarget('S11')).toBe(false);
  expect(isDirectNavigationTarget('S12')).toBe(false);
});

test('documents S12 as absorbed into the S03 mode guide state', () => {
  expect(implementedScreenDefinitions.S03.primaryCtas).toEqual(
    expect.arrayContaining(['selectPracticeMode', 'next']),
  );
  expect(excludedScreenDefinitions.S12.reason).toContain('S03');
  expect(excludedScreenDefinitions.S12.reason).not.toContain('S01 home selection');
});

test('documents S04A as the Figma performance preview with a single Next CTA', () => {
  const screenFlowDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/current-screen-flow.md'),
    'utf8',
  );
  const s04aSection = screenFlowDoc.slice(
    screenFlowDoc.indexOf('### S04A 연주 화면 미리보기'),
    screenFlowDoc.indexOf('### S05 악기 자유연주'),
  );

  expect(implementedScreenDefinitions.S04A.primaryCtas).toEqual(['next']);
  expect(implementedScreenDefinitions.S04A.transitions).toEqual([
    { action: 'next', target: 'S05' },
  ]);
  expect(s04aSection).toContain('Figma MCP node `258:266`');
  expect(s04aSection).toContain('NEXT');
  expect(s04aSection).not.toContain('직접 조정');
  expect(s04aSection).not.toContain('기본값으로 시작');
});

test('defines S05 free-play actions with connected recording, jangdan, and layer actions', () => {
  expect(implementedScreenDefinitions.S05.primaryCtas).toEqual(
    expect.arrayContaining([
      'openFreePlayRecordingSetup',
      'startPerformanceRecording',
      'cancelFreePlayRecordingSetup',
      'completePerformance',
      'openLiveJangdanGuide',
      'openLayerEditor',
    ]),
  );
  expect(implementedScreenDefinitions.S05.transitions).toEqual(
    expect.arrayContaining([
      { action: 'completePerformance', target: 'S07' },
      { action: 'openLiveJangdanGuide', target: 'S10A' },
      { action: 'openLayerEditor', target: 'S07' },
    ]),
  );
  expect(implementedScreenDefinitions.S05.transitions).not.toContainEqual(
    expect.objectContaining({
      action: 'openFreePlayRecordingSetup',
    }),
  );
  expect(implementedScreenDefinitions.S05.transitions).not.toContainEqual(
    expect.objectContaining({
      action: 'startPerformanceRecording',
    }),
  );
});

test('defines S07 track editor actions with connected save, add, and export actions', () => {
  expect(implementedScreenDefinitions.S07.primaryCtas).toEqual(
    expect.arrayContaining(['saveCurrentWork', 'exportCurrentWork', 'addTrack']),
  );
  expect(implementedScreenDefinitions.S07.transitions).toEqual(
    expect.arrayContaining([
      { action: 'addTrack', target: 'S08' },
      { action: 'exportCurrentWork', target: 'S19' },
    ]),
  );
  expect(implementedScreenDefinitions.S07.transitions).not.toContainEqual(
    expect.objectContaining({
      action: 'saveCurrentWork',
    }),
  );
});

test('defines documented cancel and disable transitions for track and jangdan flows', () => {
  expect(implementedScreenDefinitions.S09.primaryCtas).toEqual(
    expect.arrayContaining([
      'startPerformanceRecording',
      'applyInstrumentTrack',
      'restartInstrumentTrackRecording',
      'cancelInstrumentTrack',
    ]),
  );
  expect(implementedScreenDefinitions.S09.transitions).toContainEqual({
    action: 'applyInstrumentTrack',
    target: 'S07',
  });
  expect(implementedScreenDefinitions.S09.transitions).toContainEqual({
    action: 'cancelInstrumentTrack',
    target: 'S07',
  });
  expect(implementedScreenDefinitions.S09.transitions).not.toContainEqual(
    expect.objectContaining({
      action: 'startPerformanceRecording',
    }),
  );
  expect(implementedScreenDefinitions.S09.transitions).not.toContainEqual(
    expect.objectContaining({
      action: 'restartInstrumentTrackRecording',
    }),
  );

  expect(implementedScreenDefinitions.S10A.primaryCtas).toEqual(
    expect.arrayContaining([
      'previewJangdanPreset',
      'applyLiveJangdanGuide',
      'turnOffLiveJangdanGuide',
    ]),
  );
  expect(implementedScreenDefinitions.S10A.transitions).toContainEqual({
    action: 'applyLiveJangdanGuide',
    target: 'S05',
  });
  expect(implementedScreenDefinitions.S10A.transitions).toContainEqual({
    action: 'turnOffLiveJangdanGuide',
    target: 'S05',
  });
  expect(implementedScreenDefinitions.S10A.transitions).not.toContainEqual(
    expect.objectContaining({
      action: 'previewJangdanPreset',
    }),
  );

  expect(implementedScreenDefinitions.S10B.primaryCtas).toEqual(
    expect.arrayContaining([
      'previewJangdanPreset',
      'addAccompanimentTrack',
      'cancelAccompanimentTrack',
    ]),
  );
  expect(implementedScreenDefinitions.S10B.transitions).toContainEqual({
    action: 'cancelAccompanimentTrack',
    target: 'S07',
  });
  expect(implementedScreenDefinitions.S10B.transitions).not.toContainEqual(
    expect.objectContaining({
      action: 'previewJangdanPreset',
    }),
  );
});

test('defines S08 locked import as a documented same-screen action', () => {
  const screenFlowDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/current-screen-flow.md'),
    'utf8',
  );
  const s08Section = screenFlowDoc.slice(
    screenFlowDoc.indexOf('### S08 트랙 추가'),
    screenFlowDoc.indexOf('### S09 추가 악기 녹음'),
  );

  expect(implementedScreenDefinitions.S08.primaryCtas).toEqual(
    expect.arrayContaining([
      'openInstrumentTrackSelection',
      'chooseInstrumentTrack',
      'chooseAccompanimentTrack',
      'showLockedImportTrackNotice',
      'cancelTrackAdd',
    ]),
  );
  expect(implementedScreenDefinitions.S08.transitions).toEqual(
    expect.arrayContaining([
      { action: 'chooseInstrumentTrack', target: 'S09' },
      { action: 'chooseAccompanimentTrack', target: 'S10B' },
      { action: 'cancelTrackAdd', target: 'S07' },
    ]),
  );
  expect(implementedScreenDefinitions.S08.transitions).not.toContainEqual(
    expect.objectContaining({ action: 'showLockedImportTrackNotice' }),
  );
  expect(s08Section).toContain('가져오기');
  expect(s08Section).toContain('가져오기는 이후 업데이트에서 지원할 예정이에요.');
});

test('keeps settings and login sync primary CTAs aligned with the screen-flow document', () => {
  expect(implementedScreenDefinitions.S22.primaryCtas).toEqual(
    expect.arrayContaining(['loginAndLoadMySongs', 'changeLanguage', 'manageLibrary']),
  );
  expect(implementedScreenDefinitions.S23.primaryCtas).toEqual(
    expect.arrayContaining(['login', 'sync', 'importSelected', 'skip']),
  );
});

test('defines S17 share preparation actions with connected preview and publish actions', () => {
  expect(implementedScreenDefinitions.S17.primaryCtas).toEqual(
    expect.arrayContaining(['previewShareTarget', 'publishShareTarget', 'saveOnly', 'cancel']),
  );
  expect(implementedScreenDefinitions.S17.transitions).toContainEqual({
    action: 'publishShareTarget',
    target: 'S20',
  });
  expect(implementedScreenDefinitions.S17.transitions).toContainEqual({
    action: 'cancel',
    target: 'previous',
  });
});

test('defines S18 library search and sync actions from the detailed document', () => {
  expect(implementedScreenDefinitions.S18.primaryCtas).toEqual(
    expect.arrayContaining(['openWork', 'listen', 'share', 'more', 'search', 'sync']),
  );
  expect(implementedScreenDefinitions.S18.transitions).toContainEqual({
    action: 'sync',
    target: 'S23',
  });
});

test('defines S19 player management actions from the detailed document', () => {
  expect(implementedScreenDefinitions.S19.primaryCtas).toEqual(
    expect.arrayContaining([
      'playSelectedPlayerItem',
      'pauseSelectedPlayerItem',
      'openSelectedPlayerEditor',
      'shareSelectedPlayerItem',
      'deleteSelectedPlayerItem',
    ]),
  );
  expect(implementedScreenDefinitions.S19.transitions).toEqual(
    expect.arrayContaining([
      { action: 'openSelectedPlayerEditor', target: 'S07' },
      { action: 'shareSelectedPlayerItem', target: 'S17' },
      { action: 'deleteSelectedPlayerItem', target: 'S18' },
      { action: 'backToLibrary', target: 'S18' },
    ]),
  );
});

test('defines S20 share feed detail entry from the detailed document', () => {
  expect(implementedScreenDefinitions.S20.primaryCtas).toEqual(
    expect.arrayContaining(['play', 'remix', 'save', 'detail']),
  );
  expect(implementedScreenDefinitions.S20.transitions).toContainEqual({
    action: 'detail',
    target: 'S21',
  });
});

test('defines S15 practice controls from the detailed document', () => {
  const screenFlowDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/current-screen-flow.md'),
    'utf8',
  );
  const s15Section = screenFlowDoc.slice(
    screenFlowDoc.indexOf('### S15 따라하기 연주'),
    screenFlowDoc.indexOf('### S16 결과 / AI 피드백'),
  );

  expect(implementedScreenDefinitions.S15.primaryCtas).toEqual(
    expect.arrayContaining(['start', 'pause', 'complete', 'stop', 'restart']),
  );
  expect(implementedScreenDefinitions.S15.transitions).toContainEqual({
    action: 'finishPractice',
    target: 'S16',
  });
  expect(s15Section).toContain('일시정지');
  expect(s15Section).toContain('다시 시작');
});

test('defines S13 practice song preview action from the detailed document', () => {
  const screenFlowDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/current-screen-flow.md'),
    'utf8',
  );
  const s13Section = screenFlowDoc.slice(
    screenFlowDoc.indexOf('### S13 민요 선택'),
    screenFlowDoc.indexOf('### S14 따라하기 악기 선택'),
  );

  expect(implementedScreenDefinitions.S13.primaryCtas).toEqual(
    expect.arrayContaining([
      'selectArirang',
      'selectDoraji',
      'selectBoatSong',
      'previewPracticeSong',
    ]),
  );
  expect(s13Section).toContain('미리듣기');
});

test('defines S14 practice instrument next action from the detailed document', () => {
  const screenFlowDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/current-screen-flow.md'),
    'utf8',
  );
  const s14Section = screenFlowDoc.slice(
    screenFlowDoc.indexOf('### S14 따라하기 악기 선택'),
    screenFlowDoc.indexOf('### S15 따라하기 연주'),
  );

  expect(implementedScreenDefinitions.S14.primaryCtas).toEqual(
    expect.arrayContaining(['selectGayageum', 'selectJanggu', 'selectDaegeum', 'next']),
  );
  expect(implementedScreenDefinitions.S14.transitions).toContainEqual({
    action: 'next',
    target: 'S15',
  });
  expect(s14Section).toContain('Next');
});

test('defines S16 choose-another-song action from the detailed document', () => {
  const screenFlowDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/current-screen-flow.md'),
    'utf8',
  );
  const s16Section = screenFlowDoc.slice(
    screenFlowDoc.indexOf('### S16 결과 / AI 피드백'),
    screenFlowDoc.indexOf('### S17 공유 준비'),
  );

  expect(implementedScreenDefinitions.S16.primaryCtas).toEqual(
    expect.arrayContaining(['practiceAgain', 'save', 'share', 'chooseAnotherSong']),
  );
  expect(implementedScreenDefinitions.S16.transitions).toContainEqual({
    action: 'chooseAnotherSong',
    target: 'S13',
  });
  expect(s16Section).toContain('다른 민요 선택');
});

test('documents S23 skip as returning to the entry surface', () => {
  expect(implementedScreenDefinitions.S23.transitions).toContainEqual({
    action: 'skip',
    target: 'previous',
  });
});

test('defines S01 as the Figma hero entry that opens the S03 mode guide', () => {
  expect(implementedScreenDefinitions.S01.primaryCtas).toEqual([
    'playHero',
    'language',
    'library',
    'shareFeed',
    'settings',
  ]);
  expect(implementedScreenDefinitions.S01.transitions).toContainEqual({
    action: 'introGuide',
    target: 'S03',
  });
  expect(implementedScreenDefinitions.S01.transitions).not.toContainEqual({
    action: 'nextFreeCreation',
    target: 'S04',
  });
  expect(implementedScreenDefinitions.S01.transitions).not.toContainEqual({
    action: 'nextPractice',
    target: 'S13',
  });

  expect(implementedScreenDefinitions.S03.primaryCtas).toEqual([
    'selectFreeCreationMode',
    'selectPracticeMode',
    'next',
  ]);
  expect(implementedScreenDefinitions.S03.transitions).toContainEqual({
    action: 'nextFreeCreation',
    target: 'S04',
  });
  expect(implementedScreenDefinitions.S03.transitions).toContainEqual({
    action: 'nextPractice',
    target: 'S13',
  });
  expect(implementedScreenDefinitions.S03.transitions).not.toContainEqual({
    action: 'skip',
    target: 'S04',
  });
  expect(implementedScreenDefinitions.S03.transitions).not.toContainEqual({
    action: 'nextStep',
    target: 'S05',
  });
});

test('documents S01 hero entry and S03 mode selection as the current authority', () => {
  const screenFlowDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/current-screen-flow.md'),
    'utf8',
  );
  const designDoc = readFileSync(resolve(process.cwd(), 'docs/design/DESIGN.md'), 'utf8');
  const changeDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/changes/2026-06-25-s01-home-hero-entry.md'),
    'utf8',
  );

  expect(screenFlowDoc).toContain('S01 홈은 Figma의 단일 hero entry를 우선한다.');
  expect(screenFlowDoc).toContain('S03 `홈-자유창작모드`에서 `자유창작 모드 / 따라하기 모드`를 선택한다.');
  expect(screenFlowDoc).not.toContain('홈의 1차 선택은 `자유창작 모드 / 따라하기 모드`이다.');
  expect(screenFlowDoc).not.toContain('S01 홈의 따라하기 모드 선택 상태로 흡수한다.');
  expect(designDoc).toContain('홈의 1차 행동은 hero `PLAY` 진입이다.');
  expect(designDoc).not.toContain('홈의 1차 선택은 `자유창작 모드 / 따라하기 모드` segmented control이다.');
  expect(changeDoc).toContain('2026-06-25');
  expect(changeDoc).toContain('S01에서 모드 토글을 제거');
});

test('routes S01 hero entry to S03 mode selection', () => {
  const next = transitionScreenFlow(createInitialScreenFlowState(), {
    type: 'navigate',
    target: 'S03',
  });

  expect(next.currentScreen).toBe('S03');
  expect(next.history).toEqual(['S01']);
});

test('routes S03 Next to S04 when free creation mode is selected', () => {
  const state = transitionScreenFlow(createInitialScreenFlowState({
    currentScreen: 'S03',
    history: ['S01'],
  }), {
    type: 'selectMode',
    mode: 'freeCreation',
  });

  const next = transitionScreenFlow(state, { type: 'next' });

  expect(next.currentScreen).toBe('S04');
  expect(next.history).toEqual(['S01', 'S03']);
});

test('routes S03 Next to S13 when practice mode is selected', () => {
  const state = transitionScreenFlow(createInitialScreenFlowState({
    currentScreen: 'S03',
    history: ['S01'],
  }), {
    type: 'selectMode',
    mode: 'practice',
  });

  const next = transitionScreenFlow(state, { type: 'next' });

  expect(next.currentScreen).toBe('S13');
  expect(next.history).toEqual(['S01', 'S03']);
});

test('routes documented Next transitions after mode and instrument selection', () => {
  expect(
    transitionScreenFlow(
      createInitialScreenFlowState({
        currentScreen: 'S04',
        history: ['S01', 'S03'],
      }),
      { type: 'next' },
    ),
  ).toMatchObject({
    currentScreen: 'S04A',
    history: ['S01', 'S03', 'S04'],
  });

  expect(
    transitionScreenFlow(
      createInitialScreenFlowState({
        currentScreen: 'S04A',
        history: ['S01', 'S03', 'S04'],
      }),
      { type: 'next' },
    ),
  ).toMatchObject({
    currentScreen: 'S05',
    history: ['S01', 'S03', 'S04', 'S04A'],
  });

  expect(
    transitionScreenFlow(
      createInitialScreenFlowState({
        currentScreen: 'S14',
        history: ['S01', 'S03', 'S13'],
        mode: 'practice',
      }),
      { type: 'next' },
    ),
  ).toMatchObject({
    currentScreen: 'S15',
    history: ['S01', 'S03', 'S13', 'S14'],
  });
});

test('allows the S03 mode guide to enter the practice song flow', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S03',
    history: ['S01'],
  });

  const next = transitionScreenFlow(state, { type: 'navigate', target: 'S13' });

  expect(next.currentScreen).toBe('S13');
  expect(next.history).toEqual(['S01', 'S03']);
});

test('rejects S03 mode selection from other screens', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S13',
    history: ['S01'],
    mode: 'practice',
  });

  expect(() =>
    transitionScreenFlow(state, {
      type: 'selectMode',
      mode: 'freeCreation',
    }),
  ).toThrow('selectMode is only available from S03');
});

test('routes S05 completion directly to S07 without entering S06', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S05',
    history: ['S04A'],
  });

  const next = transitionScreenFlow(state, { type: 'completePerformance' });

  expect(next.currentScreen).toBe('S07');
  expect(next.history).toEqual(['S04A', 'S05']);
  expect(next.history).not.toContain('S06');
});

test('routes S05 jangdan and layer actions with connected UI actions', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S05',
    history: ['S01', 'S03', 'S04', 'S04A'],
  });

  expect(transitionScreenFlow(state, { type: 'openLiveJangdanGuide' }).currentScreen).toBe(
    'S10A',
  );
  expect(transitionScreenFlow(state, { type: 'openLayerEditor' }).currentScreen).toBe('S07');
});

test('routes S07 add-track and export actions with connected UI actions', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S07',
    history: ['S01', 'S03', 'S04', 'S04A', 'S05'],
  });

  expect(transitionScreenFlow(state, { type: 'addTrack' }).currentScreen).toBe('S08');
  expect(transitionScreenFlow(state, { type: 'exportCurrentWork' }).currentScreen).toBe('S19');
});

test('routes S10B accompaniment add directly to S07 without entering S11', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S10B',
    history: ['S07', 'S08'],
  });

  const next = transitionScreenFlow(state, { type: 'addAccompanimentTrack' });

  expect(next.currentScreen).toBe('S07');
  expect(next.history).toEqual(['S07', 'S08', 'S10B']);
  expect(next.history).not.toContain('S11');
});

test('routes S08 track add choices with connected UI actions', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S08',
    history: ['S01', 'S03', 'S04', 'S04A', 'S05', 'S07'],
  });

  expect(transitionScreenFlow(state, { type: 'chooseInstrumentTrack' }).currentScreen).toBe('S09');
  expect(transitionScreenFlow(state, { type: 'chooseAccompanimentTrack' }).currentScreen).toBe(
    'S10B',
  );
  expect(transitionScreenFlow(state, { type: 'cancelTrackAdd' }).currentScreen).toBe('S07');
});

test('routes S09 apply and cancel actions back to S07 with connected UI actions', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S09',
    history: ['S01', 'S03', 'S04', 'S04A', 'S05', 'S07', 'S08'],
  });

  expect(transitionScreenFlow(state, { type: 'applyInstrumentTrack' }).currentScreen).toBe('S07');
  expect(transitionScreenFlow(state, { type: 'cancelInstrumentTrack' }).currentScreen).toBe('S07');
});

test('routes S10B cancellation back to S07 with the connected UI action', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S10B',
    history: ['S01', 'S03', 'S04', 'S04A', 'S05', 'S07', 'S08'],
  });

  const next = transitionScreenFlow(state, { type: 'cancelAccompanimentTrack' });

  expect(next.currentScreen).toBe('S07');
  expect(next.history).toEqual(['S01', 'S03', 'S04', 'S04A', 'S05', 'S07', 'S08', 'S10B']);
});

test('routes S10A live jangdan guide actions back to S05 with connected UI actions', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S10A',
    history: ['S01', 'S03', 'S04', 'S04A', 'S05'],
  });

  expect(transitionScreenFlow(state, { type: 'applyLiveJangdanGuide' }).currentScreen).toBe(
    'S05',
  );
  expect(transitionScreenFlow(state, { type: 'turnOffLiveJangdanGuide' }).currentScreen).toBe(
    'S05',
  );
});

test('routes S15 practice completion to S16 result with the connected UI action', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S15',
    history: ['S01', 'S03', 'S13', 'S14'],
    mode: 'practice',
  });

  const next = transitionScreenFlow(state, { type: 'finishPractice' });

  expect(next.currentScreen).toBe('S16');
  expect(next.history).toEqual(['S01', 'S03', 'S13', 'S14', 'S15']);
});

test('routes S19 player management with the connected UI actions', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S19',
    history: ['S01', 'S18'],
  });

  expect(transitionScreenFlow(state, { type: 'openSelectedPlayerEditor' }).currentScreen).toBe(
    'S07',
  );
  expect(transitionScreenFlow(state, { type: 'shareSelectedPlayerItem' }).currentScreen).toBe(
    'S17',
  );
  expect(transitionScreenFlow(state, { type: 'deleteSelectedPlayerItem' }).currentScreen).toBe(
    'S18',
  );
});

test('routes S17 publishing with the connected share action', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S17',
    history: ['S01', 'S18', 'S19'],
  });

  const next = transitionScreenFlow(state, { type: 'publishShareTarget' });

  expect(next.currentScreen).toBe('S20');
  expect(next.history).toEqual(['S01', 'S18', 'S19', 'S17']);
});

test('routes S22 login CTA to S23', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S22',
    history: ['S01'],
  });

  const next = transitionScreenFlow(state, { type: 'loginCta' });

  expect(next.currentScreen).toBe('S23');
  expect(next.history).toEqual(['S01', 'S22']);
});

test('routes S18 library sync CTA to S23', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S18',
    history: ['S01'],
  });

  const next = transitionScreenFlow(state, { type: 'loginCta' });

  expect(next.currentScreen).toBe('S23');
  expect(next.history).toEqual(['S01', 'S18']);
});

test('supports a push history stack and back transition', () => {
  const state = createInitialScreenFlowState();
  const library = transitionScreenFlow(state, { type: 'navigate', target: 'S18' });
  const detail = transitionScreenFlow(library, { type: 'navigate', target: 'S19' });

  const backToLibrary = transitionScreenFlow(detail, { type: 'back' });
  const backToHome = transitionScreenFlow(backToLibrary, { type: 'back' });

  expect(detail.currentScreen).toBe('S19');
  expect(detail.history).toEqual(['S01', 'S18']);
  expect(backToLibrary.currentScreen).toBe('S18');
  expect(backToLibrary.history).toEqual(['S01']);
  expect(backToHome.currentScreen).toBe('S01');
  expect(backToHome.history).toEqual([]);
});

test('allows direct navigate only through current screen transitions', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S08',
    history: ['S07'],
  });

  const next = transitionScreenFlow(state, { type: 'navigate', target: 'S10B' });

  expect(next.currentScreen).toBe('S10B');
  expect(next.history).toEqual(['S07', 'S08']);
});

test('supports quick access navigation among home, library, share, and settings surfaces', () => {
  const libraryState = createInitialScreenFlowState({
    currentScreen: 'S18',
    history: ['S01'],
  });
  const shareState = createInitialScreenFlowState({
    currentScreen: 'S20',
    history: ['S01'],
  });
  const settingsState = createInitialScreenFlowState({
    currentScreen: 'S22',
    history: ['S01'],
  });

  expect(transitionScreenFlow(libraryState, { type: 'navigate', target: 'S20' }).currentScreen).toBe('S20');
  expect(transitionScreenFlow(libraryState, { type: 'navigate', target: 'S01' }).currentScreen).toBe('S01');
  expect(transitionScreenFlow(libraryState, { type: 'navigate', target: 'S18' })).toEqual(libraryState);

  expect(transitionScreenFlow(shareState, { type: 'navigate', target: 'S18' }).currentScreen).toBe('S18');
  expect(transitionScreenFlow(shareState, { type: 'navigate', target: 'S01' }).currentScreen).toBe('S01');
  expect(transitionScreenFlow(shareState, { type: 'navigate', target: 'S20' })).toEqual(shareState);

  expect(transitionScreenFlow(settingsState, { type: 'navigate', target: 'S18' }).currentScreen).toBe('S18');
  expect(transitionScreenFlow(settingsState, { type: 'navigate', target: 'S20' }).currentScreen).toBe('S20');
  expect(transitionScreenFlow(settingsState, { type: 'navigate', target: 'S01' }).currentScreen).toBe('S01');
});

test('rejects direct navigate to implemented screens that are not reachable from the current screen', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S04',
    history: ['S01'],
  });

  expect(() => transitionScreenFlow(state, { type: 'navigate', target: 'S21' })).toThrow(
    'S21 is not reachable from S04',
  );
});

test('rejects direct navigation attempts to excluded screens', () => {
  const state = createInitialScreenFlowState();

  expect(() => transitionScreenFlow(state, { type: 'navigate', target: 'S06' })).toThrow(
    'S06 is excluded from standalone navigation',
  );
  expect(() => transitionScreenFlow(state, { type: 'navigate', target: 'S11' })).toThrow(
    'S11 is excluded from standalone navigation',
  );
  expect(() => transitionScreenFlow(state, { type: 'navigate', target: 'S12' })).toThrow(
    'S12 is excluded from standalone navigation',
  );
});
