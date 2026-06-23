import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS } from './garakDesignSystem';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  CategoryChips,
  FigmaImagePanel,
  GARAK_SCREEN_ASSETS,
  InstrumentVisual,
  MiniTrackPlayer,
  PrimaryPillButton,
  ScreenHeading,
  SecondaryPillButton,
  garakCardShadow,
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
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'navigate', target: 'S21' })}
        style={styles.shareHeroButton}
      >
        <FigmaImagePanel
          accessibilityLabel="추천 가락 히어로"
          source={GARAK_SCREEN_ASSETS.share.recommendationHero}
          style={styles.shareHeroImage}
          imageStyle={styles.shareHeroImageStyle}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'navigate', target: 'S17' })}
        style={styles.sectionHeaderRow}
      >
        <Text style={styles.sectionTitle}>나의 GARAK 공유하기</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'navigate', target: 'S17' })}
        style={styles.sharePlayerButton}
      >
        <FigmaImagePanel
          accessibilityLabel="내 GARAK 플레이어"
          source={GARAK_SCREEN_ASSETS.share.myGarakPlayer}
          style={styles.sharePlayerImage}
          imageStyle={styles.sharePlayerImageStyle}
        />
      </Pressable>
      <View style={styles.shareRecentWrap}>
        <FigmaImagePanel
          accessibilityLabel="최근 재생한 GARAK 목록"
          source={GARAK_SCREEN_ASSETS.share.recentPlaybackStrip}
          style={styles.shareRecentStrip}
        />
        <View style={styles.shareRecentHitRow}>
          {['Korea Minyo', 'K-Drama OST', 'My Arirang'].map((title) => (
            <Pressable
              accessibilityLabel={title}
              accessibilityRole="button"
              key={title}
              onPress={() => dispatch({ type: 'navigate', target: 'S21' })}
              style={styles.shareRecentHit}
            />
          ))}
        </View>
        <View style={styles.shareNavHitRow}>
          <Pressable
            accessibilityLabel="라이브러리"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'navigate', target: 'S18' })}
            style={styles.shareNavHit}
          />
          <Pressable
            accessibilityLabel="홈"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'navigate', target: 'S01' })}
            style={styles.shareNavHit}
          />
          <Pressable
            accessibilityLabel="쉐어"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'navigate', target: 'S20' })}
            style={styles.shareNavHit}
          />
        </View>
      </View>
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
  shareHeroButton: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  shareHeroImage: {
    height: 259,
  },
  shareHeroImageStyle: {
    borderRadius: 28,
  },
  sharePlayerButton: {
    borderRadius: 26,
    marginTop: -16,
    overflow: 'hidden',
  },
  sharePlayerImage: {
    height: 82,
  },
  sharePlayerImageStyle: {
    borderRadius: 26,
  },
  shareRecentWrap: {
    height: 174,
    marginRight: -47,
    overflow: 'hidden',
    position: 'relative',
    width: 369,
  },
  shareRecentStrip: {
    height: 174,
    width: 369,
  },
  shareRecentHitRow: {
    flexDirection: 'row',
    gap: 12,
    height: 96,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 369,
  },
  shareRecentHit: {
    width: 132,
  },
  shareNavHitRow: {
    flexDirection: 'row',
    height: 64,
    left: 83,
    position: 'absolute',
    top: 64,
    width: 179,
  },
  shareNavHit: {
    flex: 1,
  },
  recommendationCard: {
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 24,
    minHeight: 230,
    overflow: 'hidden',
    padding: 18,
    ...garakCardShadow,
  },
  recommendationArtwork: {
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    borderRadius: 20,
    height: 126,
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  recommendationTitle: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '800',
  },
  recommendationText: {
    color: GARAK_COLORS.surfaceSoft,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
    maxWidth: 210,
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
  recentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recentCard: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 18,
    flex: 1,
    minHeight: 134,
    overflow: 'hidden',
    padding: 10,
  },
  recentThumb: {
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 14,
    height: 72,
    marginBottom: 10,
  },
  recentTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 11,
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
