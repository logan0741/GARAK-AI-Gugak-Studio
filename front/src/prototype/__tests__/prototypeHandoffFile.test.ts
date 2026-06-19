import { expect, test } from 'vitest';
import { parsePrototypeHandoffFile } from '../prototypeHandoffFile';

test('rejects handoff entries without an inspector draft object', () => {
  expect(
    parsePrototypeHandoffFile(
      {
        generatedAt: '2026-06-08T06:00:00.000Z',
        entries: [
          {
            inspectorDraft: null,
            measurements: {},
          },
        ],
      },
      'prototype-handoff.json',
    ),
  ).toEqual({
    ok: false,
    error: 'prototype-handoff.json entries[0].inspectorDraft must be an object',
  });
});

test('rejects handoff entries without a probe template object', () => {
  expect(
    parsePrototypeHandoffFile(
      {
        generatedAt: '2026-06-08T06:00:00.000Z',
        entries: [
          {
            inspectorDraft: {
              probeTemplate: null,
            },
            measurements: {},
          },
        ],
      },
      'prototype-handoff.json',
    ),
  ).toEqual({
    ok: false,
    error: 'prototype-handoff.json entries[0].inspectorDraft.probeTemplate must be an object',
  });
});
