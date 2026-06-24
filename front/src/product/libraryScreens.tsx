import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GARAK_COLORS } from './garakDesignSystem';
import { GarakLogo } from './GarakLogo';
import { GARAK_SCREEN_ASSETS } from './garakScreenAssets';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  getMyLibraryItemAction,
  getMyLibraryPlayerViewModel,
  getMyLibraryViewModel,
  MyLibraryHeroCard,
  MyLibraryPlaylistRow,
} from './libraryScreenModel';
import {
  QuickAccessNav,
  garakCardShadow,
} from './garakUi';

type ProductDispatch = (action: GarakProductAction) => void;

export function LibraryContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const model = getMyLibraryViewModel(state);

  return (
    <View style={styles.myLibraryStack}>
      <Text style={styles.myLibraryTitle}>
        <Text style={styles.myLibraryTitleMuted}>나의 GARAK</Text>
        {'\n'}라이브러리
      </Text>
      <Text style={styles.librarySyncLabel}>{model.syncLabel}</Text>

      <View style={styles.myHeroDeck}>
        {model.heroCards.map((card, index) => (
          <MyLibraryHeroCardView
            key={card.id}
            card={card}
            index={index}
            onPress={() => openLibraryPlayable(card, dispatch)}
          />
        ))}
      </View>

      <TextInput
        accessibilityLabel="보관함 검색"
        onChangeText={(query) => dispatch({ type: 'updateLibrarySearchQuery', query })}
        placeholder="검색"
        placeholderTextColor="#9A9A9A"
        style={styles.librarySearchInput}
        value={model.searchQuery}
      />

      <View style={styles.libraryTabRow}>
        {model.tabs.map((tab) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: tab.active }}
            key={tab.id}
            onPress={() => dispatch({ type: 'selectLibraryTab', tab: tab.id })}
            style={[styles.libraryTabButton, tab.active ? styles.libraryTabButtonActive : undefined]}
          >
            <Text style={[styles.libraryTabText, tab.active ? styles.libraryTabTextActive : undefined]}>
              {tab.label} {tab.count}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.playlistHeader}>
        <Text style={styles.sectionLabel}>Playlist</Text>
      </View>
      {model.emptyState !== undefined ? (
        <View style={styles.libraryEmptyState}>
          <Text style={styles.libraryEmptyTitle}>{model.emptyState.title}</Text>
          <Text style={styles.libraryEmptyDescription}>{model.emptyState.description}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch(model.emptyState!.action)}
            style={styles.libraryEmptyCta}
          >
            <Text style={styles.libraryEmptyCtaText}>{model.emptyState.ctaLabel}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.myPlaylistList}>
        {model.playlistRows.map((row) => (
          <MyLibraryPlaylistRowView
            key={row.id}
            row={row}
            onPress={() => openLibraryPlayable(row, dispatch)}
          />
        ))}
      </View>

      <QuickAccessNav
        active="library"
        onLibrary={() => dispatch({ type: 'navigate', target: 'S18' })}
        onHome={() => dispatch({ type: 'navigate', target: 'S01' })}
        onShare={() => dispatch({ type: 'navigate', target: 'S20' })}
        style={styles.myQuickAccess}
      />
    </View>
  );
}

export function PlayerDetailContent({
  state,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const player = getMyLibraryPlayerViewModel(state);

  return (
    <View
      accessibilityLabel={`${player.title} 재생 화면`}
      style={styles.playingScreen}
    >
      <View style={styles.playingBackdropLine} />
      <View style={styles.playingBackdropShelf}>
        <View style={[styles.playingBackdropTile, styles.playingBackdropTileMuted]} />
        <View style={[styles.playingBackdropTile, styles.playingBackdropTileRed]} />
        <View style={[styles.playingBackdropTile, styles.playingBackdropTileDark]} />
      </View>
      <View style={styles.playingPanel}>
        <View style={styles.playingCover}>
          <GarakLogo variant="light" width={156} />
          <View style={styles.playingCoverBadge}>
            <WaveformGlyph tone="red" />
          </View>
        </View>
        <View style={styles.playingTitleRow}>
          <Text numberOfLines={1} style={styles.playingTitle}>
            {player.title}
          </Text>
          <Text style={styles.playingMore}>·····</Text>
        </View>
        <View style={styles.playingProgress}>
          <View style={styles.playingProgressFill} />
        </View>
        <View style={styles.playingTimeRow}>
          <Text style={styles.playingTime}>{player.elapsedLabel}</Text>
          <Text style={styles.playingTime}>{player.remainingLabel}</Text>
        </View>
        <View style={styles.playingControls}>
          <Pressable accessibilityLabel="즐겨찾기" accessibilityRole="button" style={styles.playingIconButton}>
            <Text style={styles.playingStar}>☆</Text>
          </Pressable>
          <Pressable accessibilityLabel="이전" accessibilityRole="button" style={styles.playingIconButton}>
            <Text style={styles.playingSkip}>◀◀</Text>
          </Pressable>
          <Pressable accessibilityLabel="재생" accessibilityRole="button" style={styles.playingPlayButton}>
            <Text style={styles.playingPlay}>▶</Text>
          </Pressable>
          <Pressable accessibilityLabel="다음" accessibilityRole="button" style={styles.playingIconButton}>
            <Text style={styles.playingSkip}>▶▶</Text>
          </Pressable>
        </View>
        <View style={styles.playingVolumeRow}>
          <SpeakerGlyph quiet />
          <View style={styles.playingVolumeTrack}>
            <View style={styles.playingVolumeFill} />
          </View>
          <SpeakerGlyph />
        </View>
        {player.showsAirPlay ? (
          <Pressable accessibilityLabel="AirPlay" accessibilityRole="button" style={styles.playingAirPlay}>
            <Text style={styles.playingAirPlayText}>◎ AirPlay</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function MyLibraryHeroCardView({
  card,
  index,
  onPress,
}: {
  card: MyLibraryHeroCard;
  index: number;
  onPress: () => void;
}) {
  const isPrimary = index === 2;
  const isLightCard = card.tone === 'light';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !card.playable }}
      disabled={!card.playable}
      onPress={onPress}
      style={[
        styles.myHeroCard,
        index > 0 ? styles.myHeroCardOverlap : undefined,
        isPrimary ? styles.myHeroCardPrimary : undefined,
        card.tone === 'red'
          ? styles.myHeroCardRed
          : card.tone === 'light'
            ? styles.myHeroCardLight
            : styles.myHeroCardNavy,
        { zIndex: index + 1 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.myHeroTitle,
          isLightCard ? styles.myHeroTitleDark : styles.myHeroTitleLight,
        ]}
      >
        {card.title}
      </Text>
      {isPrimary ? (
        <>
          <Text style={styles.myHeroDate}>{card.date}</Text>
          <View style={styles.myHeroOrb}>
            <WaveformGlyph light />
          </View>
          <View style={styles.myHeroControlBlock}>
            <View style={styles.myHeroProgress}>
              <View style={styles.myHeroProgressFill} />
            </View>
            <View style={styles.myHeroControlRow}>
              <Text style={styles.myHeroControlIcon}>◀</Text>
              <Text style={styles.myHeroControlIcon}>▶</Text>
              <Text style={styles.myHeroControlIcon}>Ⅱ</Text>
            </View>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

function MyLibraryPlaylistRowView({
  row,
  onPress,
}: {
  row: MyLibraryPlaylistRow;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!row.playable}
      onPress={onPress}
      style={[styles.playlistRow, row.active ? styles.playlistRowActive : undefined]}
    >
      {row.active ? (
        <View style={styles.activeCover}>
          <Image source={GARAK_SCREEN_ASSETS.library.playlistPanel} style={styles.activeCoverImage} />
        </View>
      ) : (
        <View style={styles.inactiveCover} />
      )}
      <View style={styles.playlistCopy}>
        <Text
          numberOfLines={1}
          style={[styles.playlistTitle, row.active ? styles.playlistTitleActive : undefined]}
        >
          {row.title}
        </Text>
        {row.active ? (
          <>
            {row.subtitle !== undefined ? (
              <Text numberOfLines={1} style={styles.playlistActiveMeta}>
                {row.subtitle}
              </Text>
            ) : null}
            <View style={[styles.playlistProgress, row.subtitle !== undefined ? styles.playlistProgressWithMeta : undefined]}>
              <View style={styles.playlistProgressFill} />
            </View>
          </>
        ) : (
          <Text style={styles.playlistDate}>{row.date}</Text>
        )}
      </View>
      {row.active ? (
        <View style={styles.playlistControlPair}>
          <Text style={styles.playlistControlIcon}>▶</Text>
          <Text style={styles.playlistControlIcon}>Ⅱ</Text>
        </View>
      ) : (
        <View style={styles.playlistWaveformWrap}>
          <WaveformGlyph />
        </View>
      )}
    </Pressable>
  );
}

function WaveformGlyph({
  light = false,
  tone = 'default',
}: {
  light?: boolean;
  tone?: 'default' | 'red';
}) {
  return (
    <View style={styles.waveformGlyph}>
      {Array.from({ length: 6 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.waveformGlyphBar,
            tone === 'red'
              ? styles.waveformGlyphBarRed
              : light
                ? styles.waveformGlyphBarLight
                : styles.waveformGlyphBarMuted,
            { height: 8 + ((index * 7) % 18) },
          ]}
        />
      ))}
    </View>
  );
}

function SpeakerGlyph({ quiet = false }: { quiet?: boolean }) {
  return (
    <View style={styles.speakerGlyph}>
      <View style={styles.speakerGlyphCone} />
      <View style={styles.speakerGlyphBody} />
      {!quiet ? (
        <>
          <View style={[styles.speakerWave, styles.speakerWaveOne]} />
          <View style={[styles.speakerWave, styles.speakerWaveTwo]} />
        </>
      ) : null}
    </View>
  );
}

function openLibraryPlayable(
  item: MyLibraryHeroCard | MyLibraryPlaylistRow,
  dispatch: ProductDispatch,
) {
  const action = getMyLibraryItemAction(item);

  if (action !== undefined) {
    dispatch(action);
  }
}

const styles = StyleSheet.create({
  playingScreen: {
    alignItems: 'center',
    backgroundColor: '#181818',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  playingBackdropLine: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 232,
  },
  playingBackdropShelf: {
    alignItems: 'center',
    backgroundColor: '#101010',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 18,
    height: 143,
    justifyContent: 'center',
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    right: 0,
  },
  playingBackdropTile: {
    borderRadius: 20,
    height: 78,
    width: 78,
  },
  playingBackdropTileMuted: {
    backgroundColor: 'rgba(92,92,92,0.46)',
  },
  playingBackdropTileRed: {
    backgroundColor: 'rgba(186,28,25,0.42)',
  },
  playingBackdropTileDark: {
    backgroundColor: 'rgba(55,55,55,0.58)',
  },
  playingPanel: {
    alignItems: 'center',
    backgroundColor: '#555553',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 31,
    borderWidth: 1,
    maxWidth: 315,
    minHeight: 546,
    paddingHorizontal: 22,
    paddingTop: 22,
    width: '79%',
    ...garakCardShadow,
  },
  playingCover: {
    alignItems: 'center',
    alignSelf: 'stretch',
    aspectRatio: 1,
    backgroundColor: GARAK_COLORS.brandRed,
    borderRadius: 8,
    justifyContent: 'center',
    position: 'relative',
  },
  playingCoverBadge: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 36,
  },
  playingTitleRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },
  playingTitle: {
    color: GARAK_COLORS.surfaceCard,
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 25,
  },
  playingMore: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 18,
  },
  playingProgress: {
    alignSelf: 'stretch',
    backgroundColor: '#D6D6D6',
    borderRadius: 3,
    height: 6,
    marginTop: 26,
    overflow: 'hidden',
  },
  playingProgressFill: {
    backgroundColor: '#F4F4F4',
    borderRadius: 3,
    height: 6,
    width: '7%',
  },
  playingTimeRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  playingTime: {
    color: '#D6D6D6',
    fontSize: 12,
    fontWeight: '700',
  },
  playingControls: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 21,
  },
  playingIconButton: {
    alignItems: 'center',
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  playingPlayButton: {
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  playingStar: {
    color: '#DADADA',
    fontSize: 37,
    fontWeight: '400',
    lineHeight: 40,
  },
  playingSkip: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  playingPlay: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 43,
    fontWeight: '900',
    lineHeight: 48,
  },
  playingVolumeRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  playingVolumeTrack: {
    backgroundColor: '#ABADB1',
    borderRadius: 4,
    flex: 1,
    height: 7,
    overflow: 'hidden',
  },
  playingVolumeFill: {
    backgroundColor: '#BFC0C4',
    borderRadius: 4,
    height: 7,
    width: '98%',
  },
  playingAirPlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(62,62,62,0.9)',
    borderRadius: 17,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 34,
    paddingHorizontal: 18,
  },
  playingAirPlayText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '700',
  },
  speakerGlyph: {
    height: 24,
    position: 'relative',
    width: 22,
  },
  speakerGlyphCone: {
    backgroundColor: '#B8B9BC',
    height: 12,
    left: 3,
    position: 'absolute',
    top: 6,
    transform: [{ rotate: '45deg' }],
    width: 12,
  },
  speakerGlyphBody: {
    backgroundColor: '#B8B9BC',
    borderRadius: 2,
    height: 10,
    left: 0,
    position: 'absolute',
    top: 7,
    width: 7,
  },
  speakerWave: {
    borderColor: '#B8B9BC',
    borderLeftWidth: 0,
    borderRadius: 12,
    borderRightWidth: 2,
    borderTopWidth: 2,
    height: 15,
    position: 'absolute',
    right: 0,
    top: 4,
    width: 9,
  },
  speakerWaveOne: {
    right: 2,
    width: 7,
  },
  speakerWaveTwo: {
    right: -2,
    width: 11,
  },
  myLibraryStack: {
    gap: 18,
  },
  myLibraryTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 34,
  },
  myLibraryTitleMuted: {
    color: '#9E9E9E',
  },
  librarySyncLabel: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    marginTop: -10,
  },
  myHeroDeck: {
    marginBottom: -10,
  },
  librarySearchInput: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: '#ECECEC',
    borderRadius: 18,
    borderWidth: 1,
    color: GARAK_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  libraryTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  libraryTabButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  libraryTabButtonActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  libraryTabText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  libraryTabTextActive: {
    color: GARAK_COLORS.surfaceCard,
  },
  myHeroCard: {
    borderRadius: 40,
    height: 110,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 27,
    width: '100%',
  },
  myHeroCardOverlap: {
    marginTop: -56,
  },
  myHeroCardPrimary: {
    height: 120,
    paddingTop: 32,
  },
  myHeroCardRed: {
    backgroundColor: GARAK_COLORS.brandRed,
  },
  myHeroCardLight: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: '#F0F0F0',
    borderWidth: 1,
  },
  myHeroCardNavy: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  myHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
  myHeroTitleLight: {
    color: GARAK_COLORS.surfaceCard,
  },
  myHeroTitleDark: {
    color: GARAK_COLORS.textPrimary,
  },
  myHeroDate: {
    color: '#BFC0C8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 13,
  },
  myHeroOrb: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 39,
    borderWidth: 1,
    height: 78,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    top: 22,
    width: 78,
  },
  myHeroControlBlock: {
    bottom: 16,
    gap: 9,
    left: 20,
    position: 'absolute',
    right: 114,
  },
  myHeroProgress: {
    backgroundColor: '#46495A',
    borderRadius: 4,
    height: 4,
    overflow: 'hidden',
  },
  myHeroProgressFill: {
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 4,
    height: 4,
    width: '43%',
  },
  myHeroControlRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  myHeroControlIcon: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 10,
    fontWeight: '900',
  },
  playlistHeader: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  myPlaylistList: {
    gap: 2,
  },
  libraryEmptyState: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  libraryEmptyTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  libraryEmptyDescription: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  libraryEmptyCta: {
    alignSelf: 'flex-start',
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 16,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  libraryEmptyCtaText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 12,
    fontWeight: '800',
  },
  playlistRow: {
    alignItems: 'center',
    borderRadius: 19,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 17,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  playlistRowActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
    minHeight: 61,
  },
  activeCover: {
    borderRadius: 15,
    height: 31,
    overflow: 'hidden',
    width: 31,
  },
  activeCoverImage: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  inactiveCover: {
    backgroundColor: '#DCDCDC',
    borderRadius: 18,
    height: 35,
    width: 35,
  },
  playlistCopy: {
    flex: 1,
    minWidth: 0,
  },
  playlistTitle: {
    color: GARAK_COLORS.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  playlistTitleActive: {
    color: GARAK_COLORS.surfaceCard,
  },
  playlistDate: {
    color: '#9A9A9A',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  playlistActiveMeta: {
    color: '#C9CBD4',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0,
    marginTop: 3,
  },
  playlistProgress: {
    backgroundColor: '#5A5D6D',
    borderRadius: 3,
    height: 3,
    marginTop: 9,
    overflow: 'hidden',
  },
  playlistProgressWithMeta: {
    marginTop: 5,
  },
  playlistProgressFill: {
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 3,
    height: 3,
    width: '38%',
  },
  playlistControlPair: {
    flexDirection: 'row',
    gap: 10,
  },
  playlistControlIcon: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 10,
    fontWeight: '900',
  },
  playlistWaveformWrap: {
    minWidth: 40,
  },
  waveformGlyph: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
  },
  waveformGlyphBar: {
    borderRadius: 3,
    width: 3,
  },
  waveformGlyphBarMuted: {
    backgroundColor: '#C7C7C7',
  },
  waveformGlyphBarLight: {
    backgroundColor: GARAK_COLORS.surfaceCard,
  },
  waveformGlyphBarRed: {
    backgroundColor: GARAK_COLORS.brandRed,
  },
  myQuickAccess: {
    marginTop: 0,
  },
});
