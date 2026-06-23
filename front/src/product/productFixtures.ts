import { InstrumentId, JangdanPresetId } from '../studio/studioTypes';

export type InstrumentDefinition = {
  id: InstrumentId;
  name: string;
  description: string;
  settings: string[];
};

export type PracticeSong = {
  id: 'arirang' | 'doraji' | 'boatSong';
  title: string;
  difficulty: '쉬움' | '보통';
  durationSeconds: number;
  supportedInstruments: InstrumentId[];
  recommendedInstrument: InstrumentId;
};

export type JangdanPreset = {
  id: JangdanPresetId;
  name: string;
  defaultBpm: number;
  minBpm: number;
  maxBpm: number;
  beatUnit: string;
};

export const GARAK_BRAND = {
  serviceName: 'GARAK',
  subtitle: 'AI GUGAK STUDIO',
};

export const DEFAULT_FREE_CREATION_INSTRUMENT: InstrumentId = 'janggu';

export const MVP_INSTRUMENTS: InstrumentDefinition[] = [
  {
    id: 'gayageum',
    name: '가야금',
    description: '12현을 튕기고 눌러 선율을 쌓아요.',
    settings: ['조율', '터치 민감도', '잔향'],
  },
  {
    id: 'janggu',
    name: '장구',
    description: '궁편과 채편으로 장단의 중심을 만들어요.',
    settings: ['타격 민감도', '장단 가이드 볼륨'],
  },
  {
    id: 'daegeum',
    name: '대금',
    description: '운지와 호흡 표현으로 긴 선율을 연주해요.',
    settings: ['운지 민감도', '호흡 표현 강도'],
  },
];

export const LOCKED_FUTURE_INSTRUMENT_SLOTS = 2;

export const PRACTICE_SONGS: PracticeSong[] = [
  {
    id: 'arirang',
    title: '아리랑',
    difficulty: '쉬움',
    durationSeconds: 45,
    supportedInstruments: ['gayageum', 'janggu', 'daegeum'],
    recommendedInstrument: 'gayageum',
  },
  {
    id: 'doraji',
    title: '도라지',
    difficulty: '보통',
    durationSeconds: 52,
    supportedInstruments: ['gayageum', 'janggu', 'daegeum'],
    recommendedInstrument: 'daegeum',
  },
  {
    id: 'boatSong',
    title: '뱃노래',
    difficulty: '보통',
    durationSeconds: 58,
    supportedInstruments: ['gayageum', 'janggu', 'daegeum'],
    recommendedInstrument: 'janggu',
  },
];

export const JANGDAN_PRESETS: JangdanPreset[] = [
  {
    id: 'semachi',
    name: '세마치',
    defaultBpm: 84,
    minBpm: 80,
    maxBpm: 90,
    beatUnit: '♩.',
  },
  {
    id: 'jungmori',
    name: '중모리',
    defaultBpm: 80,
    minBpm: 70,
    maxBpm: 100,
    beatUnit: '♩',
  },
  {
    id: 'jajinmori',
    name: '자진모리',
    defaultBpm: 112,
    minBpm: 90,
    maxBpm: 144,
    beatUnit: '♩.',
  },
];

export function getInstrumentName(instrument: InstrumentId): string {
  return MVP_INSTRUMENTS.find((item) => item.id === instrument)?.name ?? instrument;
}

export function getPracticeSongTitle(songId: PracticeSong['id']): string {
  return PRACTICE_SONGS.find((song) => song.id === songId)?.title ?? songId;
}
