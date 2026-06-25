import { GoogleIdentityError, GoogleSignInClient } from './googleIdentity';

const GOOGLE_IDENTITY_SCRIPT_ID = 'garak-google-identity-services';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

type GoogleCredentialResponse = {
  credential?: string;
};

type GooglePromptNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
};

type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
      disableAutoSelect: () => void;
    };
  };
};

let scriptLoadPromise: Promise<void> | null = null;

export function createGoogleWebIdentityClient(): GoogleSignInClient {
  let configuredWebClientId: string | null = null;

  return {
    configure({ webClientId }) {
      configuredWebClientId = webClientId;
    },

    async signIn() {
      if (configuredWebClientId === null) {
        throw new GoogleIdentityError('Google web client ID is not configured');
      }

      const webClientId = configuredWebClientId;
      await ensureGoogleIdentityServicesLoaded();

      return new Promise((resolve, reject) => {
        const google = getGoogleIdentityServices();
        let settled = false;

        google.accounts.id.initialize({
          client_id: webClientId,
          use_fedcm_for_prompt: true,
          callback(response) {
            settled = true;

            if (typeof response.credential === 'string' && response.credential.length > 0) {
              resolve({ idToken: response.credential });
              return;
            }

            reject(new GoogleIdentityError('Google web sign-in did not return an ID token'));
          },
        });

        google.accounts.id.prompt((notification) => {
          if (
            !settled &&
            (notification.isNotDisplayed?.() === true || notification.isSkippedMoment?.() === true)
          ) {
            settled = true;
            reject(new GoogleIdentityError('Google web sign-in prompt was not completed'));
          }
        });
      });
    },

    async signOut() {
      getGoogleIdentityServicesOrNull()?.accounts.id.disableAutoSelect();
    },
  };
}

async function ensureGoogleIdentityServicesLoaded(): Promise<void> {
  if (getGoogleIdentityServicesOrNull() !== null) {
    return;
  }

  if (typeof document === 'undefined') {
    throw new GoogleIdentityError('Google web sign-in requires a browser runtime');
  }

  if (scriptLoadPromise !== null) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID);

    if (existingScript !== null) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => rejectGoogleScriptLoad(reject), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => rejectGoogleScriptLoad(reject), { once: true });
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

function rejectGoogleScriptLoad(reject: (reason?: unknown) => void) {
  scriptLoadPromise = null;
  reject(new GoogleIdentityError('Failed to load Google Identity Services'));
}

function getGoogleIdentityServices(): GoogleIdentityServices {
  const google = getGoogleIdentityServicesOrNull();

  if (google === null) {
    throw new GoogleIdentityError('Google Identity Services is not loaded');
  }

  return google;
}

function getGoogleIdentityServicesOrNull(): GoogleIdentityServices | null {
  const maybeGlobal = globalThis as typeof globalThis & {
    google?: GoogleIdentityServices;
  };

  return maybeGlobal.google ?? null;
}
