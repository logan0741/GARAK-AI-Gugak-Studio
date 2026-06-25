import { GarakAuthApi, GarakAuthSession, GarakUser } from './authApi';
import { AuthSessionStore } from './authSessionStore';
import { AccountState } from './garakProductState';
import { GoogleIdentityProvider } from './googleIdentity';

export type LoggedInAuthFlowResult = {
  session: GarakAuthSession;
  account: Extract<AccountState, { status: 'loggedIn' }>;
};

export async function signInWithGoogle({
  googleIdentity,
  authApi,
  sessionStore,
}: {
  googleIdentity: GoogleIdentityProvider;
  authApi: GarakAuthApi;
  sessionStore: AuthSessionStore;
}): Promise<LoggedInAuthFlowResult> {
  const idToken = await googleIdentity.signInForIdToken();
  const session = await authApi.loginWithGoogleIdToken(idToken);
  await sessionStore.save(session);

  return toAuthFlowResult(session);
}

export async function restoreAuthSession({
  authApi,
  sessionStore,
}: {
  authApi: GarakAuthApi;
  sessionStore: AuthSessionStore;
}): Promise<LoggedInAuthFlowResult | null> {
  const storedSession = await sessionStore.load();

  if (storedSession === null) {
    return null;
  }

  try {
    const user = await authApi.getMe(storedSession.accessToken);
    return toAuthFlowResult(mergeSessionUser(storedSession, user));
  } catch {
    return refreshStoredSession(authApi, sessionStore, storedSession);
  }
}

async function refreshStoredSession(
  authApi: GarakAuthApi,
  sessionStore: AuthSessionStore,
  storedSession: GarakAuthSession,
): Promise<LoggedInAuthFlowResult | null> {
  try {
    const accessToken = await authApi.refreshAccessToken(storedSession.refreshToken);
    const user = await authApi.getMe(accessToken);
    const refreshedSession = mergeSessionUser(
      {
        ...storedSession,
        accessToken,
      },
      user,
    );

    await sessionStore.save(refreshedSession);
    return toAuthFlowResult(refreshedSession);
  } catch {
    await sessionStore.clear();
    return null;
  }
}

function toAuthFlowResult(session: GarakAuthSession): LoggedInAuthFlowResult {
  return {
    session,
    account: {
      status: 'loggedIn',
      userId: session.userId,
      email: session.email,
    },
  };
}

function mergeSessionUser(session: GarakAuthSession, user: GarakUser): GarakAuthSession {
  return {
    ...session,
    userId: user.userId,
    email: user.email,
  };
}
