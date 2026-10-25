import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

/** Web: sign-in survives reloads; Google sign-in opens a popup. */
export function createAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
}

/** Google sign-in works in the browser (PWA). The native app needs its own Google module later. */
export const googleSignInAvailable = true;
