import { expect, test } from 'vitest';

import { prototypeGayageumSampleManifest } from '../../prototype/prototypeSampleManifest';
import { createInitialGarakProductState } from '../garakProductState';
import { resolveInstrumentSampleStatuses } from '../instrumentSampleReadiness';

test('resolves product instrument sample states from available manifests and fallback coverage', () => {
  const statuses = resolveInstrumentSampleStatuses({
    sampleManifests: {
      gayageum: prototypeGayageumSampleManifest,
    },
    fallbackInstruments: ['janggu', 'daegeum'],
  });

  expect(statuses).toEqual({
    gayageum: 'ready',
    janggu: 'fallback',
    daegeum: 'fallback',
  });
});

test('initial product state can surface manifest-backed readiness instead of assuming all samples are ready', () => {
  const state = createInitialGarakProductState({
    sampleManifests: {
      gayageum: prototypeGayageumSampleManifest,
    },
    sampleFallbackInstruments: ['janggu', 'daegeum'],
  });

  expect(state.instrumentSampleStatuses).toEqual({
    gayageum: 'ready',
    janggu: 'fallback',
    daegeum: 'fallback',
  });
});

test('does not assume fallback coverage when no manifest or fallback is provided', () => {
  expect(resolveInstrumentSampleStatuses()).toEqual({
    gayageum: 'downloadRequired',
    janggu: 'downloadRequired',
    daegeum: 'downloadRequired',
  });
});

test('does not allow fallback to mask missing manifest-backed gayageum samples', () => {
  expect(
    resolveInstrumentSampleStatuses({
      fallbackInstruments: ['gayageum', 'janggu', 'daegeum'],
    }),
  ).toEqual({
    gayageum: 'downloadRequired',
    janggu: 'fallback',
    daegeum: 'fallback',
  });
});

test('does not treat a malformed gayageum manifest as ready', () => {
  const malformedManifest = {
    ...prototypeGayageumSampleManifest,
    assets: [
      ...prototypeGayageumSampleManifest.assets.slice(1),
      {
        ...prototypeGayageumSampleManifest.assets[0],
        id: 'dev-gayageum-string-13',
        stringIndex: 13,
      },
    ],
  };

  expect(
    resolveInstrumentSampleStatuses({
      sampleManifests: {
        gayageum: malformedManifest,
      },
      fallbackInstruments: [],
    }).gayageum,
  ).toBe('downloadRequired');
});

test('does not treat an invalid gayageum manifest as ready', () => {
  const invalidManifest = {
    ...prototypeGayageumSampleManifest,
    assets: prototypeGayageumSampleManifest.assets.map((asset, index) =>
      index === 0 ? { ...asset, fileUri: '' } : asset,
    ),
  };

  expect(
    resolveInstrumentSampleStatuses({
      sampleManifests: {
        gayageum: invalidManifest,
      },
      fallbackInstruments: [],
    }).gayageum,
  ).toBe('downloadRequired');
});
