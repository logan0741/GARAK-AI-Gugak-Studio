export const GARAK_COLORS = {
  brand: {
    navy: '#1A1C2D',
    red: '#B51A14',
    amber: '#E59100',
  },
  redScale: {
    deep: '#730000',
    dark: '#990001',
    base: '#B51A14',
    bright: '#E03C32',
    light: '#FF7267',
  },
  amberScale: {
    deep: '#2D1700',
    dark: '#693D00',
    base: '#E59100',
    warm: '#CF7F00',
    light: '#FFDBAF',
  },
  neutral: {
    canvas: '#F9F7F3',
    app: '#F7F8F7',
    card: '#FFFFFF',
    soft: '#EAE8E1',
    muted: '#F2F1EB',
    border: '#C8C6C2',
    rail: '#C0C0C0',
    ink: '#30312E',
    stone: '#5E5E5B',
  },
  text: {
    primary: '#1A1C2D',
    secondary: '#656565',
    muted: '#8E8FA6',
    disabled: '#747474',
    inverse: '#FFFFFF',
    black: '#000000',
  },
  instrument: {
    wood: '#461F04',
    woodDark: '#2D1700',
    skin: '#F0ECE3',
    string: '#CFC8BB',
    highlight: '#E7E3BF',
  },
} as const;

export const GARAK_RADII = {
  card: 8,
  button: 126,
  chip: 18,
  circle: 999,
} as const;

export const GARAK_SPACING = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
} as const;

export const GARAK_TYPOGRAPHY = {
  fontFamily: 'Pretendard',
} as const;
