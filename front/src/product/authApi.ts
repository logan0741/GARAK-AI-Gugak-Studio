export type GarakAuthSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
};

export type GarakUser = {
  userId: string;
  email: string;
};

export class GarakAuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GarakAuthApiError';
    this.status = status;
  }
}

export type GarakAuthApi = {
  loginWithGoogleIdToken: (idToken: string) => Promise<GarakAuthSession>;
  getMe: (accessToken: string) => Promise<GarakUser>;
  refreshAccessToken: (refreshToken: string) => Promise<string>;
};

type CreateGarakAuthApiInput = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export function createGarakAuthApi({
  baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL,
  fetchImpl = fetch,
}: CreateGarakAuthApiInput = {}): GarakAuthApi {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  return {
    async loginWithGoogleIdToken(idToken) {
      const response = await postJson(fetchImpl, `${normalizedBaseUrl}/api/auth/google`, {
        id_token: idToken,
      });
      const body = await readJsonBody(response);

      if (!response.ok) {
        throw toAuthApiError(body, response.status);
      }

      return {
        accessToken: requireString(body.access_token, 'access_token'),
        refreshToken: requireString(body.refresh_token, 'refresh_token'),
        userId: requireString(body.user_id, 'user_id'),
        email: requireString(body.email, 'email'),
      };
    },

    async getMe(accessToken) {
      const response = await fetchImpl(`${normalizedBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const body = await readJsonBody(response);

      if (!response.ok) {
        throw toAuthApiError(body, response.status);
      }

      return {
        userId: requireString(body.user_id, 'user_id'),
        email: requireString(body.email, 'email'),
      };
    },

    async refreshAccessToken(refreshToken) {
      const response = await postJson(fetchImpl, `${normalizedBaseUrl}/api/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const body = await readJsonBody(response);

      if (!response.ok) {
        throw toAuthApiError(body, response.status);
      }

      return requireString(body.access_token, 'access_token');
    },
  };
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.trim();

  if (!trimmed) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required');
  }

  return trimmed.replace(/\/+$/, '');
}

function postJson(fetchImpl: typeof fetch, url: string, body: unknown): Promise<Response> {
  return fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}));
  return isRecord(body) ? body : {};
}

function toAuthApiError(body: Record<string, unknown>, status: number): GarakAuthApiError {
  return new GarakAuthApiError(
    typeof body.detail === 'string' && body.detail.length > 0
      ? body.detail
      : `Authentication request failed with status ${status}`,
    status,
  );
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new GarakAuthApiError(`Authentication response missing ${field}`, 0);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
