export type GoogleSignInClient = {
  configure: (config: { webClientId: string }) => void | Promise<void>;
  signIn: () => Promise<GoogleSignInResponse>;
  signOut: () => Promise<void>;
};

export type GoogleSignInResponse =
  | {
      idToken?: string | null;
    }
  | {
      type: 'success';
      data: {
        idToken?: string | null;
      };
    }
  | {
      type: 'cancelled';
      data: null;
    };

export type GoogleIdentityProvider = {
  signInForIdToken: () => Promise<string>;
  signOut: () => Promise<void>;
};

export class GoogleIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleIdentityError';
  }
}

export function createGoogleIdentityProvider({
  webClientId,
  client,
}: {
  webClientId: string;
  client: GoogleSignInClient;
}): GoogleIdentityProvider {
  const normalizedWebClientId = requireGoogleWebClientId(webClientId);
  void client.configure({ webClientId: normalizedWebClientId });

  return {
    async signInForIdToken() {
      const response = await client.signIn();
      const idToken = readGoogleIdToken(response);

      if (typeof idToken !== 'string' || idToken.length === 0) {
        throw new GoogleIdentityError('Google sign-in did not return an ID token');
      }

      return idToken;
    },
    signOut: () => client.signOut(),
  };
}

function readGoogleIdToken(response: GoogleSignInResponse): string | null | undefined {
  if ('type' in response) {
    return response.type === 'success' ? response.data.idToken : null;
  }

  return response.idToken;
}

export function requireGoogleWebClientId(
  value = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required');
  }

  return trimmed;
}
