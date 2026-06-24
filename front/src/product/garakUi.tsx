import {
  Image,
  ImageBackground,
  ImageStyle,
  ImageSourcePropType,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { InstrumentId } from '../studio/studioTypes';
import { GARAK_COLORS, GARAK_LAYOUT, GARAK_RADIUS } from './garakDesignSystem';
import { GarakLogo } from './GarakLogo';
import { GARAK_SCREEN_ASSETS } from './garakScreenAssets';
import { getInstrumentName } from './productFixtures';

type ButtonTone = 'navy' | 'red' | 'amber' | 'light' | 'outline';

export function GarakWordmark({ small = false }: { small?: boolean }) {
  return (
    <View style={styles.wordmarkWrap}>
      <GarakLogo width={small ? 101 : 112} />
    </View>
  );
}

export function ScreenHeading({
  title,
  description,
  compact = false,
}: {
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.heading, compact ? styles.headingCompact : undefined]}>
      <Text style={[styles.headingTitle, compact ? styles.headingTitleCompact : undefined]}>{title}</Text>
      {description ? <Text style={styles.headingDescription}>{description}</Text> : null}
    </View>
  );
}

export function PrimaryPillButton({
  label,
  onPress,
  disabled,
  tone = 'navy',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.pillButton, buttonToneStyles[tone], disabled ? styles.disabled : undefined, style]}
    >
      <Text style={[styles.pillButtonText, tone === 'light' || tone === 'outline' ? styles.darkButtonText : undefined]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SecondaryPillButton({
  label,
  onPress,
  disabled,
  tone = 'light',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PrimaryPillButton
      label={label}
      onPress={onPress}
      disabled={disabled}
      tone={tone}
      style={[styles.secondaryPill, style]}
    />
  );
}

export function ProgressSteps({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[styles.progressSegment, index <= step ? styles.progressSegmentActive : undefined]}
        />
      ))}
    </View>
  );
}

export function QuickAccessNav({
  active,
  labels = {
    library: '마이',
    home: '홈',
    share: '쉐어',
  },
  onLibrary,
  onHome,
  onShare,
  dark = true,
  style,
}: {
  active: 'library' | 'home' | 'share';
  labels?: {
    library: string;
    home: string;
    share: string;
  };
  onLibrary: () => void;
  onHome: () => void;
  onShare: () => void;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.quickAccess, dark ? styles.quickAccessDark : styles.quickAccessLight, style]}>
      <QuickAccessItem label={labels.library} active={active === 'library'} onPress={onLibrary} />
      <QuickAccessItem label={labels.home} active={active === 'home'} onPress={onHome} kind="home" />
      <QuickAccessItem label={labels.share} active={active === 'share'} onPress={onShare} kind="share" />
    </View>
  );
}

function QuickAccessItem({
  label,
  active,
  onPress,
  kind = 'library',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  kind?: 'library' | 'home' | 'share';
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.quickAccessItem, active ? styles.quickAccessItemActive : undefined]}
    >
      <QuickAccessGlyph kind={kind} />
    </Pressable>
  );
}

function QuickAccessGlyph({ kind }: { kind: 'library' | 'home' | 'share' }) {
  if (kind === 'home') {
    return (
      <View style={styles.homeGlyph}>
        <View style={styles.homeGlyphRoof} />
        <View style={styles.homeGlyphBody} />
      </View>
    );
  }

  return (
    <View style={kind === 'share' ? styles.shareGlyph : styles.userGlyph}>
      <View style={styles.userGlyphHead} />
      <View style={styles.userGlyphBody} />
      {kind === 'share' ? (
        <View style={styles.userGlyphSecond}>
          <View style={styles.userGlyphHeadSmall} />
          <View style={styles.userGlyphBodySmall} />
        </View>
      ) : null}
    </View>
  );
}

export function VisualHero({
  title,
  description,
  cta,
  onPress,
}: {
  title: string;
  description: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <ImageBackground
      accessibilityLabel={`${title}. ${description}`}
      imageStyle={styles.visualHeroImage}
      source={GARAK_SCREEN_ASSETS.home.playHero}
      style={styles.visualHero}
    >
      <Pressable
        accessibilityLabel={cta}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.visualHeroPressArea}
      />
    </ImageBackground>
  );
}

export function ArtworkImagePanel({
  source,
  accessibilityLabel,
  style,
  imageStyle,
}: {
  source: ImageSourcePropType;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}) {
  return (
    <ImageBackground
      accessibilityLabel={accessibilityLabel}
      imageStyle={[styles.artworkPanelImage, imageStyle]}
      source={source}
      style={[styles.artworkPanel, style]}
    />
  );
}

export function InstrumentVisual({
  instrument,
  compact = false,
}: {
  instrument: InstrumentId;
  compact?: boolean;
}) {
  if (instrument === 'janggu') {
    return (
      <View style={[styles.instrumentVisual, compact ? styles.instrumentVisualCompact : undefined]}>
        <View style={styles.jangguBody}>
          <View style={styles.jangguHead} />
          <View style={styles.jangguWaist} />
          <View style={styles.jangguHead} />
        </View>
        <View style={styles.jangguCordA} />
        <View style={styles.jangguCordB} />
        <View style={styles.jangguStickLeft} />
        <View style={styles.jangguStickRight} />
      </View>
    );
  }

  if (instrument === 'daegeum') {
    return (
      <View style={[styles.instrumentVisual, compact ? styles.instrumentVisualCompact : undefined]}>
        <View style={styles.daegeumBody}>
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={styles.daegeumHole} />
          ))}
        </View>
        <View style={styles.touchPointOne} />
        <View style={styles.touchPointTwo} />
      </View>
    );
  }

  return (
    <View style={[styles.instrumentVisual, compact ? styles.instrumentVisualCompact : undefined]}>
      <View style={styles.gayageumBoard}>
        {Array.from({ length: 9 }, (_, index) => (
          <View key={index} style={styles.gayageumString} />
        ))}
        <View style={styles.touchPointOne} />
        <View style={styles.touchPointTwo} />
      </View>
    </View>
  );
}

export function InstrumentBadge({ instrument }: { instrument: InstrumentId }) {
  return (
    <View style={styles.instrumentBadge}>
      <Text style={styles.instrumentBadgeText}>
        {getInstrumentName(instrument)} {instrument === 'janggu' ? 'Janggu' : instrument === 'daegeum' ? 'Daegeum' : 'Gayageum'}
      </Text>
    </View>
  );
}

export function MiniTrackPlayer({
  title,
  tone = 'navy',
}: {
  title: string;
  tone?: 'navy' | 'red' | 'amber';
}) {
  const toneStyle =
    tone === 'red' ? styles.playerRed : tone === 'amber' ? styles.playerAmber : styles.playerNavy;

  return (
    <View style={[styles.miniPlayer, toneStyle]}>
      <Text style={styles.miniPlayerTitle}>{title}</Text>
      <View style={styles.miniPlayerProgress}>
        <View style={styles.miniPlayerProgressFill} />
      </View>
      <View style={styles.playerControls}>
        <Text style={styles.playerIcon}>◀</Text>
        <Text style={styles.playerIcon}>▶</Text>
        <Text style={styles.playerIcon}>▮▮</Text>
      </View>
    </View>
  );
}

export function TrackPill({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: ButtonTone;
  onPress: () => void;
}) {
  return <PrimaryPillButton label={label} onPress={onPress} tone={tone} style={styles.trackPill} />;
}

export function CategoryChips({
  labels,
  activeIndex = 0,
}: {
  labels: string[];
  activeIndex?: number;
}) {
  return (
    <View style={styles.chipRow}>
      {labels.map((label, index) => (
        <View key={label} style={[styles.categoryChip, index === activeIndex ? styles.categoryChipActive : undefined]}>
          <Text style={[styles.categoryChipText, index === activeIndex ? styles.categoryChipTextActive : undefined]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const garakCardShadow = {
  shadowColor: GARAK_COLORS.inkBlack,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 18,
  elevation: 4,
} as const;

const buttonToneStyles = StyleSheet.create({
  navy: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  red: {
    backgroundColor: GARAK_COLORS.brandRed,
  },
  amber: {
    backgroundColor: GARAK_COLORS.brandAmber,
  },
  light: {
    backgroundColor: GARAK_COLORS.surfaceSoft,
  },
  outline: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: GARAK_COLORS.brandNavy,
    borderWidth: 1,
  },
});

const styles = StyleSheet.create({
  wordmarkWrap: {
    alignItems: 'center',
  },
  wordmarkImage: {
    height: 35,
    width: 101,
  },
  wordmarkImageSmall: {
    height: 35,
    width: 101,
  },
  heading: {
    gap: 10,
  },
  headingCompact: {
    gap: 6,
  },
  headingTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 34,
  },
  headingTitleCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  headingDescription: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  pillButton: {
    alignItems: 'center',
    borderRadius: GARAK_RADIUS.pill,
    justifyContent: 'center',
    minHeight: GARAK_LAYOUT.primaryButtonHeight,
    paddingHorizontal: 18,
  },
  secondaryPill: {
    flex: 1,
    minHeight: 44,
  },
  pillButtonText: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
  },
  darkButtonText: {
    color: GARAK_COLORS.brandNavy,
  },
  disabled: {
    opacity: 0.48,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
  },
  progressSegment: {
    backgroundColor: GARAK_COLORS.lineSoft,
    borderRadius: 4,
    flex: 1,
    height: 5,
  },
  progressSegmentActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  quickAccess: {
    alignSelf: 'center',
    borderRadius: 100,
    flexDirection: 'row',
    height: GARAK_LAYOUT.quickAccessHeight,
    justifyContent: 'center',
    padding: 7,
    width: GARAK_LAYOUT.quickAccessWidth,
    ...garakCardShadow,
  },
  quickAccessDark: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  quickAccessLight: {
    backgroundColor: '#DFDFDF',
  },
  quickAccessItem: {
    alignItems: 'center',
    borderRadius: 26,
    justifyContent: 'center',
    minWidth: 51,
  },
  quickAccessItemActive: {
    backgroundColor: GARAK_COLORS.brandAmber,
  },
  userGlyph: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  shareGlyph: {
    height: 22,
    position: 'relative',
    width: 26,
  },
  userGlyphHead: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  userGlyphBody: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 3,
    height: 8,
    marginTop: 2,
    width: 16,
  },
  userGlyphSecond: {
    position: 'absolute',
    right: 0,
    top: 3,
  },
  userGlyphHeadSmall: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  userGlyphBodySmall: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 3,
    height: 7,
    marginTop: 2,
    width: 12,
  },
  homeGlyph: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  homeGlyphRoof: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 2,
    height: 10,
    transform: [{ rotate: '45deg' }],
    width: 10,
  },
  homeGlyphBody: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 2,
    height: 10,
    marginTop: -4,
    width: 14,
  },
  visualHero: {
    height: 485,
    overflow: 'hidden',
    width: '100%',
  },
  visualHeroImage: {
    borderRadius: GARAK_RADIUS.hero,
    resizeMode: 'cover',
  },
  visualHeroPressArea: {
    bottom: 38,
    height: 59,
    position: 'absolute',
    right: 29,
    width: 110,
  },
  artworkPanel: {
    overflow: 'hidden',
    width: '100%',
  },
  artworkPanelImage: {
    resizeMode: 'cover',
  },
  instrumentVisual: {
    alignItems: 'center',
    height: 260,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  instrumentVisualCompact: {
    height: 180,
    transform: [{ scale: 0.86 }],
  },
  jangguBody: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  jangguHead: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: GARAK_COLORS.brandAmber,
    borderRadius: 50,
    borderWidth: 4,
    height: 92,
    width: 92,
  },
  jangguWaist: {
    backgroundColor: '#6E350B',
    height: 68,
    marginHorizontal: -10,
    width: 88,
  },
  jangguCordA: {
    backgroundColor: GARAK_COLORS.brandAmber,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '12deg' }],
    width: 230,
  },
  jangguCordB: {
    backgroundColor: GARAK_COLORS.brandRed,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-12deg' }],
    width: 230,
  },
  jangguStickLeft: {
    backgroundColor: '#6E350B',
    borderRadius: 4,
    height: 150,
    left: 54,
    position: 'absolute',
    transform: [{ rotate: '24deg' }],
    width: 5,
  },
  jangguStickRight: {
    backgroundColor: '#6E350B',
    borderRadius: 4,
    height: 150,
    position: 'absolute',
    right: 54,
    transform: [{ rotate: '-24deg' }],
    width: 5,
  },
  gayageumBoard: {
    backgroundColor: '#7B421D',
    borderRadius: 16,
    gap: 9,
    paddingHorizontal: 18,
    paddingVertical: 22,
    width: '100%',
  },
  gayageumString: {
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    height: 2,
  },
  daegeumBody: {
    alignItems: 'center',
    backgroundColor: '#7A4B2B',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 18,
    height: 44,
    justifyContent: 'center',
    width: '92%',
  },
  daegeumHole: {
    backgroundColor: GARAK_COLORS.inkBlack,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  touchPointOne: {
    backgroundColor: GARAK_COLORS.brandAmber,
    borderColor: 'rgba(229,145,0,0.35)',
    borderRadius: 24,
    borderWidth: 10,
    height: 44,
    left: 76,
    position: 'absolute',
    top: 74,
    width: 44,
  },
  touchPointTwo: {
    backgroundColor: GARAK_COLORS.brandAmber,
    borderColor: 'rgba(229,145,0,0.35)',
    borderRadius: 26,
    borderWidth: 10,
    height: 52,
    position: 'absolute',
    right: 62,
    top: 134,
    width: 52,
  },
  instrumentBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(229,145,0,0.2)',
    borderColor: GARAK_COLORS.brandAmber,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  instrumentBadgeText: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  miniPlayer: {
    borderRadius: 18,
    gap: 8,
    minHeight: 95,
    padding: 16,
    ...garakCardShadow,
  },
  playerNavy: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  playerRed: {
    backgroundColor: GARAK_COLORS.brandRed,
  },
  playerAmber: {
    backgroundColor: GARAK_COLORS.brandAmber,
  },
  miniPlayerTitle: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  miniPlayerProgress: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 4,
    height: 4,
  },
  miniPlayerProgressFill: {
    backgroundColor: GARAK_COLORS.brandAmber,
    borderRadius: 4,
    height: 4,
    width: '44%',
  },
  playerControls: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  playerIcon: {
    color: GARAK_COLORS.surfaceCard,
    fontSize: 13,
    fontWeight: '800',
  },
  trackPill: {
    minHeight: 59,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryChipActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  categoryChipText: {
    color: '#ACACAC',
    fontSize: 11,
    fontWeight: '800',
  },
  categoryChipTextActive: {
    color: GARAK_COLORS.surfaceApp,
  },
});
