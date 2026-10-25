import { FirebaseError } from 'firebase/app';
import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { get, ref, remove, runTransaction, set } from 'firebase/database';
import { create } from 'zustand';

import { normalizeNick } from '@/game';
import { mergeRecent, usePractice, type SessionSummary, type SoloTotals } from '@/store/practice';
import { careerOf, EMPTY_CAREER, useCareer, type Career } from '@/store/career';
import { useProfile } from '@/store/profile';
import { fasterLaps, useRecords, type BestLaps } from '@/store/records';

import { firebase, firebaseConfigured, signIn } from './firebase';

/** Who is signed in. Guests have an anonymous Firebase user; accounts have e-mail or Google. */
export interface AccountState {
  ready: boolean;
  uid: string | null;
  isGuest: boolean;
  email: string | null;
  provider: 'password' | 'google' | null;
  /** Signed in with an account that has no nick yet (first Google sign-in). */
  needsNick: boolean;
}

export const useAccount = create<AccountState>(() => ({
  ready: false,
  uid: null,
  isGuest: true,
  email: null,
  provider: null,
  needsNick: false,
}));

export class AccountError extends Error {}

/** Firebase keys cannot contain . # $ [ ] / so nicks are stored under a cleaned-up, lowercase key. */
export function nickKey(nick: string): string {
  return nick
    .trim()
    .toLowerCase()
    .replace(/[.#$[\]/\s]+/g, '_');
}

interface CloudData {
  bestLaps?: BestLaps;
  recent?: SessionSummary[];
  totals?: SoloTotals;
  career?: Career;
}

const isAccount = (user: User | null): boolean => !!user && !user.isAnonymous;
const dataRef = (uid: string) => ref(firebase().db, `users/${uid}/data`);
const profileRef = (uid: string) => ref(firebase().db, `users/${uid}/profile`);
const nickRef = (nick: string) => ref(firebase().db, `nicks/${nickKey(nick)}`);

/** RTDB rejects undefined and drops empty arrays; a JSON round trip keeps what it accepts. */
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function providerOf(user: User): AccountState['provider'] {
  return user.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'password';
}

function localData(): Required<CloudData> {
  const practice = usePractice.getState();
  return {
    bestLaps: useRecords.getState().bestLaps,
    recent: practice.recent,
    totals: practice.totals,
    career: careerOf(useCareer.getState()),
  };
}

function resetLocalData() {
  useRecords.getState().reset();
  usePractice.getState().reset();
  useCareer.getState().reset();
}

/**
 * Brings the account's cloud data onto the device. Guest progress on this device
 * (owner null) is added to the account; data from another account is dropped.
 */
async function pullAccount(user: User) {
  const [dataSnap, profileSnap] = await Promise.all([get(dataRef(user.uid)), get(profileRef(user.uid))]);
  const cloud = (dataSnap.val() ?? {}) as CloudData;
  const nick = (profileSnap.val()?.nick as string | undefined) ?? null;
  const profile = useProfile.getState();
  const owner = profile.ownerUid;

  if (owner !== null && owner !== user.uid) resetLocalData();
  const local = localData();
  const guestData = owner === null;
  const cloudCareer = { ...EMPTY_CAREER, ...cloud.career, history: cloud.career?.history ?? [] };
  const cloudTotals = cloud.totals ?? { sessions: 0, laps: 0, mistakes: 0 };

  useRecords.setState({ bestLaps: fasterLaps(cloud.bestLaps ?? {}, local.bestLaps) });
  usePractice.getState().load({
    recent: mergeRecent(cloud.recent ?? [], local.recent),
    totals: guestData
      ? {
          sessions: cloudTotals.sessions + local.totals.sessions,
          laps: cloudTotals.laps + local.totals.laps,
          mistakes: cloudTotals.mistakes + local.totals.mistakes,
        }
      : cloudTotals.sessions >= local.totals.sessions
        ? cloudTotals
        : local.totals,
  });
  useCareer.getState().load(cloudCareer.races >= local.career.races ? cloudCareer : local.career);
  useProfile.setState({ ownerUid: user.uid, nick: nick ?? profile.nick });
  useAccount.setState({ needsNick: nick === null });
  await pushAccount(user.uid);
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function pushAccount(uid: string) {
  const data = localData();
  const career = data.career;
  const nick = useProfile.getState().nick;
  await set(dataRef(uid), clean(data));
  if (nick) {
    await set(profileRef(uid), {
      nick,
      rating: career.rating,
      ratedRaces: career.ratedRaces,
      updatedAt: Date.now(),
    });
  }
}

function schedulePush() {
  const { uid, isGuest } = useAccount.getState();
  if (!uid || isGuest) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushAccount(uid).catch(() => {}), 1500);
}

let started = false;

/** Starts following sign-in changes and keeps the account's data in sync. Call once at app start. */
export function startAccountSync() {
  if (started || !firebaseConfigured) {
    useAccount.setState({ ready: true });
    return;
  }
  started = true;
  const { auth } = firebase();
  onAuthStateChanged(auth, (user) => {
    if (user && isAccount(user)) {
      useAccount.setState({
        ready: true,
        uid: user.uid,
        isGuest: false,
        email: user.email,
        provider: providerOf(user),
      });
      pullAccount(user).catch(() => {});
    } else {
      useAccount.setState({
        ready: true,
        uid: user?.uid ?? null,
        isGuest: true,
        email: null,
        provider: null,
        needsNick: false,
      });
    }
  });
  useRecords.subscribe(schedulePush);
  usePractice.subscribe(schedulePush);
  useCareer.subscribe(schedulePush);
  useProfile.subscribe(schedulePush);
}

/** Reserves a nick for this driver. Fails if someone else already has it. */
async function claimNick(nick: string, uid: string) {
  const result = await runTransaction(nickRef(nick), (current) =>
    current === null || current === uid ? uid : undefined,
  );
  if (!result.committed) throw new AccountError(`The nick “${nick}” is taken. Pick another one.`);
}

async function releaseNick(nick: string) {
  await remove(nickRef(nick)).catch(() => {});
}

function validNick(input: string): string {
  const nick = normalizeNick(input);
  if (!nick) throw new AccountError('Enter a nick.');
  if (nickKey(nick).replace(/_/g, '').length === 0)
    throw new AccountError('Use letters or numbers in your nick.');
  return nick;
}

/** Turns the guest into an account with e-mail and password, keeping everything driven so far. */
export async function createAccount(nickInput: string, email: string, password: string) {
  const nick = validNick(nickInput);
  try {
    const uid = await signIn();
    const user = firebase().auth.currentUser!;
    const owner = (await get(nickRef(nick))).val();
    if (owner !== null && owner !== uid)
      throw new AccountError(`The nick “${nick}” is taken. Pick another one.`);
    // Linking keeps the guest's uid, so everything driven as a guest stays with the account.
    await linkWithCredential(user, EmailAuthProvider.credential(email.trim(), password));
    // The token must say "password" (not "anonymous") before the rules accept the nick.
    await user.getIdToken(true);
    useAccount.setState({ isGuest: false, email: email.trim(), provider: 'password', uid });
    try {
      await claimNick(nick, uid);
    } catch (error) {
      useAccount.setState({ needsNick: true });
      throw error;
    }
    useProfile.setState({ nick, ownerUid: uid });
    useAccount.setState({ needsNick: false });
    await pushAccount(uid);
  } catch (error) {
    throw toAccountError(error);
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(firebase().auth, email.trim(), password);
  } catch (error) {
    throw toAccountError(error);
  }
}

/** Web only for now. New Google users pick a nick next (needsNick). */
export async function continueWithGoogle() {
  const { auth } = firebase();
  const provider = new GoogleAuthProvider();
  try {
    await signIn();
    const user = auth.currentUser!;
    try {
      await linkWithPopup(user, provider);
      await user.getIdToken(true);
      // onAuthStateChanged does not fire for linking; update state by hand.
      useAccount.setState({ isGuest: false, email: auth.currentUser?.email ?? null, provider: 'google' });
      await pullAccount(auth.currentUser!);
    } catch (error) {
      const credential =
        error instanceof FirebaseError ? GoogleAuthProvider.credentialFromError(error) : null;
      if (error instanceof FirebaseError && error.code === 'auth/credential-already-in-use' && credential) {
        await signInWithCredential(auth, credential);
        return;
      }
      throw error;
    }
  } catch (error) {
    throw toAccountError(error);
  }
}

export async function chooseNick(nickInput: string) {
  const nick = validNick(nickInput);
  const { uid } = useAccount.getState();
  if (!uid) throw new AccountError('Sign in first.');
  const previous = useProfile.getState().nick;
  try {
    await claimNick(nick, uid);
    if (previous && nickKey(previous) !== nickKey(nick)) await releaseNick(previous);
    useProfile.setState({ nick });
    useAccount.setState({ needsNick: false });
    await pushAccount(uid);
  } catch (error) {
    throw toAccountError(error);
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(firebase().auth, email.trim());
  } catch (error) {
    throw toAccountError(error);
  }
}

/** Signs out and clears this device. The account's data stays in the cloud. */
export async function signOutAccount() {
  await signOut(firebase().auth);
  resetLocalData();
  useProfile.setState({ ownerUid: null, nick: '' });
}

/** Deletes the account and all its data. */
export async function deleteAccount() {
  const { auth } = firebase();
  const user = auth.currentUser;
  if (!user || !isAccount(user)) return;
  const nick = useProfile.getState().nick;
  try {
    await remove(ref(firebase().db, `users/${user.uid}`));
    if (nick) await releaseNick(nick);
    await deleteUser(user);
  } catch (error) {
    throw toAccountError(error);
  }
  resetLocalData();
  useProfile.setState({ ownerUid: null, nick: '' });
}

function toAccountError(error: unknown): Error {
  if (error instanceof AccountError) return error;
  const code = error instanceof FirebaseError ? error.code : '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this e-mail already exists. Sign in instead.',
    'auth/credential-already-in-use': 'This sign-in is already used by another account. Sign in instead.',
    'auth/invalid-email': 'That e-mail address does not look right.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/missing-password': 'Enter your password.',
    'auth/invalid-credential': 'Wrong e-mail or password.',
    'auth/wrong-password': 'Wrong e-mail or password.',
    'auth/user-not-found': 'Wrong e-mail or password.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
    'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups and try again.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/requires-recent-login': 'For safety, sign out, sign in again and then delete the account.',
    'auth/operation-not-allowed': 'This sign-in method is not turned on in Firebase yet.',
    'auth/unauthorized-domain': 'This website is not on the Firebase list of allowed domains yet.',
    PERMISSION_DENIED: 'The server refused the change. Try again later.',
  };
  return new AccountError(messages[code] ?? 'Something went wrong. Try again.');
}
