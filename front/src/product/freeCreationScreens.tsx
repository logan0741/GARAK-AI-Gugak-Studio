import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS, GARAK_RADII, GARAK_SPACING, GARAK_TYPOGRAPHY } from './designTokens';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  JANGDAN_PRESETS,
  LOCKED_FUTURE_INSTRUMENT_SLOTS,
  MVP_INSTRUMENTS,
  getInstrumentName,
} from './productFixtures';

type ProductDispatch = (action: GarakProductAction) => void;

export function HomeScreenContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const isFreeCreation = state.selectedMode === 'freeCreation';

  return (
    <View style={styles.stack}>
      <Text style={styles.question}>연주 모드를 선택해요.</Text>
      <View style={styles.segmented}>
        <ModeButton
          active={isFreeCreation}
          label="자유창작 모드"
          onPress={() => dispatch({ type: 'selectMode', mode: 'freeCreation' })}
        />
        <ModeButton
          active={!isFreeCreation}
          label="따라하기 모드"
          onPress={() => dispatch({ type: 'selectMode', mode: 'practice' })}
        />
      </View>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>
          {isFreeCreation ? '내 가락을 직접 만들기' : '민요를 따라 연주하기'}
        </Text>
        <Text style={[styles.bodyText, styles.heroBodyText]}>
          {isFreeCreation
            ? '악기를 고르고 바로 연주를 시작해요. 녹음이 끝나면 작업으로 자동 저장됩니다.'
            : '아리랑, 도라지, 뱃노래 중 하나를 고르고 가이드에 맞춰 연습해요.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => dispatch({ type: 'next' })}
          style={[styles.primaryButton, styles.heroPrimaryButton]}
        >
          <Text style={[styles.primaryButtonText, styles.heroPrimaryButtonText]}>다음</Text>
        </Pressable>
      </View>
      <View style={styles.homeQuickAccess}>
        <Pressable onPress={() => dispatch({ type: 'navigate', target: 'S22' })}>
          <Text style={styles.quickAccessText}>마이</Text>
        </Pressable>
        <Text style={[styles.quickAccessText, styles.quickAccessActive]}>홈</Text>
        <Pressable onPress={() => dispatch({ type: 'navigate', target: 'S20' })}>
          <Text style={styles.quickAccessText}>쉐어</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'navigate', target: 'S03' })}
        style={styles.ghostButton}
      >
        <Text style={styles.ghostButtonText}>입문 가이드</Text>
      </Pressable>
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
  return (
    <View style={styles.stack}>
      <Text style={styles.question}>연주 할 악기를 선택해요.</Text>
      <View style={styles.instrumentRow}>
        {MVP_INSTRUMENTS.map((instrument) => (
          <Pressable
            accessibilityRole="button"
            key={instrument.id}
            onPress={() => dispatch({ type: 'selectInstrument', instrument: instrument.id })}
            style={[
              styles.instrumentCircle,
              state.selectedInstrument === instrument.id ? styles.instrumentCircleActive : undefined,
            ]}
          >
            <Text
              style={[
                styles.instrumentCircleText,
                state.selectedInstrument === instrument.id
                  ? styles.instrumentCircleTextActive
                  : undefined,
              ]}
            >
              {instrument.name}
            </Text>
          </Pressable>
        ))}
        {Array.from({ length: LOCKED_FUTURE_INSTRUMENT_SLOTS }, (_, index) => (
          <View key={index} style={[styles.instrumentCircle, styles.lockedCircle]}>
            <Text style={styles.lockedText}>lock</Text>
          </View>
        ))}
      </View>
      <View style={styles.infoPanel}>
        <Text style={styles.panelTitle}>
          {state.selectedInstrument
            ? `${getInstrumentName(state.selectedInstrument)} 설명`
            : '선택한 악기 설명'}
        </Text>
        <Text style={styles.bodyText}>
          {MVP_INSTRUMENTS.find((item) => item.id === state.selectedInstrument)?.description ??
            '가야금, 장구, 대금은 MVP에서 실제 연주 가능한 악기입니다.'}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={state.selectedInstrument === undefined}
        onPress={() => dispatch({ type: 'next' })}
        style={[
          styles.primaryButton,
          state.selectedInstrument === undefined ? styles.disabledButton : undefined,
        ]}
      >
        <Text style={styles.primaryButtonText}>다음</Text>
      </Pressable>
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
  const instrument = MVP_INSTRUMENTS.find((item) => item.id === state.selectedInstrument) ?? MVP_INSTRUMENTS[0];

  return (
    <View style={styles.stack}>
      <Text style={styles.question}>{instrument.name} 기본 설정</Text>
      <View style={styles.infoPanel}>
        {instrument.settings.map((setting) => (
          <View key={setting} style={styles.settingRow}>
            <Text style={styles.settingLabel}>{setting}</Text>
            <View style={styles.settingBar}>
              <View style={styles.settingBarFill} />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton label="직접 조정" onPress={() => dispatch({ type: 'navigate', target: 'S04' })} />
        <Pressable
          accessibilityRole="button"
          onPress={() => dispatch({ type: 'startWithDefaults' })}
          style={[styles.primaryButton, styles.rowButton]}
        >
          <Text style={styles.primaryButtonText}>기본값으로 시작</Text>
        </Pressable>
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
  const instrument = getInstrumentName(state.selectedInstrument ?? 'gayageum');

  return (
    <View style={styles.stack}>
      <View style={styles.playSurface}>
        <Text style={styles.playSurfaceTitle}>{instrument}</Text>
        <Text style={styles.playSurfaceText}>
          {instrument === '장구'
            ? '궁편과 채편 영역을 나눠 장단을 녹음합니다.'
            : instrument === '대금'
              ? '운지와 호흡 강도를 압축한 터치 영역으로 선율을 녹음합니다.'
              : '12현 가야금 현을 중심으로 선율을 녹음합니다.'}
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton label="장단" onPress={() => dispatch({ type: 'openLiveJangdanGuide' })} />
        <SecondaryButton label="레이어" onPress={() => dispatch({ type: 'navigate', target: 'S07' })} />
        <Pressable
          accessibilityRole="button"
          onPress={() => dispatch({ type: 'completePerformance' })}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>완료</Text>
        </Pressable>
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

  return (
    <View style={styles.stack}>
      <View style={styles.timeline}>
        <Text style={styles.panelTitle}>{work?.title ?? '새 작업'}</Text>
        <View style={styles.beatGrid}>
          {Array.from({ length: 8 }, (_, index) => (
            <View key={index} style={styles.beatCell}>
              <Text style={styles.beatText}>{index + 1}</Text>
            </View>
          ))}
        </View>
        {work?.tracks.map((track, index) => (
          <View key={track.id} style={styles.trackRow}>
            <Text style={styles.trackName}>
              {track.kind === 'instrument'
                ? getInstrumentName(track.instrument)
                : track.kind === 'accompaniment'
                  ? '장단 반주'
                  : track.title}
            </Text>
            <Text style={styles.trackMeta}>Track {index + 1}</Text>
          </View>
        ))}
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton label="트랙 추가" onPress={() => dispatch({ type: 'addTrack' })} />
        <SecondaryButton label="내보내기" onPress={() => dispatch({ type: 'exportCurrentWork' })} />
        <SecondaryButton label="보관함" onPress={() => dispatch({ type: 'navigate', target: 'S18' })} />
      </View>
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
    <View style={styles.stack}>
      <Text style={styles.question}>추가할 레이어를 선택해요.</Text>
      <View style={styles.optionCard}>
        <Text style={styles.panelTitle}>악기 연주 추가</Text>
        <Text style={styles.bodyText}>가야금, 장구, 대금 연주를 새 트랙으로 녹음합니다.</Text>
        <View style={styles.instrumentChoiceRow}>
          {MVP_INSTRUMENTS.map((instrument) => (
            <Pressable
              accessibilityRole="button"
              key={instrument.id}
              onPress={() =>
                dispatch({ type: 'chooseInstrumentTrack', instrument: instrument.id })
              }
              style={[
                styles.instrumentChoiceButton,
                state.selectedInstrument === instrument.id
                  ? styles.instrumentChoiceButtonActive
                  : undefined,
              ]}
            >
              <Text
                style={[
                  styles.instrumentChoiceText,
                  state.selectedInstrument === instrument.id
                    ? styles.instrumentChoiceTextActive
                    : undefined,
                ]}
              >
                {instrument.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'chooseAccompanimentTrack' })}
        style={styles.optionCard}
      >
        <Text style={styles.panelTitle}>장단/반주 추가</Text>
        <Text style={styles.bodyText}>장단 프리셋을 반주 트랙으로 생성합니다.</Text>
      </Pressable>
      <View style={[styles.optionCard, styles.disabledPanel]}>
        <Text style={styles.panelTitle}>가져오기</Text>
        <Text style={styles.bodyText}>이후 업데이트에서 지원할 예정입니다.</Text>
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
  return (
    <View style={styles.stack}>
      <View style={styles.playSurface}>
        <Text style={styles.playSurfaceTitle}>{getInstrumentName(state.selectedInstrument ?? 'gayageum')}</Text>
        <Text style={styles.playSurfaceText}>기존 작업을 들으며 새 테이크를 녹음합니다.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'applyInstrumentTrack' })}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>적용</Text>
      </Pressable>
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
    <View style={styles.stack}>
      {JANGDAN_PRESETS.map((preset) => (
        <View key={preset.id} style={styles.optionCard}>
          <Text style={styles.panelTitle}>{preset.name}</Text>
          <Text style={styles.bodyText}>
            GARAK 기본 BPM {preset.defaultBpm} · {preset.minBpm}-{preset.maxBpm} · {preset.beatUnit}
          </Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
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
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {mode === 'live' ? '적용하고 연주로 돌아가기' : '반주 트랙 추가'}
        </Text>
      </Pressable>
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
      onPress={onPress}
      style={[styles.segmentButton, active ? styles.segmentButtonActive : undefined]}
    >
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : undefined]}>{label}</Text>
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

const styles = StyleSheet.create({
  stack: {
    gap: GARAK_SPACING.lg,
  },
  question: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  segmented: {
    backgroundColor: GARAK_COLORS.neutral.soft,
    borderColor: GARAK_COLORS.neutral.border,
    borderRadius: GARAK_RADII.chip,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    padding: 2,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: GARAK_RADII.chip,
    flex: 1,
    justifyContent: 'center',
    minHeight: 30,
  },
  segmentButtonActive: {
    backgroundColor: GARAK_COLORS.brand.navy,
  },
  segmentText: {
    color: GARAK_COLORS.text.secondary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: GARAK_COLORS.text.inverse,
  },
  heroCard: {
    backgroundColor: GARAK_COLORS.brand.navy,
    borderRadius: GARAK_RADII.card,
    gap: 18,
    minHeight: 340,
    padding: 28,
  },
  heroTitle: {
    color: GARAK_COLORS.text.inverse,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 34,
    marginTop: 'auto',
  },
  heroBodyText: {
    color: GARAK_COLORS.neutral.canvas,
  },
  heroPrimaryButton: {
    backgroundColor: GARAK_COLORS.brand.amber,
  },
  heroPrimaryButtonText: {
    color: GARAK_COLORS.brand.navy,
  },
  bodyText: {
    color: GARAK_COLORS.text.secondary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: GARAK_COLORS.brand.navy,
    borderRadius: GARAK_RADII.button,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: GARAK_COLORS.text.inverse,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.soft,
    borderColor: GARAK_COLORS.neutral.border,
    borderRadius: GARAK_RADII.button,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  homeQuickAccess: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.brand.navy,
    borderRadius: GARAK_RADII.button,
    flexDirection: 'row',
    gap: 10,
    padding: 8,
  },
  quickAccessText: {
    borderRadius: GARAK_RADII.chip,
    color: GARAK_COLORS.text.inverse,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
  },
  quickAccessActive: {
    backgroundColor: GARAK_COLORS.brand.amber,
    color: GARAK_COLORS.brand.navy,
  },
  instrumentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  instrumentCircle: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.border,
    borderRadius: GARAK_RADII.circle,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  instrumentCircleActive: {
    backgroundColor: GARAK_COLORS.brand.red,
    borderColor: GARAK_COLORS.brand.red,
  },
  instrumentCircleText: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 11,
    fontWeight: '700',
  },
  instrumentCircleTextActive: {
    color: GARAK_COLORS.text.inverse,
  },
  lockedCircle: {
    backgroundColor: GARAK_COLORS.neutral.soft,
    borderColor: GARAK_COLORS.neutral.border,
  },
  lockedText: {
    color: GARAK_COLORS.text.disabled,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 10,
    fontWeight: '700',
  },
  infoPanel: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  panelTitle: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  settingRow: {
    gap: 8,
  },
  settingLabel: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  settingBar: {
    backgroundColor: GARAK_COLORS.neutral.muted,
    borderRadius: 4,
    height: 6,
  },
  settingBarFill: {
    backgroundColor: GARAK_COLORS.brand.amber,
    borderRadius: 4,
    height: 6,
    width: '68%',
  },
  playSurface: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 18,
    justifyContent: 'center',
    minHeight: 360,
    padding: 28,
  },
  playSurfaceTitle: {
    color: GARAK_COLORS.brand.red,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 32,
    fontWeight: '700',
  },
  playSurfaceText: {
    color: GARAK_COLORS.text.secondary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rowButton: {
    flex: 1,
  },
  timeline: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  beatGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  beatCell: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.muted,
    borderRadius: 4,
    flex: 1,
    minHeight: 30,
    justifyContent: 'center',
  },
  beatText: {
    color: GARAK_COLORS.text.secondary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 11,
    fontWeight: '700',
  },
  trackRow: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brand.navy,
    borderRadius: GARAK_RADII.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  trackName: {
    color: GARAK_COLORS.text.inverse,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
  trackMeta: {
    color: GARAK_COLORS.brand.amber,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 12,
  },
  optionCard: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  disabledPanel: {
    opacity: 0.6,
  },
  ghostButton: {
    alignItems: 'center',
    alignSelf: 'center',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  ghostButtonText: {
    color: GARAK_COLORS.brand.red,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  instrumentChoiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  instrumentChoiceButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.chip,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
  instrumentChoiceButtonActive: {
    backgroundColor: GARAK_COLORS.brand.red,
  },
  instrumentChoiceText: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  instrumentChoiceTextActive: {
    color: GARAK_COLORS.text.inverse,
  },
});
