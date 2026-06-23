import { describe, expect, test, vi } from 'vitest';
import { GarakAuthApi, GarakAuthSession } from '../authApi';
import { AuthSessionStore } from '../authSessionStore';
import { GoogleIdentityProvider } from '../googleIdentity';
import { restoreAuthSession, signInWithGoogle } from '../authFlow';

const session: GarakAuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  userId: 'google-user-1',
  email: 'user@example.com',
};

describe('auth flow', () => {
  test('signs in with Google ID token and saves the GARAK session', async () => {
    const googleIdentity: GoogleIdentityProvider = {
      signInForIdToken: vi.fn(async () => 'google.id.token'),
      signOut: vi.fn(async () => undefined),
    };
    const authApi = createAuthApi({
      loginWithGoogleIdToken: vi.fn(async () => session),
    });
    const sessionStore = createSessionStore();

    const result = await signInWithGoogle({ googleIdentity, authApi, sessionStore });

    expect(googleIdentity.signInForIdToken).toHaveBeenCalledOnce();
    expect(authApi.loginWithGoogleIdToken).toHaveBeenCalledWith('google.id.token');
    expect(sessionStore.save).toHaveBeenCalledWith(session);
    expect(result.account).toEqual({
      status: 'loggedIn',
      userId: 'google-user-1',
      email: 'user@example.com',
    });
  });

  test('restores a valid stored session by checking /api/auth/me', async () => {
    const authApi = createAuthApi({
      getMe: vi.fn(async () => ({
        userId: 'google-user-1',
        email: 'fresh@example.com',
      })),
    });
    const sessionStore = createSessionStore({ load: vi.fn(async () => session) });

    const result = await restoreAuthSession({ authApi, sessionStore });

    expect(authApi.getMe).toHaveBeenCalledWith('access-token');
    expect(result?.session).toEqual({
      ...session,
      email: 'fresh@example.com',
    });
    expect(result?.account.email).toBe('fresh@example.com');
  });

  test('refreshes and resaves the session when the stored access token is stale', async () => {
    const authApi = createAuthApi({
      getMe: vi
        .fn()
        .mockRejectedValueOnce(new Error('expired'))
        .mockResolvedValueOnce({
          userId: 'google-user-1',
          email: 'fresh@example.com',
        }),
      refreshAccessToken: vi.fn(async () => 'new-access-token'),
    });
    const sessionStore = createSessionStore({ load: vi.fn(async () => session) });

    const result = await restoreAuthSession({ authApi, sessionStore });

    expect(authApi.refreshAccessToken).toHaveBeenCalledWith('refresh-token');
    expect(authApi.getMe).toHaveBeenLastCalledWith('new-access-token');
    expect(sessionStore.save).toHaveBeenCalledWith({
      ...session,
      accessToken: 'new-access-token',
      email: 'fresh@example.com',
    });
    expect(result?.session.accessToken).toBe('new-access-token');
  });

  test('clears the saved session when restore and refresh both fail', async () => {
    const authApi = createAuthApi({
      getMe: vi.fn(async () => {
        throw new Error('expired');
      }),
      refreshAccessToken: vi.fn(async () => {
        throw new Error('invalid refresh');
      }),
    });
    const sessionStore = createSessionStore({ load: vi.fn(async () => session) });

    await expect(restoreAuthSession({ authApi, sessionStore })).resolves.toBeNull();
    expect(sessionStore.clear).toHaveBeenCalledOnce();
  });
});

function createAuthApi(overrides: Partial<GarakAuthApi> = {}): GarakAuthApi {
  return {
    loginWithGoogleIdToken: vi.fn(async () => session),
    getMe: vi.fn(async () => ({
      userId: session.userId,
      email: session.email,
    })),
    refreshAccessToken: vi.fn(async () => session.accessToken),
    ...overrides,
  };
}

function createSessionStore(overrides: Partial<AuthSessionStore> = {}): AuthSessionStore {
  return {
    load: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    ...overrides,
  };
}
