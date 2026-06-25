import { describe, expect, test, vi } from 'vitest';
import {
  createGoogleIdentityProvider,
  GoogleIdentityError,
  requireGoogleWebClientId,
} from '../googleIdentity';

describe('Google identity provider', () => {
  test('configures the Google client with the web client ID and returns an ID token', async () => {
    const client = {
      configure: vi.fn(),
      signIn: vi.fn(async () => ({ idToken: 'google.id.token' })),
      signOut: vi.fn(),
    };

    const provider = createGoogleIdentityProvider({
      webClientId: 'web-client-id.apps.googleusercontent.com',
      client,
    });

    await expect(provider.signInForIdToken()).resolves.toBe('google.id.token');
    expect(client.configure).toHaveBeenCalledWith({
      webClientId: 'web-client-id.apps.googleusercontent.com',
    });
  });

  test('reads an ID token from the native Google Sign-In success response', async () => {
    const client = {
      configure: vi.fn(),
      signIn: vi.fn(async () => ({
        type: 'success' as const,
        data: {
          idToken: 'native.google.id.token',
        },
      })),
      signOut: vi.fn(),
    };

    const provider = createGoogleIdentityProvider({
      webClientId: 'web-client-id.apps.googleusercontent.com',
      client,
    });

    await expect(provider.signInForIdToken()).resolves.toBe('native.google.id.token');
  });

  test('rejects a Google sign-in response without an ID token', async () => {
    const provider = createGoogleIdentityProvider({
      webClientId: 'web-client-id.apps.googleusercontent.com',
      client: {
        configure: vi.fn(),
        signIn: vi.fn(async () => ({ idToken: null })),
        signOut: vi.fn(),
      },
    });

    await expect(provider.signInForIdToken()).rejects.toMatchObject({
      name: 'GoogleIdentityError',
      message: 'Google sign-in did not return an ID token',
    } satisfies Partial<GoogleIdentityError>);
  });

  test('requires the public Google web client ID', () => {
    expect(() => requireGoogleWebClientId('')).toThrow(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required',
    );
    expect(requireGoogleWebClientId(' web-client-id.apps.googleusercontent.com ')).toBe(
      'web-client-id.apps.googleusercontent.com',
    );
  });
});
