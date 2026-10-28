import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';

// Exported only by the React Native build of firebase/auth, so it is missing from the web types.
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => firebaseAuth.Persistence;
};

/** Phones: sign-in survives app restarts. */
export function createAuth(app: FirebaseApp): firebaseAuth.Auth {
  return firebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

/**
 * OAuth "Web client" ID of the Firebase project (Authentication → Google → Web SDK configuration).
 * Google returns an ID token for this client, which Firebase accepts.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export const googleSignInAvailable = WEB_CLIENT_ID !== '';

let configured = false;

/**
 * Native Google sign-in: shows the account picker and returns a Firebase credential,
 * or null when the player closes the picker.
 */
export async function googleCredential(): Promise<firebaseAuth.AuthCredential | null> {
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always ask which account, so a player with several can pick another one.
    await GoogleSignin.signOut().catch(() => {});
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response) || !response.data.idToken) return null;
    return firebaseAuth.GoogleAuthProvider.credential(response.data.idToken);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw error;
  }
}
