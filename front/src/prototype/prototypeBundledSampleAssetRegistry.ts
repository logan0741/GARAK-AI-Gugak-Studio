import {
  prototypeBundledSampleAssetUris,
  type PrototypeBundledSampleAssetUri,
} from './prototypeBundledSampleAssetUris';

declare const require: (path: string) => number;

export const prototypeBundledSampleAssetModules: Record<string, number> &
  Record<PrototypeBundledSampleAssetUri, number> = {
  [prototypeBundledSampleAssetUris[0]]: require('../../assets/audio/gayageum-dev/string-01.wav'),
  [prototypeBundledSampleAssetUris[1]]: require('../../assets/audio/gayageum-dev/string-02.wav'),
  [prototypeBundledSampleAssetUris[2]]: require('../../assets/audio/gayageum-dev/string-03.wav'),
  [prototypeBundledSampleAssetUris[3]]: require('../../assets/audio/gayageum-dev/string-04.wav'),
  [prototypeBundledSampleAssetUris[4]]: require('../../assets/audio/gayageum-dev/string-05.wav'),
  [prototypeBundledSampleAssetUris[5]]: require('../../assets/audio/gayageum-dev/string-06.wav'),
  [prototypeBundledSampleAssetUris[6]]: require('../../assets/audio/gayageum-dev/string-07.wav'),
  [prototypeBundledSampleAssetUris[7]]: require('../../assets/audio/gayageum-dev/string-08.wav'),
  [prototypeBundledSampleAssetUris[8]]: require('../../assets/audio/gayageum-dev/string-09.wav'),
  [prototypeBundledSampleAssetUris[9]]: require('../../assets/audio/gayageum-dev/string-10.wav'),
  [prototypeBundledSampleAssetUris[10]]: require('../../assets/audio/gayageum-dev/string-11.wav'),
  [prototypeBundledSampleAssetUris[11]]: require('../../assets/audio/gayageum-dev/string-12.wav'),
};
