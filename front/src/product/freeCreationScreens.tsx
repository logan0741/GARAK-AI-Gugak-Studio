import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import type { InstrumentId, Track } from '../studio/studioTypes';
import {
  GARAK_COLORS,
  GARAK_MONTAGE_BUTTON,
  GARAK_RADIUS,
  GARAK_SEMANTIC_COLORS,
  GARAK_SPACING,
} from './garakDesignSystem';
import { GarakScreenFrameMode } from './garakScreenFrame';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  DaegeumLandscapeStageArtwork,
  GayageumLandscapeStageArtwork,
  InstrumentSelectionArtworkPanel,
  InstrumentPreviewStageArtwork,
  JangguLandscapeStageArtwork,
} from './garakArtworkPanels';
import {
  InstrumentBadge,
  InstrumentVisual,
  MiniTrackPlayer,
  PrimaryPillButton,
  ProgressSteps,
  QuickAccessNav,
  ScreenHeading,
  SecondaryPillButton,
  VisualHero,
  garakCardShadow,
} from './garakUi';
import {
  DEFAULT_FREE_CREATION_INSTRUMENT,
  JANGDAN_PRESETS,
  LOCKED_FUTURE_INSTRUMENT_SLOTS,
  MVP_INSTRUMENTS,
  getInstrumentName,
} from './productFixtures';
import {
  getJangdanPresetPanelModel,
  type JangdanPresetPanelMode,
} from './jangdanPresetPanelModel';
import { getFreeCreationCompletedPreviewModel } from './freeCreationCompletedPreviewModel';
import {
  getFreeCreationMixEditorModel,
  type FreeCreationTrackControlModel,
} from './freeCreationMixEditorModel';
import { getHomeScreenViewModel } from './homeScreenModel';
import { getInstrumentSettingsModel } from './instrumentSettingsModel';

type ProductDispatch = (action: GarakProductAction) => void;
const INSTRUMENT_CHIP_ORDER: InstrumentId[] = ['janggu', 'gayageum', 'daegeum'];
const FIGMA_INSTRUMENT_CHIP_WIDTH: Record<InstrumentId, number> = {
  janggu: 48,
  gayageum: 62,
  daegeum: 47,
};
const FUTURE_INSTRUMENT_CHIPS = [
  { id: 'future-rhythm', width: 48 },
  { id: 'future-string', width: 73 },
  { id: 'future-wind', width: 73 },
] as const;
const JANGGU_FIGMA_BADGE = '장구 Janggu';
const JANGGU_FIGMA_DESCRIPTION =
  '장구는 한국 전통 음악에서 가장 대표적으로 사용되는 타악기 중 하나로, 가운데가 잘록한 모래시계 모양을 하고 있습니다.';
const PERFORMANCE_PREVIEW_CALLOUTS: Record<InstrumentId, { top: string; bottom: string }> = {
  gayageum: {
    top: '연주를 시작하고 녹음하고, 이를 직접 들어보고, 저장 할 수 있습니다.',
    bottom: '가야금은 손가락으로 줄을 뜯고 눌러 음색을 조절해요.',
  },
  janggu: {
    top: '연주를 시작하고 녹음하고, 이를 직접 들어보고, 저장 할 수 있습니다.',
    bottom: '연주할 때는 양손으로 궁편과 열편을 손에 쥐고 연주.',
  },
  daegeum: {
    top: '연주를 시작하고 녹음하고, 이를 직접 들어보고, 저장 할 수 있습니다.',
    bottom: '대금은 운지와 호흡으로 음정과 세기를 조절해요.',
  },
};

function isInstrumentTrack(track: Track): track is Extract<Track, { kind: 'instrument' }> {
  return track.kind === 'instrument';
}

function isAccompanimentTrack(track: Track): track is Extract<Track, { kind: 'accompaniment' }> {
  return track.kind === 'accompaniment';
}

function getNextTrackInstrument(existingInstruments: InstrumentId[]): InstrumentId {
  return (
    INSTRUMENT_CHIP_ORDER.find((instrument) => !existingInstruments.includes(instrument)) ??
    existingInstruments[0] ??
    DEFAULT_FREE_CREATION_INSTRUMENT
  );
}

export function HomeScreenContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const homeModel = getHomeScreenViewModel(state);

  return (
    <View style={styles.screenStack}>
      <VisualHero
        title={homeModel.title}
        description={homeModel.description}
        cta={homeModel.ctaLabel}
        onPress={() => dispatch({ type: 'navigate', target: 'S03' })}
      />

      <QuickAccessNav
        active="home"
        labels={homeModel.quickAccessLabels}
        onLibrary={() => dispatch({ type: 'navigate', target: 'S18' })}
        onHome={() => dispatch({ type: 'navigate', target: 'S01' })}
        onShare={() => dispatch({ type: 'navigate', target: 'S20' })}
        style={styles.homeQuickAccess}
      />
    </View>
  );
}

export function InstrumentSelectContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const { height } = useWindowDimensions();
  const isCompactHeight = height < 820;
  const selectedInstrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const instrumentSelectSampleModel = getInstrumentSettingsModel({
    ...state,
    selectedInstrument,
  });

  function confirmSelectionAndContinue() {
    if (state.selectedInstrument === undefined) {
      dispatch({ type: 'selectInstrument', instrument: selectedInstrument });
    }

    dispatch({ type: 'next' });
  }

  return (
    <View style={styles.instrumentSelectScreen}>
      <Text style={[styles.instrumentSelectTitle, isCompactHeight ? styles.instrumentSelectTitleCompact : undefined]}>
        연주 할 <Text style={styles.instrumentSelectTitleStrong}>악기</Text>를{'\n'}선택해요.
      </Text>
      <InstrumentChipRow
        variant="figma"
        selectedInstrument={selectedInstrument}
        onSelect={(instrument) => dispatch({ type: 'selectInstrument', instrument })}
        onLockedInstrumentPress={() => dispatch({ type: 'showFutureInstrumentNotice' })}
      />
      {state.instrumentSelectNotice === 'futureInstrument' ? (
        <Text style={styles.instrumentSelectNotice}>새로운 악기가 업데이트될 예정이에요.</Text>
      ) : null}
      {selectedInstrument === DEFAULT_FREE_CREATION_INSTRUMENT ? (
        <View
          accessible
          accessibilityLabel={`${JANGGU_FIGMA_BADGE}. ${JANGGU_FIGMA_DESCRIPTION}. ${instrumentSelectSampleModel.sampleStatusLabel}. ${instrumentSelectSampleModel.sampleStatusDescription}`}
          style={[
            styles.instrumentSelectArtworkWrap,
            isCompactHeight ? styles.instrumentSelectArtworkWrapCompact : undefined,
          ]}
        >
          <InstrumentSelectionArtworkPanel
            style={isCompactHeight ? styles.instrumentSelectArtworkCompact : undefined}
          />
        </View>
      ) : (
        <View
          accessible
          accessibilityLabel={`${instrumentSelectSampleModel.instrumentName}. ${MVP_INSTRUMENTS.find((item) => item.id === selectedInstrument)?.description ?? ''} ${instrumentSelectSampleModel.sampleStatusLabel}. ${instrumentSelectSampleModel.sampleStatusDescription}`}
          style={styles.instrumentPreviewCard}
        >
          <InstrumentVisual instrument={selectedInstrument} />
          <InstrumentBadge instrument={selectedInstrument} />
          <Text style={styles.instrumentDescription}>
            {MVP_INSTRUMENTS.find((item) => item.id === selectedInstrument)?.description}
            {'\n'}선택한 악기는 연주, 녹음, 트랙 추가 흐름에 연결됩니다.
          </Text>
        </View>
      )}
      <View style={[styles.instrumentSelectFooter, isCompactHeight ? styles.instrumentSelectFooterCompact : undefined]}>
        <ProgressSteps step={0} />
        <PrimaryPillButton
          label="NEXT"
          onPress={confirmSelectionAndContinue}
        />
      </View>
    </View>
  );
}

export function InstrumentSettingsContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const { height } = useWindowDimensions();
  const isCompactHeight = height < 820;
  const instrumentSettingsModel = getInstrumentSettingsModel(state);
  const instrumentSettingsStartAction = instrumentSettingsModel.primaryAction;
  const performancePreviewCallouts = PERFORMANCE_PREVIEW_CALLOUTS[instrumentSettingsModel.instrument];

  return (
    <View style={styles.performancePreviewScreen}>
      <Text
        accessibilityLabel="연주 할 화면을 미리 볼 수 있어요."
        style={[
          styles.performancePreviewTitle,
          isCompactHeight ? styles.performancePreviewTitleCompact : undefined,
        ]}
      >
        연주 할 <Text style={styles.performancePreviewTitleStrong}>화면</Text>을{'\n'}미리 볼 수 있어요.
      </Text>
      <View
        accessible
        accessibilityLabel={`${performancePreviewCallouts.top} ${performancePreviewCallouts.bottom}`}
        style={[
          styles.performancePreviewPanel,
          isCompactHeight ? styles.performancePreviewPanelCompact : undefined,
        ]}
      >
        <View style={styles.performancePreviewTopCallout}>
          <Text style={styles.performancePreviewCalloutText}>{performancePreviewCallouts.top}</Text>
        </View>
        <View style={styles.performancePreviewTopLine} />
        <View style={styles.performancePreviewTopDrop} />
        <InstrumentPreviewStageArtwork
          instrument={instrumentSettingsModel.instrument}
          style={[
            styles.performancePreviewStage,
            isCompactHeight ? styles.performancePreviewStageCompact : undefined,
          ]}
        />
        <View style={styles.performancePreviewBottomLead} />
        <View style={styles.performancePreviewBottomDrop} />
        <View style={styles.performancePreviewBottomCallout}>
          <Text style={styles.performancePreviewCalloutText}>{performancePreviewCallouts.bottom}</Text>
        </View>
      </View>
      <View
        style={[
          styles.performancePreviewFooter,
          isCompactHeight ? styles.performancePreviewFooterCompact : undefined,
        ]}
      >
        <ProgressSteps step={2} />
        <PrimaryPillButton
          disabled={instrumentSettingsStartAction === undefined}
          label="NEXT"
          onPress={() =>
            instrumentSettingsStartAction === undefined
              ? undefined
              : dispatch(instrumentSettingsStartAction)
          }
        />
      </View>
    </View>
  );
}

export function FreePlayContent({
  state,
  dispatch,
  frameMode = 'portrait',
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
  frameMode?: GarakScreenFrameMode;
}) {
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const isLandscapeFrame = frameMode === 'landscape';
  const usesFigmaDaegeumLandscapeStage = isLandscapeFrame && instrument === 'daegeum';
  const usesFigmaGayageumLandscapeStage = isLandscapeFrame && instrument === 'gayageum';
  const usesFigmaJangguLandscapeStage = isLandscapeFrame && instrument === 'janggu';
  const usesFigmaLandscapeStage =
    usesFigmaDaegeumLandscapeStage || usesFigmaGayageumLandscapeStage || usesFigmaJangguLandscapeStage;

  return (
    <View style={[styles.screenStack, isLandscapeFrame ? styles.landscapePerformanceStack : undefined]}>
      {usesFigmaDaegeumLandscapeStage ? (
        <View style={styles.jangguLandscapeStageWrap}>
          <DaegeumLandscapeStageArtwork />
          <LandscapeStageNotice visible={state.freePlayNotice === 'missingTake'} />
          <LandscapeStageActionHits dispatch={dispatch} />
        </View>
      ) : usesFigmaGayageumLandscapeStage ? (
        <View style={styles.jangguLandscapeStageWrap}>
          <GayageumLandscapeStageArtwork />
          <LandscapeStageNotice visible={state.freePlayNotice === 'missingTake'} />
          <LandscapeStageActionHits dispatch={dispatch} />
        </View>
      ) : usesFigmaJangguLandscapeStage ? (
        <View style={styles.jangguLandscapeStageWrap}>
          <JangguLandscapeStageArtwork />
          <LandscapeStageNotice visible={state.freePlayNotice === 'missingTake'} />
          <LandscapeStageActionHits dispatch={dispatch} />
        </View>
      ) : (
        <View style={[styles.freePlaySurface, isLandscapeFrame ? styles.landscapeFreePlaySurface : undefined]}>
          <View style={styles.freePlayTopBar}>
            <Text style={styles.surfaceBrand}>GARAK</Text>
            <View style={styles.inlineControls}>
              <Text style={styles.inlineControl}>▶</Text>
              <Text style={styles.inlineControlAmber}>●</Text>
            </View>
          </View>
          <InstrumentVisual instrument={instrument} compact={isLandscapeFrame} />
        </View>
      )}
      {!usesFigmaLandscapeStage ? (
        <View style={styles.freePlayActionArea}>
          {state.freePlayNotice === 'missingTake' ? (
            <Text style={styles.freePlayNotice}>저장할 테이크가 없어요. 먼저 녹음을 시작해 주세요.</Text>
          ) : null}
          <View style={[styles.buttonRow, isLandscapeFrame ? styles.landscapeButtonRow : undefined]}>
            <SecondaryPillButton
              label={state.pendingFreePlayTake ? '녹음 중' : '녹음'}
              onPress={() => dispatch({ type: 'openFreePlayRecordingSetup' })}
            />
            <SecondaryPillButton label="장단" onPress={() => dispatch({ type: 'openLiveJangdanGuide' })} />
            <SecondaryPillButton label="레이어" onPress={() => dispatch({ type: 'openLayerEditor' })} />
            <PrimaryPillButton label="완료" onPress={() => dispatch({ type: 'completePerformance' })} style={styles.rowPrimary} />
          </View>
        </View>
      ) : null}
      {state.freePlayRecordingSetup !== undefined ? (
        <>
          <Pressable
            accessibilityLabel="녹음 전 설정 닫기"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'cancelFreePlayRecordingSetup' })}
            style={styles.recordingSetupBackdrop}
          />
          <FreePlayRecordingSetupSheet state={state} dispatch={dispatch} />
        </>
      ) : null}
    </View>
  );
}

function LandscapeStageNotice({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <View
      accessible
      accessibilityLabel="저장할 테이크가 없어요. 먼저 녹음을 시작해 주세요."
      pointerEvents="none"
      style={styles.landscapeStageNotice}
    >
      <Text style={styles.landscapeStageNoticeText}>저장할 테이크가 없어요. 먼저 녹음을 시작해 주세요.</Text>
    </View>
  );
}

function FreePlayRecordingSetupSheet({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const setup = state.freePlayRecordingSetup;

  if (setup === undefined) {
    return null;
  }

  return (
    <View
      style={styles.recordingSetupSheet}
    >
      <Text style={styles.recordingSetupEyebrow}>녹음 전 설정</Text>
      <Text style={styles.recordingSetupTitle}>장단과 BPM을 확인한 뒤 녹음해요.</Text>
      <View style={styles.recordingPresetGrid}>
        {JANGDAN_PRESETS.map((preset) => {
          const active = setup.presetId === preset.id;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={preset.id}
              onPress={() => dispatch({ type: 'selectFreePlayRecordingPreset', presetId: preset.id })}
              style={[
                styles.recordingPresetButton,
                active ? styles.recordingPresetButtonActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.recordingPresetName,
                  active ? styles.recordingPresetNameActive : undefined,
                ]}
              >
                {preset.name}
              </Text>
              <Text
                style={[
                  styles.recordingPresetMeta,
                  active ? styles.recordingPresetMetaActive : undefined,
                ]}
              >
                {preset.defaultBpm} BPM · {preset.beatUnit}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <JangdanStepperControl
        label="BPM"
        value={`${setup.bpm} BPM`}
        onDecrease={() => dispatch({ type: 'adjustFreePlayRecordingBpm', delta: -4 })}
        onIncrease={() => dispatch({ type: 'adjustFreePlayRecordingBpm', delta: 4 })}
      />
      <Text style={styles.recordingSetupMetaText}>박자 {setup.beatUnit}</Text>
      <View style={styles.recordingSetupActions}>
        <SecondaryPillButton
          label="취소"
          onPress={() => dispatch({ type: 'cancelFreePlayRecordingSetup' })}
          style={styles.recordingSetupActionButton}
        />
        <PrimaryPillButton
          label="녹음 시작"
          onPress={() => dispatch({ type: 'startPerformanceRecording', recordingSetup: setup })}
          style={styles.recordingSetupActionButton}
        />
      </View>
    </View>
  );
}

function LandscapeStageActionHits({ dispatch }: { dispatch: ProductDispatch }) {
  return (
    <>
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'back' })}
        style={styles.jangguLandscapeBackHit}
      />
      <Pressable
        accessibilityLabel="녹음 시작"
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'openFreePlayRecordingSetup' })}
        style={[styles.landscapeStageActionHit, styles.landscapeStageRecordHit]}
      />
      <Pressable
        accessibilityLabel="장단 설정"
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'openLiveJangdanGuide' })}
        style={[styles.landscapeStageActionHit, styles.landscapeStageJangdanHit]}
      />
      <Pressable
        accessibilityLabel="레이어 편집"
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'openLayerEditor' })}
        style={[styles.landscapeStageActionHit, styles.landscapeStageLayerHit]}
      />
      <Pressable
        accessibilityLabel="연주 완료"
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'completePerformance' })}
        style={[styles.landscapeStageActionHit, styles.landscapeStageCompleteHit]}
      />
    </>
  );
}

export function TrackLayerEditorContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  const hasAccompanimentTrack = work?.tracks.some(isAccompanimentTrack) ?? false;
  const mixEditorModel = getFreeCreationMixEditorModel(state);

  if (hasAccompanimentTrack) {
    return <FreeCreationCompletedPreviewContent state={state} dispatch={dispatch} />;
  }

  return (
    <View style={styles.freeCreationMixScreen}>
      <View
        style={styles.freeCreationPlayerDeck}
        accessible
        accessibilityLabel={mixEditorModel.playerAccessibilityLabel}
      >
        <View style={styles.freeCreationPlayerShadowBack} />
        <View style={styles.freeCreationPlayerShadowFront} />
        <View style={styles.freeCreationPlayerCard}>
          <View style={styles.freeCreationNewBadge}>
            <Text style={styles.freeCreationNewBadgeText}>NEW!</Text>
          </View>
          <Text numberOfLines={1} style={styles.freeCreationPlayerTitle}>
            {mixEditorModel.playerTitle}
          </Text>
          <View style={styles.freeCreationPlayerProgress}>
            <View style={styles.freeCreationPlayerProgressFill} />
          </View>
          <MixPlayerControls />
        </View>
      </View>

      <View style={styles.freeCreationMixPanel}>
        <MixWaveformGlyph />
        <Text style={styles.freeCreationMixCopy}>
          다른 악기를 연주하여 트랙을 추가해요.{'\n'}트랙과{' '}
          <Text style={styles.freeCreationMixCopyStrong}>AI 반주</Text>를 추가하여{' '}
          <Text style={styles.freeCreationMixCopyStrong}>나만의 가락</Text>을 생성해요.
        </Text>

        <View style={styles.freeCreationPlayheadControl}>
          <JangdanStepperControl
            label="재생 헤드"
            value={mixEditorModel.playheadBeatLabel}
            onDecrease={() => dispatch(mixEditorModel.decreasePlayheadAction)}
            onIncrease={() => dispatch(mixEditorModel.increasePlayheadAction)}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="트랙과 AI 반주 믹스"
          onPress={() => dispatch({ type: 'addTrack' })}
          style={styles.freeCreationMixButton}
        >
          <Text style={styles.freeCreationMixButtonText}>Mix</Text>
        </Pressable>

        <TrackControlStack trackControls={mixEditorModel.trackControls} dispatch={dispatch} />

        {mixEditorModel.saveAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="작업 저장"
            onPress={() => mixEditorModel.saveAction && dispatch(mixEditorModel.saveAction)}
            style={styles.freeCreationSaveButton}
          >
            <Text style={styles.freeCreationSaveButtonText}>{mixEditorModel.saveStatusLabel}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="프로젝트 저장 및 공유"
          onPress={() => dispatch({ type: 'exportCurrentWork' })}
          style={styles.freeCreationShareButton}
        >
          <ShareOutlineGlyph />
          <Text style={styles.freeCreationShareButtonText}>{'Save & Share project'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FreeCreationCompletedPreviewContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const previewModel = getFreeCreationCompletedPreviewModel(state);
  const mixEditorModel = getFreeCreationMixEditorModel(state);

  return (
    <View style={styles.freeCreationCompletedPreviewScreen}>
      <Text style={styles.freeCreationCompletedTitle}>
        <Text style={styles.freeCreationCompletedTitleStrong}>가락</Text> 미리듣기
      </Text>

      <View
        style={styles.freeCreationCompletedPlayerDeck}
        accessible
        accessibilityLabel={previewModel.playerAccessibilityLabel}
      >
        <View style={styles.freeCreationPlayerShadowBack} />
        <View style={styles.freeCreationPlayerShadowFront} />
        <View style={styles.freeCreationCompletedPlayerCard}>
          <View style={styles.freeCreationCompletedPlayerTitleRow}>
            <Text numberOfLines={1} style={styles.freeCreationCompletedPlayerTitle}>
              {previewModel.playerTitle}
            </Text>
            <View style={styles.freeCreationCompletedEditGlyph} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={styles.freeCreationCompletedEditGlyphLine} />
              <View style={styles.freeCreationCompletedEditGlyphTip} />
            </View>
          </View>
          <View style={styles.freeCreationCompletedPlayerProgress}>
            <View style={styles.freeCreationPlayerProgressFill} />
          </View>
          <MixPlayerControls />
        </View>
      </View>

      <View style={styles.freeCreationCompletedPanel}>
        <View style={styles.freeCreationCompletedPanelHeader}>
          <TrackAddWaveformGlyph />
          <Text style={styles.freeCreationCompletedCopy}>
            연주 한 트랙들과 생성 한 AI 반주로{'\n'}
            <Text style={styles.freeCreationCompletedCopyStrong}>{previewModel.completionSubjectLabel}</Text>을 완성해요.
          </Text>
        </View>

        <TrackControlStack
          trackControls={mixEditorModel.trackControls}
          dispatch={dispatch}
          style={styles.freeCreationCompletedTrackControlScroller}
        />

        {previewModel.saveAction ? (
          <SecondaryPillButton
            accessibilityLabel="작업 저장"
            label={previewModel.saveStatusLabel}
            onPress={() => previewModel.saveAction && dispatch(previewModel.saveAction)}
            style={styles.freeCreationCompletedActionButton}
            tone="outline"
          />
        ) : null}

        <PrimaryPillButton
          accessibilityLabel="완성한 가락 내보내기"
          label="GO"
          onPress={() => dispatch({ type: 'exportCurrentWork' })}
          style={styles.freeCreationCompletedActionButton}
        />
      </View>
    </View>
  );
}

function TrackControlStack({
  trackControls,
  dispatch,
  style,
}: {
  trackControls: FreeCreationTrackControlModel[];
  dispatch: ProductDispatch;
  style?: StyleProp<ViewStyle>;
}) {
  if (trackControls.length === 0) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.freeCreationTrackControlScroller, style]}
      contentContainerStyle={styles.freeCreationTrackControlStack}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      {trackControls.map((trackControl) => (
        <View
          key={trackControl.trackId}
          style={styles.freeCreationTrackControlRow}
          accessible
          accessibilityLabel={`${trackControl.label} ${trackControl.volumeLabel}`}
        >
          <Text numberOfLines={1} style={styles.freeCreationTrackControlLabel}>
            {trackControl.label}
          </Text>
          <Pressable
            accessibilityLabel={`${trackControl.label} 볼륨 낮추기`}
            accessibilityRole="button"
            onPress={() => dispatch(trackControl.decreaseVolumeAction)}
            style={styles.freeCreationTrackControlIconButton}
          >
            <Text style={styles.freeCreationTrackControlIconText}>-</Text>
          </Pressable>
          <Text style={styles.freeCreationTrackControlVolume}>{trackControl.volumeLabel}</Text>
          <Pressable
            accessibilityLabel={`${trackControl.label} 볼륨 높이기`}
            accessibilityRole="button"
            onPress={() => dispatch(trackControl.increaseVolumeAction)}
            style={styles.freeCreationTrackControlIconButton}
          >
            <Text style={styles.freeCreationTrackControlIconText}>+</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`${trackControl.label} 음소거`}
            accessibilityRole="button"
            accessibilityState={{ selected: trackControl.isMuted }}
            onPress={() => dispatch(trackControl.toggleMuteAction)}
            style={[
              styles.freeCreationTrackControlToggle,
              trackControl.isMuted ? styles.freeCreationTrackControlToggleActive : undefined,
            ]}
          >
            <Text
              style={[
                styles.freeCreationTrackControlToggleText,
                trackControl.isMuted ? styles.freeCreationTrackControlToggleTextActive : undefined,
              ]}
            >
              M
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`${trackControl.label} 솔로`}
            accessibilityRole="button"
            accessibilityState={{ selected: trackControl.isSoloed }}
            onPress={() => dispatch(trackControl.toggleSoloAction)}
            style={[
              styles.freeCreationTrackControlToggle,
              trackControl.isSoloed ? styles.freeCreationTrackControlToggleActive : undefined,
            ]}
          >
            <Text
              style={[
                styles.freeCreationTrackControlToggleText,
                trackControl.isSoloed ? styles.freeCreationTrackControlToggleTextActive : undefined,
              ]}
            >
              S
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`${trackControl.label} 삭제`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !trackControl.canDelete }}
            disabled={!trackControl.canDelete}
            onPress={() => dispatch(trackControl.deleteAction)}
            style={[
              styles.freeCreationTrackControlIconButton,
              !trackControl.canDelete ? styles.freeCreationTrackControlIconButtonDisabled : undefined,
            ]}
          >
            <Text style={styles.freeCreationTrackControlIconText}>X</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function MixPlayerControls() {
  return (
    <View style={styles.freeCreationPlayerControls}>
      <View style={styles.freeCreationPlayerControlCircle}>
        <Text style={styles.freeCreationPlayerControlIcon}>▶</Text>
      </View>
      <View style={styles.freeCreationPlayerPauseCircle}>
        <View style={styles.freeCreationPauseBar} />
        <View style={styles.freeCreationPauseBar} />
      </View>
    </View>
  );
}

function MixWaveformGlyph() {
  return (
    <View style={styles.freeCreationWaveform} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.freeCreationWaveformBar, styles.freeCreationWaveformBarShort]} />
      <View style={[styles.freeCreationWaveformBar, styles.freeCreationWaveformBarTall]} />
      <View style={[styles.freeCreationWaveformBar, styles.freeCreationWaveformBarMedium]} />
      <View style={[styles.freeCreationWaveformBar, styles.freeCreationWaveformBarTall]} />
      <View style={[styles.freeCreationWaveformBar, styles.freeCreationWaveformBarShort]} />
    </View>
  );
}

function ShareOutlineGlyph() {
  return (
    <View style={styles.freeCreationShareGlyph} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.freeCreationShareLine, styles.freeCreationShareLineUp]} />
      <View style={[styles.freeCreationShareLine, styles.freeCreationShareLineDown]} />
      <View style={[styles.freeCreationShareNode, styles.freeCreationShareNodeLeft]} />
      <View style={[styles.freeCreationShareNode, styles.freeCreationShareNodeTop]} />
      <View style={[styles.freeCreationShareNode, styles.freeCreationShareNodeBottom]} />
    </View>
  );
}

export function AddTrackContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  const instrumentTracks = work?.tracks.filter(isInstrumentTrack) ?? [];
  const firstInstrumentTrack = instrumentTracks[0];
  const secondInstrumentTrack = instrumentTracks[1];
  const primaryInstrument =
    firstInstrumentTrack?.instrument ?? state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const suggestedTrackInstrument = getNextTrackInstrument(instrumentTracks.map((track) => track.instrument));
  const isInstrumentSelectionOpen = state.trackAddSelection === 'instrument';
  const secondInstrumentTrackLabel = secondInstrumentTrack
    ? `Track 2 : ${getInstrumentName(secondInstrumentTrack.instrument)}`
    : undefined;
  const currentTrackLabel = secondInstrumentTrackLabel
    ? `Track 1 : ${getInstrumentName(primaryInstrument)}`
    : `TRACK 1 : ${getInstrumentName(primaryInstrument)}`;
  const currentWorkContextLabel =
    work === undefined ? '현재 작업 없음' : `현재 작업 · ${work.title}`;

  return (
    <View style={styles.freeCreationTrackAddScreen}>
      <Text style={styles.freeCreationTrackAddTitle}>
        <Text style={styles.freeCreationTrackAddTitleStrong}>나만의 가락</Text> 만들기
      </Text>

      <View style={styles.freeCreationTrackAddPanel}>
        <TrackAddWaveformGlyph />
        <Text style={styles.freeCreationTrackAddCopy}>
          다른 악기를 연주하여 트랙을 추가해요. {'\n'}트랙을 추가하고, AI 반주를 추가하여{'\n'}
          <Text style={styles.freeCreationTrackAddCopyStrong}>나만의 가락</Text>을 생성해요.
        </Text>
        <Text style={styles.freeCreationTrackAddContext}>{currentWorkContextLabel}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="AI 반주 생성하기"
          onPress={() => dispatch({ type: 'chooseAccompanimentTrack' })}
          style={[
            styles.freeCreationLayerOptionWrap,
            secondInstrumentTrackLabel
              ? styles.freeCreationAccompanimentLayerAfterInstrument
              : styles.freeCreationAccompanimentLayer,
          ]}
        >
          <View style={[styles.freeCreationLayerOptionRotated, styles.freeCreationLayerOptionNavy]}>
            <Text style={[styles.freeCreationLayerOptionText, styles.freeCreationLayerOptionTextNavy]}>
              AI 반주 생성하기
            </Text>
          </View>
        </Pressable>

        {secondInstrumentTrackLabel ? (
          <View
            accessible
            accessibilityLabel={secondInstrumentTrackLabel}
            style={[styles.freeCreationLayerOptionWrap, styles.freeCreationAddedInstrumentLayer]}
          >
            <View style={styles.freeCreationAddedInstrumentTrackButton}>
              <Text style={styles.freeCreationAddedInstrumentTrackButtonText}>{secondInstrumentTrackLabel}</Text>
            </View>
          </View>
        ) : (
          <>
            {isInstrumentSelectionOpen ? (
              <View
                style={[
                  styles.freeCreationLayerOptionWrap,
                  styles.freeCreationInstrumentLayer,
                  styles.freeCreationInstrumentLayerOpen,
                ]}
              >
                <View style={styles.freeCreationInstrumentPickerCard}>
                  <Text style={styles.freeCreationInstrumentPickerTitle}>추가 악기 선택</Text>
                  <View style={styles.freeCreationInstrumentPickerChips}>
                    {MVP_INSTRUMENTS.map((instrument) => {
                      const isSuggestedInstrument = instrument.id === suggestedTrackInstrument;

                      return (
                        <Pressable
                          key={instrument.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${getInstrumentName(instrument.id)} 추가 녹음`}
                          onPress={() =>
                            dispatch({ type: 'chooseInstrumentTrack', instrument: instrument.id })
                          }
                          style={[
                            styles.freeCreationInstrumentPickerChip,
                            isSuggestedInstrument
                              ? styles.freeCreationInstrumentPickerChipSuggested
                              : undefined,
                          ]}
                        >
                          <Text
                            style={[
                              styles.freeCreationInstrumentPickerChipText,
                              isSuggestedInstrument
                                ? styles.freeCreationInstrumentPickerChipTextSuggested
                                : undefined,
                            ]}
                          >
                            {getInstrumentName(instrument.id)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="악기 연주 추가"
                onPress={() => dispatch({ type: 'openInstrumentTrackSelection' })}
                style={[styles.freeCreationLayerOptionWrap, styles.freeCreationInstrumentLayer]}
              >
                <View style={[styles.freeCreationLayerOptionRotated, styles.freeCreationLayerOptionRed]}>
                  <Text style={[styles.freeCreationLayerOptionText, styles.freeCreationLayerOptionTextRed]}>
                    악기 연주 추가
                  </Text>
                </View>
              </Pressable>
            )}
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="가져오기 준비 중"
          onPress={() => dispatch({ type: 'showLockedImportTrackNotice' })}
          style={[
            styles.freeCreationLayerOptionWrap,
            styles.freeCreationImportLayer,
            styles.lockedOption,
          ]}
        >
          <View style={[styles.freeCreationLayerOptionRotated, styles.freeCreationLayerOptionAmber]}>
            <Text style={[styles.freeCreationLayerOptionText, styles.freeCreationLayerOptionTextAmber]}>
              가져오기
            </Text>
          </View>
        </Pressable>

        <View style={styles.freeCreationCurrentTrackButton}>
          <Text style={styles.freeCreationCurrentTrackButtonText}>{currentTrackLabel}</Text>
        </View>

        {state.trackAddNotice === 'importLocked' ? (
          <Text style={styles.freeCreationTrackAddNotice}>
            가져오기는 이후 업데이트에서 지원할 예정이에요.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 단계로 이동"
          onPress={() => dispatch({ type: 'exportCurrentWork' })}
          style={styles.freeCreationTrackAddGoButton}
        >
          <Text style={styles.freeCreationTrackAddGoButtonText}>GO</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="트랙 추가 취소"
          onPress={() => dispatch({ type: 'cancelTrackAdd' })}
          style={styles.freeCreationTrackAddCancelButton}
        >
          <Text style={styles.freeCreationTrackAddCancelButtonText}>취소</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TrackAddWaveformGlyph() {
  return (
    <View
      style={styles.freeCreationTrackAddWaveform}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.freeCreationTrackAddWaveformBar, styles.freeCreationTrackAddWaveformTiny]} />
      <View style={[styles.freeCreationTrackAddWaveformBar, styles.freeCreationTrackAddWaveformMedium]} />
      <View style={[styles.freeCreationTrackAddWaveformBar, styles.freeCreationTrackAddWaveformTallest]} />
      <View style={[styles.freeCreationTrackAddWaveformBar, styles.freeCreationTrackAddWaveformRegular]} />
      <View style={[styles.freeCreationTrackAddWaveformBar, styles.freeCreationTrackAddWaveformTall]} />
      <View style={[styles.freeCreationTrackAddWaveformBar, styles.freeCreationTrackAddWaveformShort]} />
    </View>
  );
}

export function ExtraInstrumentRecordContent({
  state,
  dispatch,
  frameMode = 'portrait',
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
  frameMode?: GarakScreenFrameMode;
}) {
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const isLandscapeFrame = frameMode === 'landscape';
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  const recordingStatus = state.pendingFreePlayTake ? '미리듣기 준비됨' : '녹음 대기';

  return (
    <View style={[styles.screenStack, isLandscapeFrame ? styles.landscapePerformanceStack : undefined]}>
      {!isLandscapeFrame ? <ScreenHeading title={`${getInstrumentName(instrument)} 트랙 녹음`} compact /> : null}
      <MiniTrackPlayer title={work?.title ?? '현재 작업'} tone="navy" />
      <View style={[styles.noteBubble, styles.extraInstrumentNoteBubble]}>
        <Text style={styles.noteBubbleText}>
          기존 작업을 들으며 {getInstrumentName(instrument)} 트랙을 덧녹음해요. {recordingStatus}
        </Text>
      </View>
      <View style={[styles.freePlaySurface, isLandscapeFrame ? styles.landscapeFreePlaySurface : undefined]}>
        <InstrumentVisual instrument={instrument} compact={isLandscapeFrame} />
      </View>
      <View
        style={[
          styles.buttonRow,
          styles.extraInstrumentButtonRow,
          isLandscapeFrame ? styles.landscapeButtonRow : undefined,
        ]}
      >
        <SecondaryPillButton
          label={state.pendingFreePlayTake ? '녹음 중' : '녹음'}
          onPress={() => dispatch({ type: 'startPerformanceRecording' })}
          style={styles.extraInstrumentActionButton}
        />
        <SecondaryPillButton
          label="다시 녹음"
          onPress={() => dispatch({ type: 'restartInstrumentTrackRecording' })}
          style={styles.extraInstrumentActionButton}
        />
        <SecondaryPillButton
          label="취소"
          onPress={() => dispatch({ type: 'cancelInstrumentTrack' })}
          style={styles.extraInstrumentActionButton}
        />
        <PrimaryPillButton
          label="적용"
          onPress={() => dispatch({ type: 'applyInstrumentTrack' })}
          style={styles.extraInstrumentActionButton}
        />
      </View>
    </View>
  );
}

export function LiveJangdanContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return <JangdanPresetPanel mode="live" state={state} dispatch={dispatch} />;
}

export function AccompanimentTrackContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return <JangdanPresetPanel mode="track" state={state} dispatch={dispatch} />;
}

function JangdanPresetPanel({
  mode,
  state,
  dispatch,
}: {
  mode: JangdanPresetPanelMode;
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const model = getJangdanPresetPanelModel(state, mode);

  return (
    <View style={styles.screenStack}>
      <ScreenHeading
        title={mode === 'live' ? '라이브 장단을\n선택해요.' : '장단 트랙을\n만들어요.'}
        description="AI 생성 오디오가 아니라 로컬 장단 프리셋을 미리듣고 수락하는 흐름입니다."
      />
      <MiniTrackPlayer title={model.miniPlayerTitle} tone="amber" />
      {model.workContextLabel ? (
        <Text style={styles.recommendationMessage}>{model.workContextLabel}</Text>
      ) : null}
      {model.recommendationMessage ? (
        <Text style={styles.recommendationMessage}>{model.recommendationMessage}</Text>
      ) : null}
      <View style={styles.jangdanControlStack}>
        <JangdanStepperControl
          label="BPM"
          value={model.bpmValueLabel}
          onDecrease={() => dispatch(model.decreaseBpmAction)}
          onIncrease={() => dispatch(model.increaseBpmAction)}
        />
        <JangdanStepperControl
          label="볼륨"
          value={model.volumeValueLabel}
          onDecrease={() => dispatch(model.decreaseVolumeAction)}
          onIncrease={() => dispatch(model.increaseVolumeAction)}
        />
      </View>
      <View style={styles.presetStack}>
        {model.manualPresets.map((preset) => {
          const isPreviewing = model.previewingPresetId === preset.id;

          return (
            <View key={preset.id} style={styles.presetRow}>
              <View style={styles.presetRowTextBlock}>
                <Text style={styles.panelTitle}>{preset.name}</Text>
                <Text style={styles.metaText}>
                  GARAK 기본 BPM {preset.defaultBpm} · {preset.minBpm}-{preset.maxBpm} · {preset.beatUnit}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${preset.name} 장단 미리듣기`}
                onPress={() =>
                  dispatch({
                    type: 'previewJangdanPreset',
                    mode,
                    presetId: preset.id,
                    bpm: preset.defaultBpm,
                    volume: model.acceptedVolume,
                  })
                }
                style={[
                  styles.previewButton,
                  isPreviewing ? styles.previewButtonActive : undefined,
                ]}
              >
                <Text style={[styles.previewText, isPreviewing ? styles.previewTextActive : undefined]}>
                  {isPreviewing ? '미리듣는 중' : '미리듣기'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <PrimaryPillButton
        disabled={model.acceptAction === undefined}
        label={mode === 'live' ? '적용하고 연주로 돌아가기' : '반주 트랙 추가'}
        onPress={() =>
          model.acceptAction === undefined ? undefined : dispatch(model.acceptAction)
        }
      />
      <SecondaryPillButton
        label={mode === 'live' ? '끄기' : '취소'}
        onPress={() =>
          mode === 'live'
            ? dispatch({ type: 'turnOffLiveJangdanGuide' })
            : dispatch({ type: 'cancelAccompanimentTrack' })
        }
      />
    </View>
  );
}

function JangdanStepperControl({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.jangdanStepperRow}>
      <Text style={styles.jangdanStepperLabel}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label} 낮추기`}
        accessibilityRole="button"
        onPress={onDecrease}
        style={styles.jangdanStepperButton}
      >
        <Text style={styles.jangdanStepperButtonText}>-</Text>
      </Pressable>
      <Text style={styles.jangdanStepperValue}>{value}</Text>
      <Pressable
        accessibilityLabel={`${label} 높이기`}
        accessibilityRole="button"
        onPress={onIncrease}
        style={styles.jangdanStepperButton}
      >
        <Text style={styles.jangdanStepperButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

function InstrumentChipRow({
  selectedInstrument,
  onSelect,
  onLockedInstrumentPress,
  variant = 'wrap',
}: {
  selectedInstrument: InstrumentId;
  onSelect: (instrument: InstrumentId) => void;
  onLockedInstrumentPress?: () => void;
  variant?: 'wrap' | 'figma';
}) {
  const chipContent = (
    <>
      {INSTRUMENT_CHIP_ORDER.map((instrumentId) => {
        const instrument = MVP_INSTRUMENTS.find((item) => item.id === instrumentId);

        if (!instrument) {
          return null;
        }

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedInstrument === instrument.id }}
            key={instrument.id}
            onPress={() => onSelect(instrument.id)}
            style={[
              styles.instrumentChip,
              variant === 'figma'
                ? [styles.instrumentChipFigma, { width: FIGMA_INSTRUMENT_CHIP_WIDTH[instrument.id] }]
                : undefined,
              selectedInstrument === instrument.id ? styles.instrumentChipActive : undefined,
            ]}
          >
            <Text
              style={[
                styles.instrumentChipText,
                variant === 'figma' ? styles.instrumentChipTextFigma : undefined,
                selectedInstrument === instrument.id ? styles.instrumentChipTextActive : undefined,
              ]}
            >
              {instrument.name}
            </Text>
          </Pressable>
        );
      })}
      {variant === 'figma'
        ? FUTURE_INSTRUMENT_CHIPS.map((chip) => (
            <Pressable
              accessibilityLabel="준비 중인 악기"
              accessibilityRole="button"
              key={chip.id}
              onPress={onLockedInstrumentPress}
              style={[
                styles.instrumentChip,
                styles.instrumentChipFigma,
                styles.instrumentChipLockedFigma,
                { width: chip.width },
              ]}
            >
              <LockGlyph />
            </Pressable>
          ))
        : Array.from({ length: LOCKED_FUTURE_INSTRUMENT_SLOTS }, (_, index) => (
            <Pressable
              accessibilityLabel="준비 중인 악기"
              accessibilityRole="button"
              key={index}
              onPress={onLockedInstrumentPress}
              style={[styles.instrumentChip, styles.instrumentChipLocked]}
            >
              <Text style={styles.instrumentChipLockedText}>잠금</Text>
            </Pressable>
          ))}
    </>
  );

  if (variant === 'figma') {
    return (
      <ScrollView
        bounces={false}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.instrumentChipScroller}
        contentContainerStyle={styles.instrumentChipScrollerContent}
      >
        {chipContent}
      </ScrollView>
    );
  }

  return (
    <View style={styles.instrumentChips}>
      {chipContent}
    </View>
  );
}

function LockGlyph() {
  return (
    <View style={styles.lockGlyph}>
      <View style={styles.lockGlyphShackle} />
      <View style={styles.lockGlyphBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenStack: {
    gap: 18,
    position: 'relative',
  },
  instrumentSelectScreen: {
    gap: 0,
  },
  instrumentSelectTitle: {
    color: '#606060',
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 34,
    marginTop: 27,
  },
  instrumentSelectTitleCompact: {
    fontSize: 27,
    lineHeight: 32,
    marginTop: 14,
  },
  instrumentSelectTitleStrong: {
    color: '#191919',
    fontWeight: '800',
  },
  instrumentSelectNotice: {
    color: GARAK_COLORS.brandRed,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 8,
    textAlign: 'center',
  },
  instrumentSelectArtworkWrap: {
    marginTop: 12,
  },
  instrumentSelectArtworkWrapCompact: {
    marginTop: 9,
  },
  instrumentSelectArtworkCompact: {
    height: 389,
  },
  instrumentSelectFooter: {
    gap: 13,
    marginTop: 15,
  },
  instrumentSelectFooterCompact: {
    marginTop: 8,
  },
  performancePreviewScreen: {
    gap: 0,
  },
  performancePreviewTitle: {
    color: '#606060',
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 34,
    marginTop: 27,
  },
  performancePreviewTitleCompact: {
    fontSize: 27,
    lineHeight: 32,
    marginTop: 14,
  },
  performancePreviewTitleStrong: {
    color: '#191919',
    fontWeight: '800',
  },
  performancePreviewPanel: {
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    borderColor: 'rgba(0,0,0,0.04)',
    borderRadius: 40,
    borderWidth: 1,
    height: 510,
    marginTop: 54,
    overflow: 'hidden',
    position: 'relative',
    ...garakCardShadow,
  },
  performancePreviewPanelCompact: {
    height: 430,
    marginTop: 32,
  },
  performancePreviewTopCallout: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(229,145,0,0.3)',
    borderColor: GARAK_COLORS.brandAmber,
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginTop: 56,
    paddingHorizontal: 14,
    width: 175,
    zIndex: 2,
  },
  performancePreviewCalloutText: {
    color: '#606060',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 13,
    textAlign: 'center',
  },
  performancePreviewTopLine: {
    backgroundColor: GARAK_COLORS.brandAmber,
    height: 1,
    position: 'absolute',
    right: 33,
    top: 75,
    width: 62,
  },
  performancePreviewTopDrop: {
    backgroundColor: GARAK_COLORS.brandAmber,
    height: 43,
    position: 'absolute',
    right: 33,
    top: 75,
    width: 1,
  },
  performancePreviewStage: {
    marginTop: 22,
  },
  performancePreviewStageCompact: {
    height: 145,
  },
  performancePreviewBottomLead: {
    backgroundColor: GARAK_COLORS.brandAmber,
    height: 1,
    left: 13,
    position: 'absolute',
    top: 325,
    width: 64,
  },
  performancePreviewBottomDrop: {
    backgroundColor: GARAK_COLORS.brandAmber,
    height: 48,
    left: 13,
    position: 'absolute',
    top: 325,
    width: 1,
  },
  performancePreviewBottomCallout: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(229,145,0,0.3)',
    borderColor: GARAK_COLORS.brandAmber,
    borderRadius: 17,
    borderWidth: 1,
    height: 33,
    justifyContent: 'center',
    marginTop: 30,
    paddingHorizontal: 14,
    width: 255,
  },
  performancePreviewFooter: {
    gap: 13,
    marginTop: 15,
  },
  performancePreviewFooterCompact: {
    marginTop: 8,
  },
  landscapePerformanceStack: {
    flex: 1,
    gap: 12,
  },
  homeQuickAccess: {
    marginTop: 71,
  },
  homeTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  smallCircleButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  smallCircleText: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 16,
    fontWeight: '800',
  },
  avatarButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandRed,
    borderColor: GARAK_COLORS.surfaceApp,
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 11,
    fontWeight: '800',
  },
  instrumentPreviewCard: {
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    borderRadius: GARAK_RADIUS.hero,
    minHeight: 430,
    overflow: 'hidden',
    padding: 22,
    ...garakCardShadow,
  },
  playPreviewCard: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: GARAK_RADIUS.hero,
    minHeight: 440,
    overflow: 'hidden',
    padding: 16,
    ...garakCardShadow,
  },
  freeCreationMixScreen: {
    gap: 25,
    marginTop: 108,
  },
  freeCreationCompletedPreviewScreen: {
    marginTop: 50,
  },
  freeCreationCompletedTitle: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 34,
  },
  freeCreationCompletedTitleStrong: {
    color: GARAK_COLORS.textSecondary,
    fontWeight: '600',
  },
  freeCreationPlayerDeck: {
    alignSelf: 'center',
    height: 161,
    position: 'relative',
    width: '100%',
  },
  freeCreationCompletedPlayerDeck: {
    alignSelf: 'center',
    height: 161,
    marginTop: 17,
    position: 'relative',
    width: '100%',
  },
  freeCreationPlayerShadowBack: {
    backgroundColor: '#5E606A',
    borderRadius: 28,
    height: 134,
    left: 8,
    opacity: 0.65,
    position: 'absolute',
    right: 8,
    top: 26,
  },
  freeCreationPlayerShadowFront: {
    backgroundColor: '#3A3C4A',
    borderRadius: 30,
    height: 142,
    left: 6,
    opacity: 0.82,
    position: 'absolute',
    right: 6,
    top: 14,
  },
  freeCreationPlayerCard: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 40,
    height: 135,
    left: 0,
    overflow: 'visible',
    paddingTop: 28,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  freeCreationCompletedPlayerCard: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 40,
    height: 135,
    left: 0,
    overflow: 'visible',
    paddingTop: 32,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  freeCreationNewBadge: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandRed,
    borderRadius: 36,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: 7,
    position: 'absolute',
    right: 10,
    top: -7,
  },
  freeCreationNewBadgeText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  freeCreationPlayerTitle: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 26,
    maxWidth: 245,
  },
  freeCreationCompletedPlayerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    height: 14,
    justifyContent: 'center',
  },
  freeCreationCompletedPlayerTitle: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 12.4,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 14,
    maxWidth: 108,
  },
  freeCreationCompletedEditGlyph: {
    height: 12,
    position: 'relative',
    width: 10,
  },
  freeCreationCompletedEditGlyphLine: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    height: 2,
    left: 1,
    position: 'absolute',
    top: 7,
    transform: [{ rotate: '-58deg' }],
    width: 10,
  },
  freeCreationCompletedEditGlyphTip: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    height: 3,
    position: 'absolute',
    right: 0,
    top: 2,
    transform: [{ rotate: '-58deg' }],
    width: 2,
  },
  freeCreationPlayerProgress: {
    backgroundColor: '#E4E4E4',
    borderRadius: 2,
    height: 3,
    marginTop: 17,
    overflow: 'hidden',
    width: 245,
  },
  freeCreationCompletedPlayerProgress: {
    backgroundColor: '#E4E4E4',
    borderRadius: 2,
    height: 3,
    marginTop: 12,
    overflow: 'hidden',
    width: 245,
  },
  freeCreationPlayerProgressFill: {
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 2,
    height: '100%',
    width: 136,
  },
  freeCreationPlayerControls: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 55,
    flexDirection: 'row',
    gap: 8,
    height: 33,
    justifyContent: 'center',
    marginTop: 15,
    width: 106,
  },
  freeCreationPlayerControlCircle: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  freeCreationPlayerPauseCircle: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 3,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  freeCreationPlayerControlIcon: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
    marginLeft: 2,
  },
  freeCreationPauseBar: {
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 1,
    height: 9,
    width: 3,
  },
  freeCreationMixPanel: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    borderColor: 'rgba(0,0,0,0.04)',
    borderRadius: 40,
    borderWidth: 1,
    height: 511,
    overflow: 'hidden',
    paddingHorizontal: 27,
    paddingTop: 34,
    position: 'relative',
    width: '100%',
    ...garakCardShadow,
  },
  freeCreationCompletedPanel: {
    alignSelf: 'center',
    backgroundColor: GARAK_SEMANTIC_COLORS.backgroundAlternative,
    borderColor: GARAK_SEMANTIC_COLORS.lineAlternative,
    borderRadius: GARAK_RADIUS.hero,
    borderWidth: 1,
    gap: GARAK_SPACING.pt24,
    minHeight: 520,
    overflow: 'hidden',
    paddingBottom: GARAK_SPACING.pt32,
    paddingHorizontal: GARAK_SPACING.pt20,
    paddingTop: GARAK_SPACING.pt40,
    width: '100%',
    ...garakCardShadow,
  },
  freeCreationCompletedPanelHeader: {
    gap: GARAK_SPACING.pt20,
  },
  freeCreationWaveform: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    height: 12,
    width: 15,
  },
  freeCreationWaveformBar: {
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 1,
    width: 1,
  },
  freeCreationWaveformBarShort: {
    height: 7,
  },
  freeCreationWaveformBarMedium: {
    height: 10,
  },
  freeCreationWaveformBarTall: {
    height: 12,
  },
  freeCreationMixCopy: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '300',
    letterSpacing: 0,
    lineHeight: 15,
    marginTop: 17,
    width: 304,
  },
  freeCreationMixCopyStrong: {
    color: GARAK_COLORS.textSecondary,
    fontWeight: '500',
  },
  freeCreationPlayheadControl: {
    left: 27,
    position: 'absolute',
    right: 28,
    top: 103,
  },
  freeCreationCompletedCopy: {
    color: GARAK_SEMANTIC_COLORS.labelNeutral,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0,
    lineHeight: 20,
    maxWidth: 304,
  },
  freeCreationCompletedCopyStrong: {
    color: GARAK_SEMANTIC_COLORS.labelNeutral,
    fontWeight: '700',
  },
  freeCreationCompletedActionButton: {
    flex: 0,
    minHeight: GARAK_MONTAGE_BUTTON.large.minHeight,
  },
  freeCreationMixButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 38,
    height: 36,
    justifyContent: 'center',
    left: 27,
    position: 'absolute',
    right: 28,
    top: 170,
  },
  freeCreationMixButtonText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 32,
  },
  freeCreationTrackControlScroller: {
    left: 27,
    maxHeight: 106,
    position: 'absolute',
    right: 28,
    top: 224,
  },
  freeCreationCompletedTrackControlScroller: {
    left: GARAK_SPACING.pt0,
    maxHeight: 168,
    position: 'relative',
    right: GARAK_SPACING.pt0,
    top: GARAK_SPACING.pt0,
  },
  freeCreationTrackControlStack: {
    gap: 8,
    paddingBottom: 2,
  },
  freeCreationTrackControlRow: {
    alignItems: 'center',
    borderColor: 'rgba(31,32,46,0.14)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 45,
    paddingHorizontal: 10,
  },
  freeCreationTrackControlLabel: {
    color: GARAK_COLORS.textSecondary,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    minWidth: 0,
  },
  freeCreationTrackControlIconButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceSoft,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  freeCreationTrackControlIconButtonDisabled: {
    opacity: 0.35,
  },
  freeCreationTrackControlIconText: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 16,
  },
  freeCreationTrackControlVolume: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    minWidth: 32,
    textAlign: 'center',
  },
  freeCreationTrackControlToggle: {
    alignItems: 'center',
    borderColor: 'rgba(31,32,46,0.18)',
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  freeCreationTrackControlToggleActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
    borderColor: GARAK_COLORS.brandNavy,
  },
  freeCreationTrackControlToggleText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
  },
  freeCreationTrackControlToggleTextActive: {
    color: GARAK_COLORS.surfaceCard,
  },
  freeCreationSaveButton: {
    alignItems: 'center',
    borderColor: 'rgba(31,32,46,0.24)',
    borderRadius: GARAK_RADIUS.pill,
    borderWidth: 1,
    bottom: 127,
    height: 42,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  freeCreationSaveButtonText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  freeCreationShareButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: GARAK_RADIUS.pill,
    bottom: 71,
    flexDirection: 'row',
    gap: 4,
    height: 48,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  freeCreationShareButtonText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 15.5,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 32,
  },
  freeCreationShareGlyph: {
    height: 18,
    marginRight: 2,
    position: 'relative',
    width: 19,
  },
  freeCreationShareNode: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    width: 6,
    zIndex: 2,
  },
  freeCreationShareNodeLeft: {
    left: 1,
    top: 6,
  },
  freeCreationShareNodeTop: {
    right: 1,
    top: 1,
  },
  freeCreationShareNodeBottom: {
    bottom: 1,
    right: 1,
  },
  freeCreationShareLine: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    height: 2,
    left: 5,
    position: 'absolute',
    width: 11,
  },
  freeCreationShareLineUp: {
    top: 6,
    transform: [{ rotate: '-23deg' }],
  },
  freeCreationShareLineDown: {
    top: 11,
    transform: [{ rotate: '23deg' }],
  },
  freeCreationTrackAddScreen: {
    marginTop: 50,
  },
  freeCreationTrackAddTitle: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 34,
  },
  freeCreationTrackAddTitleStrong: {
    color: GARAK_COLORS.textSecondary,
    fontWeight: '600',
  },
  freeCreationTrackAddPanel: {
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    borderColor: 'rgba(0,0,0,0.04)',
    borderRadius: 40,
    borderWidth: 1,
    height: 697,
    marginTop: 29,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingTop: 45,
    position: 'relative',
    width: '100%',
    ...garakCardShadow,
  },
  freeCreationTrackAddWaveform: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    height: 19,
    width: 18,
  },
  freeCreationTrackAddWaveformBar: {
    backgroundColor: '#242424',
    borderRadius: 1,
    width: 1.2,
  },
  freeCreationTrackAddWaveformTiny: {
    height: 5,
  },
  freeCreationTrackAddWaveformMedium: {
    height: 12,
  },
  freeCreationTrackAddWaveformTallest: {
    height: 19,
  },
  freeCreationTrackAddWaveformRegular: {
    height: 9.5,
  },
  freeCreationTrackAddWaveformTall: {
    height: 15,
  },
  freeCreationTrackAddWaveformShort: {
    height: 6,
  },
  freeCreationTrackAddCopy: {
    color: '#656565',
    fontSize: 13.36,
    fontWeight: '300',
    letterSpacing: 0,
    lineHeight: 16.2,
    marginTop: 21,
    width: 278,
  },
  freeCreationTrackAddCopyStrong: {
    color: '#656565',
    fontWeight: '500',
  },
  freeCreationTrackAddContext: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 17,
    marginTop: 12,
  },
  freeCreationLayerOptionWrap: {
    alignItems: 'center',
    height: 109,
    justifyContent: 'center',
    left: -3,
    position: 'absolute',
    width: 351,
  },
  freeCreationAccompanimentLayer: {
    top: 264,
    zIndex: 1,
  },
  freeCreationAccompanimentLayerAfterInstrument: {
    top: 264,
    zIndex: 1,
  },
  freeCreationInstrumentLayer: {
    top: 341,
    zIndex: 2,
  },
  freeCreationInstrumentLayerOpen: {
    top: 318,
    zIndex: 4,
  },
  freeCreationAddedInstrumentLayer: {
    top: 344,
    zIndex: 2,
  },
  freeCreationImportLayer: {
    top: 414,
    zIndex: 3,
  },
  freeCreationLayerOptionRotated: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 126,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 59,
    justifyContent: 'center',
    transform: [{ rotate: '-8.4deg' }],
    width: 346,
  },
  freeCreationLayerOptionNavy: {
    borderColor: GARAK_COLORS.brandNavy,
  },
  freeCreationLayerOptionRed: {
    borderColor: GARAK_COLORS.brandRed,
  },
  freeCreationLayerOptionAmber: {
    borderColor: GARAK_COLORS.brandAmber,
  },
  freeCreationLayerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
    lineHeight: 20,
  },
  freeCreationLayerOptionTextNavy: {
    color: GARAK_COLORS.brandNavy,
  },
  freeCreationLayerOptionTextRed: {
    color: GARAK_COLORS.brandRed,
  },
  freeCreationLayerOptionTextAmber: {
    color: GARAK_COLORS.brandAmber,
  },
  freeCreationInstrumentPickerCard: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: GARAK_COLORS.brandRed,
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    minHeight: 96,
    paddingHorizontal: 16,
    paddingVertical: 13,
    width: 330,
    ...garakCardShadow,
  },
  freeCreationInstrumentPickerTitle: {
    color: GARAK_COLORS.brandRed,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 17,
    textAlign: 'center',
  },
  freeCreationInstrumentPickerChips: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  freeCreationInstrumentPickerChip: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceSoft,
    borderRadius: 17,
    minHeight: 32,
    minWidth: 78,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  freeCreationInstrumentPickerChipSuggested: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  freeCreationInstrumentPickerChipText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  freeCreationInstrumentPickerChipTextSuggested: {
    color: GARAK_COLORS.surfaceCard,
  },
  freeCreationAddedInstrumentTrackButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandRed,
    borderRadius: 126,
    height: 59,
    justifyContent: 'center',
    transform: [{ rotate: '-8.4deg' }],
    width: 346,
  },
  freeCreationAddedInstrumentTrackButtonText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  freeCreationCurrentTrackButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 126,
    height: 59,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 512,
  },
  freeCreationCurrentTrackButtonText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  freeCreationTrackAddGoButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: GARAK_RADIUS.pill,
    bottom: 79,
    height: 48,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  freeCreationTrackAddGoButtonText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
    lineHeight: 20,
  },
  freeCreationTrackAddCancelButton: {
    alignItems: 'center',
    borderColor: 'rgba(31,32,46,0.24)',
    borderRadius: GARAK_RADIUS.pill,
    borderWidth: 1,
    bottom: 25,
    height: 42,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  freeCreationTrackAddCancelButtonText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  freeCreationTrackAddNotice: {
    color: GARAK_COLORS.brandRed,
    fontSize: 12,
    fontWeight: '700',
    left: 12,
    lineHeight: 17,
    position: 'absolute',
    right: 12,
    textAlign: 'center',
    top: 152,
  },
  freePlaySurface: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 26,
    minHeight: 390,
    overflow: 'hidden',
    padding: 14,
    ...garakCardShadow,
  },
  landscapeFreePlaySurface: {
    flex: 1,
    minHeight: 0,
    padding: 12,
  },
  jangguLandscapeStageWrap: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  jangguLandscapeBackHit: {
    height: 90,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 140,
  },
  landscapeStageActionHit: {
    position: 'absolute',
    zIndex: 3,
  },
  landscapeStageRecordHit: {
    height: 52,
    right: 34,
    top: 82,
    width: 52,
  },
  landscapeStageJangdanHit: {
    height: 52,
    right: 0,
    top: 82,
    width: 44,
  },
  landscapeStageLayerHit: {
    bottom: 94,
    left: '31%',
    right: '31%',
    top: 94,
  },
  landscapeStageCompleteHit: {
    bottom: 0,
    height: 96,
    right: 0,
    width: 172,
  },
  landscapeStageNotice: {
    alignSelf: 'center',
    backgroundColor: 'rgba(25,27,43,0.88)',
    borderRadius: 18,
    bottom: 18,
    left: 96,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: 'absolute',
    right: 96,
    zIndex: 5,
  },
  landscapeStageNoticeText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 16,
    textAlign: 'center',
  },
  recordingSetupSheet: {
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    borderColor: 'rgba(31,32,46,0.14)',
    borderRadius: 24,
    borderWidth: 1,
    bottom: 12,
    gap: 10,
    left: 12,
    padding: 16,
    position: 'absolute',
    right: 12,
    zIndex: 12,
    ...garakCardShadow,
  },
  recordingSetupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,16,24,0.22)',
    zIndex: 11,
  },
  recordingSetupEyebrow: {
    color: GARAK_COLORS.brandAmber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  recordingSetupTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 21,
  },
  recordingPresetGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  recordingPresetButton: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: 'rgba(31,32,46,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 54,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  recordingPresetButtonActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
    borderColor: GARAK_COLORS.brandNavy,
  },
  recordingPresetName: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  recordingPresetNameActive: {
    color: GARAK_COLORS.surfaceCard,
  },
  recordingPresetMeta: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 15,
    marginTop: 3,
  },
  recordingPresetMetaActive: {
    color: 'rgba(255,255,255,0.76)',
  },
  recordingSetupMetaText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  recordingSetupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  recordingSetupActionButton: {
    flex: 1,
    minWidth: 0,
  },
  freePlayTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  surfaceBrand: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 13,
    fontWeight: '800',
  },
  inlineControls: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineControl: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 14,
    fontWeight: '800',
  },
  inlineControlAmber: {
    color: GARAK_COLORS.brandAmber,
    fontSize: 14,
    fontWeight: '800',
  },
  noteBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(229,145,0,0.18)',
    borderColor: GARAK_COLORS.brandAmber,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: -10,
    maxWidth: 230,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  extraInstrumentNoteBubble: {
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  noteBubbleText: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 11,
    lineHeight: 16,
  },
  instrumentDescription: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  freePlayActionArea: {
    gap: 10,
  },
  freePlayNotice: {
    color: GARAK_COLORS.brandRed,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  extraInstrumentButtonRow: {
    justifyContent: 'space-between',
  },
  extraInstrumentActionButton: {
    flex: 0,
    flexBasis: '47%',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  landscapeButtonRow: {
    minHeight: 48,
  },
  rowPrimary: {
    flex: 1,
  },
  trackStack: {
    gap: 12,
  },
  optionPanel: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: GARAK_COLORS.lineSoft,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  lockedOption: {
    opacity: 0.64,
  },
  panelTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  instrumentChipScroller: {
    marginRight: -24,
    marginTop: 41,
  },
  instrumentChipScrollerContent: {
    flexDirection: 'row',
    gap: 7,
    paddingRight: 24,
  },
  instrumentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  instrumentChip: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 16,
    minHeight: 27,
    minWidth: 48,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  instrumentChipFigma: {
    minWidth: 0,
    paddingHorizontal: 0,
  },
  instrumentChipActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  instrumentChipLocked: {
    backgroundColor: GARAK_COLORS.surfaceSoft,
  },
  instrumentChipLockedFigma: {
    backgroundColor: '#ACACAC',
  },
  instrumentChipText: {
    color: '#ACACAC',
    fontSize: 12,
    fontWeight: '800',
  },
  instrumentChipTextFigma: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0,
  },
  instrumentChipTextActive: {
    color: GARAK_COLORS.surfaceCard,
    fontWeight: '800',
  },
  instrumentChipLockedText: {
    color: '#ACACAC',
    fontSize: 12,
    fontWeight: '800',
  },
  lockGlyph: {
    alignItems: 'center',
    height: 13,
    justifyContent: 'flex-end',
    width: 11,
  },
  lockGlyphShackle: {
    borderColor: GARAK_COLORS.surfaceCard,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 1.5,
    height: 7,
    marginBottom: -2,
    width: 7,
  },
  lockGlyphBody: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 2,
    height: 7,
    width: 10,
  },
  presetStack: {
    gap: 10,
  },
  jangdanControlStack: {
    gap: 8,
  },
  jangdanStepperRow: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  jangdanStepperLabel: {
    color: GARAK_COLORS.textSecondary,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  jangdanStepperButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceSoft,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  jangdanStepperButtonText: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  jangdanStepperValue: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    minWidth: 64,
    textAlign: 'center',
  },
  presetRow: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingHorizontal: 16,
  },
  presetRowTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  recommendationMessage: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  metaText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  previewButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 82,
    paddingHorizontal: 10,
  },
  previewButtonActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  previewText: {
    color: GARAK_COLORS.brandAmber,
    fontSize: 12,
    fontWeight: '800',
  },
  previewTextActive: {
    color: GARAK_COLORS.surfaceCard,
  },
});
