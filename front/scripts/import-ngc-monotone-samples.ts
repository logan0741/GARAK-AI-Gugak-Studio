import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  daegeumNgcMonotoneSampleManifest,
  jangguNgcMonotoneSampleManifest,
  NGC_MONOTONE_LICENSE_NOTE,
  NGC_MONOTONE_SOURCE_NAME,
} from '../src/product/livePerformanceBundledSamples';

const DOWNLOAD_URL = 'https://www.gugak.go.kr/digitaleum/cmmn/file/monotone/download.do';
const OUTPUT_CHANNELS = 1;
const OUTPUT_BITS_PER_SAMPLE = 16;
const OUTPUT_MAX_AMPLITUDE = 0x7fff;

type DownloadForm = {
  usePurposeGb: string;
  usePurpose: string;
  usePurposeDtl: string;
  companyName: string;
};

type WavAudio = {
  sampleRate: number;
  samples: Float32Array;
};

type ActiveSegment = {
  startFrame: number;
  endFrame: number;
  peak: number;
};

const defaultDownloadForm: DownloadForm = {
  usePurposeGb: process.env.NGC_MONOTONE_USE_PURPOSE_GB ?? '비상업용',
  usePurpose: process.env.NGC_MONOTONE_USE_PURPOSE ?? '어플리케이션 제작',
  usePurposeDtl:
    process.env.NGC_MONOTONE_USE_PURPOSE_DETAIL ??
    'GUKAK STUDIO S05 bundled sample integration',
  companyName: process.env.NGC_MONOTONE_COMPANY_NAME ?? 'HANTONE',
};

const jangguSources = [
  {
    mntnSeq: 2288,
    outputFileUri: jangguNgcMonotoneSampleManifest.assets[0].fileUri,
  },
  {
    mntnSeq: 2282,
    outputFileUri: jangguNgcMonotoneSampleManifest.assets[1].fileUri,
  },
  {
    mntnSeq: 2294,
    outputFileUri: jangguNgcMonotoneSampleManifest.assets[2].fileUri,
  },
] as const;

async function main(): Promise<void> {
  console.log(`Importing ${NGC_MONOTONE_SOURCE_NAME}`);
  console.log(NGC_MONOTONE_LICENSE_NOTE);

  for (const source of jangguSources) {
    const audio = parseWav(await downloadMonotoneWav(source.mntnSeq, defaultDownloadForm));
    const segment = selectPercussionSegment(audio);
    const sample = cropAndNormalize(audio, {
      startFrame: segment.startFrame,
      frameCount: secondsToFrames(audio.sampleRate, 1.1),
      fadeOutSeconds: 0.05,
    });

    writeWavAsset(source.outputFileUri, sample);
  }

  const daegeumScale = parseWav(await downloadMonotoneWav(2550, defaultDownloadForm));
  const daegeumSegments = selectDaegeumScaleSegments(daegeumScale);
  daegeumSegments.forEach((segment, index) => {
    const asset = daegeumNgcMonotoneSampleManifest.assets[index];
    const sample = cropAndNormalize(daegeumScale, {
      startFrame: segment.startFrame,
      frameCount: secondsToFrames(daegeumScale.sampleRate, 1.15),
      fadeOutSeconds: 0.12,
    });

    writeWavAsset(asset.fileUri, sample);
  });

  writeSourceReadme();
}

async function downloadMonotoneWav(mntnSeq: number, form: DownloadForm): Promise<Buffer> {
  const body = new URLSearchParams({
    id: String(mntnSeq),
    usePurposeGb: form.usePurposeGb,
    usePurpose: form.usePurpose,
    usePurposeDtl: form.usePurposeDtl,
    companyName: form.companyName,
  });

  const response = await fetch(DOWNLOAD_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`NGC monotone download failed for ${mntnSeq}: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!contentType.includes('audio') && !isRiffWave(buffer)) {
    throw new Error(`NGC monotone download for ${mntnSeq} did not return audio`);
  }

  return buffer;
}

function parseWav(buffer: Buffer): WavAudio {
  if (!isRiffWave(buffer)) {
    throw new Error('WAV file must start with RIFF/WAVE');
  }

  const fmt = findChunk(buffer, 'fmt ');
  const data = findChunk(buffer, 'data');
  const audioFormat = buffer.readUInt16LE(fmt.start);
  const channelCount = buffer.readUInt16LE(fmt.start + 2);
  const sampleRate = buffer.readUInt32LE(fmt.start + 4);
  const bitsPerSample = buffer.readUInt16LE(fmt.start + 14);
  const bytesPerSample = bitsPerSample / 8;
  const frameSize = channelCount * bytesPerSample;
  const frameCount = Math.floor(data.size / frameSize);
  const samples = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame += 1) {
    let mono = 0;
    for (let channel = 0; channel < channelCount; channel += 1) {
      const offset = data.start + frame * frameSize + channel * bytesPerSample;
      mono += readSample(buffer, offset, audioFormat, bitsPerSample);
    }
    samples[frame] = mono / channelCount;
  }

  return { sampleRate, samples };
}

function selectPercussionSegment(audio: WavAudio): ActiveSegment {
  const segments = detectActiveSegments(audio, {
    thresholdRatio: 0.04,
    windowSeconds: 0.01,
    minDurationSeconds: 0.08,
  });
  const segment = segments[0];
  if (segment === undefined) {
    throw new Error('Could not find an active percussion segment');
  }

  return {
    ...segment,
    startFrame: Math.max(0, segment.startFrame - secondsToFrames(audio.sampleRate, 0.02)),
  };
}

function selectDaegeumScaleSegments(audio: WavAudio): ActiveSegment[] {
  const segments = detectActiveSegments(audio, {
    thresholdRatio: 0.08,
    windowSeconds: 0.05,
    minDurationSeconds: 0.45,
  });
  const selectedSegments = segments.slice(-12).map((segment) => ({
    ...segment,
    startFrame: Math.max(0, segment.startFrame - secondsToFrames(audio.sampleRate, 0.04)),
  }));

  if (selectedSegments.length !== 12) {
    throw new Error(`Expected 12 daegeum scale segments, found ${selectedSegments.length}`);
  }

  return selectedSegments;
}

function detectActiveSegments(
  audio: WavAudio,
  options: {
    thresholdRatio: number;
    windowSeconds: number;
    minDurationSeconds: number;
  },
): ActiveSegment[] {
  const windowFrameCount = Math.max(1, secondsToFrames(audio.sampleRate, options.windowSeconds));
  const maxAmplitude = audio.samples.reduce(
    (currentMax, sample) => Math.max(currentMax, Math.abs(sample)),
    0,
  );
  const threshold = maxAmplitude * options.thresholdRatio;
  const segments: ActiveSegment[] = [];
  let currentSegment: ActiveSegment | undefined;

  for (let frame = 0; frame < audio.samples.length; frame += windowFrameCount) {
    const windowEndFrame = Math.min(audio.samples.length, frame + windowFrameCount);
    const peak = getPeak(audio.samples, frame, windowEndFrame);

    if (peak >= threshold) {
      if (currentSegment === undefined) {
        currentSegment = {
          startFrame: frame,
          endFrame: windowEndFrame,
          peak,
        };
      } else {
        currentSegment.endFrame = windowEndFrame;
        currentSegment.peak = Math.max(currentSegment.peak, peak);
      }
      continue;
    }

    if (currentSegment !== undefined) {
      pushSegmentIfLongEnough(audio, currentSegment, options.minDurationSeconds, segments);
      currentSegment = undefined;
    }
  }

  if (currentSegment !== undefined) {
    pushSegmentIfLongEnough(audio, currentSegment, options.minDurationSeconds, segments);
  }

  return segments;
}

function cropAndNormalize(
  audio: WavAudio,
  input: {
    startFrame: number;
    frameCount: number;
    fadeOutSeconds: number;
  },
): WavAudio {
  const frameCount = Math.min(input.frameCount, audio.samples.length - input.startFrame);
  const samples = new Float32Array(frameCount);
  const fadeOutFrameCount = secondsToFrames(audio.sampleRate, input.fadeOutSeconds);

  for (let index = 0; index < frameCount; index += 1) {
    const sourceSample = audio.samples[input.startFrame + index] ?? 0;
    const remainingFrames = frameCount - index;
    const fadeOut =
      remainingFrames >= fadeOutFrameCount || fadeOutFrameCount === 0
        ? 1
        : remainingFrames / fadeOutFrameCount;
    samples[index] = sourceSample * fadeOut;
  }

  const peak = getPeak(samples, 0, samples.length);
  if (peak > 0) {
    const gain = 0.92 / peak;
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = clampSample(samples[index] * gain);
    }
  }

  return {
    sampleRate: audio.sampleRate,
    samples,
  };
}

function writeWavAsset(fileUri: string, audio: WavAudio): void {
  const outputPath = join(process.cwd(), fileUri);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, createPcm16MonoWav(audio));
  console.log(`Wrote ${fileUri}`);
}

function createPcm16MonoWav(audio: WavAudio): Buffer {
  const dataSize = audio.samples.length * OUTPUT_CHANNELS * (OUTPUT_BITS_PER_SAMPLE / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(OUTPUT_CHANNELS, 22);
  buffer.writeUInt32LE(audio.sampleRate, 24);
  buffer.writeUInt32LE(audio.sampleRate * OUTPUT_CHANNELS * (OUTPUT_BITS_PER_SAMPLE / 8), 28);
  buffer.writeUInt16LE(OUTPUT_CHANNELS * (OUTPUT_BITS_PER_SAMPLE / 8), 32);
  buffer.writeUInt16LE(OUTPUT_BITS_PER_SAMPLE, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let frame = 0; frame < audio.samples.length; frame += 1) {
    buffer.writeInt16LE(
      Math.round(clampSample(audio.samples[frame]) * OUTPUT_MAX_AMPLITUDE),
      44 + frame * 2,
    );
  }

  return buffer;
}

function readSample(
  buffer: Buffer,
  offset: number,
  audioFormat: number,
  bitsPerSample: number,
): number {
  if (audioFormat === 3 && bitsPerSample === 32) {
    return clampSample(buffer.readFloatLE(offset));
  }

  if (audioFormat === 1 && bitsPerSample === 16) {
    return buffer.readInt16LE(offset) / 32768;
  }

  if (audioFormat === 1 && bitsPerSample === 24) {
    return readInt24LE(buffer, offset) / 8388608;
  }

  if (audioFormat === 1 && bitsPerSample === 32) {
    return buffer.readInt32LE(offset) / 2147483648;
  }

  throw new Error(`Unsupported WAV format: audioFormat=${audioFormat}, bitsPerSample=${bitsPerSample}`);
}

function findChunk(buffer: Buffer, id: string): { start: number; size: number } {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;

    if (chunkId === id) {
      return { start, size };
    }

    offset = start + size + (size % 2);
  }

  throw new Error(`WAV chunk missing: ${id}`);
}

function pushSegmentIfLongEnough(
  audio: WavAudio,
  segment: ActiveSegment,
  minDurationSeconds: number,
  segments: ActiveSegment[],
): void {
  if (segment.endFrame - segment.startFrame >= secondsToFrames(audio.sampleRate, minDurationSeconds)) {
    segments.push(segment);
  }
}

function getPeak(samples: Float32Array, startFrame: number, endFrame: number): number {
  let peak = 0;
  for (let frame = startFrame; frame < endFrame; frame += 1) {
    peak = Math.max(peak, Math.abs(samples[frame] ?? 0));
  }

  return peak;
}

function readInt24LE(buffer: Buffer, offset: number): number {
  const value = buffer.readUIntLE(offset, 3);
  return value & 0x800000 ? value | 0xff000000 : value;
}

function secondsToFrames(sampleRate: number, seconds: number): number {
  return Math.round(sampleRate * seconds);
}

function clampSample(sample: number): number {
  return Math.max(-1, Math.min(1, sample));
}

function isRiffWave(buffer: Buffer): boolean {
  return (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WAVE'
  );
}

function writeSourceReadme(): void {
  const outputPath = join(process.cwd(), 'assets/audio/ngc-monotone/SOURCE.md');
  const text = [
    '# NGC Monotone Samples',
    '',
    `Source: ${NGC_MONOTONE_SOURCE_NAME}`,
    'Source page: https://www.gugak.go.kr/digitaleum/front/monotone/list.do',
    `License: ${NGC_MONOTONE_LICENSE_NOTE}`,
    '',
    'Imported by `npm run samples:import-ngc`.',
    '',
    'Selected source ids:',
    '- Janggu kung: mntnSeq=2288, Janggu_3_1.wav',
    '- Janggu deong: mntnSeq=2282, Janggu_1_1.wav',
    '- Janggu deok: mntnSeq=2294, Janggu_5_1.wav',
    '- Sanjo daegeum scale: mntnSeq=2550, sanjo_deageum_scale_sus_04.wav',
    '',
  ].join('\n');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, text);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
