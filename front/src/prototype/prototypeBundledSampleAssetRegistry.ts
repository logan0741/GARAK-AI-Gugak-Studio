import { PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY } from './prototypeSampleManifest';

declare const require: (path: string) => number;

export const prototypeBundledSampleAssetModules: Record<string, number> = {
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-01.wav`]: require('../../assets/audio/gayageum-dev/string-01.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-02.wav`]: require('../../assets/audio/gayageum-dev/string-02.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-03.wav`]: require('../../assets/audio/gayageum-dev/string-03.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-04.wav`]: require('../../assets/audio/gayageum-dev/string-04.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-05.wav`]: require('../../assets/audio/gayageum-dev/string-05.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-06.wav`]: require('../../assets/audio/gayageum-dev/string-06.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-07.wav`]: require('../../assets/audio/gayageum-dev/string-07.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-08.wav`]: require('../../assets/audio/gayageum-dev/string-08.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-09.wav`]: require('../../assets/audio/gayageum-dev/string-09.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-10.wav`]: require('../../assets/audio/gayageum-dev/string-10.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-11.wav`]: require('../../assets/audio/gayageum-dev/string-11.wav'),
  [`${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-12.wav`]: require('../../assets/audio/gayageum-dev/string-12.wav'),
};
