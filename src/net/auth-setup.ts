import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
  type AuthCredential,
} from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

/** Web: sign-in survives reloads; Google sign-in opens a popup. */
export function createAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
}

/** Google sign-in works in the browser (PWA) through a popup. */
export const googleSignInAvailable = true;

/** Web uses the popup flow in account.ts instead; only the native app returns a credential here. */
export async function googleCredential(): Promise<AuthCredential | null> {
  return null;
}
