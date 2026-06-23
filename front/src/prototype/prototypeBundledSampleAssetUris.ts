import { PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY } from './prototypeSampleManifest';

export const prototypeBundledSampleAssetUris = [
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-01.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-02.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-03.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-04.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-05.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-06.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-07.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-08.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-09.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-10.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-11.wav`,
  `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-12.wav`,
] as const;

export type PrototypeBundledSampleAssetUri = (typeof prototypeBundledSampleAssetUris)[number];
