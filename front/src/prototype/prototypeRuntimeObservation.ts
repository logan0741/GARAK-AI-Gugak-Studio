import { PrototypeRuntimeObservation } from './prototypeQaSnapshot';
import { PrototypeSamplerEngineHost } from './prototypeSamplerEngineHost';

export function createPrototypeRuntimeObservation(
  host: PrototypeSamplerEngineHost,
): PrototypeRuntimeObservation {
  const baseObservation: PrototypeRuntimeObservation = {
    activeRuntime: host.activeRuntime,
    nativePreloadStatus: getNativePreloadObservationStatus(host),
    requestedCandidate: host.requestedCandidate,
    runtimeStatus: host.status,
    sampleManifestVersion: host.manifestVersion ?? null,
  };

  if (host.status === 'native_candidate_failed') {
    return {
      ...baseObservation,
      preloadErrorMessage: host.preloadErrorMessage,
    };
  }

  return baseObservation;
}

function getNativePreloadObservationStatus(
  host: PrototypeSamplerEngineHost,
): PrototypeRuntimeObservation['nativePreloadStatus'] {
  if (host.status === 'native_candidate_ready') {
    return 'ready';
  }

  if (host.status === 'native_candidate_preloading') {
    return 'preloading';
  }

  if (host.status === 'native_candidate_failed') {
    return 'failed';
  }

  return 'not_started';
}
