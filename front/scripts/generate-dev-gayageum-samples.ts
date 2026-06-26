import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { prototypeGayageumSampleManifest } from '../src/prototype/prototypeSampleManifest';

const SAMPLE_RATE = 44_100;
const DURATION_SECONDS = 0.45;
const CHANNEL_COUNT = 1;
const BITS_PER_SAMPLE = 16;
const MAX_AMPLITUDE = 0x7fff;

for (const asset of prototypeGayageumSampleManifest.assets) {
  const outputPath = join(process.cwd(), asset.fileUri);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, createSinePluckWav(asset.pitchHz));
}

function createSinePluckWav(frequencyHz: number): Buffer {
  const frameCount = Math.round(SAMPLE_RATE * DURATION_SECONDS);
  const dataSize = frameCount * CHANNEL_COUNT * (BITS_PER_SAMPLE / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNEL_COUNT, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNEL_COUNT * (BITS_PER_SAMPLE / 8), 28);
  buffer.writeUInt16LE(CHANNEL_COUNT * (BITS_PER_SAMPLE / 8), 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const t = frame / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.015);
    const decay = Math.exp(-7 * t);
    const sample = Math.sin(2 * Math.PI * frequencyHz * t) * attack * decay * 0.5;
    buffer.writeInt16LE(Math.round(sample * MAX_AMPLITUDE), 44 + frame * 2);
  }

  return buffer;
}
