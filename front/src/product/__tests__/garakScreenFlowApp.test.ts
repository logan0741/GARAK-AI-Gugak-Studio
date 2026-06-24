import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('does not render a mocked OS status bar in the app shell', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).not.toContain('9:41');
  expect(source).not.toContain('styles.statusBar');
  expect(source).not.toContain('homeIndicator');
});

test('uses the Figma completed instrument stack for S08 after adding a track', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('secondInstrumentTrackLabel');
  expect(source).toContain('Track 2 :');
  expect(source).toContain('freeCreationAddedInstrumentLayer');
  expect(source).toContain('freeCreationAddedInstrumentTrackButton');
  expect(source).toContain('freeCreationAccompanimentLayerAfterInstrument');
});

test('uses the completed free-creation preview with live work and jangdan data', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('hasAccompanimentTrack');
  expect(source).toContain('freeCreationCompletedPreviewScreen');
  expect(source).toContain('freeCreationCompletedTitleStrong');
  expect(source).toContain('미리듣기');
  expect(source).toContain('getFreeCreationCompletedPreviewModel');
  expect(source).toContain('previewModel.playerTitle');
  expect(source).toContain('previewModel.accompanimentTrackLabel');
  expect(source).toContain('freeCreationCompletedAccompanimentButton');
});

test('connects S10 jangdan preset previews without applying the preset', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain("type: 'previewJangdanPreset'");
  expect(source).toContain("type: 'turnOffLiveJangdanGuide'");
  expect(source).toContain("type: 'cancelAccompanimentTrack'");
  expect(source).toContain('model.previewingPresetId');
  expect(source).toContain('미리듣는 중');
  expect(source).toContain("label={mode === 'live' ? '끄기' : '취소'}");
  expect(source).toContain('previewButtonActive');
});

test('uses the Figma home hero copy in the home screen accessibility contract', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('AI와 함께');
  expect(source).not.toContain('장단 추천으로');
});

test('uses the Figma free-creation mode guide for the intro screen', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/settingsScreens.tsx'), 'utf8');

  expect(source).toContain('원하는');
  expect(source).toContain('연주모드');
  expect(source).toContain('자유창작 모드');
  expect(source).toContain('따라하기 모드');
  expect(source).toContain('AI 반주 추가');
  expect(source).toContain('useWindowDimensions');
  expect(source).toContain('modeGuidePanelCompact');
  expect(source).toContain("type: 'selectIntroGuideMode'");
  expect(source).toContain("mode: 'freeCreation'");
  expect(source).toContain("mode: 'practice'");
  expect(source).toContain('modeGuideSkipButton');
  expect(source).toMatch(/label="건너뛰기"[\s\S]*?target: 'S04'/);
  expect(source).toContain("target: 'S04'");
  expect(source).not.toContain('GARAK에 오신 것을 환영해요');
  expect(source).not.toContain('onPress={() => undefined}');
  expect(source).not.toContain("onPress={() => dispatch({ type: 'navigate', target: 'S13' })}");
});

test('connects S23 login sync preview and actions to library data', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/settingsScreens.tsx'), 'utf8');

  expect(source).toContain('getLoginSyncViewModel');
  expect(source).toContain('model.localSummary');
  expect(source).toContain('model.accountSummary');
  expect(source).toContain('model.conflictLabel');
  expect(source).toContain('model.syncPreviewLabel');
  expect(source).toContain('model.emptyAccountMessage');
  expect(source).toContain('Google로 로그인');
  expect(source).toContain('동기화');
  expect(source).toContain('선택해서 가져오기');
  expect(source).toContain('건너뛰기');
  expect(source).toContain('model.actions.login');
  expect(source).toContain('model.actions.sync');
  expect(source).toContain('model.actions.importSelected');
  expect(source).toContain('model.actions.skip');
});

test('connects S22 settings actions to language and library management', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/settingsScreens.tsx'), 'utf8');

  expect(source).toContain('getSettingsViewModel');
  expect(source).toContain('model.actions.changeLanguage');
  expect(source).toContain('model.actions.manageLibrary');
  expect(source).toContain('model.actions.loginAndLoadMySongs');
});

test('connects S02 language choices to the product language state', () => {
  const appSource = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');
  const settingsSource = readFileSync(resolve(process.cwd(), 'src/product/settingsScreens.tsx'), 'utf8');

  expect(appSource).toContain('<LanguageContent state={state} dispatch={dispatch} />');
  expect(settingsSource).toContain("type: 'setLanguage'");
  expect(settingsSource).toContain("language: 'ko'");
  expect(settingsSource).toContain("language: 'en'");
  expect(settingsSource).toContain('state.language');
});

test('connects S18 library tabs, search, sync label, and empty state CTA', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/libraryScreens.tsx'), 'utf8');

  expect(source).toContain('model.tabs.map');
  expect(source).toContain("type: 'selectLibraryTab'");
  expect(source).toContain('TextInput');
  expect(source).toContain("type: 'updateLibrarySearchQuery'");
  expect(source).toContain('model.syncLabel');
  expect(source).toContain('accessibilityLabel="보관함 동기화"');
  expect(source).toContain("type: 'loginAndLoadMySongs'");
  expect(source).toContain('model.emptyState');
});

test('connects S19 player edit and share CTAs to selected library item actions', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/libraryScreens.tsx'), 'utf8');

  expect(source).toContain('getMyLibraryPlayerActions');
  expect(source).toContain('playerActions.editAction');
  expect(source).toContain('playerActions.shareAction');
  expect(source).toContain('편집으로 열기');
  expect(source).toContain('공유');
  expect(source).toContain('보관함으로 돌아가기');
  expect(source).toContain('dispatch(playerActions.backAction)');
  expect(source).toContain('dispatch(playerActions.editAction)');
  expect(source).toContain('dispatch(playerActions.shareAction)');
});

test('uses the Figma instrument selection design for the free-creation instrument screen', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('연주 할');
  expect(source).toContain('악기');
  expect(source).toContain('장구 Janggu');
  expect(source).toContain('장구는 한국 전통 음악에서');
  expect(source).toContain('InstrumentSelectionArtworkPanel');
  expect(source).toContain('FUTURE_INSTRUMENT_CHIPS');
  expect(source).toContain('onLockedInstrumentPress');
  expect(source).toContain("type: 'showFutureInstrumentNotice'");
  expect(source).toContain('새로운 악기가 업데이트될 예정이에요');
  expect(source).toContain('NEXT');
  expect(source).not.toContain('연주 & 녹음');
});

test('uses the Figma performance preview design before entering free play', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('연주 할 화면');
  expect(source).toContain('미리 볼 수 있어요');
  expect(source).toContain('연주를 시작하고 녹음하고');
  expect(source).toContain('양손으로 궁편과 열편을');
  expect(source).toContain('JangguPreviewStageArtwork');
  expect(source).toContain('ProgressSteps step={2}');
  expect(source).toContain('startWithDefaults');
  expect(source).not.toContain('직접 조정');
});

test('uses the Figma gayageum stage for landscape free play', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('GayageumLandscapeStageArtwork');
  expect(source).toContain('usesFigmaGayageumLandscapeStage');
  expect(source).toContain("instrument === 'gayageum'");
});

test('uses the Figma daegeum stage for landscape free play', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('DaegeumLandscapeStageArtwork');
  expect(source).toContain('usesFigmaDaegeumLandscapeStage');
  expect(source).toContain("instrument === 'daegeum'");
});

test('lets embedded Figma landscape stages own the full viewport', () => {
  const appSource = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');
  const freePlaySource = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(appSource).toContain('embeddedLandscapeContent');
  expect(appSource).toContain('landscapeContentStyle = usesEmbeddedHeader ? styles.embeddedLandscapeContent');
  expect(freePlaySource).toContain('usesFigmaLandscapeStage');
  expect(freePlaySource).toContain('!usesFigmaLandscapeStage ?');
});

test('connects S05 embedded Figma landscape stage hotspots to free-play actions', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('LandscapeStageActionHits');
  expect(source).toContain('LandscapeStageNotice');
  expect(source).toContain("visible={state.freePlayNotice === 'missingTake'}");
  expect(source).toContain("accessibilityLabel=\"녹음 시작\"");
  expect(source).toContain("type: 'startPerformanceRecording'");
  expect(source).toContain("accessibilityLabel=\"장단 설정\"");
  expect(source).toContain("type: 'openLiveJangdanGuide'");
  expect(source).toContain("accessibilityLabel=\"레이어 편집\"");
  expect(source).toContain("type: 'openLayerEditor'");
  expect(source).toContain("accessibilityLabel=\"연주 완료\"");
  expect(source).toContain("type: 'completePerformance'");
});

test('connects S05 recording start separately from completion and missing-take guidance', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain("type: 'startPerformanceRecording'");
  expect(source).toContain("type: 'completePerformance'");
  expect(source).toContain("type: 'openLayerEditor'");
  expect(source).toContain("state.freePlayNotice === 'missingTake'");
  expect(source).toContain('저장할 테이크가 없어요');
  expect(source).toContain("label={state.pendingFreePlayTake ? '녹음 중' : '녹음'}");
  expect(source).not.toContain("label=\"레이어\" onPress={() => dispatch({ type: 'navigate', target: 'S07' })}");
});

test('uses the Figma free-creation mix and share flow for S07', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('freeCreationMixScreen');
  expect(source).toContain('freeCreationPlayerDeck');
  expect(source).toContain('getFreeCreationMixEditorModel');
  expect(source).toContain('mixEditorModel.playerTitle');
  expect(source).toContain('mixEditorModel.playerAccessibilityLabel');
  expect(source).toContain('Mix');
  expect(source).toContain('Save & Share project');
  expect(source).toContain("type: 'addTrack'");
  expect(source).toContain("type: 'exportCurrentWork'");
  expect(source).not.toContain('TrackPill label="트랙 추가하기"');
  expect(source).not.toContain('My Janggu');
});

test('prevents the share feed from entering S17 without a shareable target', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/shareScreens.tsx'), 'utf8');

  expect(source).toContain('getSharePrepareAction');
  expect(source).toContain('disabled={sharePrepareAction === undefined}');
  expect(source).not.toContain("onPress={() => dispatch({ type: 'navigate', target: 'S17' })}");
});

test('connects S17 share publishing to the selected share target state', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/shareScreens.tsx'), 'utf8');

  expect(source).toContain("type: 'publishShareTarget'");
  expect(source).toContain("type: 'previewShareTarget'");
  expect(source).toContain("type: 'back'");
  expect(source).toContain('durationLabel');
  expect(source).toContain('instrumentLabel');
  expect(source).toContain('sourceLabel');
  expect(source).toContain('미리듣기');
  expect(source).toContain('취소');
  expect(source).not.toContain("label=\"공유하기\"\n          onPress={() => dispatch({ type: 'navigate', target: 'S20' })}");
});

test('connects S16 result actions to retry, save, share, and choose another song', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/practiceScreens.tsx'), 'utf8');

  expect(source).toMatch(/label="다시 연주"\s+onPress=\{\(\) => dispatch\(\{ type: 'navigate', target: 'S15' \}\)\}/);
  expect(source).toMatch(/label="저장"\s+onPress=\{\(\) => dispatch\(\{ type: 'savePracticeResult' \}\)\}/);
  expect(source).toMatch(/label="공유"\s+onPress=\{\(\) => dispatch\(\{ type: 'sharePracticeResult' \}\)\}/);
  expect(source).toMatch(/label="다른 민요 선택"\s+onPress=\{\(\) => dispatch\(\{ type: 'navigate', target: 'S13' \}\)\}/);
});

test('connects S13 song preview and guide readiness metadata', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/practiceScreens.tsx'), 'utf8');

  expect(source).toContain("type: 'previewPracticeSong'");
  expect(source).toContain("type: 'selectPracticeSong'");
  expect(source).toContain('미리듣기');
  expect(source).toContain('가이드 준비 완료');
  expect(source).toContain('지원 악기');
  expect(source).toContain('supportedInstruments.map');
});

test('keeps S14 instrument selection separate from the Next action', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/practiceScreens.tsx'), 'utf8');
  const stateSource = readFileSync(resolve(process.cwd(), 'src/product/garakProductState.ts'), 'utf8');
  const selectInstrumentReducerCase =
    stateSource.match(/case 'selectPracticeInstrument':[\s\S]*?case 'finishPractice':/)?.[0] ?? '';

  expect(source).toContain('selectedPracticeInstrument');
  expect(source).toContain("type: 'selectPracticeInstrument'");
  expect(source).toMatch(/PrimaryPillButton label="NEXT" onPress=\{\(\) => dispatch\(\{ type: 'next' \}\)\}/);
  expect(selectInstrumentReducerCase).toContain('selectedInstrument: action.instrument');
  expect(selectInstrumentReducerCase).not.toContain("pushTarget(state.screenFlow, 'S15')");
});

test('connects S15 practice controls to practice attempt state actions', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/practiceScreens.tsx'), 'utf8');

  expect(source).toContain('practiceAttempt');
  expect(source).toMatch(/label=\{practiceControlLabel\}\s+onPress=\{handlePrimaryPracticeAction\}/);
  expect(source).toContain("type: 'startPractice'");
  expect(source).toContain("type: 'pausePractice'");
  expect(source).toContain("type: 'restartPractice'");
  expect(source).toContain("type: 'finishPractice'");
  expect(source).toContain('일시정지');
  expect(source).toContain('다시 시작');
});

test('connects shared detail remix and save buttons to library data actions', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/shareScreens.tsx'), 'utf8');

  expect(source).toContain('getSharedDetailViewModel');
  expect(source).toContain("type: 'openSharedRecordingDetail'");
  expect(source).toContain('recordingId: model.hero.recordingId');
  expect(source).toContain('recordingId: card.recordingId');
  expect(source).toContain('firstRecentCard.recordingId');
  expect(source).toContain('disabled={!model.canRemix}');
  expect(source).toContain('model.actions.remix');
  expect(source).toContain('model.actions.save');
  expect(source).not.toContain("type: 'navigate', target: 'S21'");
  expect(source).not.toContain("label=\"리믹스\" tone=\"amber\" onPress={() => dispatch({ type: 'navigate', target: 'S07' })}");
  expect(source).not.toContain("label=\"저장\" onPress={() => dispatch({ type: 'navigate', target: 'S18' })}");
});

test('keeps the share quick access tab active on S20', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/shareScreens.tsx'), 'utf8');

  expect(source).toContain(
    '<QuickAccessNav\n          active="share"\n          dark\n          style={styles.shareQuickAccessOverlay}',
  );
});

test('uses the Figma stacked track add flow for S08', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('freeCreationTrackAddScreen');
  expect(source).toContain('나만의 가락');
  expect(source).toContain('AI 반주 생성하기');
  expect(source).toContain('트랙 추가하기');
  expect(source).toContain('가져오기');
  expect(source).toContain('가져오기는 이후 업데이트에서 지원할 예정이에요.');
  expect(source).toContain("type: 'showLockedImportTrackNotice'");
  expect(source).toContain("type: 'cancelTrackAdd'");
  expect(source).toContain('freeCreationLayerOptionRotated');
  expect(source).toContain("rotate: '-8.4deg'");
  expect(source).toContain("type: 'chooseAccompanimentTrack'");
  expect(source).toContain("type: 'chooseInstrumentTrack'");
  expect(source).toContain('TRACK 1 :');
  expect(source).not.toContain("추가할 트랙을\\n선택해요.");
});

test('connects S09 extra instrument recording controls before applying the new track', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('기존 작업을 들으며');
  expect(source).toContain("label={state.pendingFreePlayTake ? '녹음 중' : '녹음'}");
  expect(source).toContain("type: 'startPerformanceRecording'");
  expect(source).toContain('미리듣기 준비됨');
  expect(source).toContain('extraInstrumentNoteBubble');
  expect(source).toContain("type: 'restartInstrumentTrackRecording'");
  expect(source).toContain("type: 'applyInstrumentTrack'");
  expect(source).toContain("type: 'cancelInstrumentTrack'");
  expect(source).toContain('다시 녹음');
  expect(source).toContain('취소');
  expect(source).toContain('extraInstrumentButtonRow');
  expect(source).toContain('extraInstrumentActionButton');
});
