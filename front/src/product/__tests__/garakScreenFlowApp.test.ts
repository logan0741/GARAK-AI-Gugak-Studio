import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import {
  PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS,
  PRODUCT_SAMPLE_MANIFESTS,
} from '../productSampleReadinessConfig';
import { resolveInstrumentSampleStatuses } from '../instrumentSampleReadiness';

test('does not render a mocked OS status bar in the app shell', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).not.toContain('9:41');
  expect(source).not.toContain('styles.statusBar');
  expect(source).not.toContain('homeIndicator');
});

test('wires bundled sample readiness into the product app entry point', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakAuthEntryApp.tsx'), 'utf8');
  const statuses = resolveInstrumentSampleStatuses({
    sampleManifests: PRODUCT_SAMPLE_MANIFESTS,
    fallbackInstruments: PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS,
  });

  expect(source).toContain('PRODUCT_SAMPLE_MANIFESTS');
  expect(source).toContain('PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS');
  expect(statuses).toEqual({
    gayageum: 'ready',
    janggu: 'fallback',
    daegeum: 'fallback',
  });
});

test('injects runtime product services from the auth entry point', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakAuthEntryApp.tsx'), 'utf8');

  expect(source).toContain('createRuntimeGarakProductServices');
  expect(source).toContain('const productServices = useMemo(');
  expect(source).toContain('sessionStore');
  expect(source).toContain('services={productServices}');
});

test('accepts product services and runs effect follow-up actions after dispatch', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).toContain('services?: GarakProductServices');
  expect(source).toContain('createLocalGarakProductServices');
  expect(source).toContain('runGarakProductEffect');
  expect(source).toContain('followUpActions.forEach(dispatch)');
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
  expect(source).toContain('const mixEditorModel = getFreeCreationMixEditorModel(state);');
  expect(source).toContain('previewModel.playerTitle');
  expect(source).toContain('previewModel.completionSubjectLabel');
  expect(source).toContain('trackControls={mixEditorModel.trackControls}');
  expect(source).toContain('freeCreationCompletedTrackControlScroller');
  expect(source).toContain('previewModel.saveAction');
  expect(source).toContain('previewModel.saveStatusLabel');
  expect(source).toContain("dispatch(previewModel.saveAction)");
  expect(source).toContain('GARAK_SPACING');
  expect(source).toContain('GARAK_MONTAGE_BUTTON');
  expect(source).toContain('<SecondaryPillButton');
  expect(source).toContain('<PrimaryPillButton');
  expect(source).toContain('top: GARAK_SPACING.pt0');
  expect(source).toContain('left: GARAK_SPACING.pt0');
  expect(source).toContain('right: GARAK_SPACING.pt0');
});

test('connects S10 jangdan preset previews without applying the preset', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain("type: 'previewJangdanPreset'");
  expect(source).toContain("type: 'turnOffLiveJangdanGuide'");
  expect(source).toContain("type: 'cancelAccompanimentTrack'");
  expect(source).toContain('model.previewingPresetId');
  expect(source).toContain('model.workContextLabel');
  expect(source).toContain('model.bpmValueLabel');
  expect(source).toContain('model.volumeValueLabel');
  expect(source).toContain('dispatch(model.decreaseBpmAction)');
  expect(source).toContain('dispatch(model.increaseBpmAction)');
  expect(source).toContain('dispatch(model.decreaseVolumeAction)');
  expect(source).toContain('dispatch(model.increaseVolumeAction)');
  expect(source).toContain('disabled={model.acceptAction === undefined}');
  expect(source).toContain('dispatch(model.acceptAction)');
  expect(source).toContain('미리듣는 중');
  expect(source).toContain("label={mode === 'live' ? '끄기' : '취소'}");
  expect(source).toContain('previewButtonActive');
});

test('uses the language-aware Figma home hero copy in the home screen accessibility contract', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const appSource = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');
  const modelSource = readFileSync(resolve(process.cwd(), 'src/product/homeScreenModel.ts'), 'utf8');
  const uiSource = readFileSync(resolve(process.cwd(), 'src/product/garakUi.tsx'), 'utf8');

  expect(source).toContain('getHomeScreenViewModel');
  expect(source).toContain('homeModel.title');
  expect(source).toContain('homeModel.description');
  expect(source).toContain('cta={homeModel.ctaLabel}');
  expect(source).toContain("onPress={() => dispatch({ type: 'navigate', target: 'S03' })}");
  expect(source).not.toContain('homeModel.modeOptions.map');
  expect(source).not.toContain('homeModel.selectedModeTitle');
  expect(source).not.toContain('homeModel.selectedModeDescription');
  expect(appSource).toContain('getHomeScreenViewModel');
  expect(appSource).toContain('labels={homeModel.quickAccessLabels}');
  expect(modelSource).toContain('AI와 함께');
  expect(modelSource).not.toContain('장단 추천으로');
  expect(uiSource).toMatch(/visualHero:\s*\{[\s\S]*?position: 'relative'/);
  expect(uiSource).toMatch(/visualHeroPressArea:\s*\{[\s\S]*?bottom: 38/);
});

test('keeps the home play CTA visible when the hero bitmap cannot render', () => {
  const uiSource = readFileSync(resolve(process.cwd(), 'src/product/garakUi.tsx'), 'utf8');
  const visualHeroSource = uiSource.slice(
    uiSource.indexOf('export function VisualHero'),
    uiSource.indexOf('export function ArtworkImagePanel'),
  );

  expect(visualHeroSource).toContain('useState(false)');
  expect(visualHeroSource).toContain('onError={() => setHeroImageFailed(true)}');
  expect(visualHeroSource).toContain('heroImageFailed ?');
  expect(visualHeroSource).toContain('visualHeroFallbackContent');
  expect(visualHeroSource).toContain('visualHeroFallbackButton');
});

test('uses the Figma free-creation mode guide for the intro screen', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/settingsScreens.tsx'), 'utf8');
  const introGuideSource = source.slice(
    source.indexOf('export function IntroGuideContent'),
    source.indexOf('export function SettingsContent'),
  );

  expect(source).toContain('원하는');
  expect(source).toContain('연주모드');
  expect(source).toContain('자유창작 모드');
  expect(source).toContain('따라하기 모드');
  expect(source).toContain('AI 반주 추가');
  expect(source).toContain('useWindowDimensions');
  expect(source).toContain('modeGuidePanelCompact');
  expect(source).toContain("type: 'selectIntroGuideMode'");
  expect(source).toContain("mode: 'freeCreation'");
  expect(source).toContain('PRACTICE_MODE_AVAILABLE');
  expect(source).toContain('disabled={!PRACTICE_MODE_AVAILABLE}');
  expect(source).toContain('modeToggleButtonDisabled');
  expect(source).toContain('modeToggleTextDisabled');
  expect(introGuideSource).not.toContain("mode: 'practice'");
  expect(source).not.toContain("target: isPracticeMode ? 'S13' : 'S04'");
  expect(introGuideSource).not.toContain('SecondaryPillButton');
  expect(introGuideSource).not.toContain('modeGuideSkipButton');
  expect(introGuideSource).not.toContain('label="건너뛰기"');
  expect(source).not.toContain('GARAK에 오신 것을 환영해요');
  expect(source).not.toContain('onPress={() => undefined}');
  expect(source).not.toContain("onPress={() => dispatch({ type: 'navigate', target: 'S13' })}");
});

test('uses Wanted Montage linear progress indicator across free-creation onboarding screens', () => {
  const uiSource = readFileSync(resolve(process.cwd(), 'src/product/garakUi.tsx'), 'utf8');
  const settingsSource = readFileSync(resolve(process.cwd(), 'src/product/settingsScreens.tsx'), 'utf8');
  const freeCreationSource = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const introGuideSource = settingsSource.slice(
    settingsSource.indexOf('export function IntroGuideContent'),
    settingsSource.indexOf('export function SettingsContent'),
  );
  const instrumentSelectSource = freeCreationSource.slice(
    freeCreationSource.indexOf('export function InstrumentSelectContent'),
    freeCreationSource.indexOf('export function InstrumentSettingsContent'),
  );
  const instrumentSettingsSource = freeCreationSource.slice(
    freeCreationSource.indexOf('export function InstrumentSettingsContent'),
    freeCreationSource.indexOf('export function FreePlayContent'),
  );

  expect(uiSource).toContain('export function GarakProgressIndicator');
  expect(uiSource).toContain('Math.max(0, Math.min(1, progress))');
  expect(uiSource).toContain('accessibilityRole="progressbar"');
  expect(uiSource).toContain('accessibilityValue={{ min: 0, max: 100, now: Math.round(normalizedProgress * 100) }}');
  expect(uiSource).toContain('progressIndicatorTrack');
  expect(uiSource).toContain('progressIndicatorFill');
  expect(uiSource).toMatch(/progressIndicatorTrack:\s*\{[\s\S]*?height: 2/);
  expect(introGuideSource).toContain('GarakProgressIndicator progress={1 / 3}');
  expect(instrumentSelectSource).toContain('GarakProgressIndicator progress={2 / 3}');
  expect(instrumentSettingsSource).toContain('GarakProgressIndicator progress={1}');
  expect(introGuideSource).not.toContain('ProgressSteps');
  expect(instrumentSelectSource).not.toContain('ProgressSteps');
  expect(instrumentSettingsSource).not.toContain('ProgressSteps');
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
  expect(source).toContain('model.actions.completeLoginSync');
  expect(source).toContain('model.actions.skipLoginSync');
  expect(source).not.toContain('model.actions.login)');
  expect(source).not.toContain('model.actions.sync)');
  expect(source).not.toContain('model.actions.importSelected)');
  expect(source).not.toContain('model.actions.skip)');
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
  const homeEntryButtonBlock = appSource.match(/<Pressable[\s\S]*?homeEntryButton[\s\S]*?<\/Pressable>/)?.[0];

  expect(appSource).toContain('<LanguageContent state={state} dispatch={dispatch} />');
  expect(homeEntryButtonBlock).toContain("target: 'S02'");
  expect(homeEntryButtonBlock).not.toContain("target: 'S03'");
  expect(settingsSource).toContain("type: 'setLanguage'");
  expect(settingsSource).toContain("language: 'ko'");
  expect(settingsSource).toContain("language: 'en'");
  expect(settingsSource).toContain('state.language');
  expect(settingsSource).toContain("const selectedLabel = isEn ? 'Selected' : '선택됨'");
  expect(settingsSource).toContain("const availableLabel = isEn ? 'Available' : '사용 가능'");
  expect(settingsSource).toContain('value={state.language ===');
});

test('connects S18 library tabs, search, sync label, row storage status, and empty state CTA', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/libraryScreens.tsx'), 'utf8');

  expect(source).toContain('model.tabs.map');
  expect(source).toContain("type: 'selectLibraryTab'");
  expect(source).toContain('TextInput');
  expect(source).toContain("type: 'updateLibrarySearchQuery'");
  expect(source).toContain('model.syncLabel');
  expect(source).toContain('accessibilityLabel="보관함 동기화"');
  expect(source).toContain("type: 'loginAndLoadMySongs'");
  expect(source).toContain('row.storageLabel');
  expect(source).toContain('model.emptyState');
  expect(source).toContain('isEmptyLibrary');
  expect(source).toContain('myLibraryStackEmpty');
  expect(source).toContain('myHeroDeckEmpty');
});

test('keeps home browsing quick access as a shell-level floating bar', () => {
  const appSource = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');
  const homeSource = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const librarySource = readFileSync(resolve(process.cwd(), 'src/product/libraryScreens.tsx'), 'utf8');
  const shareSource = readFileSync(resolve(process.cwd(), 'src/product/shareScreens.tsx'), 'utf8');

  expect(appSource).toContain('isHomeBrowsingSurface');
  expect(appSource).toContain('<QuickAccessNav');
  expect(appSource).toContain('style={styles.floatingQuickAccess}');
  expect(appSource).toContain("currentScreen === 'S18'");
  expect(appSource).toContain("active={isLibrary ? 'library' : isShare ? 'share' : 'home'}");
  expect(homeSource).not.toContain('<QuickAccessNav');
  expect(librarySource).not.toContain('<QuickAccessNav');
  expect(shareSource).not.toContain('<QuickAccessNav');
});

test('connects S19 player edit and share CTAs to selected library item actions', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/libraryScreens.tsx'), 'utf8');

  expect(source).toContain('getMyLibraryPlayerActions');
  expect(source).toContain('playerActions.editAction');
  expect(source).toContain('playerActions.shareAction');
  expect(source).toContain('playerActions.deleteAction');
  expect(source).toContain('편집으로 열기');
  expect(source).toContain('공유');
  expect(source).toContain('삭제');
  expect(source).toContain('보관함으로 돌아가기');
  expect(source).toContain('dispatch(playerActions.backAction)');
  expect(source).toContain('dispatch(playerActions.editAction)');
  expect(source).toContain('dispatch(playerActions.shareAction)');
  expect(source).toContain('dispatch(playerActions.deleteAction)');
});

test('connects S19 player playback to selected library item state', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/libraryScreens.tsx'), 'utf8');

  expect(source).toContain('player.isPlaying');
  expect(source).toContain('playbackAction');
  expect(source).toContain('playerActions.pauseAction');
  expect(source).toContain('playerActions.playAction');
  expect(source).toContain('accessibilityLabel={playbackLabel}');
  expect(source).toContain('dispatch(playbackAction)');
});

test('uses the Figma instrument selection design for the free-creation instrument screen', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const instrumentSelectSource = source.slice(
    source.indexOf('export function InstrumentSelectContent'),
    source.indexOf('export function InstrumentSettingsContent'),
  );

  expect(source).toContain('연주 할');
  expect(source).toContain('악기');
  expect(source).toContain('장구 Janggu');
  expect(source).toContain('장구는 한국 전통 음악에서');
  expect(source).toContain('InstrumentSelectionPreviewCard');
  expect(source).toContain('InstrumentPreviewStageArtwork');
  expect(source).toContain('FUTURE_INSTRUMENT_CHIPS');
  expect(source).toContain('onLockedInstrumentPress');
  expect(source).toContain("type: 'showFutureInstrumentNotice'");
  expect(source).toContain('새로운 악기가 업데이트될 예정이에요');
  expect(source).toContain('NEXT');
  expect(source).not.toContain('연주 & 녹음');
  expect(instrumentSelectSource).toContain('instrumentSelectSampleModel');
  expect(instrumentSelectSource).toContain('instrumentSelectSampleModel.sampleStatusLabel');
  expect(instrumentSelectSource).toContain('instrumentSelectSampleModel.sampleStatusDescription');
  expect(instrumentSelectSource).not.toContain('styles.instrumentSelectSampleStatusRow');
  expect(instrumentSelectSource).not.toContain('instrumentSampleStatusPill');
});

test('uses full instrument performance previews and complete janggu copy on S04', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const instrumentSelectSource = source.slice(
    source.indexOf('export function InstrumentSelectContent'),
    source.indexOf('export function InstrumentSettingsContent'),
  );

  expect(source).toContain('민속기악에서는 열편에만 열채를 쓰고');
  expect(source).toContain('풍물놀이나 일부 무속음악 계통에서는 양손에 열채와 궁굴채를 들고 친다고 합니다.');
  expect(instrumentSelectSource).toContain('InstrumentSelectionPreviewCard');
  expect(instrumentSelectSource).toContain('InstrumentPreviewStageArtwork');
  expect(instrumentSelectSource).toContain('instrument={selectedInstrument}');
  expect(instrumentSelectSource).not.toContain('InstrumentVisual instrument={selectedInstrument}');
});

test('keeps S04A preview copy in normal flow below the stage artwork', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const instrumentSettingsSource = source.slice(
    source.indexOf('export function InstrumentSettingsContent'),
    source.indexOf('export function FreePlayContent'),
  );

  expect(instrumentSettingsSource).toContain('performancePreviewDescription');
  expect(instrumentSettingsSource).toContain('{performancePreviewCallouts.bottom}');
  expect(instrumentSettingsSource).not.toContain('performancePreviewBottomCallout');
  expect(instrumentSettingsSource).not.toContain('performancePreviewBottomDrop');
});

test('uses the Figma performance preview design before entering free play', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const instrumentSettingsSource = source.slice(
    source.indexOf('export function InstrumentSettingsContent'),
    source.indexOf('export function FreePlayContent'),
  );

  expect(source).toContain('getInstrumentSettingsModel');
  expect(source).toContain('연주를 시작하고 녹음하고');
  expect(source).toContain('궁편은 그냥 손으로 때리며');
  expect(instrumentSettingsSource).toContain('연주 할 화면');
  expect(instrumentSettingsSource).toContain('미리 볼 수 있어요');
  expect(instrumentSettingsSource).toContain('NEXT');
  expect(instrumentSettingsSource).toContain('InstrumentPreviewStageArtwork');
  expect(instrumentSettingsSource).toContain('instrument={instrumentSettingsModel.instrument}');
  expect(instrumentSettingsSource).toContain('GarakProgressIndicator progress={1}');
  expect(instrumentSettingsSource).toContain('instrumentSettingsStartAction');
  expect(instrumentSettingsSource).toContain('instrumentSettingsModel.primaryAction');
  expect(instrumentSettingsSource).toContain('disabled={instrumentSettingsStartAction === undefined}');
  expect(instrumentSettingsSource).toContain('dispatch(instrumentSettingsStartAction)');
  expect(instrumentSettingsSource).not.toContain('instrumentSettingsSummaryCard');
  expect(instrumentSettingsSource).not.toContain('instrumentSettingsModel.secondaryAction');
  expect(instrumentSettingsSource).not.toContain('instrumentSettingsModel.settingRows.map');
  expect(instrumentSettingsSource).not.toContain('instrumentSettingsModel.settingControls.map');
  expect(instrumentSettingsSource).not.toContain('직접 조정');
  expect(instrumentSettingsSource).not.toContain('기본값으로 시작');
  expect(instrumentSettingsSource).not.toContain('<SecondaryPillButton');
  expect(instrumentSettingsSource).not.toContain('BPM');
  expect(instrumentSettingsSource).not.toContain('장단');
});

test('uses the Figma gayageum stage for landscape free play', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const uiSource = readFileSync(resolve(process.cwd(), 'src/product/garakUi.tsx'), 'utf8');
  const instrumentVisualSource = uiSource.slice(
    uiSource.indexOf('export function InstrumentVisual'),
    uiSource.indexOf('export function InstrumentBadge'),
  );

  expect(source).toContain('GayageumLandscapeStageArtwork');
  expect(source).toContain('usesFigmaGayageumLandscapeStage');
  expect(source).toContain("instrument === 'gayageum'");
  expect(instrumentVisualSource).toContain('Array.from({ length: 12 }');
  expect(instrumentVisualSource).not.toContain('Array.from({ length: 9 }');
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
  expect(source).toContain("accessibilityLabel={isRecordingPerformance ? '연주 완료' : '녹음 시작'}");
  expect(source).toContain("type: 'openFreePlayRecordingSetup'");
  expect(source).toContain("accessibilityLabel=\"장단 설정\"");
  expect(source).toContain("type: 'openLiveJangdanGuide'");
  expect(source).not.toContain('landscapeStageLayerHit');
  expect(source).toContain("type: 'completePerformance'");
});

test('keeps S05 landscape control hits on visible controls instead of the instrument corners', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const freePlaySource = source.slice(
    source.indexOf('export function FreePlayContent'),
    source.indexOf('function LandscapeStageNotice'),
  );
  const actionHitsSource = source.slice(
    source.indexOf('function LandscapeStageActionHits'),
    source.indexOf('export function TrackLayerEditorContent'),
  );
  const primaryHitStyle = source.slice(
    source.indexOf('landscapeStagePrimaryHit:'),
    source.indexOf('landscapeStageJangdanHit:'),
  );

  expect(freePlaySource).toContain('isRecordingPerformance={isRecordingPerformance}');
  expect(actionHitsSource).toContain('isRecordingPerformance');
  expect(actionHitsSource).toContain("type: isRecordingPerformance ? 'completePerformance' : 'openFreePlayRecordingSetup'");
  expect(actionHitsSource).not.toContain('landscapeStageCompleteHit');
  expect(primaryHitStyle).toContain('top: 16');
  expect(primaryHitStyle).toContain('right: 64');
  expect(primaryHitStyle).toContain('width: 44');
  expect(primaryHitStyle).not.toContain('bottom: 0');
});

test('connects S05 and S09 performance surfaces to captured input events', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('createTouchModel');
  expect(source).toContain('PanResponder');
  expect(source).toContain('appendFreePlayPerformanceEvents');
  expect(source).toContain('PerformanceCaptureSurface');
  expect(source).toContain('performanceCapture.panHandlers');
  expect(source).toContain('onPerformanceEvents={appendPerformanceEvents}');
  expect(source).toContain('onLivePerformanceEvents');
  expect(source).toContain('onLivePerformanceEventsRef.current?.(events)');
});

test('keeps S05 performance capture enabled separately from recording state', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');
  const freePlaySource = source.slice(
    source.indexOf('export function FreePlayContent'),
    source.indexOf('function LandscapeStageNotice'),
  );

  expect(source).toContain('getFreePlayPerformanceCaptureModel');
  expect(freePlaySource).toContain('const performanceCaptureModel = getFreePlayPerformanceCaptureModel(state);');
  expect(freePlaySource).toContain('const isRecordingPerformance = performanceCaptureModel.isRecording;');
  expect(freePlaySource).toContain('enabled={performanceCaptureModel.captureEnabled}');
  expect(freePlaySource).not.toContain('enabled={isRecordingPerformance}');
});

test('keeps the performance PanResponder stable across callback prop updates', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('useCallback');
  expect(source).toContain('useRef');
  expect(source).toContain('const enabledRef = useRef(enabled);');
  expect(source).toContain('enabledRef.current = enabled;');
  expect(source).toContain('const onPerformanceEventsRef = useRef(onPerformanceEvents);');
  expect(source).toContain('onPerformanceEventsRef.current = onPerformanceEvents;');
  expect(source).toContain('const handleTouchFrame = useCallback(');
  expect(source).toContain('onPerformanceEventsRef.current(events);');
  expect(source).toContain('[handleTouchFrame]');
  expect(source).not.toContain('[enabled, onPerformanceEvents, touchModel]');
});

test('connects S05 recording start separately from completion and missing-take guidance', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('FreePlayRecordingSetupSheet');
  expect(source).toContain('recordingSetupBackdrop');
  expect(source).toContain("state.freePlayRecordingSetup !== undefined");
  expect(source).toContain("type: 'openFreePlayRecordingSetup'");
  expect(source).toContain("type: 'selectFreePlayRecordingPreset'");
  expect(source).toContain("type: 'adjustFreePlayRecordingBpm'");
  expect(source).toContain("type: 'cancelFreePlayRecordingSetup'");
  expect(source).toContain("type: 'startPerformanceRecording'");
  expect(source).toContain("type: 'completePerformance'");
  expect(source).toContain("type: 'openLayerEditor'");
  expect(source).toContain("state.freePlayNotice === 'missingTake'");
  expect(source).toContain('저장할 테이크가 없어요');
  expect(source).toContain('녹음 전 설정');
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
  expect(source).toContain('mixEditorModel.saveAction');
  expect(source).toContain('mixEditorModel.saveStatusLabel');
  expect(source).toContain('mixEditorModel.playheadBeatLabel');
  expect(source).toContain('dispatch(mixEditorModel.decreasePlayheadAction)');
  expect(source).toContain('dispatch(mixEditorModel.increasePlayheadAction)');
  expect(source).toContain('TrackControlStack trackControls={mixEditorModel.trackControls}');
  expect(source).toContain('dispatch(trackControl.decreaseVolumeAction)');
  expect(source).toContain('dispatch(trackControl.increaseVolumeAction)');
  expect(source).toContain('dispatch(trackControl.toggleMuteAction)');
  expect(source).toContain('dispatch(trackControl.toggleSoloAction)');
  expect(source).toContain('dispatch(trackControl.deleteAction)');
  expect(source).toContain('disabled={!trackControl.canDelete}');
  expect(source).toContain('TrackControlStack');
  expect(source).toContain('freeCreationCompletedTrackControlScroller');
  expect(source).toContain('Mix');
  expect(source).toContain('작업 저장');
  expect(source).toContain('Save & Share project');
  expect(source).toContain("type: 'addTrack'");
  expect(source).toContain("dispatch(mixEditorModel.saveAction)");
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
  expect(source).toContain("type: 'cancelShareTarget'");
  expect(source).toContain('durationLabel');
  expect(source).toContain('instrumentLabel');
  expect(source).toContain('sourceLabel');
  expect(source).toContain('미리듣기');
  expect(source).toContain('취소');
  expect(source).not.toContain("label=\"공유하기\"\n          onPress={() => dispatch({ type: 'navigate', target: 'S20' })}");
});

test('connects S16 result actions to retry, save, share, and choose another song', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/practiceScreens.tsx'), 'utf8');
  const componentSource = source.slice(
    source.indexOf('export function PracticeResultContent'),
    source.indexOf('const styles = StyleSheet.create'),
  );

  expect(componentSource).toContain('getPracticeResultModel');
  expect(componentSource).toContain('resultModel.accuracyScoreLabel');
  expect(componentSource).toContain('resultModel.feedbackTitle');
  expect(componentSource).toContain('resultModel.feedbackDescription');
  expect(componentSource).toMatch(/label="다시 연주"[\s\S]*?dispatch\(resultModel\.actions\.retry\)/);
  expect(componentSource).toMatch(/label="저장"[\s\S]*?dispatch\(resultModel\.actions\.save\)/);
  expect(componentSource).toMatch(/label="공유"[\s\S]*?dispatch\(resultModel\.actions\.share\)/);
  expect(componentSource).toMatch(
    /label="다른 민요 선택"[\s\S]*?dispatch\(resultModel\.actions\.chooseAnotherSong\)/,
  );
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

  expect(source).toContain('selectedPracticeInstrument');
  expect(source).toContain("type: 'selectPracticeInstrument'");
  expect(source).toContain('practiceInstrumentGuideStatus');
  expect(source).toMatch(/PrimaryPillButton label="NEXT" onPress=\{\(\) => dispatch\(\{ type: 'next' \}\)\}/);
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

test('connects S17 save-only and cancel controls to explicit share preparation actions', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/shareScreens.tsx'), 'utf8');

  expect(source).toContain("type: 'saveShareTargetOnly'");
  expect(source).toContain("type: 'cancelShareTarget'");
  expect(source).not.toContain("label=\"저장만 하기\"\n          onPress={() => dispatch({ type: 'navigate', target: 'S18' })}");
  expect(source).not.toContain("label=\"취소\"\n          onPress={() => dispatch({ type: 'back' })}");
});

test('connects S21 shared detail playback to selected recording state', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/shareScreens.tsx'), 'utf8');

  expect(source).toContain('model.isPlaying');
  expect(source).toContain('playbackAction');
  expect(source).toContain('playbackLabel');
  expect(source).toContain('재생');
  expect(source).toContain('일시정지');
  expect(source).toContain('dispatch(playbackAction)');
});

test('keeps the share quick access tab active on S20', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).toContain("active={isLibrary ? 'library' : isShare ? 'share' : 'home'}");
  expect(source).toContain("onShare={() => dispatch({ type: 'navigate', target: 'S20' })}");
});

test('reserves enough scroll room above the floating quick access nav on browsing screens', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).toContain('homeBrowsingContent');
  expect(source).toContain('paddingBottom: GARAK_LAYOUT.quickAccessHeight + 118');
});

test('labels shell icon buttons for assistive technology', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).toContain('accessibilityLabel="언어 변경"');
  expect(source).toContain('accessibilityLabel="뒤로가기"');
  expect(source).toContain('accessibilityLabel="마이 및 설정"');
  expect(source).toContain('accessibilityLabel="새 작업 시작"');
});

test('labels auth buttons without exposing decorative marks as button names', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/authScreens.tsx'), 'utf8');

  expect(source).toContain('accessibilityLabel={label}');
  expect(source).toContain('accessibilityElementsHidden');
  expect(source).toContain('importantForAccessibility="no-hide-descendants"');
});

test('keeps the login brand and auth actions visually grouped', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/authScreens.tsx'), 'utf8');
  const loginScreenStyle = source.slice(source.indexOf('loginScreen:'), source.indexOf('loginBrand:'));
  const homeIndicatorStyle = source.slice(source.indexOf('homeIndicator:'), source.indexOf('});', source.indexOf('homeIndicator:')));

  expect(loginScreenStyle).not.toContain("justifyContent: 'space-between'");
  expect(loginScreenStyle).toContain("justifyContent: 'center'");
  expect(loginScreenStyle).toContain('gap: 104');
  expect(homeIndicatorStyle).toContain("position: 'absolute'");
  expect(homeIndicatorStyle).toContain('bottom: 9');
});

test('uses the Figma stacked track add flow for S08', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('freeCreationTrackAddScreen');
  expect(source).toContain('currentWorkContextLabel');
  expect(source).toContain('freeCreationTrackAddContext');
  expect(source).toContain('나만의 가락');
  expect(source).toContain('AI 반주 생성하기');
  expect(source).toContain('악기 연주 추가');
  expect(source).toContain('추가 악기 선택');
  expect(source).toContain('가져오기');
  expect(source).toContain('가져오기는 이후 업데이트에서 지원할 예정이에요.');
  expect(source).toContain("type: 'showLockedImportTrackNotice'");
  expect(source).toContain("type: 'cancelTrackAdd'");
  expect(source).toContain('freeCreationLayerOptionRotated');
  expect(source).toContain("rotate: '-8.4deg'");
  expect(source).toContain("type: 'openInstrumentTrackSelection'");
  expect(source).toContain("state.trackAddSelection === 'instrument'");
  expect(source).toContain('MVP_INSTRUMENTS.map');
  expect(source).toContain("flexWrap: 'wrap'");
  expect(source).not.toContain('marginRight: -24');
  expect(source).toContain('accessibilityLabel={`${getInstrumentName(instrument.id)} 추가 녹음`}');
  expect(source).not.toContain('accessibilityLabel="추가 악기 선택"');
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
