import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS } from './garakDesignSystem';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  ShareMyGarakPlayerArtwork,
  ShareRecentPlaybackArtwork,
  ShareRecommendationArtwork,
} from './garakArtworkPanels';
import {
  CategoryChips,
  InstrumentVisual,
  MiniTrackPlayer,
  PrimaryPillButton,
  ScreenHeading,
  SecondaryPillButton,
} from './garakUi';

type ProductDispatch = (action: GarakProductAction) => void;

export function SharePrepareContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const hasShareable =
    state.library.exportedAudios.length > 0 || state.library.practiceResults.length > 0;

  return (
    <View style={styles.stack}>
      <ScreenHeading title={'나의 GARAK\n공유하기'} />
      <View style={styles.prepareCard}>
        <MiniTrackPlayer title={hasShareable ? 'My Arirang' : '공유 대상 없음'} tone="navy" />
        <Text style={styles.bodyText}>
          {hasShareable
            ? '제목, 길이, 사용 악기를 확인한 뒤 공유할 수 있습니다.'
            : '작업을 내보내거나 따라하기 결과를 저장하면 공유할 수 있습니다.'}
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryPillButton
          disabled={!hasShareable}
          label="공유하기"
          onPress={() => dispatch({ type: 'navigate', target: 'S20' })}
        />
        <SecondaryPillButton
          disabled={!hasShareable}
          label="저장만 하기"
          onPress={() => dispatch({ type: 'navigate', target: 'S18' })}
        />
      </View>
    </View>
  );
}

export function ShareFeedContent({ dispatch }: { state: GarakProductState; dispatch: ProductDispatch }) {
  return (
    <View style={styles.stack}>
      <ScreenHeading title={'다양한 GARAK들을\n함께 공유해요'} />
      <CategoryChips labels={['Hot', 'K-pop', 'K-Drama OST', 'K-Minyo']} />
      <ShareRecommendationArtwork onPress={() => dispatch({ type: 'navigate', target: 'S21' })} />
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'navigate', target: 'S17' })}
        style={styles.sectionHeaderRow}
      >
        <Text style={styles.sectionTitle}>나의 GARAK 공유하기</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <ShareMyGarakPlayerArtwork onPress={() => dispatch({ type: 'navigate', target: 'S17' })} />
      <ShareRecentPlaybackArtwork
        onOpenRecent={() => dispatch({ type: 'navigate', target: 'S21' })}
        onLibrary={() => dispatch({ type: 'navigate', target: 'S18' })}
        onHome={() => dispatch({ type: 'navigate', target: 'S01' })}
        onShare={() => dispatch({ type: 'navigate', target: 'S20' })}
      />
    </View>
  );
}

export function SharedDetailContent({ dispatch }: { state: GarakProductState; dispatch: ProductDispatch }) {
  return (
    <View style={styles.stack}>
      <ScreenHeading title="공유 가락 듣기" compact />
      <View style={styles.detailHero}>
        <InstrumentVisual instrument="gayageum" />
      </View>
      <MiniTrackPlayer title="아침의 아리랑" tone="red" />
      <Text style={styles.bodyText}>공유 곡을 듣고 새 작업의 참조 트랙으로 리믹스할 수 있습니다.</Text>
      <View style={styles.buttonRow}>
        <PrimaryPillButton label="리믹스" tone="amber" onPress={() => dispatch({ type: 'navigate', target: 'S07' })} style={styles.rowPrimary} />
        <SecondaryPillButton label="저장" onPress={() => dispatch({ type: 'navigate', target: 'S18' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
  },
  prepareCard: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 24,
    gap: 18,
    padding: 18,
  },
  bodyText: {
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
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -14,
  },
  sectionTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  chevron: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 24,
    fontWeight: '800',
  },
  detailHero: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 28,
    minHeight: 300,
    overflow: 'hidden',
    padding: 16,
  },
});
