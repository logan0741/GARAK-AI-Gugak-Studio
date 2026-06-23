import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS } from './garakDesignSystem';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  FigmaImagePanel,
  GARAK_SCREEN_ASSETS,
  MiniTrackPlayer,
  PrimaryPillButton,
  ScreenHeading,
  SecondaryPillButton,
  garakCardShadow,
} from './garakUi';
import { getInstrumentName } from './productFixtures';

type ProductDispatch = (action: GarakProductAction) => void;

export function LibraryContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const firstWork = state.library.works[0];

  return (
    <View style={styles.stack}>
      <ScreenHeading title={'나의 GARAK\n라이브러리'} />
      <View style={styles.libraryFigmaPanelWrap}>
        <FigmaImagePanel
          accessibilityLabel="Figma 라이브러리 패널"
          source={GARAK_SCREEN_ASSETS.library.playlistPanel}
          style={styles.libraryFigmaPanel}
          imageStyle={styles.libraryFigmaPanelImage}
        />
        <Pressable
          accessibilityLabel="선택한 작업 열기"
          accessibilityRole="button"
          onPress={() =>
            firstWork
              ? dispatch({ type: 'openWork', workId: firstWork.id })
              : dispatch({ type: 'navigate', target: 'S01' })
          }
          style={styles.libraryPanelHitArea}
        />
        <View style={styles.libraryNavHitRow}>
          <Pressable
            accessibilityLabel="라이브러리"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'navigate', target: 'S18' })}
            style={styles.libraryNavHit}
          />
          <Pressable
            accessibilityLabel="홈"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'navigate', target: 'S01' })}
            style={styles.libraryNavHit}
          />
          <Pressable
            accessibilityLabel="쉐어"
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'navigate', target: 'S20' })}
            style={styles.libraryNavHit}
          />
        </View>
      </View>
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
  const exported = state.library.exportedAudios[0];

  return (
    <View style={styles.stack}>
      <ScreenHeading title="가락 미리듣기" compact />
      <MiniTrackPlayer title={exported?.title ?? 'My Arirang'} tone="navy" />
      <View style={styles.detailCard}>
        <Text style={styles.rowTitle}>{exported?.title ?? '연주 상세'}</Text>
        <Text style={styles.rowMeta}>사용 악기 {exported?.instrumentNames.join(', ') || '가야금'}</Text>
        <View style={styles.waveform}>
          {Array.from({ length: 18 }, (_, index) => (
            <View key={index} style={[styles.wave, { height: 8 + (index % 5) * 8 }]} />
          ))}
        </View>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryPillButton label="편집으로 열기" onPress={() => dispatch({ type: 'navigate', target: 'S07' })} />
        <SecondaryPillButton label="공유" onPress={() => dispatch({ type: 'navigate', target: 'S17' })} />
      </View>
    </View>
  );
}

function EmptyState({
  title,
  body,
  cta,
  onPress,
}: {
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowMeta}>{body}</Text>
      <PrimaryPillButton label={cta} tone="amber" onPress={onPress} />
    </View>
  );
}

function PlaylistPlaceholder({
  title,
  date,
  active,
}: {
  title: string;
  date: string;
  active?: boolean;
}) {
  return (
    <View style={[styles.playlistRow, active ? styles.playlistRowActive : undefined]}>
      <View style={[styles.playlistDot, active ? styles.playlistDotActive : undefined]} />
      <View style={styles.playlistCopy}>
        <Text style={[styles.playlistTitle, active ? styles.playlistTitleActive : undefined]}>{title}</Text>
        <Text style={styles.playlistDate}>{date}</Text>
      </View>
      <Text style={styles.playlistAction}>▶</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
  },
  libraryFigmaPanelWrap: {
    borderRadius: 34,
    overflow: 'hidden',
  },
  libraryFigmaPanel: {
    height: 633,
  },
  libraryFigmaPanelImage: {
    borderRadius: 34,
  },
  libraryPanelHitArea: {
    height: 410,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  libraryNavHitRow: {
    bottom: 35,
    flexDirection: 'row',
    height: 64,
    left: 84,
    position: 'absolute',
    width: 179,
  },
  libraryNavHit: {
    flex: 1,
  },
  featureList: {
    gap: 10,
  },
  libraryHeroRow: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 74,
    paddingHorizontal: 20,
    ...garakCardShadow,
  },
  libraryHeroRowActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  rowTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  rowTitleLight: {
    color: GARAK_COLORS.surfaceCard,
  },
  rowMeta: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  rowMetaLight: {
    color: GARAK_COLORS.surfaceSoft,
  },
  rowAction: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 18,
    fontWeight: '800',
  },
  rowActionLight: {
    color: GARAK_COLORS.surfaceCard,
  },
  sectionLabel: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  playlist: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 24,
    gap: 6,
    padding: 10,
  },
  playlistRow: {
    alignItems: 'center',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 12,
    minHeight: 55,
    paddingHorizontal: 12,
  },
  playlistRowActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  playlistDot: {
    backgroundColor: GARAK_COLORS.surfaceSoft,
    borderRadius: 19,
    height: 37,
    width: 37,
  },
  playlistDotActive: {
    backgroundColor: GARAK_COLORS.brandAmber,
  },
  playlistCopy: {
    flex: 1,
  },
  playlistTitle: {
    color: GARAK_COLORS.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  playlistTitleActive: {
    color: GARAK_COLORS.surfaceCard,
  },
  playlistDate: {
    color: '#A2A2A2',
    fontSize: 10,
    marginTop: 4,
  },
  playlistAction: {
    color: GARAK_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 24,
    gap: 12,
    padding: 18,
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
