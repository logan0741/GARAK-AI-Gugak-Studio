import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InstrumentId } from '../studio/studioTypes';
import { GARAK_COLORS, GARAK_RADIUS } from './garakDesignSystem';
import { GarakProductAction, GarakProductState } from './garakProductState';
import { InstrumentSelectionArtworkPanel } from './garakArtworkPanels';
import {
  InstrumentBadge,
  InstrumentVisual,
  MiniTrackPlayer,
  PrimaryPillButton,
  ProgressSteps,
  QuickAccessNav,
  ScreenHeading,
  SecondaryPillButton,
  TrackPill,
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
        description="전통 악기를 연주하고, 장단 추천으로 자신만의 가락을 완성할 수 있습니다."
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
  const selectedInstrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;

  function confirmSelectionAndContinue() {
    if (state.selectedInstrument === undefined) {
      dispatch({ type: 'selectInstrument', instrument: selectedInstrument });
    }

    dispatch({ type: 'next' });
  }

  return (
    <View style={styles.screenStack}>
      <ScreenHeading title={'연주 할 악기를\n선택해요.'} />
      <InstrumentChipRow
        selectedInstrument={selectedInstrument}
        onSelect={(instrument) => dispatch({ type: 'selectInstrument', instrument })}
      />
      {selectedInstrument === DEFAULT_FREE_CREATION_INSTRUMENT ? (
        <InstrumentSelectionArtworkPanel />
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
      <ProgressSteps step={0} />
      <PrimaryPillButton
        label="Next"
        onPress={confirmSelectionAndContinue}
      />
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
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const instrumentDefinition = MVP_INSTRUMENTS.find((item) => item.id === instrument) ?? MVP_INSTRUMENTS[0];

  return (
    <View style={styles.screenStack}>
      <ScreenHeading title={'연주 할 화면을\n미리 볼 수 있어요.'} />
      <View style={styles.playPreviewCard}>
        <InstrumentVisual instrument={instrument} />
        <View style={styles.noteBubble}>
          <Text style={styles.noteBubbleText}>연주와 녹음은 이 화면에서 바로 시작해요.</Text>
        </View>
      </View>
      <Text style={styles.instrumentDescription}>
        {instrumentDefinition.settings.join(' · ')} 기본값으로 시작합니다. BPM과 장단은 녹음 직전에 정합니다.
      </Text>
      <ProgressSteps step={1} />
      <View style={styles.buttonRow}>
        <SecondaryPillButton label="직접 조정" onPress={() => dispatch({ type: 'navigate', target: 'S04' })} />
        <PrimaryPillButton
          label="Next"
          onPress={() => dispatch({ type: 'startWithDefaults' })}
          style={styles.rowPrimary}
        />
      </View>
    </View>
  );
}

export function FreePlayContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;

  return (
    <View style={styles.screenStack}>
      <View style={styles.freePlaySurface}>
        <View style={styles.freePlayTopBar}>
          <Text style={styles.surfaceBrand}>GARAK</Text>
          <View style={styles.inlineControls}>
            <Text style={styles.inlineControl}>▶</Text>
            <Text style={styles.inlineControlAmber}>●</Text>
          </View>
        </View>
        <InstrumentVisual instrument={instrument} />
      </View>
      <View style={styles.buttonRow}>
        <SecondaryPillButton label="장단" onPress={() => dispatch({ type: 'openLiveJangdanGuide' })} />
        <SecondaryPillButton label="레이어" onPress={() => dispatch({ type: 'navigate', target: 'S07' })} />
        <PrimaryPillButton label="녹음 완료" onPress={() => dispatch({ type: 'completePerformance' })} style={styles.rowPrimary} />
      </View>
    </View>
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
  const tracks = work?.tracks ?? [];

  return (
    <View style={styles.screenStack}>
      <ScreenHeading title={tracks.length > 2 ? '가락 미리듣기' : '나만의 가락 만들기'} compact />
      <MiniTrackPlayer title={work?.title ?? 'My Janggu'} tone="navy" />
      <Text style={styles.instrumentDescription}>
        {tracks.length > 0
          ? '연주 한 트랙들과 추가한 장단으로 나만의 가락을 완성해요.'
          : '연주를 마치면 첫 트랙이 자동 저장됩니다.'}
      </Text>
      <View style={styles.trackStack}>
        {tracks.map((track, index) => (
          <TrackPill
            key={track.id}
            label={`TRACK ${index + 1} : ${
              track.kind === 'instrument'
                ? getInstrumentName(track.instrument)
                : track.kind === 'accompaniment'
                  ? '장단'
                  : track.title
            }`}
            tone={index === 0 ? 'amber' : index === 1 ? 'red' : 'navy'}
            onPress={() => undefined}
          />
        ))}
        <TrackPill label="트랙 추가하기" tone="outline" onPress={() => dispatch({ type: 'addTrack' })} />
        <TrackPill label="장단 추천 추가하기" tone="light" onPress={() => dispatch({ type: 'chooseAccompanimentTrack' })} />
      </View>
      <View style={styles.buttonRow}>
        <SecondaryPillButton label="보관함" onPress={() => dispatch({ type: 'navigate', target: 'S18' })} />
        <SecondaryPillButton label="내보내기" tone="outline" onPress={() => dispatch({ type: 'exportCurrentWork' })} />
      </View>
      <PrimaryPillButton label="GO" onPress={() => dispatch({ type: 'exportCurrentWork' })} />
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
  return (
    <View style={styles.screenStack}>
      <ScreenHeading title={'추가할 트랙을\n선택해요.'} />
      <View style={styles.optionPanel}>
        <Text style={styles.panelTitle}>악기 연주 추가</Text>
        <Text style={styles.instrumentDescription}>다른 악기를 녹음해 새 트랙으로 쌓습니다.</Text>
        <InstrumentChipRow
          selectedInstrument={state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT}
          onSelect={(instrument) => dispatch({ type: 'chooseInstrumentTrack', instrument })}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'chooseAccompanimentTrack' })}
        style={styles.optionPanel}
      >
        <Text style={styles.panelTitle}>장단 추천 / 반주 추가</Text>
        <Text style={styles.instrumentDescription}>세마치, 중모리, 자진모리 프리셋을 미리듣고 트랙으로 추가합니다.</Text>
      </Pressable>
      <View style={[styles.optionPanel, styles.lockedOption]}>
        <Text style={styles.panelTitle}>가져오기</Text>
        <Text style={styles.instrumentDescription}>외부 파일 가져오기는 이후 업데이트에서 지원합니다.</Text>
      </View>
    </View>
  );
}

export function ExtraInstrumentRecordContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;

  return (
    <View style={styles.screenStack}>
      <ScreenHeading title={`${getInstrumentName(instrument)} 트랙 녹음`} compact />
      <View style={styles.freePlaySurface}>
        <InstrumentVisual instrument={instrument} />
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
}: {
  selectedInstrument: InstrumentId;
  onSelect: (instrument: InstrumentId) => void;
}) {
  return (
    <View style={styles.instrumentChips}>
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
            style={[styles.instrumentChip, selectedInstrument === instrument.id ? styles.instrumentChipActive : undefined]}
          >
            <Text style={[styles.instrumentChipText, selectedInstrument === instrument.id ? styles.instrumentChipTextActive : undefined]}>
              {instrument.name}
            </Text>
          </Pressable>
        );
      })}
      {Array.from({ length: LOCKED_FUTURE_INSTRUMENT_SLOTS }, (_, index) => (
        <View key={index} style={[styles.instrumentChip, styles.instrumentChipLocked]}>
          <Text style={styles.instrumentChipLockedText}>잠금</Text>
        </View>
      ))}
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
  freePlaySurface: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 26,
    minHeight: 390,
    overflow: 'hidden',
    padding: 14,
    ...garakCardShadow,
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
  instrumentChipActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  instrumentChipLocked: {
    backgroundColor: GARAK_COLORS.surfaceSoft,
  },
  instrumentChipText: {
    color: '#ACACAC',
    fontSize: 12,
    fontWeight: '800',
  },
  instrumentChipTextActive: {
    color: GARAK_COLORS.surfaceCard,
  },
  instrumentChipLockedText: {
    color: '#ACACAC',
    fontSize: 12,
    fontWeight: '800',
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
