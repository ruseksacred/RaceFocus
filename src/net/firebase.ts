import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  inMemoryPersistence,
  initializeAuth,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, onValue, ref, type Database } from 'firebase/database';

/**
 * Firebase setup for private rooms.
 *
 * Uses the RaceFocus project below; EXPO_PUBLIC_FIREBASE_* variables (see .env.example) override it.
 * With EXPO_PUBLIC_FIREBASE_EMULATOR_HOST set, the app talks to the local
 * emulators instead (`npm run emulators`), no Firebase project needed.
 */
/**
 * The RaceFocus Firebase project. Web config is not secret (it ships in every web app);
 * access is controlled by database.rules.json. EXPO_PUBLIC_FIREBASE_* variables override it.
 */
const PROJECT = {
  apiKey: 'AIzaSyC3WYoe4kmybR9LWtY4Y71ItUmdb7PnmmI',
  authDomain: 'racefocus-b709c.firebaseapp.com',
  databaseURL: 'https://racefocus-b709c-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'racefocus-b709c',
  appId: '1:747969436231:web:e3561b69da65cae1c3af62',
};

const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
const DEMO_PROJECT = 'demo-racefocus';

const config = emulatorHost
  ? {
      apiKey: 'demo-key',
      projectId: DEMO_PROJECT,
      databaseURL: `http://${emulatorHost}:9000?ns=${DEMO_PROJECT}-default-rtdb`,
      appId: 'demo-app',
    }
  : {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || PROJECT.apiKey,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || PROJECT.authDomain,
      databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || PROJECT.databaseURL,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || PROJECT.projectId,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || PROJECT.appId,
    };

/** False when no Firebase project or emulator is set up; rooms are then unavailable. */
export const firebaseConfigured = Boolean(config.apiKey && config.databaseURL && config.projectId);

interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Database;
}

let handles: FirebaseHandles | null = null;
let serverOffsetMs = 0;

export function firebase(): FirebaseHandles {
  if (!firebaseConfigured) throw new Error('Firebase is not configured');
  if (handles) return handles;
  const app = getApps()[0] ?? initializeApp(config);
  // In-memory sign-in: a fresh anonymous driver each time the app starts. Fine until accounts exist.
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  const db = getDatabase(app);
  if (emulatorHost) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectDatabaseEmulator(db, emulatorHost, 9000);
  }
  // Server clock offset, so every phone counts down to the same start.
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    serverOffsetMs = Number(snap.val()) || 0;
  });
  handles = { app, auth, db };
  return handles;
}

/** Signs in anonymously if needed and returns the driver's id. */
export async function signIn(): Promise<string> {
  const { auth } = firebase();
  if (auth.currentUser) return auth.currentUser.uid;
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

export function currentUid(): string | null {
  return handles?.auth.currentUser?.uid ?? null;
}

/** Current time on the server clock, in ms. */
export function serverNow(): number {
  return Date.now() + serverOffsetMs;
}
