import { Asset } from 'expo-asset';
import type { PrototypeSampleAssetResolver } from '../prototype/prototypeNativeSamplerEngineFactory';
import {
  daegeumNgcMonotoneSampleManifest,
  jangguNgcMonotoneSampleManifest,
} from './livePerformanceBundledSamples';

declare const require: (path: string) => number;

const livePerformanceBundledSampleAssetModules: Record<string, number> = {
  [jangguNgcMonotoneSampleManifest.assets[0].fileUri]: require('../../assets/audio/ngc-monotone/janggu/kung-strong.wav'),
  [jangguNgcMonotoneSampleManifest.assets[1].fileUri]: require('../../assets/audio/ngc-monotone/janggu/deong-strong.wav'),
  [jangguNgcMonotoneSampleManifest.assets[2].fileUri]: require('../../assets/audio/ngc-monotone/janggu/deok-strong.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[0].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-01.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[1].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-02.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[2].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-03.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[3].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-04.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[4].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-05.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[5].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-06.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[6].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-07.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[7].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-08.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[8].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-09.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[9].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-10.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[10].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-11.wav'),
  [daegeumNgcMonotoneSampleManifest.assets[11].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-12.wav'),
};

export function createLivePerformanceBundledSampleAssetResolver(): PrototypeSampleAssetResolver {
  return {
    async resolveFileUri(fileUri) {
      const moduleId = livePerformanceBundledSampleAssetModules[fileUri];

      if (moduleId === undefined) {
        throw new Error(`No bundled live performance sample module for ${fileUri}`);
      }

      const asset = Asset.fromModule(moduleId);
      await asset.downloadAsync();

      const resolvedUri = asset.localUri ?? asset.uri;
      if (!resolvedUri) {
        throw new Error(`Bundled live performance sample did not resolve to a URI: ${fileUri}`);
      }

      return resolvedUri;
    },
  };
}
