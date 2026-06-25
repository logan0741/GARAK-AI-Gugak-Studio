import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GARAK_COLORS, GARAK_LAYOUT } from './garakDesignSystem';
import { GARAK_SCREEN_ASSETS } from './garakScreenAssets';
import { GarakProductAction, GarakProductState, ProductPlayerSelection } from './garakProductState';
import {
  getSharedDetailViewModel,
  getShareFeedViewModel,
  getSharePrepareAction,
  getSharePrepareViewModel,
  ShareFeedPlayer,
  ShareFeedRecentCard,
} from './shareScreenModel';
import {
  InstrumentVisual,
  MiniTrackPlayer,
  PrimaryPillButton,
  ScreenHeading,
  SecondaryPillButton,
  garakCardShadow,
} from './garakUi';
import { GarakText as Text } from './garakTypography';

type ProductDispatch = (action: GarakProductAction) => void;

export function SharePrepareContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const model = getSharePrepareViewModel(state);
  const previewButtonLabel = model.isPreviewing ? '미리듣는 중' : '미리듣기';

  return (
    <View style={styles.stack}>
      <ScreenHeading title={'나의 GARAK\n공유하기'} />
      <View style={styles.prepareCard}>
        <MiniTrackPlayer title={model.title} tone="navy" />
        <View style={styles.prepareWaveformPreview}>
          {Array.from({ length: 18 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.prepareWaveformBar,
                index % 3 === 0 ? styles.prepareWaveformBarTall : undefined,
                model.isPreviewing && index < 7 ? styles.prepareWaveformBarActive : undefined,
              ]}
            />
          ))}
        </View>
        <View style={styles.prepareMetaGrid}>
          <PrepareMeta label="길이" value={model.durationLabel} />
          <PrepareMeta label="사용 악기" value={model.instrumentLabel} />
          <PrepareMeta label="출처" value={model.sourceLabel} />
        </View>
        <Text style={styles.bodyText}>{model.description}</Text>
        {model.publishErrorMessage ? (
          <Text style={styles.shareErrorText}>{model.publishErrorMessage}</Text>
        ) : null}
      </View>
      <View style={[styles.buttonRow, styles.prepareButtonGrid]}>
        <SecondaryPillButton
          disabled={!model.canShare || model.isPublishing}
          label={previewButtonLabel}
          onPress={() => dispatch({ type: 'previewShareTarget' })}
          style={styles.prepareActionButton}
        />
        <SecondaryPillButton
          disabled={!model.canShare || model.isPublishing}
          label="공유하기"
          onPress={() => dispatch({ type: 'publishShareTarget' })}
          style={styles.prepareActionButton}
        />
        <SecondaryPillButton
          disabled={!model.canShare || model.isPublishing}
          label="저장만 하기"
          onPress={() => dispatch({ type: 'saveShareTargetOnly' })}
          style={styles.prepareActionButton}
        />
        <SecondaryPillButton
          label="취소"
          onPress={() => dispatch({ type: 'cancelShareTarget' })}
          style={styles.prepareActionButton}
        />
      </View>
    </View>
  );
}

function PrepareMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.prepareMetaRow}>
      <Text style={styles.prepareMetaLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.prepareMetaValue}>{value}</Text>
    </View>
  );
}

export function ShareFeedContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const model = getShareFeedViewModel(state);
  const sharePrepareAction = getSharePrepareAction(state);
  const firstRecentCard = model.recentCards[0];

  return (
    <View style={styles.shareFeedStack}>
      <Text style={styles.shareFeedTitle}>
        <Text style={styles.shareFeedTitleMuted}>다양한 GARAK들을</Text>
        {'\n'}함께 <Text style={styles.shareFeedTitleStrong}>공유</Text>
        <Text style={styles.shareFeedTitleMuted}>해요</Text>
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.shareCategoryScroller}
        contentContainerStyle={styles.shareCategoryRow}
      >
        {model.categories.map((category) => (
          <View
            key={category.label}
            style={[styles.shareCategoryChip, category.active ? styles.shareCategoryChipActive : undefined]}
          >
            <Text
              style={[
                styles.shareCategoryChipText,
                category.active ? styles.shareCategoryChipTextActive : undefined,
              ]}
            >
              {category.label}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Pressable
        accessibilityLabel={model.hero.title}
        accessibilityRole="button"
        onPress={() =>
          dispatch({
            type: 'openSharedRecordingDetail',
            recordingId: model.hero.recordingId,
          })
        }
        style={styles.shareHeroCard}
      >
        <ImageBackground
          source={GARAK_SCREEN_ASSETS.share.heroKpopStage}
          style={styles.shareHeroBackground}
          imageStyle={styles.shareHeroImage}
        >
          <View style={styles.shareHeroTint} />
          <View style={styles.shareHeroAvatarCluster}>
            <Image source={GARAK_SCREEN_ASSETS.share.heroAvatarMain} style={styles.shareHeroAvatarMain} />
            <Image
              source={GARAK_SCREEN_ASSETS.share.heroAvatar1}
              style={[styles.shareHeroAvatarSmall, styles.shareHeroAvatarTopLeft]}
            />
            <Image
              source={GARAK_SCREEN_ASSETS.share.heroAvatar2}
              style={[styles.shareHeroAvatarSmall, styles.shareHeroAvatarTopRight]}
            />
            <Image
              source={GARAK_SCREEN_ASSETS.share.heroAvatar3}
              style={[styles.shareHeroAvatarSmall, styles.shareHeroAvatarBottomLeft]}
            />
            <Image
              source={GARAK_SCREEN_ASSETS.share.heroAvatar4}
              style={[styles.shareHeroAvatarSmall, styles.shareHeroAvatarBottomRight]}
            />
          </View>
          <View style={styles.shareHeroCopy}>
            <Text style={styles.shareHeroTitle}>{model.hero.title}</Text>
            <Text style={styles.shareHeroDescription}>{model.hero.description}</Text>
          </View>
        </ImageBackground>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: sharePrepareAction === undefined }}
        disabled={sharePrepareAction === undefined}
        onPress={() => {
          if (sharePrepareAction !== undefined) {
            dispatch(sharePrepareAction);
          }
        }}
        style={styles.shareSectionHeaderRow}
      >
        <Text style={styles.sectionTitle}>나의 GARAK 공유하기</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <SharePlayerCard player={model.player} onPress={() => openSharePlayer(model.player, dispatch)} />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: firstRecentCard === undefined }}
        disabled={firstRecentCard === undefined}
        onPress={() => {
          if (firstRecentCard !== undefined) {
            dispatch({
              type: 'openSharedRecordingDetail',
              recordingId: firstRecentCard.recordingId,
            });
          }
        }}
        style={styles.shareRecentHeaderRow}
      >
        <View style={styles.shareRecentHeadingCopy}>
          <Text style={styles.sectionTitle}>최근 재생한 GARAK</Text>
          <Text style={styles.shareRecentSortLabel}>{model.sortLabel}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={styles.shareRecentArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.shareRecentScroller}
          contentContainerStyle={styles.shareRecentRow}
        >
          {model.recentCards.map((card) => (
            <ShareRecentCardView
              key={card.id}
              card={card}
              onPress={() =>
                dispatch({
                  type: 'openSharedRecordingDetail',
                  recordingId: card.recordingId,
                })
              }
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function SharePlayerCard({
  player,
  onPress,
}: {
  player: ShareFeedPlayer;
  onPress: () => void;
}) {
  return (
    <View style={styles.sharePlayerDeck}>
      <View style={[styles.sharePlayerShadowCard, styles.sharePlayerShadowBack]} />
      <View style={[styles.sharePlayerShadowCard, styles.sharePlayerShadowFront]} />
      <Pressable
        accessibilityLabel={player.title}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.sharePlayerCard}
      >
        <Image source={GARAK_SCREEN_ASSETS.share.playerThumbnail} style={styles.sharePlayerThumbnail} />
        <View style={styles.sharePlayerInfo}>
          <Text numberOfLines={1} style={styles.sharePlayerTitle}>
            {player.title}
          </Text>
          <View style={styles.sharePlayerProgress}>
            <View style={styles.sharePlayerProgressFill} />
          </View>
        </View>
        <View style={styles.sharePlayerControls}>
          <Text style={styles.sharePlayerIcon}>▶</Text>
          <Text style={styles.sharePlayerIcon}>Ⅱ</Text>
          <Text style={styles.sharePlayerIcon}>⇧</Text>
        </View>
      </Pressable>
    </View>
  );
}

function ShareRecentCardView({
  card,
  onPress,
}: {
  card: ShareFeedRecentCard;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={card.title}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.shareRecentCard}
    >
      <ImageBackground
        source={RECENT_CARD_ARTWORK[card.artwork]}
        style={styles.shareRecentArtwork}
        imageStyle={styles.shareRecentImage}
      >
        <View style={styles.shareRecentTopScrim} />
        {card.liked ? (
          <View style={styles.shareRecentLike}>
            <Text style={styles.shareRecentLikeText}>♥</Text>
          </View>
        ) : null}
        <View style={styles.shareRecentCopy}>
          <Text numberOfLines={1} style={styles.shareRecentTitle}>
            {card.title}
          </Text>
          <Text numberOfLines={2} style={styles.shareRecentSubtitle}>
            {card.subtitle}
          </Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function openSharePlayer(player: ShareFeedPlayer, dispatch: ProductDispatch) {
  dispatch({
    type: 'playLibraryItem',
    item: toProductPlayerSelection(player),
  });
}

function toProductPlayerSelection(player: ShareFeedPlayer): ProductPlayerSelection {
  if (player.sourceKind === 'work' && player.workId !== undefined) {
    return { kind: 'work', workId: player.workId };
  }

  if (player.sourceKind === 'exportedAudio' && player.exportedAudioId !== undefined) {
    return { kind: 'exportedAudio', exportedAudioId: player.exportedAudioId };
  }

  if (player.sourceKind === 'practiceResult' && player.practiceResultId !== undefined) {
    return { kind: 'practiceResult', practiceResultId: player.practiceResultId };
  }

  return { kind: 'demo', title: player.title };
}

const RECENT_CARD_ARTWORK = {
  floral: GARAK_SCREEN_ASSETS.share.recentFloral,
  dancheong: GARAK_SCREEN_ASSETS.share.recentDancheong,
  pattern: GARAK_SCREEN_ASSETS.share.recentPattern,
} as const;

export function SharedDetailContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const model = getSharedDetailViewModel(state);
  const playbackAction = model.isPlaying ? model.actions.pause : model.actions.play;
  const playbackLabel = model.isPlaying ? '일시정지' : '재생';

  return (
    <View style={styles.stack}>
      <ScreenHeading title="공유 가락 듣기" compact />
      <View style={styles.detailHero}>
        <InstrumentVisual instrument={model.instrument} />
      </View>
      <MiniTrackPlayer title={model.title} tone="red" />
      <Text style={styles.bodyText}>
        {model.provenanceLabel} · {model.durationLabel} · {model.remixStatusLabel}
      </Text>
      <View style={styles.buttonRow}>
        <PrimaryPillButton
          label={playbackLabel}
          onPress={() => {
            if (playbackAction !== undefined) {
              dispatch(playbackAction);
            }
          }}
          style={styles.rowPrimary}
        />
        <PrimaryPillButton
          label="리믹스"
          tone="amber"
          disabled={!model.canRemix}
          onPress={() => {
            if (model.actions.remix !== undefined) {
              dispatch(model.actions.remix);
            }
          }}
          style={styles.rowPrimary}
        />
        <SecondaryPillButton label="저장" onPress={() => dispatch(model.actions.save)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
  },
  shareFeedStack: {
    gap: 0,
  },
  shareFeedTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 34,
    marginBottom: 18,
  },
  shareFeedTitleMuted: {
    color: '#676767',
  },
  shareFeedTitleStrong: {
    color: GARAK_COLORS.textPrimary,
    fontWeight: '900',
  },
  shareCategoryScroller: {
    marginBottom: 18,
    marginHorizontal: -GARAK_LAYOUT.horizontalPadding,
    maxHeight: 31,
  },
  shareCategoryRow: {
    gap: 8,
    paddingHorizontal: GARAK_LAYOUT.horizontalPadding,
    paddingRight: GARAK_LAYOUT.horizontalPadding + 42,
  },
  shareCategoryChip: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 27,
    paddingHorizontal: 13,
  },
  shareCategoryChipActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  shareCategoryChipText: {
    color: '#A7A7A7',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  shareCategoryChipTextActive: {
    color: GARAK_COLORS.surfaceCard,
  },
  shareHeroCard: {
    borderRadius: 40,
    height: 256,
    marginBottom: 12,
    overflow: 'hidden',
    width: '100%',
  },
  shareHeroBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  shareHeroImage: {
    borderRadius: 40,
    resizeMode: 'cover',
  },
  shareHeroTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,7,18,0.22)',
  },
  shareHeroAvatarCluster: {
    alignItems: 'center',
    height: 134,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 25,
  },
  shareHeroAvatarMain: {
    borderColor: GARAK_COLORS.surfaceCard,
    borderRadius: 33,
    borderWidth: 2,
    height: 66,
    marginTop: 33,
    width: 66,
    zIndex: 3,
  },
  shareHeroAvatarSmall: {
    borderColor: GARAK_COLORS.surfaceCard,
    borderRadius: 23,
    borderWidth: 1.5,
    height: 46,
    position: 'absolute',
    width: 46,
  },
  shareHeroAvatarTopLeft: {
    left: 106,
    top: 12,
  },
  shareHeroAvatarTopRight: {
    right: 106,
    top: 12,
  },
  shareHeroAvatarBottomLeft: {
    left: 89,
    top: 64,
  },
  shareHeroAvatarBottomRight: {
    right: 89,
    top: 64,
  },
  shareHeroCopy: {
    alignItems: 'center',
    bottom: 26,
    left: 24,
    position: 'absolute',
    right: 24,
  },
  shareHeroTitle: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 18,
    textAlign: 'center',
  },
  shareHeroDescription: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  shareSectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
    marginTop: 0,
  },
  sharePlayerDeck: {
    height: 82,
    position: 'relative',
    width: '100%',
  },
  sharePlayerShadowCard: {
    backgroundColor: '#D4D4D8',
    borderRadius: 22,
    height: 64,
    left: 8,
    position: 'absolute',
    right: 8,
  },
  sharePlayerShadowBack: {
    opacity: 0.65,
    top: 22,
  },
  sharePlayerShadowFront: {
    opacity: 0.9,
    top: 14,
  },
  sharePlayerCard: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 22,
    flexDirection: 'row',
    height: 64,
    left: 0,
    paddingLeft: 12,
    paddingRight: 18,
    position: 'absolute',
    right: 0,
    top: 0,
    ...garakCardShadow,
  },
  sharePlayerThumbnail: {
    borderRadius: 22,
    height: 43,
    width: 43,
  },
  sharePlayerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sharePlayerTitle: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  sharePlayerProgress: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 3,
    height: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  sharePlayerProgressFill: {
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 3,
    height: 3,
    width: '56%',
  },
  sharePlayerControls: {
    flexDirection: 'row',
    gap: 11,
    justifyContent: 'flex-end',
    marginLeft: 12,
  },
  sharePlayerIcon: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  shareRecentHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 18,
  },
  shareRecentHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  shareRecentSortLabel: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    marginTop: 2,
  },
  shareRecentArea: {
    height: 224,
    marginHorizontal: -GARAK_LAYOUT.horizontalPadding,
    position: 'relative',
  },
  shareRecentScroller: {
    height: 192,
  },
  shareRecentRow: {
    gap: 12,
    paddingHorizontal: GARAK_LAYOUT.horizontalPadding,
    paddingRight: GARAK_LAYOUT.horizontalPadding + 42,
  },
  shareRecentCard: {
    backgroundColor: GARAK_COLORS.surfaceMuted,
    borderRadius: 16,
    height: 192,
    overflow: 'hidden',
    width: 134,
  },
  shareRecentArtwork: {
    flex: 1,
    position: 'relative',
  },
  shareRecentImage: {
    borderRadius: 16,
    resizeMode: 'cover',
  },
  shareRecentTopScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  shareRecentLike: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 9,
    top: 9,
    width: 26,
  },
  shareRecentLikeText: {
    color: GARAK_COLORS.brandRed,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  shareRecentCopy: {
    backgroundColor: 'rgba(10,11,18,0.62)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    bottom: 0,
    gap: 4,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
  },
  shareRecentTitle: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 15,
  },
  shareRecentSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 15,
  },
  prepareCard: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 24,
    gap: 18,
    padding: 18,
  },
  prepareWaveformPreview: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    height: 86,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  prepareWaveformBar: {
    backgroundColor: 'rgba(25,27,43,0.28)',
    borderRadius: 5,
    height: 28,
    width: 7,
  },
  prepareWaveformBarTall: {
    height: 46,
  },
  prepareWaveformBarActive: {
    backgroundColor: GARAK_COLORS.brandAmber,
  },
  prepareMetaGrid: {
    gap: 9,
  },
  prepareMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  prepareMetaLabel: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  prepareMetaValue: {
    color: GARAK_COLORS.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  prepareButtonGrid: {
    flexWrap: 'wrap',
  },
  prepareActionButton: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  bodyText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  shareErrorText: {
    color: GARAK_COLORS.brandRed,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
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
