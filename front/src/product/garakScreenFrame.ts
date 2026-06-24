import { ImplementedScreenId } from '../screen-flow/screenDefinitions';

export type GarakScreenFrameMode = 'portrait' | 'landscape';

export type GarakScreenFrameConfig = {
  mode: GarakScreenFrameMode;
  scrollable: boolean;
};

export const PERFORMANCE_LANDSCAPE_SCREEN_IDS = ['S05', 'S09', 'S15'] as const satisfies readonly ImplementedScreenId[];

const PERFORMANCE_LANDSCAPE_SCREEN_SET = new Set<ImplementedScreenId>(PERFORMANCE_LANDSCAPE_SCREEN_IDS);
const EMBEDDED_LANDSCAPE_ARTWORK_HEADER_SCREEN_SET = new Set<ImplementedScreenId>(['S05']);

export function getGarakScreenFrameConfig(screenId: ImplementedScreenId): GarakScreenFrameConfig {
  if (PERFORMANCE_LANDSCAPE_SCREEN_SET.has(screenId)) {
    return {
      mode: 'landscape',
      scrollable: false,
    };
  }

  return {
    mode: 'portrait',
    scrollable: true,
  };
}

export function usesEmbeddedLandscapeArtworkHeader(screenId: ImplementedScreenId): boolean {
  return EMBEDDED_LANDSCAPE_ARTWORK_HEADER_SCREEN_SET.has(screenId);
}
