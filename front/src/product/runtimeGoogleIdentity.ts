import { Platform } from 'react-native';
import { createGoogleIdentityProvider, GoogleIdentityProvider } from './googleIdentity';
import { createGoogleWebIdentityClient } from './googleWebIdentityClient';

export async function createRuntimeGoogleIdentityProvider(
  webClientId: string,
): Promise<GoogleIdentityProvider> {
  const client =
    Platform.OS === 'web'
      ? createGoogleWebIdentityClient()
      : (await import('./googleNativeSignInClient')).googleNativeSignInClient;

  return createGoogleIdentityProvider({
    webClientId,
    client,
  });
}
