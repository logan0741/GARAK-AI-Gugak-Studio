import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleSignInClient } from './googleIdentity';

export const googleNativeSignInClient: GoogleSignInClient = {
  configure({ webClientId }) {
    GoogleSignin.configure({ webClientId });
  },

  async signIn() {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    return GoogleSignin.signIn();
  },

  async signOut() {
    await GoogleSignin.signOut();
  },
};
