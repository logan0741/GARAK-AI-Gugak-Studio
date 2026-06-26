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
  sampleReady: boolean;
  guideReady: boolean;
};

export type JangdanPreset = {
  id: JangdanPresetId;
  name: string;
  defaultBpm: number;
  minBpm: number;
  maxBpm: number;
  beatUnit: string;
};

export type SharedRecording = {
  id: string;
  title: string;
  authorDisplayName: string;
  sourceLabel: string;
  instrument: InstrumentId;
  durationSeconds: number;
  audioUri: string;
  remixable: boolean;
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
    sampleReady: true,
    guideReady: true,
  },
  {
    id: 'doraji',
    title: '도라지',
    difficulty: '보통',
    durationSeconds: 52,
    supportedInstruments: ['gayageum', 'janggu', 'daegeum'],
    recommendedInstrument: 'daegeum',
    sampleReady: true,
    guideReady: true,
  },
  {
    id: 'boatSong',
    title: '뱃노래',
    difficulty: '보통',
    durationSeconds: 58,
    supportedInstruments: ['gayageum', 'janggu', 'daegeum'],
    recommendedInstrument: 'janggu',
    sampleReady: true,
    guideReady: true,
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

export const FEATURED_SHARED_RECORDING: SharedRecording = {
  id: 'shared-morning-arirang',
  title: '아침의 아리랑',
  authorDisplayName: 'Minsu_Kim',
  sourceLabel: '공유 피드 데모',
  instrument: 'gayageum',
  durationSeconds: 48,
  audioUri: 'placeholder://shared-morning-arirang.wav',
  remixable: true,
};

export const SHARE_FEED_RECORDINGS: SharedRecording[] = [
  FEATURED_SHARED_RECORDING,
  {
    id: 'recent-kdrama-ost',
    title: 'K-Drama OST',
    authorDisplayName: 'Drama_Garak',
    sourceLabel: '공유 피드 데모',
    instrument: 'daegeum',
    durationSeconds: 57,
    audioUri: 'placeholder://recent-kdrama-ost.wav',
    remixable: true,
  },
  {
    id: 'recent-kpop-demon-hunters',
    title: 'K-pop Demon Hunters',
    authorDisplayName: 'Kpop_Garak',
    sourceLabel: '공유 피드 데모',
    instrument: 'janggu',
    durationSeconds: 64,
    audioUri: 'placeholder://recent-kpop-demon-hunters.wav',
    remixable: true,
  },
  {
    id: 'recent-korea-minyo',
    title: 'Korea Minyo',
    authorDisplayName: 'Minyo_Archive',
    sourceLabel: '공유 피드 데모',
    instrument: 'gayageum',
    durationSeconds: 52,
    audioUri: 'placeholder://recent-korea-minyo.wav',
    remixable: false,
  },
];

export type PracticeGuideEvent = {
  tsMs: number;
  stringIndex: number;
  velocity: number;
};

export type PracticeSongGuide = {
  songId: PracticeSong['id'];
  totalDurationMs: number;
  events: PracticeGuideEvent[];
};

// 아리랑 — 세마치 장단, ~76 BPM, 평조 가야금 (현 5=황종, 3=남려, 6=중려, 7=임종, 4=고선)
// 아리랑 아리랑 아라리요 / 아리랑 고개로 넘어간다 / 나를 버리고 가시는 님은 / 십리도 못 가서 발병 난다
const ARIRANG_GUIDE: PracticeSongGuide = {
  songId: 'arirang',
  totalDurationMs: 45000,
  events: [
    { tsMs: 0,     stringIndex: 5, velocity: 0.80 },
    { tsMs: 750,   stringIndex: 5, velocity: 0.70 },
    { tsMs: 1500,  stringIndex: 6, velocity: 0.80 },
    { tsMs: 2250,  stringIndex: 5, velocity: 0.75 },
    { tsMs: 3000,  stringIndex: 4, velocity: 0.80 },
    { tsMs: 3750,  stringIndex: 5, velocity: 0.70 },
    { tsMs: 4500,  stringIndex: 3, velocity: 0.80 },
    { tsMs: 5250,  stringIndex: 3, velocity: 0.75 },
    { tsMs: 6000,  stringIndex: 5, velocity: 0.80 },
    { tsMs: 6750,  stringIndex: 5, velocity: 0.70 },
    { tsMs: 7500,  stringIndex: 6, velocity: 0.80 },
    { tsMs: 8250,  stringIndex: 5, velocity: 0.75 },
    { tsMs: 9000,  stringIndex: 4, velocity: 0.80 },
    { tsMs: 9750,  stringIndex: 4, velocity: 0.70 },
    { tsMs: 10500, stringIndex: 3, velocity: 0.85 },
    { tsMs: 12000, stringIndex: 3, velocity: 0.80 },
    { tsMs: 12750, stringIndex: 4, velocity: 0.75 },
    { tsMs: 13500, stringIndex: 5, velocity: 0.80 },
    { tsMs: 14250, stringIndex: 5, velocity: 0.70 },
    { tsMs: 15000, stringIndex: 6, velocity: 0.80 },
    { tsMs: 15750, stringIndex: 5, velocity: 0.75 },
    { tsMs: 16500, stringIndex: 4, velocity: 0.80 },
    { tsMs: 17250, stringIndex: 4, velocity: 0.70 },
    { tsMs: 18000, stringIndex: 3, velocity: 0.80 },
    { tsMs: 18750, stringIndex: 3, velocity: 0.75 },
    { tsMs: 19500, stringIndex: 2, velocity: 0.85 },
  ],
};

// 도라지 — 세마치 장단, ~80 BPM (도라지 도라지 백도라지 / 심심산천에 백도라지)
const DORAJI_GUIDE: PracticeSongGuide = {
  songId: 'doraji',
  totalDurationMs: 52000,
  events: [
    { tsMs: 0,     stringIndex: 6, velocity: 0.80 },
    { tsMs: 600,   stringIndex: 5, velocity: 0.75 },
    { tsMs: 1200,  stringIndex: 6, velocity: 0.80 },
    { tsMs: 1800,  stringIndex: 5, velocity: 0.70 },
    { tsMs: 2400,  stringIndex: 6, velocity: 0.80 },
    { tsMs: 3000,  stringIndex: 7, velocity: 0.75 },
    { tsMs: 3600,  stringIndex: 6, velocity: 0.80 },
    { tsMs: 4200,  stringIndex: 5, velocity: 0.70 },
    { tsMs: 4800,  stringIndex: 4, velocity: 0.80 },
    { tsMs: 5400,  stringIndex: 6, velocity: 0.80 },
    { tsMs: 6000,  stringIndex: 5, velocity: 0.75 },
    { tsMs: 6600,  stringIndex: 6, velocity: 0.80 },
    { tsMs: 7200,  stringIndex: 5, velocity: 0.70 },
    { tsMs: 7800,  stringIndex: 4, velocity: 0.80 },
    { tsMs: 8400,  stringIndex: 4, velocity: 0.75 },
    { tsMs: 9000,  stringIndex: 3, velocity: 0.85 },
    { tsMs: 9600,  stringIndex: 5, velocity: 0.80 },
    { tsMs: 10200, stringIndex: 6, velocity: 0.75 },
    { tsMs: 10800, stringIndex: 7, velocity: 0.80 },
    { tsMs: 11400, stringIndex: 6, velocity: 0.70 },
    { tsMs: 12000, stringIndex: 5, velocity: 0.85 },
  ],
};

// 뱃노래 — 굿거리 장단, ~72 BPM (에헤야 노아라 / 우리 사공 노저어라)
const BOAT_SONG_GUIDE: PracticeSongGuide = {
  songId: 'boatSong',
  totalDurationMs: 58000,
  events: [
    { tsMs: 0,      stringIndex: 4, velocity: 0.80 },
    { tsMs: 833,    stringIndex: 5, velocity: 0.75 },
    { tsMs: 1667,   stringIndex: 5, velocity: 0.80 },
    { tsMs: 2500,   stringIndex: 6, velocity: 0.80 },
    { tsMs: 3333,   stringIndex: 5, velocity: 0.75 },
    { tsMs: 4167,   stringIndex: 4, velocity: 0.80 },
    { tsMs: 5000,   stringIndex: 5, velocity: 0.70 },
    { tsMs: 5833,   stringIndex: 4, velocity: 0.80 },
    { tsMs: 6667,   stringIndex: 3, velocity: 0.85 },
    { tsMs: 8333,   stringIndex: 4, velocity: 0.80 },
    { tsMs: 9167,   stringIndex: 5, velocity: 0.75 },
    { tsMs: 10000,  stringIndex: 6, velocity: 0.80 },
    { tsMs: 10833,  stringIndex: 5, velocity: 0.70 },
    { tsMs: 11667,  stringIndex: 4, velocity: 0.85 },
    { tsMs: 12500,  stringIndex: 3, velocity: 0.80 },
    { tsMs: 13333,  stringIndex: 3, velocity: 0.75 },
    { tsMs: 14167,  stringIndex: 4, velocity: 0.80 },
    { tsMs: 15000,  stringIndex: 5, velocity: 0.80 },
    { tsMs: 15833,  stringIndex: 6, velocity: 0.75 },
    { tsMs: 16667,  stringIndex: 5, velocity: 0.70 },
    { tsMs: 17500,  stringIndex: 4, velocity: 0.85 },
  ],
};

export const PRACTICE_SONG_GUIDES: PracticeSongGuide[] = [
  ARIRANG_GUIDE,
  DORAJI_GUIDE,
  BOAT_SONG_GUIDE,
];

export function getPracticeSongGuide(songId: string): PracticeSongGuide | undefined {
  return PRACTICE_SONG_GUIDES.find((guide) => guide.songId === songId);
}

export function getSharedRecordingById(recordingId?: string): SharedRecording {
  return SHARE_FEED_RECORDINGS.find((recording) => recording.id === recordingId) ?? FEATURED_SHARED_RECORDING;
}

export function getInstrumentName(instrument: InstrumentId): string {
  return MVP_INSTRUMENTS.find((item) => item.id === instrument)?.name ?? instrument;
}

export function getPracticeSongTitle(songId: string): string {
  return PRACTICE_SONGS.find((song) => song.id === songId)?.title ?? songId;
}
