import { recommendJangdan } from '../domain/jangdan';
import type { InstrumentTrack, JangdanPresetId, Track } from '../studio/studioTypes';
import type { AiAutoAccompanimentStatus } from './aiAutoAccompaniment';
import type { GarakProductAction, GarakProductState, JangdanPresetPreviewMode } from './garakProductState';
import { JANGDAN_PRESETS } from './productFixtures';
import type { JangdanPreset } from './productFixtures';

export type JangdanPresetPanelMode = 'live' | 'track';

export type JangdanPresetPanelModel = {
  recommendationStatus: 'ready' | 'insufficient-data';
  recommendedPreset?: JangdanPreset;
  recommendationMessage?: string;
  autoAccompaniment?: JangdanAutoAccompanimentModel;
  miniPlayerTitle: string;
  workContextLabel?: string;
  acceptedPreset: JangdanPreset;
  acceptedBpm: number;
  acceptedVolume: number;
  bpmValueLabel: string;
  volumeValueLabel: string;
  decreaseBpmAction: GarakProductAction;
  increaseBpmAction: GarakProductAction;
  decreaseVolumeAction: GarakProductAction;
  increaseVolumeAction: GarakProductAction;
  acceptAction?: GarakProductAction;
  manualPresets: JangdanPreset[];
  previewingPresetId?: JangdanPresetId;
};

export type JangdanAutoAccompanimentModel = {
  status: AiAutoAccompanimentStatus['status'];
  message: string;
  generatedTrackLabels: string[];
  mixedAudioUri?: string;
  confidenceLabel?: string;
};

export const INSUFFICIENT_JANGDAN_RECOMMENDATION_COPY =
  '추천을 만들려면 먼저 연주 트랙이 필요해요.';

const BPM_STEP = 4;
const VOLUME_STEP = 0.1;

export function getJangdanPresetPanelModel(
  state: GarakProductState,
  mode: JangdanPresetPanelMode,
): JangdanPresetPanelModel {
  const defaultPreset = JANGDAN_PRESETS[0];
  const previewingPresetId =
    state.previewingJangdanPreset?.mode === mode
      ? state.previewingJangdanPreset.presetId
      : undefined;
  const previewingPreset = JANGDAN_PRESETS.find((preset) => preset.id === previewingPresetId);

  if (mode === 'live') {
    return createJangdanPresetPanelModel({
      mode,
      recommendationStatus: 'ready',
      recommendedPreset: defaultPreset,
      miniPlayerTitle: 'Live Jangdan Guide',
      autoAccompaniment: undefined,
      acceptedPreset: previewingPreset ?? defaultPreset,
      previewing: state.previewingJangdanPreset?.mode === mode ? state.previewingJangdanPreset : undefined,
      previewingPresetId,
    });
  }

  const currentWork = state.library.works.find((work) => work.id === state.currentWorkId);
  const events =
    currentWork?.tracks
      .filter(isInstrumentTrack)
      .flatMap((track) => track.takes.flatMap((take) => take.events)) ?? [];

  if (events.length === 0) {
    return createJangdanPresetPanelModel({
      mode,
      recommendationStatus: 'insufficient-data',
      recommendationMessage: INSUFFICIENT_JANGDAN_RECOMMENDATION_COPY,
      miniPlayerTitle: 'AI 추천 준비 중',
      autoAccompaniment: createAutoAccompanimentModel(state.autoAccompanimentStatus),
      workContextLabel: createWorkContextLabel(currentWork?.title),
      acceptedPreset: previewingPreset ?? defaultPreset,
      previewing: state.previewingJangdanPreset?.mode === mode ? state.previewingJangdanPreset : undefined,
      previewingPresetId,
    });
  }

  const recommendation = recommendJangdan(events);
  const recommendedPreset =
    JANGDAN_PRESETS.find((preset) => preset.id === recommendation.jangdan) ?? defaultPreset;

  return createJangdanPresetPanelModel({
    mode,
    recommendationStatus: 'ready',
    recommendedPreset,
    miniPlayerTitle: `AI 추천: ${recommendedPreset.name}`,
    autoAccompaniment: createAutoAccompanimentModel(state.autoAccompanimentStatus),
    workContextLabel: createWorkContextLabel(currentWork?.title),
    acceptedPreset: previewingPreset ?? recommendedPreset,
    previewing: state.previewingJangdanPreset?.mode === mode ? state.previewingJangdanPreset : undefined,
    previewingPresetId,
  });
}

function isInstrumentTrack(track: Track): track is InstrumentTrack {
  return track.kind === 'instrument';
}

function createWorkContextLabel(workTitle?: string): string {
  return workTitle === undefined ? '현재 작업 없음' : `현재 작업 · ${workTitle}`;
}

function createJangdanPresetPanelModel(input: {
  mode: JangdanPresetPreviewMode;
  recommendationStatus: JangdanPresetPanelModel['recommendationStatus'];
  recommendedPreset?: JangdanPreset;
  recommendationMessage?: string;
  autoAccompaniment?: JangdanAutoAccompanimentModel;
  miniPlayerTitle: string;
  workContextLabel?: string;
  acceptedPreset: JangdanPreset;
  previewing?: GarakProductState['previewingJangdanPreset'];
  previewingPresetId?: JangdanPresetId;
}): JangdanPresetPanelModel {
  const acceptedBpm = clampBpm(
    input.acceptedPreset,
    input.previewing?.bpm ?? input.acceptedPreset.defaultBpm,
  );
  const acceptedVolume = clampVolume(
    input.previewing?.volume ?? (input.mode === 'live' ? 0.6 : 0.7),
  );

  return {
    recommendationStatus: input.recommendationStatus,
    recommendedPreset: input.recommendedPreset,
    recommendationMessage: input.recommendationMessage,
    autoAccompaniment: input.autoAccompaniment,
    miniPlayerTitle: input.miniPlayerTitle,
    workContextLabel: input.workContextLabel,
    acceptedPreset: input.acceptedPreset,
    acceptedBpm,
    acceptedVolume,
    bpmValueLabel: `${acceptedBpm} BPM`,
    volumeValueLabel: `${Math.round(acceptedVolume * 100)}%`,
    decreaseBpmAction: createPreviewAction(
      input.mode,
      input.acceptedPreset,
      acceptedBpm - BPM_STEP,
      acceptedVolume,
    ),
    increaseBpmAction: createPreviewAction(
      input.mode,
      input.acceptedPreset,
      acceptedBpm + BPM_STEP,
      acceptedVolume,
    ),
    decreaseVolumeAction: createPreviewAction(
      input.mode,
      input.acceptedPreset,
      acceptedBpm,
      acceptedVolume - VOLUME_STEP,
    ),
    increaseVolumeAction: createPreviewAction(
      input.mode,
      input.acceptedPreset,
      acceptedBpm,
      acceptedVolume + VOLUME_STEP,
    ),
    acceptAction:
      input.previewing === undefined
        ? undefined
        : createAcceptAction(input.mode, input.acceptedPreset, acceptedBpm, acceptedVolume),
    manualPresets: JANGDAN_PRESETS,
    previewingPresetId: input.previewingPresetId,
  };
}

function createAutoAccompanimentModel(
  status: AiAutoAccompanimentStatus,
): JangdanAutoAccompanimentModel | undefined {
  switch (status.status) {
    case 'idle':
      return {
        status: 'idle',
        message: 'AI auto accompaniment is ready to connect. Local jangdan presets stay available.',
        generatedTrackLabels: [],
      };
    case 'generating':
      return {
        status: 'generating',
        message: `AI auto accompaniment is ${status.stage}. Local jangdan presets stay available.`,
        generatedTrackLabels: [],
      };
    case 'candidateReady':
      return {
        status: 'candidateReady',
        message: 'AI ensemble WAV candidate is ready for preview.',
        generatedTrackLabels: status.candidate.generatedTracks.map(
          (track) => `${track.instrument} ${track.role} ${Math.round(track.volume * 100)}%`,
        ),
        mixedAudioUri: status.candidate.mixedAudioUri,
        confidenceLabel: `${Math.round(status.candidate.analysis.confidence * 100)}% confidence`,
      };
    case 'failed':
      return {
        status: 'failed',
        message: `${status.message} Local jangdan presets stay available.`,
        generatedTrackLabels: [],
      };
  }
}

function createPreviewAction(
  mode: JangdanPresetPreviewMode,
  preset: JangdanPreset,
  bpm: number,
  volume: number,
): GarakProductAction {
  return {
    type: 'previewJangdanPreset',
    mode,
    presetId: preset.id,
    bpm: clampBpm(preset, bpm),
    volume: clampVolume(volume),
  };
}

function createAcceptAction(
  mode: JangdanPresetPreviewMode,
  preset: JangdanPreset,
  bpm: number,
  volume: number,
): GarakProductAction {
  if (mode === 'live') {
    return {
      type: 'applyLiveJangdanGuide',
      presetId: preset.id,
      bpm,
      volume,
    };
  }

  return {
    type: 'addAccompanimentTrack',
    presetId: preset.id,
    bpm,
    volume,
  };
}

function clampBpm(preset: JangdanPreset, bpm: number): number {
  return Math.min(preset.maxBpm, Math.max(preset.minBpm, Math.round(bpm)));
}

function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, Math.round(volume * 100) / 100));
}
