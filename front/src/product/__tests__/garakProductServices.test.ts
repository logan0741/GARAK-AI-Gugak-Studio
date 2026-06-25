import { describe, expect, test } from 'vitest';
import type { ProductLibraryState } from '../garakProductState';
import {
  createInMemoryGarakProductServices,
  createNoopGarakProductServices,
} from '../garakProductServices';

describe('Garak product service ports', () => {
  test('stores and reloads library snapshots through the public service contract', async () => {
    const services = createInMemoryGarakProductServices();
    const snapshot: ProductLibraryState = {
      works: [],
      exportedAudios: [],
      practiceResults: [],
    };

    await services.library.saveSnapshot(snapshot);

    await expect(services.library.loadSnapshot()).resolves.toEqual(snapshot);
  });

  test('keeps persisted library snapshots isolated from caller mutation', async () => {
    const services = createInMemoryGarakProductServices();
    const snapshot: ProductLibraryState = {
      works: [],
      exportedAudios: [],
      practiceResults: [],
    };

    await services.library.saveSnapshot(snapshot);
    snapshot.works.push({
      id: 'caller-mutation',
      title: 'Mutated Work',
      createdAt: '2026-06-25T00:00:00.000Z',
      updatedAt: '2026-06-25T00:00:00.000Z',
      source: 'free_creation',
      tracks: [],
      syncState: 'local_only',
    });

    await expect(services.library.loadSnapshot()).resolves.toEqual({
      works: [],
      exportedAudios: [],
      practiceResults: [],
    });
  });

  test('noop services expose unavailable backend and AI boundaries without throwing', async () => {
    const services = createNoopGarakProductServices();

    await expect(services.account.loginAndLoadLibrary()).resolves.toEqual({
      status: 'unavailable',
    });
    await expect(services.ai.recommendAccompaniment({ events: [] })).resolves.toEqual({
      status: 'unavailable',
    });
    await expect(services.share.publishShareTarget({ kind: 'practiceResult', id: 'practice-1' })).resolves.toEqual({
      status: 'unavailable',
    });
    await expect(services.audio.playPerformanceEvents([])).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
