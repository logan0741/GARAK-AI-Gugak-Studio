import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { InstrumentId } from '../studio/studioTypes';
import { GARAK_RADIUS } from './garakDesignSystem';
import { GARAK_SCREEN_ASSETS } from './garakScreenAssets';
import { ArtworkImagePanel } from './garakUi';

type QuickAccessHandlers = {
  onLibrary: () => void;
  onHome: () => void;
  onShare: () => void;
};

const FREE_PLAY_STAGE_ASSETS: Record<InstrumentId, number> = {
  gayageum: GARAK_SCREEN_ASSETS.creation.gayageumFreePlayLandscapeStage,
  janggu: GARAK_SCREEN_ASSETS.creation.jangguFreePlayLandscapeStage,
  daegeum: GARAK_SCREEN_ASSETS.creation.daegeumFreePlayLandscapeStage,
};

const FREE_PLAY_STAGE_LABELS: Record<InstrumentId, string> = {
  gayageum: '가야금 자유연주 화면 미리보기',
  janggu: '장구 자유연주 화면 미리보기',
  daegeum: '대금 자유연주 화면 미리보기',
};

export function InstrumentSelectionArtworkPanel({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <ArtworkImagePanel
      accessibilityLabel="장구 악기 선택 미리보기"
      source={GARAK_SCREEN_ASSETS.creation.jangguInstrumentPanel}
      style={[styles.instrumentPanel, style]}
      imageStyle={styles.roundedHeroImage}
    />
  );
}

export function JangguLandscapeStageArtwork() {
  return (
    <ArtworkImagePanel
      accessibilityLabel="장구 자유 연주 가로 스테이지"
      source={GARAK_SCREEN_ASSETS.creation.jangguFreePlayLandscapeStage}
      style={styles.jangguLandscapeStage}
      imageStyle={styles.jangguLandscapeStageImage}
    />
  );
}

export function GayageumLandscapeStageArtwork() {
  return (
    <ArtworkImagePanel
      accessibilityLabel="가야금 자유 연주 가로 스테이지"
      source={GARAK_SCREEN_ASSETS.creation.gayageumFreePlayLandscapeStage}
      style={styles.jangguLandscapeStage}
      imageStyle={styles.jangguLandscapeStageImage}
    />
  );
}

export function DaegeumLandscapeStageArtwork() {
  return (
    <ArtworkImagePanel
      accessibilityLabel="대금 자유 연주 가로 스테이지"
      source={GARAK_SCREEN_ASSETS.creation.daegeumFreePlayLandscapeStage}
      style={styles.jangguLandscapeStage}
      imageStyle={styles.jangguLandscapeStageImage}
    />
  );
}

export function JangguPreviewStageArtwork({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <ArtworkImagePanel
      accessibilityLabel="장구 자유연주 화면 미리보기"
      source={GARAK_SCREEN_ASSETS.creation.jangguFreePlayLandscapeStage}
      style={[styles.jangguPreviewStage, style]}
      imageStyle={styles.jangguPreviewStageImage}
    />
  );
}

export function InstrumentPreviewStageArtwork({
  instrument,
  style,
}: {
  instrument: InstrumentId;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ArtworkImagePanel
      accessibilityLabel={FREE_PLAY_STAGE_LABELS[instrument]}
      source={FREE_PLAY_STAGE_ASSETS[instrument]}
      style={[styles.jangguPreviewStage, style]}
      imageStyle={styles.jangguPreviewStageImage}
    />
  );
}

export function LibraryPlaylistArtworkPanel({
  onOpenSelectedWork,
  onLibrary,
  onHome,
  onShare,
}: {
  onOpenSelectedWork: () => void;
} & QuickAccessHandlers) {
  return (
    <View style={styles.libraryPanelWrap}>
      <ArtworkImagePanel
        accessibilityLabel="라이브러리 플레이리스트 패널"
        source={GARAK_SCREEN_ASSETS.library.playlistPanel}
        style={styles.libraryPanel}
        imageStyle={styles.libraryPanelImage}
      />
      <Pressable
        accessibilityLabel="선택한 작업 열기"
        accessibilityRole="button"
        onPress={onOpenSelectedWork}
        style={styles.libraryPanelHitArea}
      />
      <View style={styles.libraryNavHitRow}>
        <ArtworkNavHit accessibilityLabel="라이브러리" onPress={onLibrary} />
        <ArtworkNavHit accessibilityLabel="홈" onPress={onHome} />
        <ArtworkNavHit accessibilityLabel="쉐어" onPress={onShare} />
      </View>
    </View>
  );
}

export function ShareRecommendationArtwork({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.shareHeroButton}
    >
      <ArtworkImagePanel
        accessibilityLabel="추천 가락 히어로"
        source={GARAK_SCREEN_ASSETS.share.recommendationHero}
        style={styles.shareHeroImage}
        imageStyle={styles.shareHeroImageStyle}
      />
    </Pressable>
  );
}

export function ShareMyGarakPlayerArtwork({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.sharePlayerButton}
    >
      <ArtworkImagePanel
        accessibilityLabel="내 GARAK 플레이어"
        source={GARAK_SCREEN_ASSETS.share.myGarakPlayer}
        style={styles.sharePlayerImage}
        imageStyle={styles.sharePlayerImageStyle}
      />
    </Pressable>
  );
}

export function ShareRecentPlaybackArtwork({
  onOpenRecent,
  onLibrary,
  onHome,
  onShare,
}: {
  onOpenRecent: (title: string) => void;
} & QuickAccessHandlers) {
  return (
    <View style={styles.shareRecentWrap}>
      <ArtworkImagePanel
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
            onPress={() => onOpenRecent(title)}
            style={styles.shareRecentHit}
          />
        ))}
      </View>
      <View style={styles.shareNavHitRow}>
        <ArtworkNavHit accessibilityLabel="라이브러리" onPress={onLibrary} />
        <ArtworkNavHit accessibilityLabel="홈" onPress={onHome} />
        <ArtworkNavHit accessibilityLabel="쉐어" onPress={onShare} />
      </View>
    </View>
  );
}

function ArtworkNavHit({
  accessibilityLabel,
  onPress,
}: {
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.navHit}
    />
  );
}

const styles = StyleSheet.create({
  instrumentPanel: {
    height: 435,
  },
  roundedHeroImage: {
    borderRadius: GARAK_RADIUS.hero,
  },
  jangguLandscapeStage: {
    flex: 1,
    minHeight: 0,
  },
  jangguLandscapeStageImage: {
    resizeMode: 'contain',
  },
  jangguPreviewStage: {
    height: 160,
    width: '100%',
  },
  jangguPreviewStageImage: {
    resizeMode: 'cover',
  },
  libraryPanelWrap: {
    borderRadius: 34,
    overflow: 'hidden',
  },
  libraryPanel: {
    height: 633,
  },
  libraryPanelImage: {
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
  navHit: {
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
});
