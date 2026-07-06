import { evaluateAudioEngineProbe, type AudioEngineProbe } from './audioEngineEvaluation';
import { parseAudioEngineProbeRecord } from './audioEngineProbeRecord';

export type D2ExpoAudioProbeRecordCommandInput = {
  argv: string[];
  getGeneratedAt: () => string;
  writeTextFile: (path: string, value: string) => void;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

const D2_EXPO_AUDIO_PROBE_RECORD_USAGE =
  'Usage: npm run qa:d2-expo-audio-probe-record -- --output <probe-record.json> --device-label <device/OS> --measured-at <ISO> --touch-latency-ms <number> --max-stable-voices <integer> --pitch-bend-smooth <true|false> --glissando-triggered-strings <0-12> --mute-release-clean <true|false> --preload-stable <true|false> --session-fallback-preserved <true|false> --recording-capture-seconds <number> --measurement-notes <text> [--first-touch-latency-ms <number>] [--steady-touch-latency-ms <number>]';

const REQUIRED_FLAGS = [
  'output',
  'deviceLabel',
  'measuredAt',
  'touchLatencyMs',
  'maxStableVoices',
  'pitchBendSmooth',
  'glissandoTriggeredStrings',
  'muteReleaseClean',
  'preloadStable',
  'sessionFallbackPreserved',
  'recordingCaptureSeconds',
  'measurementNotes',
] as const;

type RequiredFlag = typeof REQUIRED_FLAGS[number];

type ParsedFlags = Partial<Record<RequiredFlag, string>> & {
  firstTouchLatencyMs?: string;
  steadyTouchLatencyMs?: string;
};

export function runD2ExpoAudioProbeRecordCommand(
  input: D2ExpoAudioProbeRecordCommandInput,
): number {
  const flags = parseD2ExpoAudioProbeRecordArgs(input.argv);

  if (!flags || !hasAllRequiredFlags(flags)) {
    input.writeStderr(D2_EXPO_AUDIO_PROBE_RECORD_USAGE);
    return 1;
  }

  const generatedAt = input.getGeneratedAt();
  const probe = buildD2ExpoAudioProbe(flags);
  const record = {
    generatedAt,
    probes: [probe],
  };
  const parseResult = parseAudioEngineProbeRecord(record);

  if (!parseResult.ok) {
    input.writeStderr(
      `Could not write D-2 expo-audio probe record: ${parseResult.errors.join('; ')}`,
    );
    return 1;
  }

  const evaluation = evaluateAudioEngineProbe(parseResult.record.probes[0]);
  if (evaluation.decision !== 'PASS' && evaluation.decision !== 'PASS_WITH_LIMITS') {
    input.writeStderr(
      `Could not write D-2 expo-audio probe record: expo-audio evaluated to ${evaluation.decision}; failed criteria: ${evaluation.failedCriteria.join(', ')}`,
    );
    return 1;
  }

  try {
    input.writeTextFile(flags.output, `${JSON.stringify(parseResult.record, null, 2)}\n`);
  } catch {
    input.writeStderr(`Could not write D-2 expo-audio probe record: ${flags.output}`);
    return 1;
  }

  input.writeStdout(
    `Wrote D-2 expo-audio probe record: ${flags.output} (${evaluation.decision})`,
  );
  return 0;
}

function parseD2ExpoAudioProbeRecordArgs(argv: string[]): ParsedFlags | undefined {
  const flags: ParsedFlags = {};

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      return undefined;
    }

    switch (flag) {
      case '--output':
        flags.output = value;
        break;
      case '--device-label':
        flags.deviceLabel = value;
        break;
      case '--measured-at':
        flags.measuredAt = value;
        break;
      case '--touch-latency-ms':
        flags.touchLatencyMs = value;
        break;
      case '--first-touch-latency-ms':
        flags.firstTouchLatencyMs = value;
        break;
      case '--steady-touch-latency-ms':
        flags.steadyTouchLatencyMs = value;
        break;
      case '--max-stable-voices':
        flags.maxStableVoices = value;
        break;
      case '--pitch-bend-smooth':
        flags.pitchBendSmooth = value;
        break;
      case '--glissando-triggered-strings':
        flags.glissandoTriggeredStrings = value;
        break;
      case '--mute-release-clean':
        flags.muteReleaseClean = value;
        break;
      case '--preload-stable':
        flags.preloadStable = value;
        break;
      case '--session-fallback-preserved':
        flags.sessionFallbackPreserved = value;
        break;
      case '--recording-capture-seconds':
        flags.recordingCaptureSeconds = value;
        break;
      case '--measurement-notes':
        flags.measurementNotes = value;
        break;
      default:
        return undefined;
    }
  }

  return flags;
}

function hasAllRequiredFlags(flags: ParsedFlags): flags is ParsedFlags & Record<RequiredFlag, string> {
  return REQUIRED_FLAGS.every((flag) => !!flags[flag]);
}

function buildD2ExpoAudioProbe(
  flags: ParsedFlags & Record<RequiredFlag, string>,
): Record<string, unknown> {
  return {
    candidate: 'expo-audio',
    evidenceSource: 'physical-device',
    deviceLabel: flags.deviceLabel,
    measuredAt: flags.measuredAt,
    measurementNotes: flags.measurementNotes,
    touchToSoundLatencyMs: Number(flags.touchLatencyMs),
    ...optionalNumber('firstTouchLatencyMs', flags.firstTouchLatencyMs),
    ...optionalNumber('steadyTouchLatencyMs', flags.steadyTouchLatencyMs),
    maxStableVoices: Number(flags.maxStableVoices),
    pitchBendSmooth: parseBoolean(flags.pitchBendSmooth),
    glissandoTriggeredStrings: Number(flags.glissandoTriggeredStrings),
    muteReleaseClean: parseBoolean(flags.muteReleaseClean),
    preloadStable: parseBoolean(flags.preloadStable),
    sessionFallbackPreserved: parseBoolean(flags.sessionFallbackPreserved),
    recordingCaptureSeconds: Number(flags.recordingCaptureSeconds),
  };
}

function optionalNumber<Field extends 'firstTouchLatencyMs' | 'steadyTouchLatencyMs'>(
  field: Field,
  value?: string,
): Pick<AudioEngineProbe, Field> | Record<string, never> {
  return value === undefined ? {} : { [field]: Number(value) } as Pick<AudioEngineProbe, Field>;
}

function parseBoolean(value: string): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}
