import { GarakAuthSession } from './authApi';

export type StoredAuthSession = GarakAuthSession;

export type AuthStoragePort = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
};

export type AuthSessionStore = {
  load: () => Promise<StoredAuthSession | null>;
  save: (session: StoredAuthSession) => Promise<void>;
  clear: () => Promise<void>;
};

export const GARAK_AUTH_SESSION_KEY = 'garak.auth.session';

export function createAuthSessionStore(storage: AuthStoragePort): AuthSessionStore {
  return {
    async load() {
      const raw = await storage.getItem(GARAK_AUTH_SESSION_KEY);

      if (raw === null) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw);
        return parseStoredAuthSession(parsed);
      } catch {
        return null;
      }
    },

    async save(session) {
      await storage.setItem(GARAK_AUTH_SESSION_KEY, JSON.stringify(session));
    },

    async clear() {
      await storage.deleteItem(GARAK_AUTH_SESSION_KEY);
    },
  };
}

function parseStoredAuthSession(value: unknown): StoredAuthSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const { accessToken, refreshToken, userId, email } = value;

  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof userId !== 'string' ||
    typeof email !== 'string'
  ) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    userId,
    email,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
