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

  const sampleAssetsByReplayKey = indexSampleAssetsByReplayKey(manifest);
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
        sampleAssetsByReplayKey,
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
  sampleAssetsByReplayKey: Map<string, SampleAsset>;
}): ReplayScheduleItem {
  const baseItem = {
    delayMs: input.event.tsMs - input.replayStartMs,
    event: input.event,
    originalIndex: input.originalIndex,
  };

  if (!requiresSampleAsset(input.event)) {
    return baseItem;
  }

  const sampleAssetKey = getReplaySampleAssetKey(input.event);
  const sampleAsset = input.sampleAssetsByReplayKey.get(sampleAssetKey);
  if (!sampleAsset) {
    throw new Error(
      `No sample asset for ${describeEventSampleRequirement(input.event)} in manifest version ${input.manifestVersion}`,
    );
  }

  return {
    ...baseItem,
    sampleAssetId: sampleAsset.id,
    sampleFileUri: sampleAsset.fileUri,
  };
}

function indexSampleAssetsByReplayKey(manifest: SampleAssetManifest): Map<string, SampleAsset> {
  const sampleAssetsByReplayKey = new Map<string, SampleAsset>();

  for (const asset of manifest.assets) {
    const key = getSampleAssetReplayKey(asset);
    if (sampleAssetsByReplayKey.has(key)) {
      throw new Error(
        `SampleAssetManifest contains duplicate assets for ${describeSampleAssetKey(asset)}`,
      );
    }

    sampleAssetsByReplayKey.set(key, asset);
  }

  return sampleAssetsByReplayKey;
}

function requiresSampleAsset(event: PerformanceEvent): boolean {
  return (
    event.type === 'string_pluck' ||
    event.type === 'glissando_step' ||
    event.type === 'janggu_hit' ||
    event.type === 'daegeum_note'
  );
}

function getReplaySampleAssetKey(event: PerformanceEvent): string {
  if (event.type === 'string_pluck' || event.type === 'glissando_step') {
    return `gayageum_12:string:${event.stringIndex}`;
  }

  if (event.type === 'janggu_hit') {
    return `janggu:surface:${event.surface}`;
  }

  if (event.type === 'daegeum_note') {
    return `daegeum:fingering:${event.fingering}`;
  }

  throw new Error(`Performance event does not require a sample asset: ${event.type}`);
}

function getSampleAssetReplayKey(asset: SampleAsset): string {
  if (asset.instrument === 'gayageum_12') {
    return `gayageum_12:string:${asset.stringIndex}`;
  }

  if (asset.instrument === 'janggu') {
    return `janggu:surface:${asset.surface}`;
  }

  return `daegeum:fingering:${asset.fingering}`;
}

function describeEventSampleRequirement(event: PerformanceEvent): string {
  if (event.type === 'string_pluck' || event.type === 'glissando_step') {
    return `stringIndex ${event.stringIndex}`;
  }

  if (event.type === 'janggu_hit') {
    return `janggu surface ${event.surface}`;
  }

  if (event.type === 'daegeum_note') {
    return `daegeum fingering ${event.fingering}`;
  }

  return event.type;
}

function describeSampleAssetKey(asset: SampleAsset): string {
  if (asset.instrument === 'gayageum_12') {
    return `stringIndex ${asset.stringIndex}`;
  }

  if (asset.instrument === 'janggu') {
    return `janggu surface ${asset.surface}`;
  }

  return `daegeum fingering ${asset.fingering}`;
}
