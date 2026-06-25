import { describe, expect, test } from 'vitest';
import { createAuthSessionStore, StoredAuthSession } from '../authSessionStore';

describe('auth session store', () => {
  test('saves and loads the current GARAK auth session', async () => {
    const storage = new MemoryStoragePort();
    const store = createAuthSessionStore(storage);
    const session: StoredAuthSession = {
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      userId: 'user-1',
      email: 'user@example.com',
    };

    await store.save(session);

    expect(await store.load()).toEqual(session);
    expect(storage.values.get('garak.auth.session')).toBe(JSON.stringify(session));
  });

  test('returns null for a missing or malformed stored session', async () => {
    const storage = new MemoryStoragePort();
    const store = createAuthSessionStore(storage);

    expect(await store.load()).toBeNull();

    storage.values.set('garak.auth.session', '{bad json');
    expect(await store.load()).toBeNull();

    storage.values.set('garak.auth.session', JSON.stringify({ accessToken: 'missing fields' }));
    expect(await store.load()).toBeNull();
  });

  test('clears the stored session', async () => {
    const storage = new MemoryStoragePort();
    const store = createAuthSessionStore(storage);

    await store.save({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      userId: 'user-1',
      email: 'user@example.com',
    });
    await store.clear();

    expect(await store.load()).toBeNull();
    expect(storage.values.has('garak.auth.session')).toBe(false);
  });
});

class MemoryStoragePort {
  values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async deleteItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}
