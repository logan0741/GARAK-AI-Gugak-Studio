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
  expect(source).toContain("target: 'S04'");
  expect(source).not.toContain('GARAK에 오신 것을 환영해요');
});

test('connects the S23 Google login button to the login sync action', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/settingsScreens.tsx'), 'utf8');

  expect(source).toContain('Google로 로그인');
  expect(source).toContain("type: 'completeLoginSync'");
  expect(source).not.toContain("accessibilityLabel=\"Google로 로그인\"\n          onPress={() => dispatch({ type: 'navigate', target: 'S18' })}");
});

test('uses the Figma instrument selection design for the free-creation instrument screen', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('연주 할');
  expect(source).toContain('악기');
  expect(source).toContain('장구 Janggu');
  expect(source).toContain('장구는 한국 전통 음악에서');
  expect(source).toContain('InstrumentSelectionArtworkPanel');
  expect(source).toContain('FUTURE_INSTRUMENT_CHIPS');
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

test('uses the Figma free-creation mix and share flow for S07', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('freeCreationMixScreen');
  expect(source).toContain('freeCreationPlayerDeck');
  expect(source).toContain('My Janggu');
  expect(source).toContain('Mix');
  expect(source).toContain('Save & Share project');
  expect(source).toContain("type: 'addTrack'");
  expect(source).toContain("type: 'exportCurrentWork'");
  expect(source).not.toContain('TrackPill label="트랙 추가하기"');
});

test('uses the Figma stacked track add flow for S08', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('freeCreationTrackAddScreen');
  expect(source).toContain('나만의 가락');
  expect(source).toContain('AI 반주 생성하기');
  expect(source).toContain('트랙 추가하기');
  expect(source).toContain('freeCreationLayerOptionRotated');
  expect(source).toContain("rotate: '-8.4deg'");
  expect(source).toContain("type: 'chooseAccompanimentTrack'");
  expect(source).toContain("type: 'chooseInstrumentTrack'");
  expect(source).toContain('TRACK 1 :');
  expect(source).not.toContain("추가할 트랙을\\n선택해요.");
});
