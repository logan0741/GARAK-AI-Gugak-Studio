import { useEffect, useReducer } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  advanceGarakFlow,
  createInitialGarakFlowState,
  GarakFlowState,
  getDefaultInstrumentSettings,
  getInstrumentLabel,
  getInstrumentSlots,
  getPlaySurfaceDescriptor,
  InstrumentId,
  InstrumentSlot,
} from './s05-vertical-slice-flow';

const GAYAGEUM_STRINGS = Array.from({ length: 12 }, (_, index) => index + 1);
const MODE_COPY = {
  'free-play': {
    title: 'GARAK과 함께 국악 연주하기',
    body: '악기를 고르고 바로 연주를 시작합니다.',
  },
  practice: {
    title: '따라하기 모드',
    body: '민요를 고르고 가이드에 맞춰 연주합니다.',
  },
} as const;

export function GarakS05VerticalSliceScreen() {
  const [state, dispatch] = useReducer(advanceGarakFlow, undefined, createInitialGarakFlowState);

  useEffect(() => {
    if (state.recordingStatus !== 'processing') {
      return;
    }

    const timerId = setTimeout(() => {
      dispatch({ type: 'complete_processing' });
    }, 700);

    return () => clearTimeout(timerId);
  }, [state.recordingStatus]);

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      <View style={styles.appFrame}>
        <Header />
        {renderScreen(state, dispatch)}
      </View>
    </ScrollView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>GARAK</Text>
      <Text style={styles.subtitle}>AI GUGAK STUDIO</Text>
    </View>
  );
}

function renderScreen(
  state: GarakFlowState,
  dispatch: React.Dispatch<Parameters<typeof advanceGarakFlow>[1]>,
) {
  switch (state.screen) {
    case 'home':
      return <HomeScreen state={state} dispatch={dispatch} />;
    case 'instrument-selection':
      return <InstrumentSelectionScreen state={state} dispatch={dispatch} />;
    case 'instrument-settings':
      return <InstrumentSettingsScreen state={state} dispatch={dispatch} />;
    case 'free-play':
      return <FreePlayScreen state={state} dispatch={dispatch} />;
    case 'completion-placeholder':
      return <PlaceholderScreen title="연주 완료 확인" body="테이크가 준비됐어요." />;
    case 'layer-edit-placeholder':
      return <PlaceholderScreen title="레이어 편집" body="현재 테이크를 레이어로 열 준비가 됐어요." />;
    case 'practice-placeholder':
      return <PlaceholderScreen title="민요 선택" body="따라하기 흐름은 다음 화면 정의에서 이어집니다." />;
  }
}

function HomeScreen({
  state,
  dispatch,
}: {
  state: GarakFlowState;
  dispatch: React.Dispatch<Parameters<typeof advanceGarakFlow>[1]>;
}) {
  const copy = MODE_COPY[state.selectedMode];

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{state.homeQuestion}</Text>
      <View style={styles.modeToggle}>
        <SegmentButton
          label="자유창작 모드"
          selected={state.selectedMode === 'free-play'}
          onPress={() => dispatch({ type: 'select_mode', mode: 'free-play' })}
        />
        <SegmentButton
          label="따라하기 모드"
          selected={state.selectedMode === 'practice'}
          onPress={() => dispatch({ type: 'select_mode', mode: 'practice' })}
        />
      </View>
      <View style={styles.heroPanel}>
        <Text style={styles.heroTitle}>{copy.title}</Text>
        <Text style={styles.heroBody}>{copy.body}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 화면으로 이동"
          onPress={() => dispatch({ type: 'press_next' })}
          style={styles.roundNextButton}
        >
          <Text style={styles.nextArrow}>›</Text>
        </Pressable>
      </View>
      <View style={styles.homeQuickNav}>
        <Text style={styles.quickNavText}>마이</Text>
        <Text style={[styles.quickNavText, styles.quickNavSelected]}>홈</Text>
        <Text style={styles.quickNavText}>쉐어</Text>
      </View>
    </View>
  );
}

function InstrumentSelectionScreen({
  state,
  dispatch,
}: {
  state: GarakFlowState;
  dispatch: React.Dispatch<Parameters<typeof advanceGarakFlow>[1]>;
}) {
  const selectedSlot = getInstrumentSlots().find(
    (slot) => slot.status === 'available' && slot.instrumentId === state.selectedInstrumentId,
  );

  return (
    <View style={styles.section}>
      <Text style={styles.title}>연주 할 악기를 선택해요.</Text>
      <View style={styles.instrumentSlotRow}>
        {getInstrumentSlots().map((slot) => (
          <InstrumentSlotButton
            key={slot.status === 'available' ? slot.instrumentId : slot.slotId}
            slot={slot}
            selected={slot.status === 'available' && slot.instrumentId === state.selectedInstrumentId}
            onPress={() => {
              if (slot.status === 'available') {
                dispatch({ type: 'select_instrument', instrumentId: slot.instrumentId });
                return;
              }
              dispatch({ type: 'press_locked_instrument', slotId: slot.slotId });
            }}
          />
        ))}
      </View>
      <View style={styles.descriptionPanel}>
        <Text style={styles.panelTitle}>
          {selectedSlot?.status === 'available' ? selectedSlot.label : '악기'}
        </Text>
        <Text style={styles.panelBody}>
          {selectedSlot?.status === 'available'
            ? selectedSlot.description
            : '가야금, 장구, 대금 중 하나를 선택합니다.'}
        </Text>
        <Text style={styles.metaText}>
          샘플 상태: {selectedSlot?.status === 'available' ? '기본 샘플 사용 중' : '선택 대기'}
        </Text>
      </View>
      <Notice text={state.notice} onDismiss={() => dispatch({ type: 'dismiss_notice' })} />
      <PrimaryButton label="Next" onPress={() => dispatch({ type: 'press_next' })} />
    </View>
  );
}

function InstrumentSettingsScreen({
  state,
  dispatch,
}: {
  state: GarakFlowState;
  dispatch: React.Dispatch<Parameters<typeof advanceGarakFlow>[1]>;
}) {
  const instrumentId = state.selectedInstrumentId;
  const settings = instrumentId === undefined ? undefined : getDefaultInstrumentSettings(instrumentId);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>
        {instrumentId === undefined ? '연주 기본 설정' : `${getInstrumentLabel(instrumentId)} 기본 설정`}
      </Text>
      <View style={styles.descriptionPanel}>
        {settings?.controls.map((control) => (
          <View key={control.key} style={styles.settingRow}>
            <Text style={styles.settingLabel}>{control.label}</Text>
            <Text style={styles.settingValue}>{control.defaultValue}</Text>
          </View>
        ))}
      </View>
      <Notice text={state.notice} onDismiss={() => dispatch({ type: 'dismiss_notice' })} />
      <PrimaryButton label="기본값으로 시작" onPress={() => dispatch({ type: 'start_with_defaults' })} />
      <SecondaryButton label="Next" onPress={() => dispatch({ type: 'start_with_defaults' })} />
    </View>
  );
}

function FreePlayScreen({
  state,
  dispatch,
}: {
  state: GarakFlowState;
  dispatch: React.Dispatch<Parameters<typeof advanceGarakFlow>[1]>;
}) {
  const instrumentId = state.selectedInstrumentId ?? '12_string_gayageum';

  return (
    <View style={styles.section}>
      <View style={styles.playHeader}>
        <View>
          <Text style={styles.kicker}>악기 자유연주</Text>
          <Text style={styles.title}>{getInstrumentLabel(instrumentId)}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{formatRecordingStatus(state)}</Text>
        </View>
      </View>
      <PlaySurface
        instrumentId={instrumentId}
        onInput={(label) => dispatch({ type: 'play_surface_input', label })}
      />
      <View style={styles.playMetaRow}>
        <Text style={styles.metaText}>테이크: {formatTake(state)}</Text>
        <Text style={styles.metaText}>입력: {state.latestInputLabel ?? '없음'}</Text>
      </View>
      <Notice text={state.notice} onDismiss={() => dispatch({ type: 'dismiss_notice' })} />
      <View style={styles.actionGrid}>
        <PrimaryButton
          label={state.recordingStatus === 'recording' ? '녹음 중지' : '녹음'}
          onPress={() => dispatch({ type: 'press_record', nowMs: Date.now() })}
        />
        <SecondaryButton label="장단" onPress={() => dispatch({ type: 'open_jangdan_panel' })} />
        <SecondaryButton label="레이어" onPress={() => dispatch({ type: 'open_layer_edit' })} />
        <PrimaryButton label="완료" onPress={() => dispatch({ type: 'press_done', nowMs: Date.now() })} />
      </View>
      {state.jangdanPanelOpen ? (
        <JangdanPanel onClose={() => dispatch({ type: 'close_jangdan_panel' })} />
      ) : null}
      {state.recordingStatus === 'processing' ? (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingTitle}>{state.processingOverlay}</Text>
          <Text style={styles.processingText}>파형과 저장 데이터를 준비하고 있어요.</Text>
        </View>
      ) : null}
    </View>
  );
}

function PlaySurface({
  instrumentId,
  onInput,
}: {
  instrumentId: InstrumentId;
  onInput: (label: string) => void;
}) {
  const descriptor = getPlaySurfaceDescriptor(instrumentId);

  if (descriptor.type === 'strings') {
    return (
      <View style={styles.playSurface}>
        {GAYAGEUM_STRINGS.map((stringIndex) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`가야금 ${stringIndex}현`}
            key={stringIndex}
            onPress={() => onInput(`${stringIndex}현`)}
            style={styles.stringRow}
          >
            <Text style={styles.stringLabel}>{stringIndex}</Text>
            <View style={styles.stringLine} />
          </Pressable>
        ))}
      </View>
    );
  }

  if (descriptor.type === 'percussion-surfaces') {
    return (
      <View style={[styles.playSurface, styles.jangguSurface]}>
        {descriptor.surfaces.map((surface) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`장구 ${surface}`}
            key={surface}
            onPress={() => onInput(surface)}
            style={styles.drumHead}
          >
            <Text style={styles.drumText}>{surface}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.playSurface}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="대금 호흡 입력"
        onPress={() => onInput('호흡')}
        style={styles.breathBar}
      >
        <View style={styles.breathFill} />
      </Pressable>
      <View style={styles.fingerHoleRow}>
        {[1, 2, 3, 4, 5, 6].map((hole) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`대금 운지 ${hole}`}
            key={hole}
            onPress={() => onInput(`${hole}공`)}
            style={styles.fingerHole}
          />
        ))}
      </View>
      <Text style={styles.surfaceHint}>호흡 / 운지 / 음정</Text>
    </View>
  );
}

function JangdanPanel({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.bottomPanel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>장단</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="장단 패널 닫기" onPress={onClose}>
          <Text style={styles.closeText}>닫기</Text>
        </Pressable>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>기본 장단</Text>
        <Text style={styles.settingValue}>준비 중</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>BPM</Text>
        <Text style={styles.settingValue}>--</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>볼륨</Text>
        <Text style={styles.settingValue}>--</Text>
      </View>
    </View>
  );
}

function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.descriptionPanel}>
        <Text style={styles.panelBody}>{body}</Text>
      </View>
    </View>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.segmentButton, selected ? styles.segmentButtonSelected : undefined]}
    >
      <Text style={[styles.segmentText, selected ? styles.segmentTextSelected : undefined]}>{label}</Text>
    </Pressable>
  );
}

function InstrumentSlotButton({
  slot,
  selected,
  onPress,
}: {
  slot: InstrumentSlot;
  selected: boolean;
  onPress: () => void;
}) {
  const label = slot.status === 'available' ? slot.label : '🔒';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={slot.status === 'available' ? slot.label : '잠금 악기'}
      accessibilityState={{ selected, disabled: slot.status === 'locked' }}
      onPress={onPress}
      style={[
        styles.instrumentSlot,
        slot.status === 'locked' ? styles.instrumentSlotLocked : undefined,
        selected ? styles.instrumentSlotSelected : undefined,
      ]}
    >
      <Text style={[styles.instrumentSlotText, selected ? styles.instrumentSlotTextSelected : undefined]}>
        {label}
      </Text>
      {selected ? <Text style={styles.selectedMark}>✓</Text> : null}
    </Pressable>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function Notice({ text, onDismiss }: { text?: string; onDismiss: () => void }) {
  if (text === undefined) {
    return null;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.notice}>
      <Text selectable style={styles.noticeText}>{text}</Text>
    </Pressable>
  );
}

function formatRecordingStatus(state: GarakFlowState): string {
  switch (state.recordingStatus) {
    case 'idle':
      return '연주 대기';
    case 'recording':
      return '녹음 중';
    case 'processing':
      return '처리 중';
    case 'take-ready':
      return '테이크 준비됨';
  }
}

function formatTake(state: GarakFlowState): string {
  if (state.currentTake === undefined) {
    return '없음';
  }

  return `${state.currentTake.durationMs}ms / ${state.currentTake.eventCount}입력`;
}

const colors = {
  bg: '#F1F0EC',
  panel: '#D9D8D3',
  panelStrong: '#C4C2BC',
  ink: '#1F1D1A',
  muted: '#77736C',
  accent: '#9B4F3E',
  accentDark: '#623529',
  gold: '#B89445',
  green: '#4F7668',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  screenContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  appFrame: {
    alignSelf: 'center',
    backgroundColor: colors.bg,
    borderColor: '#E4E1DA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 22,
    maxWidth: 430,
    minHeight: 720,
    overflow: 'hidden',
    padding: 24,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: 2,
  },
  brand: {
    color: colors.muted,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    flex: 1,
    gap: 14,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  modeToggle: {
    backgroundColor: '#E8E6E0',
    borderColor: '#CCC9C0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  segmentButtonSelected: {
    backgroundColor: colors.panelStrong,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextSelected: {
    color: colors.ink,
  },
  heroPanel: {
    backgroundColor: colors.panel,
    borderRadius: 28,
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 370,
    padding: 22,
  },
  heroTitle: {
    color: colors.muted,
    fontSize: 27,
    fontWeight: '500',
    lineHeight: 34,
    maxWidth: 260,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    maxWidth: 260,
  },
  roundNextButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    marginTop: 18,
    width: 118,
  },
  nextArrow: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 32,
  },
  homeQuickNav: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.panelStrong,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    padding: 6,
  },
  quickNavText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 54,
    paddingVertical: 14,
    textAlign: 'center',
  },
  quickNavSelected: {
    backgroundColor: colors.white,
    borderRadius: 999,
  },
  instrumentSlotRow: {
    flexDirection: 'row',
    gap: 10,
  },
  instrumentSlot: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 2,
    height: 50,
    justifyContent: 'center',
    position: 'relative',
    width: 50,
  },
  instrumentSlotSelected: {
    borderColor: colors.accent,
  },
  instrumentSlotLocked: {
    backgroundColor: '#5E5A55',
  },
  instrumentSlotText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  instrumentSlotTextSelected: {
    color: colors.accentDark,
  },
  selectedMark: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
    height: 18,
    lineHeight: 18,
    position: 'absolute',
    right: -3,
    textAlign: 'center',
    top: -3,
    width: 18,
  },
  descriptionPanel: {
    backgroundColor: colors.white,
    borderColor: '#D6D2C7',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  panelBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: '#ECE8DF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  settingLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  settingValue: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '800',
  },
  playHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPill: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '800',
  },
  playSurface: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    gap: 10,
    justifyContent: 'center',
    minHeight: 340,
    padding: 18,
  },
  stringRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 20,
  },
  stringLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    width: 20,
  },
  stringLine: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    flex: 1,
    height: 4,
  },
  jangguSurface: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 20,
  },
  drumHead: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gold,
    borderRadius: 999,
    borderWidth: 5,
    flex: 1,
    height: 132,
    justifyContent: 'center',
  },
  drumText: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  breathBar: {
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  breathFill: {
    backgroundColor: colors.green,
    borderRadius: 999,
    height: 26,
    width: '58%',
  },
  fingerHoleRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  fingerHole: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    height: 28,
    width: 28,
  },
  surfaceHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  playMetaRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 8,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#D1CDC4',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 110,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  notice: {
    backgroundColor: '#F6E6DE',
    borderColor: '#E1B9AA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: '800',
  },
  bottomPanel: {
    backgroundColor: colors.white,
    borderColor: '#D6D2C7',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  closeText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(31, 29, 26, 0.72)',
    justifyContent: 'center',
    padding: 28,
  },
  processingTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
  processingText: {
    color: '#EFE9DE',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
