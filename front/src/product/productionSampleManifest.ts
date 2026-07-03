import type { SampleAssetManifest } from '../domain/sampleManifest';

const BASE_URL = (process.env['EXPO_PUBLIC_API_BASE_URL'] ?? '').replace(/\/+$/, '');

// 산조가야금 12현 — 12율 오름차순 (황→응)
const GAYAGEUM_STRINGS: ReadonlyArray<{ yulmyeong: string; pitchHz: number }> = [
  { yulmyeong: '황', pitchHz: 196.0 },
  { yulmyeong: '대', pitchHz: 207.65 },
  { yulmyeong: '태', pitchHz: 220.0 },
  { yulmyeong: '협', pitchHz: 233.08 },
  { yulmyeong: '고', pitchHz: 246.94 },
  { yulmyeong: '중', pitchHz: 261.63 },
  { yulmyeong: '유', pitchHz: 293.66 },
  { yulmyeong: '임', pitchHz: 329.63 },
  { yulmyeong: '이', pitchHz: 349.23 },
  { yulmyeong: '남', pitchHz: 392.0 },
  { yulmyeong: '무', pitchHz: 440.0 },
  { yulmyeong: '응', pitchHz: 493.88 },
];

export const productionGayageumSampleManifest: SampleAssetManifest = {
  version: '2026.07.mvp',
  assets: GAYAGEUM_STRINGS.map(({ yulmyeong, pitchHz }, index) => ({
    id: `gayageum-${yulmyeong}`,
    instrument: 'gayageum_12' as const,
    stringIndex: index + 1,
    pitchHz,
    fileUri: `${BASE_URL}/static/samples/가야금/${yulmyeong}.wav`,
    sourceLayer: 'public_asset' as const,
    sourceName: '국립국악원 산조가야금 단음 샘플',
    licenseNote: '공공데이터 포털 국악 데이터 활용',
  })),
};
