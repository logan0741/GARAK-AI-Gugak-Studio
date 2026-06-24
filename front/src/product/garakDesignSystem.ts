import { ImplementedScreenId } from '../screen-flow/screenDefinitions';

export const GARAK_COLORS = {
  brandNavy: '#1A1C2D',
  brandRed: '#B51A14',
  brandAmber: '#E59100',
  surfaceCanvas: '#F9F7F3',
  surfaceApp: '#F7F8F7',
  surfaceCard: '#FFFFFF',
  surfaceSoft: '#E8E5DE',
  surfaceMuted: '#D9D9D9',
  textPrimary: '#1A1C2D',
  textSecondary: '#656565',
  textMuted: '#959595',
  lineSoft: '#E4E4E4',
  inkBlack: '#000000',
} as const;

export const GARAK_RADIUS = {
  control: 17,
  pill: 126,
  card: 24,
  hero: 40,
  compact: 12,
} as const;

export const GARAK_LAYOUT = {
  figmaPhoneWidth: 393,
  figmaPhoneHeight: 852,
  horizontalPadding: 24,
  primaryButtonHeight: 48,
  quickAccessWidth: 179,
  quickAccessHeight: 64,
  headerIconSize: 34,
} as const;

export const GARAK_AUTH_BUTTON_LAYOUT = {
  buttonHeight: 60,
  buttonWidth: 346,
  cornerRadius: 30,
  gap: 15,
  googleIconSize: 24,
} as const;

export const GARAK_ONBOARDING_LOGOS = [
  {
    fileName: 'logo1.svg',
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    logoColor: GARAK_COLORS.brandRed,
  },
  {
    fileName: 'logo2.svg',
    backgroundColor: GARAK_COLORS.brandNavy,
    logoColor: GARAK_COLORS.brandAmber,
  },
  {
    fileName: 'logo3.svg',
    backgroundColor: GARAK_COLORS.brandRed,
    logoColor: GARAK_COLORS.surfaceCanvas,
  },
] as const;

export type FigmaImplementationStatus = 'implemented' | 'adapted' | 'deferred' | 'excluded';

export type FigmaImplementationMapItem = {
  figmaName: string;
  screenIds: ImplementedScreenId[];
  status: FigmaImplementationStatus;
  implementation: string;
  constraint?: string;
};

export const FIGMA_IMPLEMENTATION_MAP: FigmaImplementationMapItem[] = [
  {
    figmaName: '온보딩 / 온보딩2',
    screenIds: ['S01'],
    status: 'adapted',
    implementation: 'GARAK wordmark, splash color variants, tagline are applied as brand moments in the app shell and empty states.',
    constraint: '앱은 게스트 상태로 홈에 진입하므로 필수 온보딩 관문 아님.',
  },
  {
    figmaName: '로그인',
    screenIds: ['S23'],
    status: 'adapted',
    implementation: 'Google and guest-mode shaped buttons are used only in login/sync context.',
    constraint: '첫 실행 관문 아님. S22/S23에서 보관함 동기화가 필요할 때만 제안.',
  },
  {
    figmaName: '홈',
    screenIds: ['S01'],
    status: 'implemented',
    implementation: 'Large rounded visual hero, PLAY CTA, GARAK header, profile dot, quick access pill.',
  },
  {
    figmaName: '홈-자유창작모드',
    screenIds: ['S01', 'S04', 'S04A', 'S05', 'S07', 'S08', 'S09', 'S10A', 'S10B'],
    status: 'adapted',
    implementation: 'Mode segmented control, instrument chips, preview surfaces, track/mix/AI accompaniment buttons are mapped to existing flow actions.',
    constraint: 'AI wording is kept as recommendation/local sequencing, not generative audio.',
  },
  {
    figmaName: '마이',
    screenIds: ['S18', 'S22'],
    status: 'adapted',
    implementation: 'Playlist/library layout maps primarily to S18; account/settings responsibilities remain in S22.',
    constraint: 'Figma label 마이 visually behaves as library, while product docs reserve S22 for settings/account.',
  },
  {
    figmaName: '쉐어',
    screenIds: ['S20', 'S21', 'S17'],
    status: 'implemented',
    implementation: 'Category chips, recommendation hero, own GARAK share card, recent playback list.',
  },
  {
    figmaName: '플레잉 iPhone mockup background',
    screenIds: [],
    status: 'excluded',
    implementation: 'Not copied into app UI.',
    constraint: '사용자가 제외를 명시한 홍보용 iPhone mockup 배경.',
  },
];

export const FIGMA_DESIGN_FRAME_AUDIT = {
  fileName: '2026 솔챌',
  pageName: 'Idea',
  designFrameId: '288:294',
  designSystemFrameId: '180:999',
  excludedByUser: ['플레잉 iPhone mockup background'],
  confirmedTokens: [
    GARAK_COLORS.brandNavy,
    GARAK_COLORS.brandRed,
    GARAK_COLORS.brandAmber,
    GARAK_COLORS.surfaceCanvas,
  ],
} as const;

export function getFigmaMappedScreenIds(figmaName: string): ImplementedScreenId[] {
  return FIGMA_IMPLEMENTATION_MAP.find((item) => item.figmaName === figmaName)?.screenIds ?? [];
}
