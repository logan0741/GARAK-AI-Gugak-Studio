import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS } from './garakDesignSystem';
import { GarakScreenFrameMode } from './garakScreenFrame';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  InstrumentVisual,
  PrimaryPillButton,
  ScreenHeading,
  SecondaryPillButton,
  garakCardShadow,
} from './garakUi';
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
      <ScreenHeading title={'따라할 민요를\n선택해요.'} />
      {PRACTICE_SONGS.map((song, index) => (
        <Pressable
          accessibilityRole="button"
          key={song.id}
          onPress={() => dispatch({ type: 'selectPracticeSong', songId: song.id })}
          style={[styles.songCard, index === 0 ? styles.songCardActive : undefined]}
        >
          <View>
            <Text style={[styles.cardTitle, index === 0 ? styles.cardTitleLight : undefined]}>{song.title}</Text>
            <Text style={[styles.bodyText, index === 0 ? styles.bodyTextLight : undefined]}>
              {song.difficulty} · {song.durationSeconds}초 · 추천 {getInstrumentName(song.recommendedInstrument)}
            </Text>
          </View>
          <Text style={[styles.cardAction, index === 0 ? styles.cardActionLight : undefined]}>›</Text>
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
      <ScreenHeading title={'따라할 악기를\n선택해요.'} description={`${song.title}에 맞춰 연주할 악기를 고릅니다.`} />
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
  frameMode = 'portrait',
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
  frameMode?: GarakScreenFrameMode;
}) {
  const song = PRACTICE_SONGS.find((item) => item.id === state.selectedPracticeSongId) ?? PRACTICE_SONGS[0];
  const instrument = state.selectedInstrument ?? song.recommendedInstrument;
  const isLandscapeFrame = frameMode === 'landscape';

  return (
    <View style={[styles.stack, isLandscapeFrame ? styles.landscapePerformanceStack : undefined]}>
      {!isLandscapeFrame ? (
        <ScreenHeading title={song.title} compact description="다음 입력 가이드에 맞춰 연주합니다." />
      ) : null}
      <View style={[styles.practiceSurface, isLandscapeFrame ? styles.landscapePracticeSurface : undefined]}>
        <InstrumentVisual instrument={instrument} compact={isLandscapeFrame} />
        <View style={styles.guideRow}>
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={[styles.guideCell, index === 2 ? styles.guideCellActive : undefined]} />
          ))}
        </View>
      </View>
      <PrimaryPillButton label="완주" onPress={() => dispatch({ type: 'finishPractice' })} />
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
      <ScreenHeading title="결과 / AI 피드백" compact />
      <View style={styles.resultPanel}>
        <Text style={styles.scoreText}>82</Text>
        <Text style={styles.cardTitle}>박자 흐름이 안정적이에요.</Text>
        <Text style={styles.bodyText}>
          일부 구간은 조금 빠르게 들어갔지만 전체적인 선율 진행은 잘 유지되었습니다.
        </Text>
      </View>
      <View style={[styles.buttonRow, styles.resultButtonGrid]}>
        <SecondaryPillButton
          label="다시 연주"
          onPress={() => dispatch({ type: 'navigate', target: 'S15' })}
          style={styles.resultActionButton}
        />
        <SecondaryPillButton
          label="저장"
          onPress={() => dispatch({ type: 'savePracticeResult' })}
          style={styles.resultActionButton}
        />
        <SecondaryPillButton
          label="공유"
          onPress={() => dispatch({ type: 'sharePracticeResult' })}
          style={styles.resultActionButton}
        />
        <SecondaryPillButton
          label="다른 민요 선택"
          onPress={() => dispatch({ type: 'navigate', target: 'S13' })}
          style={styles.resultActionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  landscapePerformanceStack: {
    flex: 1,
    gap: 12,
  },
  songCard: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 82,
    padding: 18,
    ...garakCardShadow,
  },
  songCardActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  instrumentCard: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    padding: 18,
  },
  cardTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  cardTitleLight: {
    color: GARAK_COLORS.surfaceCard,
  },
  bodyText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  bodyTextLight: {
    color: GARAK_COLORS.surfaceSoft,
  },
  cardAction: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 24,
    fontWeight: '800',
  },
  cardActionLight: {
    color: GARAK_COLORS.surfaceCard,
  },
  badge: {
    backgroundColor: 'rgba(229,145,0,0.2)',
    borderColor: GARAK_COLORS.brandAmber,
    borderRadius: 14,
    borderWidth: 1,
    color: GARAK_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  practiceSurface: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 28,
    gap: 16,
    minHeight: 390,
    padding: 16,
    ...garakCardShadow,
  },
  landscapePracticeSurface: {
    flex: 1,
    gap: 12,
    minHeight: 0,
    padding: 12,
  },
  guideRow: {
    flexDirection: 'row',
    gap: 8,
  },
  guideCell: {
    backgroundColor: GARAK_COLORS.surfaceSoft,
    borderRadius: 5,
    flex: 1,
    height: 46,
  },
  guideCellActive: {
    backgroundColor: GARAK_COLORS.brandAmber,
  },
  resultPanel: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 28,
    gap: 12,
    padding: 24,
    ...garakCardShadow,
  },
  scoreText: {
    color: GARAK_COLORS.brandRed,
    fontSize: 68,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resultButtonGrid: {
    flexWrap: 'wrap',
  },
  resultActionButton: {
    flexBasis: '48%',
    flexGrow: 1,
  },
});
