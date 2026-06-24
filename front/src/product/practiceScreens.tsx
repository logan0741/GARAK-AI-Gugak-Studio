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
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return (
    <View style={styles.stack}>
      <ScreenHeading
        title={'따라할 민요를\n선택해요.'}
        description={
          state.previewingPracticeSongId === undefined
            ? '샘플을 들어보고 준비된 가이드로 연습을 시작합니다.'
            : `${PRACTICE_SONGS.find((song) => song.id === state.previewingPracticeSongId)?.title ?? '민요'} 샘플 재생 중`
        }
      />
      {PRACTICE_SONGS.map((song, index) => {
        const isPreviewing = state.previewingPracticeSongId === song.id;
        const isActive = isPreviewing || (state.previewingPracticeSongId === undefined && index === 0);
        const readinessLabel = song.sampleReady && song.guideReady ? '가이드 준비 완료' : '가이드 준비 중';

        return (
          <View key={song.id} style={[styles.songCard, isActive ? styles.songCardActive : undefined]}>
            <Pressable
              accessibilityRole="button"
              disabled={!song.guideReady}
              onPress={() => dispatch({ type: 'selectPracticeSong', songId: song.id })}
              style={styles.songSelectArea}
            >
              <View style={styles.songInfo}>
                <Text style={[styles.cardTitle, isActive ? styles.cardTitleLight : undefined]}>{song.title}</Text>
                <Text style={[styles.bodyText, isActive ? styles.bodyTextLight : undefined]}>
                  {song.difficulty} · {song.durationSeconds}초 · 추천 {getInstrumentName(song.recommendedInstrument)}
                </Text>
                <Text style={[styles.bodyText, isActive ? styles.bodyTextLight : undefined]}>
                  지원 악기 {song.supportedInstruments.map(getInstrumentName).join(', ')}
                </Text>
                <Text style={[styles.songReadyText, isActive ? styles.songReadyTextActive : undefined]}>
                  {readinessLabel}
                </Text>
              </View>
              <Text style={[styles.cardAction, isActive ? styles.cardActionLight : undefined]}>›</Text>
            </Pressable>
            <SecondaryPillButton
              label="미리듣기"
              disabled={!song.sampleReady}
              onPress={() => dispatch({ type: 'previewPracticeSong', songId: song.id })}
              style={styles.songPreviewButton}
            />
          </View>
        );
      })}
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
  const selectedPracticeInstrument = state.selectedInstrument ?? song.recommendedInstrument;

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
          style={[
            styles.instrumentCard,
            selectedPracticeInstrument === instrument.id ? styles.instrumentCardSelected : undefined,
          ]}
        >
          <View>
            <Text style={styles.cardTitle}>{instrument.name}</Text>
            <Text style={styles.bodyText}>따라하기 난이도 보통</Text>
          </View>
          <View style={styles.instrumentBadgeRow}>
            {song.recommendedInstrument === instrument.id ? (
              <Text style={styles.badge}>추천</Text>
            ) : null}
            {selectedPracticeInstrument === instrument.id ? (
              <Text style={styles.selectedBadge}>선택됨</Text>
            ) : null}
          </View>
        </Pressable>
      ))}
      <PrimaryPillButton label="NEXT" onPress={() => dispatch({ type: 'next' })} />
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
  const practiceAttempt = state.practiceAttempt;
  const practiceStatus = practiceAttempt?.status ?? 'ready';
  const practiceControlLabel =
    practiceStatus === 'playing' ? '일시정지' : practiceStatus === 'paused' ? '다시 시작' : '시작';
  const practiceStatusText =
    practiceStatus === 'playing'
      ? '연습 기록 중'
      : practiceStatus === 'paused'
        ? '일시정지'
        : practiceStatus === 'completed'
          ? '완주 완료'
          : '가이드 준비 완료';
  const practiceGuideText =
    practiceStatus === 'paused'
      ? '다시 시작하면 처음부터 기록합니다.'
      : `현재 위치 2/6 · 다음 입력 ${getInstrumentName(instrument)}`;
  const handlePrimaryPracticeAction = () => {
    if (practiceStatus === 'playing') {
      dispatch({ type: 'pausePractice' });
      return;
    }

    if (practiceStatus === 'paused') {
      dispatch({ type: 'restartPractice' });
      return;
    }

    dispatch({ type: 'startPractice' });
  };

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
      <View style={styles.practiceStatusPanel}>
        <Text style={styles.practiceStatusText}>{practiceStatusText}</Text>
        <Text style={styles.bodyText}>{practiceGuideText}</Text>
      </View>
      <View style={[styles.buttonRow, styles.practiceControlRow]}>
        <PrimaryPillButton
          label={practiceControlLabel}
          onPress={handlePrimaryPracticeAction}
          style={styles.practiceActionButton}
        />
        <SecondaryPillButton
          label="완주"
          onPress={() => dispatch({ type: 'finishPractice' })}
          style={styles.practiceActionButton}
        />
      </View>
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
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 22,
    gap: 12,
    minHeight: 132,
    padding: 16,
    ...garakCardShadow,
  },
  songCardActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  songSelectArea: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  songInfo: {
    flex: 1,
    gap: 3,
  },
  songPreviewButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 18,
  },
  songReadyText: {
    color: GARAK_COLORS.brandRed,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  songReadyTextActive: {
    color: GARAK_COLORS.brandAmber,
  },
  instrumentCard: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: 'transparent',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    padding: 18,
  },
  instrumentCardSelected: {
    borderColor: GARAK_COLORS.brandAmber,
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
  instrumentBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  selectedBadge: {
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 14,
    color: GARAK_COLORS.surfaceCard,
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
  practiceStatusPanel: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 18,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  practiceStatusText: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  practiceControlRow: {
    flexWrap: 'wrap',
  },
  practiceActionButton: {
    flexBasis: '47%',
    flexGrow: 1,
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
