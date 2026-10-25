import AsyncStorage from '@react-native-async-storage/async-storage';
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

/** Google sign-in in the native app needs a native Google module; added with the Play build. */
export const googleSignInAvailable = false;
