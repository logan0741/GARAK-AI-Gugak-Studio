import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { InstrumentId } from '../studio/studioTypes';
import { GARAK_COLORS, GARAK_RADIUS } from './garakDesignSystem';
import { GarakScreenFrameMode } from './garakScreenFrame';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  DaegeumLandscapeStageArtwork,
  GayageumLandscapeStageArtwork,
  InstrumentSelectionArtworkPanel,
  JangguLandscapeStageArtwork,
  JangguPreviewStageArtwork,
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
const PERFORMANCE_PREVIEW_TOP_CALLOUT =
  '연주를 시작하고 녹음하고, 이를 직접 들어보고, 저장 할 수 있습니다.';
const PERFORMANCE_PREVIEW_BOTTOM_CALLOUT =
  '연주할 때는 양손으로 궁편과 열편을 손에 쥐고 연주.';

export function HomeScreenContent({
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return (
    <View style={styles.screenStack}>
      <VisualHero
        title="GARAK과 함께 국악 연주하기"
        description="전통 악기를 연주하고, AI와 함께 자신만의 가락을 완성할 수 있습니다."
        cta="PLAY"
        onPress={() => dispatch({ type: 'next' })}
      />

      <QuickAccessNav
        active="home"
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
      />
      {selectedInstrument === DEFAULT_FREE_CREATION_INSTRUMENT ? (
        <View
          accessible
          accessibilityLabel={`${JANGGU_FIGMA_BADGE}. ${JANGGU_FIGMA_DESCRIPTION}`}
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
        <View style={styles.instrumentPreviewCard}>
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
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const { height } = useWindowDimensions();
  const isCompactHeight = height < 820;

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
        accessibilityLabel={`${PERFORMANCE_PREVIEW_TOP_CALLOUT} ${PERFORMANCE_PREVIEW_BOTTOM_CALLOUT}`}
        style={[
          styles.performancePreviewPanel,
          isCompactHeight ? styles.performancePreviewPanelCompact : undefined,
        ]}
      >
        <View style={styles.performancePreviewTopCallout}>
          <Text style={styles.performancePreviewCalloutText}>{PERFORMANCE_PREVIEW_TOP_CALLOUT}</Text>
        </View>
        <View style={styles.performancePreviewTopLine} />
        <View style={styles.performancePreviewTopDrop} />
        <JangguPreviewStageArtwork
          style={[
            styles.performancePreviewStage,
            isCompactHeight ? styles.performancePreviewStageCompact : undefined,
          ]}
        />
        <View style={styles.performancePreviewBottomLead} />
        <View style={styles.performancePreviewBottomDrop} />
        <View style={styles.performancePreviewBottomCallout}>
          <Text style={styles.performancePreviewCalloutText}>{PERFORMANCE_PREVIEW_BOTTOM_CALLOUT}</Text>
        </View>
      </View>
      <View
        style={[
          styles.performancePreviewFooter,
          isCompactHeight ? styles.performancePreviewFooterCompact : undefined,
        ]}
      >
        <ProgressSteps step={2} />
        <PrimaryPillButton label="NEXT" onPress={() => dispatch({ type: 'startWithDefaults' })} />
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
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'back' })}
            style={styles.jangguLandscapeBackHit}
          />
        </View>
      ) : usesFigmaGayageumLandscapeStage ? (
        <View style={styles.jangguLandscapeStageWrap}>
          <GayageumLandscapeStageArtwork />
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'back' })}
            style={styles.jangguLandscapeBackHit}
          />
        </View>
      ) : usesFigmaJangguLandscapeStage ? (
        <View style={styles.jangguLandscapeStageWrap}>
          <JangguLandscapeStageArtwork />
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'back' })}
            style={styles.jangguLandscapeBackHit}
          />
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
        <View style={[styles.buttonRow, isLandscapeFrame ? styles.landscapeButtonRow : undefined]}>
          <SecondaryPillButton label="장단" onPress={() => dispatch({ type: 'openLiveJangdanGuide' })} />
          <SecondaryPillButton label="레이어" onPress={() => dispatch({ type: 'navigate', target: 'S07' })} />
          <PrimaryPillButton label="녹음 완료" onPress={() => dispatch({ type: 'completePerformance' })} style={styles.rowPrimary} />
        </View>
      ) : null}
    </View>
  );
}

export function TrackLayerEditorContent({
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return (
    <View style={styles.freeCreationMixScreen}>
      <View style={styles.freeCreationPlayerDeck} accessible accessibilityLabel="My Janggu 재생 미리보기">
        <View style={styles.freeCreationPlayerShadowBack} />
        <View style={styles.freeCreationPlayerShadowFront} />
        <View style={styles.freeCreationPlayerCard}>
          <View style={styles.freeCreationNewBadge}>
            <Text style={styles.freeCreationNewBadgeText}>NEW!</Text>
          </View>
          <Text numberOfLines={1} style={styles.freeCreationPlayerTitle}>
            My Janggu
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="트랙과 AI 반주 믹스"
          onPress={() => dispatch({ type: 'addTrack' })}
          style={styles.freeCreationMixButton}
        >
          <Text style={styles.freeCreationMixButtonText}>Mix</Text>
        </Pressable>

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
  const firstInstrumentTrack = work?.tracks.find((track) => track.kind === 'instrument');
  const primaryInstrument =
    firstInstrumentTrack?.kind === 'instrument'
      ? firstInstrumentTrack.instrument
      : state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const currentTrackLabel = `TRACK 1 : ${getInstrumentName(primaryInstrument)}`;

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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="AI 반주 생성하기"
          onPress={() => dispatch({ type: 'chooseAccompanimentTrack' })}
          style={[styles.freeCreationLayerOptionWrap, styles.freeCreationAccompanimentLayer]}
        >
          <View style={[styles.freeCreationLayerOptionRotated, styles.freeCreationLayerOptionNavy]}>
            <Text style={[styles.freeCreationLayerOptionText, styles.freeCreationLayerOptionTextNavy]}>
              AI 반주 생성하기
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="트랙 추가하기"
          onPress={() => dispatch({ type: 'chooseInstrumentTrack', instrument: primaryInstrument })}
          style={[styles.freeCreationLayerOptionWrap, styles.freeCreationInstrumentLayer]}
        >
          <View style={[styles.freeCreationLayerOptionRotated, styles.freeCreationLayerOptionRed]}>
            <Text style={[styles.freeCreationLayerOptionText, styles.freeCreationLayerOptionTextRed]}>
              트랙 추가하기
            </Text>
          </View>
        </Pressable>

        <View style={styles.freeCreationCurrentTrackButton}>
          <Text style={styles.freeCreationCurrentTrackButtonText}>{currentTrackLabel}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 단계로 이동"
          onPress={() => dispatch({ type: 'exportCurrentWork' })}
          style={styles.freeCreationTrackAddGoButton}
        >
          <Text style={styles.freeCreationTrackAddGoButtonText}>GO</Text>
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

  return (
    <View style={[styles.screenStack, isLandscapeFrame ? styles.landscapePerformanceStack : undefined]}>
      {!isLandscapeFrame ? <ScreenHeading title={`${getInstrumentName(instrument)} 트랙 녹음`} compact /> : null}
      <View style={[styles.freePlaySurface, isLandscapeFrame ? styles.landscapeFreePlaySurface : undefined]}>
        <InstrumentVisual instrument={instrument} compact={isLandscapeFrame} />
      </View>
      <PrimaryPillButton label="TRACK 적용" onPress={() => dispatch({ type: 'applyInstrumentTrack' })} />
    </View>
  );
}

export function LiveJangdanContent({ dispatch }: { dispatch: ProductDispatch }) {
  return <JangdanPresetPanel mode="live" dispatch={dispatch} />;
}

export function AccompanimentTrackContent({ dispatch }: { dispatch: ProductDispatch }) {
  return <JangdanPresetPanel mode="track" dispatch={dispatch} />;
}

function JangdanPresetPanel({ mode, dispatch }: { mode: 'live' | 'track'; dispatch: ProductDispatch }) {
  const defaultPreset = JANGDAN_PRESETS[0];

  return (
    <View style={styles.screenStack}>
      <ScreenHeading
        title={mode === 'live' ? '라이브 장단을\n선택해요.' : '장단 트랙을\n만들어요.'}
        description="AI 생성 오디오가 아니라 로컬 장단 프리셋을 미리듣고 수락하는 흐름입니다."
      />
      <MiniTrackPlayer title={mode === 'live' ? 'Live Jangdan Guide' : 'AI 추천: 세마치'} tone="amber" />
      <View style={styles.presetStack}>
        {JANGDAN_PRESETS.map((preset) => (
          <View key={preset.id} style={styles.presetRow}>
            <View>
              <Text style={styles.panelTitle}>{preset.name}</Text>
              <Text style={styles.metaText}>
                GARAK 기본 BPM {preset.defaultBpm} · {preset.minBpm}-{preset.maxBpm} · {preset.beatUnit}
              </Text>
            </View>
            <Text style={styles.previewText}>미리듣기</Text>
          </View>
        ))}
      </View>
      <PrimaryPillButton
        label={mode === 'live' ? '적용하고 연주로 돌아가기' : '반주 트랙 추가'}
        onPress={() =>
          mode === 'live'
            ? dispatch({
                type: 'applyLiveJangdanGuide',
                presetId: defaultPreset.id,
                bpm: defaultPreset.defaultBpm,
                volume: 0.6,
              })
            : dispatch({
                type: 'addAccompanimentTrack',
                presetId: defaultPreset.id,
                bpm: defaultPreset.defaultBpm,
                volume: 0.7,
              })
        }
      />
    </View>
  );
}

function InstrumentChipRow({
  selectedInstrument,
  onSelect,
  variant = 'wrap',
}: {
  selectedInstrument: InstrumentId;
  onSelect: (instrument: InstrumentId) => void;
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
            <View
              accessibilityLabel="준비 중인 악기"
              key={chip.id}
              style={[
                styles.instrumentChip,
                styles.instrumentChipFigma,
                styles.instrumentChipLockedFigma,
                { width: chip.width },
              ]}
            >
              <LockGlyph />
            </View>
          ))
        : Array.from({ length: LOCKED_FUTURE_INSTRUMENT_SLOTS }, (_, index) => (
            <View key={index} style={[styles.instrumentChip, styles.instrumentChipLocked]}>
              <Text style={styles.instrumentChipLockedText}>잠금</Text>
            </View>
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

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentButton, active ? styles.segmentButtonActive : undefined]}
    >
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : undefined]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenStack: {
    gap: 18,
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
  instrumentSelectArtworkWrap: {
    marginTop: 18,
  },
  instrumentSelectArtworkWrapCompact: {
    marginTop: 13,
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
  segmented: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 14,
    minHeight: 34,
    padding: 3,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  segmentText: {
    color: '#ACACAC',
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: GARAK_COLORS.surfaceCard,
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
  freeCreationPlayerDeck: {
    alignSelf: 'center',
    height: 161,
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
  freeCreationPlayerProgress: {
    backgroundColor: '#E4E4E4',
    borderRadius: 2,
    height: 3,
    marginTop: 17,
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
  freeCreationMixButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 38,
    height: 36,
    justifyContent: 'center',
    left: 27,
    position: 'absolute',
    right: 28,
    top: 163,
  },
  freeCreationMixButtonText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 32,
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
  freeCreationInstrumentLayer: {
    top: 341,
    zIndex: 2,
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
  freeCreationCurrentTrackButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 126,
    height: 59,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 458,
  },
  freeCreationCurrentTrackButtonText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
    lineHeight: 20,
  },
  freeCreationTrackAddGoButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: GARAK_RADIUS.pill,
    bottom: 77,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
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
  presetRow: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingHorizontal: 16,
  },
  metaText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  previewText: {
    color: GARAK_COLORS.brandAmber,
    fontSize: 12,
    fontWeight: '800',
  },
});
