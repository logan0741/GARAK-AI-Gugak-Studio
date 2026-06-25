import { describe, expect, test } from 'vitest';
import { createGarakAuthApi, GarakAuthApiError } from '../authApi';

describe('Garak auth API', () => {
  test('posts a Google ID token to the backend and returns GARAK tokens', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const api = createGarakAuthApi({
      baseUrl: 'http://localhost:8000',
      fetchImpl: async (url, init) => {
        requests.push({ url: String(url), init });
        return jsonResponse({
          access_token: 'access.jwt',
          refresh_token: 'refresh.jwt',
          user_id: 'google-user-1',
          email: 'user@example.com',
        });
      },
    });

    const session = await api.loginWithGoogleIdToken('google.id.token');

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('http://localhost:8000/api/auth/google');
    expect(requests[0].init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'google.id.token' }),
    });
    expect(session).toEqual({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      userId: 'google-user-1',
      email: 'user@example.com',
    });
  });

  test('loads the current user with an access token', async () => {
    const api = createGarakAuthApi({
      baseUrl: 'http://localhost:8000/',
      fetchImpl: async (url, init) => {
        expect(url).toBe('http://localhost:8000/api/auth/me');
        expect(init?.headers).toMatchObject({ Authorization: 'Bearer access.jwt' });
        return jsonResponse({ user_id: 'user-1', email: 'user@example.com' });
      },
    });

    await expect(api.getMe('access.jwt')).resolves.toEqual({
      userId: 'user-1',
      email: 'user@example.com',
    });
  });

  test('refreshes an access token with a refresh token', async () => {
    const api = createGarakAuthApi({
      baseUrl: 'http://localhost:8000',
      fetchImpl: async (_url, init) => {
        expect(init).toMatchObject({
          method: 'POST',
          body: JSON.stringify({ refresh_token: 'refresh.jwt' }),
        });
        return jsonResponse({ access_token: 'new.access.jwt' });
      },
    });

    await expect(api.refreshAccessToken('refresh.jwt')).resolves.toBe('new.access.jwt');
  });

  test('throws a typed error with backend detail when the backend rejects login', async () => {
    const api = createGarakAuthApi({
      baseUrl: 'http://localhost:8000',
      fetchImpl: async () => jsonResponse({ detail: 'Invalid or expired Google ID token' }, 401),
    });

    await expect(api.loginWithGoogleIdToken('bad')).rejects.toMatchObject({
      name: 'GarakAuthApiError',
      status: 401,
      message: 'Invalid or expired Google ID token',
    } satisfies Partial<GarakAuthApiError>);
  });

  test('requires an API base URL', () => {
    expect(() => createGarakAuthApi({ baseUrl: '   ', fetchImpl: async () => jsonResponse({}) })).toThrow(
      'EXPO_PUBLIC_API_BASE_URL is required',
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
