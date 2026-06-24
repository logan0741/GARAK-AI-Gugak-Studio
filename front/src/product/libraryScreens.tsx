import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS } from './garakDesignSystem';
import { GARAK_SCREEN_ASSETS } from './garakScreenAssets';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  getMyLibraryPlayerViewModel,
  getMyLibraryViewModel,
  MyLibraryHeroCard,
  MyLibraryPlaylistRow,
} from './libraryScreenModel';
import {
  MiniTrackPlayer,
  QuickAccessNav,
  ScreenHeading,
  SecondaryPillButton,
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

      <View style={styles.playlistHeader}>
        <Text style={styles.sectionLabel}>Playlist</Text>
      </View>
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
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const player = getMyLibraryPlayerViewModel(state);

  return (
    <View style={styles.stack}>
      <ScreenHeading title="가락 미리듣기" compact />
      <MiniTrackPlayer title={player.title} tone="navy" />
      <View style={styles.detailCard}>
        <Text style={styles.rowTitle}>{player.title}</Text>
        <Text style={styles.rowMeta}>{player.meta}</Text>
        <View style={styles.waveform}>
          {Array.from({ length: 18 }, (_, index) => (
            <View key={index} style={[styles.wave, { height: 8 + (index % 5) * 8 }]} />
          ))}
        </View>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryPillButton
          label="편집으로 열기"
          onPress={() =>
            player.editWorkId !== undefined
              ? dispatch({ type: 'openWork', workId: player.editWorkId })
              : dispatch({ type: 'navigate', target: 'S07' })
          }
        />
        <SecondaryPillButton label="공유" onPress={() => dispatch({ type: 'navigate', target: 'S17' })} />
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
          <View style={styles.playlistProgress}>
            <View style={styles.playlistProgressFill} />
          </View>
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

function WaveformGlyph({ light = false }: { light?: boolean }) {
  return (
    <View style={styles.waveformGlyph}>
      {Array.from({ length: 6 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.waveformGlyphBar,
            light ? styles.waveformGlyphBarLight : styles.waveformGlyphBarMuted,
            { height: 8 + ((index * 7) % 18) },
          ]}
        />
      ))}
    </View>
  );
}

function openLibraryPlayable(
  item: MyLibraryHeroCard | MyLibraryPlaylistRow,
  dispatch: ProductDispatch,
) {
  if (!item.playable) {
    return;
  }

  if (item.exportedAudioId !== undefined) {
    dispatch({
      type: 'playLibraryItem',
      item: { kind: 'exportedAudio', exportedAudioId: item.exportedAudioId },
    });
    return;
  }

  if (item.practiceResultId !== undefined) {
    dispatch({
      type: 'playLibraryItem',
      item: { kind: 'practiceResult', practiceResultId: item.practiceResultId },
    });
    return;
  }

  if (item.workId !== undefined) {
    dispatch({ type: 'playLibraryItem', item: { kind: 'work', workId: item.workId } });
    return;
  }

  dispatch({ type: 'playLibraryItem', item: { kind: 'demo', title: item.title, date: item.date } });
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
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
  myHeroDeck: {
    marginBottom: -10,
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
  playlistProgress: {
    backgroundColor: '#5A5D6D',
    borderRadius: 3,
    height: 3,
    marginTop: 9,
    overflow: 'hidden',
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
  myQuickAccess: {
    marginTop: 0,
  },
  rowTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  rowMeta: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  detailCard: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 24,
    gap: 16,
    padding: 20,
  },
  waveform: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    height: 58,
  },
  wave: {
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 4,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
