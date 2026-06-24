import { recommendJangdan } from '../domain/jangdan';
import type { InstrumentTrack, Track } from '../studio/studioTypes';
import type { GarakProductState } from './garakProductState';
import { JANGDAN_PRESETS } from './productFixtures';
import type { JangdanPreset } from './productFixtures';

export type JangdanPresetPanelMode = 'live' | 'track';

export type JangdanPresetPanelModel = {
  recommendationStatus: 'ready' | 'insufficient-data';
  recommendedPreset?: JangdanPreset;
  recommendationMessage?: string;
  miniPlayerTitle: string;
  acceptedPreset: JangdanPreset;
  manualPresets: JangdanPreset[];
};

export const INSUFFICIENT_JANGDAN_RECOMMENDATION_COPY =
  '추천을 만들려면 먼저 연주 트랙이 필요해요.';

export function getJangdanPresetPanelModel(
  state: GarakProductState,
  mode: JangdanPresetPanelMode,
): JangdanPresetPanelModel {
  const defaultPreset = JANGDAN_PRESETS[0];

  if (mode === 'live') {
    return {
      recommendationStatus: 'ready',
      recommendedPreset: defaultPreset,
      miniPlayerTitle: 'Live Jangdan Guide',
      acceptedPreset: defaultPreset,
      manualPresets: JANGDAN_PRESETS,
    };
  }

  const currentWork = state.library.works.find((work) => work.id === state.currentWorkId);
  const events =
    currentWork?.tracks
      .filter(isInstrumentTrack)
      .flatMap((track) => track.takes.flatMap((take) => take.events)) ?? [];

  if (events.length === 0) {
    return {
      recommendationStatus: 'insufficient-data',
      recommendationMessage: INSUFFICIENT_JANGDAN_RECOMMENDATION_COPY,
      miniPlayerTitle: 'AI 추천 준비 중',
      acceptedPreset: defaultPreset,
      manualPresets: JANGDAN_PRESETS,
    };
  }

  const recommendation = recommendJangdan(events);
  const recommendedPreset =
    JANGDAN_PRESETS.find((preset) => preset.id === recommendation.jangdan) ?? defaultPreset;

  return {
    recommendationStatus: 'ready',
    recommendedPreset,
    miniPlayerTitle: `AI 추천: ${recommendedPreset.name}`,
    acceptedPreset: recommendedPreset,
    manualPresets: JANGDAN_PRESETS,
  };
}

function isInstrumentTrack(track: Track): track is InstrumentTrack {
  return track.kind === 'instrument';
}
