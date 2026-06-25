import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS, GARAK_RADII, GARAK_SPACING, GARAK_TYPOGRAPHY } from './designTokens';
import { GarakProductAction, GarakProductState } from './garakProductState';
import { MVP_INSTRUMENTS, PRACTICE_SONGS, getInstrumentName } from './productFixtures';

type ProductDispatch = (action: GarakProductAction) => void;

export function PracticeSongSelectContent({
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return (
    <View style={styles.stack}>
      {PRACTICE_SONGS.map((song) => (
        <Pressable
          accessibilityRole="button"
          key={song.id}
          onPress={() => dispatch({ type: 'selectPracticeSong', songId: song.id })}
          style={styles.songCard}
        >
          <Text style={styles.cardTitle}>{song.title}</Text>
          <Text style={styles.bodyText}>
            {song.difficulty} · {song.durationSeconds}초 · 추천 {getInstrumentName(song.recommendedInstrument)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PracticeInstrumentSelectContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const song = PRACTICE_SONGS.find((item) => item.id === state.selectedPracticeSongId) ?? PRACTICE_SONGS[0];

  return (
    <View style={styles.stack}>
      {MVP_INSTRUMENTS.map((instrument) => (
        <Pressable
          accessibilityRole="button"
          key={instrument.id}
          onPress={() =>
            dispatch({ type: 'selectPracticeInstrument', instrument: instrument.id })
          }
          style={styles.instrumentCard}
        >
          <View>
            <Text style={styles.cardTitle}>{instrument.name}</Text>
            <Text style={styles.bodyText}>따라하기 난이도 보통</Text>
          </View>
          {song.recommendedInstrument === instrument.id ? (
            <Text style={styles.badge}>추천</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

export function PracticePerformanceContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const song = PRACTICE_SONGS.find((item) => item.id === state.selectedPracticeSongId) ?? PRACTICE_SONGS[0];

  return (
    <View style={styles.stack}>
      <View style={styles.practiceSurface}>
        <Text style={styles.surfaceTitle}>{song.title}</Text>
        <Text style={styles.bodyText}>
          다음 구간이 밝게 표시되고, 타이밍 정확도가 실시간으로 표시됩니다.
        </Text>
        <View style={styles.guideRow}>
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={[styles.guideCell, index === 2 ? styles.guideCellActive : undefined]} />
          ))}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'finishPractice' })}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>완주</Text>
      </Pressable>
    </View>
  );
}

export function PracticeResultContent({
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.resultPanel}>
        <Text style={styles.scoreText}>82</Text>
        <Text style={styles.cardTitle}>박자 흐름이 안정적이에요.</Text>
        <Text style={styles.bodyText}>
          일부 구간은 조금 빠르게 들어갔지만 전체적인 선율 진행은 잘 유지되었습니다.
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton label="다시 연주" onPress={() => dispatch({ type: 'navigate', target: 'S15' })} />
        <SecondaryButton label="저장" onPress={() => dispatch({ type: 'savePracticeResult' })} />
        <SecondaryButton label="공유" onPress={() => dispatch({ type: 'sharePracticeResult' })} />
      </View>
    </View>
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
    gap: GARAK_SPACING.md,
  },
  songCard: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  instrumentCard: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    padding: 16,
  },
  cardTitle: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  bodyText: {
    color: GARAK_COLORS.text.secondary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  badge: {
    backgroundColor: GARAK_COLORS.brand.amber,
    borderRadius: GARAK_RADII.chip,
    color: GARAK_COLORS.brand.navy,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  practiceSurface: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 18,
    minHeight: 360,
    padding: 28,
  },
  surfaceTitle: {
    color: GARAK_COLORS.brand.red,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 30,
    fontWeight: '700',
  },
  guideRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  guideCell: {
    backgroundColor: GARAK_COLORS.neutral.muted,
    borderRadius: 5,
    flex: 1,
    height: 54,
  },
  guideCellActive: {
    backgroundColor: GARAK_COLORS.brand.amber,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brand.navy,
    borderRadius: GARAK_RADII.button,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    color: GARAK_COLORS.text.inverse,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontWeight: '700',
  },
  resultPanel: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  scoreText: {
    color: GARAK_COLORS.brand.red,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 64,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
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
  },
  secondaryButtonText: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
});
