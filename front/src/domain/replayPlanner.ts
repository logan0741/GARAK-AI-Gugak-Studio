import { PerformanceEvent, assertPerformanceEvent } from './performanceEvent';
import {
  SampleAsset,
  SampleAssetManifest,
  validateSampleAssetManifest,
} from './sampleManifest';
import { Session } from './session';

export type ReplayScheduleItem = {
  delayMs: number;
  originalIndex: number;
  event: PerformanceEvent;
  sampleAssetId?: string;
  sampleFileUri?: string;
};

export type ReplaySchedule = {
  sessionId: string;
  sampleAssetManifestVersion: string;
  durationMs: number;
  items: ReplayScheduleItem[];
};

export function planSessionReplay(
  session: Session,
  sampleAssetManifest: SampleAssetManifest,
): ReplaySchedule {
  const manifest = validateSampleAssetManifest(sampleAssetManifest);

  if (manifest.version !== session.sampleAssetManifestVersion) {
    throw new Error(
      `SampleAssetManifest version ${manifest.version} does not match session replay version ${session.sampleAssetManifestVersion}`,
    );
  }

  const sampleAssetsByStringIndex = indexSampleAssetsByStringIndex(manifest);
  const indexedEvents = session.events.map((event, originalIndex) => {
    assertPerformanceEvent(event);
    return { event, originalIndex };
  });

  if (indexedEvents.length === 0) {
    return {
      durationMs: 0,
      items: [],
      sampleAssetManifestVersion: manifest.version,
      sessionId: session.id,
    };
  }

  const replayStartMs = Math.min(...indexedEvents.map(({ event }) => event.tsMs));
  const items = [...indexedEvents]
    .sort((left, right) => {
      const timestampDelta = left.event.tsMs - right.event.tsMs;
      return timestampDelta === 0 ? left.originalIndex - right.originalIndex : timestampDelta;
    })
    .map(({ event, originalIndex }) =>
      buildReplayScheduleItem({
        event,
        manifestVersion: manifest.version,
        originalIndex,
        replayStartMs,
        sampleAssetsByStringIndex,
      }),
    );

  return {
    durationMs: Math.max(...items.map((item) => item.delayMs)),
    items,
    sampleAssetManifestVersion: manifest.version,
    sessionId: session.id,
  };
}

function buildReplayScheduleItem(input: {
  event: PerformanceEvent;
  manifestVersion: string;
  originalIndex: number;
  replayStartMs: number;
  sampleAssetsByStringIndex: Map<number, SampleAsset>;
}): ReplayScheduleItem {
  const baseItem = {
    delayMs: input.event.tsMs - input.replayStartMs,
    event: input.event,
    originalIndex: input.originalIndex,
  };

  if (!requiresSampleAsset(input.event)) {
    return baseItem;
  }

  const sampleAsset = input.sampleAssetsByStringIndex.get(input.event.stringIndex);
  if (!sampleAsset) {
    throw new Error(
      `No sample asset for stringIndex ${input.event.stringIndex} in manifest version ${input.manifestVersion}`,
    );
  }

  return {
    ...baseItem,
    sampleAssetId: sampleAsset.id,
    sampleFileUri: sampleAsset.fileUri,
  };
}

function indexSampleAssetsByStringIndex(manifest: SampleAssetManifest): Map<number, SampleAsset> {
  const sampleAssetsByStringIndex = new Map<number, SampleAsset>();

  for (const asset of manifest.assets) {
    if (sampleAssetsByStringIndex.has(asset.stringIndex)) {
      throw new Error(
        `SampleAssetManifest contains duplicate assets for stringIndex ${asset.stringIndex}`,
      );
    }

    sampleAssetsByStringIndex.set(asset.stringIndex, asset);
  }

  return sampleAssetsByStringIndex;
}

function requiresSampleAsset(event: PerformanceEvent): boolean {
  return event.type === 'string_pluck' || event.type === 'glissando_step';
}
