import {
  get,
  limitToFirst,
  onValue,
  orderByChild,
  query,
  ref,
  remove,
  runTransaction,
  update,
} from 'firebase/database';

import {
  boardKey,
  MODES,
  parseEntry,
  TRACKS,
  type LeaderboardEntry,
  type Mode,
  type TrackId,
} from '@/game';
import { useProfile } from '@/store/profile';

import { firebase, signIn } from './firebase';

/** How many drivers a leaderboard shows. */
export const LEADERBOARD_SIZE = 50;

const ALL_BOARDS = TRACKS.flatMap((t) => MODES.map((m) => boardKey(t.id, m)));
const boardRef = (key: string) => ref(firebase().db, `leaderboards/${key}`);
const rowRef = (key: string, uid: string) => ref(firebase().db, `leaderboards/${key}/${uid}`);

/** Only signed-in accounts (unique nicks) get on the leaderboard. */
function accountUid(): string | null {
  const user = firebase().auth.currentUser;
  return user && !user.isAnonymous ? user.uid : null;
}

export interface BoardView {
  /** Fastest first, at most LEADERBOARD_SIZE. */
  top: LeaderboardEntry[];
  /** This driver's own row, also when outside the top. */
  mine: LeaderboardEntry | null;
}

/** Live leaderboard for one track and mode. Returns a function that stops watching. */
export function watchBoard(
  track: TrackId,
  mode: Mode,
  onChange: (view: BoardView) => void,
  onError: () => void,
): () => void {
  const key = boardKey(track, mode);
  let stopped = false;
  const stops: (() => void)[] = [];
  let top: LeaderboardEntry[] = [];
  let mine: LeaderboardEntry | null = null;
  signIn()
    .then((uid) => {
      if (stopped) return;
      stops.push(
        onValue(
          query(boardRef(key), orderByChild('ms'), limitToFirst(LEADERBOARD_SIZE)),
          (snap) => {
            const rows: LeaderboardEntry[] = [];
            snap.forEach((child) => {
              const entry = parseEntry(child.key!, child.val());
              if (entry) rows.push(entry);
            });
            top = rows;
            onChange({ top, mine });
          },
          onError,
        ),
        onValue(
          rowRef(key, uid),
          (snap) => {
            mine = parseEntry(uid, snap.val());
            onChange({ top, mine });
          },
          () => {},
        ),
      );
    })
    .catch(onError);
  return () => {
    stopped = true;
    stops.forEach((stop) => stop());
  };
}

/**
 * Saves a lap from an online race if it beats this driver's record on the board.
 * Does nothing for guests. Never throws: a failed save must not disturb the results screen.
 */
export async function submitRecord(track: TrackId, mode: Mode, ms: number): Promise<void> {
  const uid = accountUid();
  const { nick, helmet } = useProfile.getState();
  if (!uid || !nick) return;
  await runTransaction(rowRef(boardKey(track, mode), uid), (current: { ms?: number } | null) => {
    if (current && typeof current.ms === 'number' && current.ms <= ms) return undefined;
    return { name: nick, ms, at: Date.now(), ...(helmet ? { helmet } : {}) };
  }).catch(() => {});
}

/** After a nick or helmet change, updates them on every board this driver is on. */
export async function refreshMyRecords(): Promise<void> {
  const uid = accountUid();
  const { nick, helmet } = useProfile.getState();
  if (!uid || !nick) return;
  try {
    const rows = await Promise.all(ALL_BOARDS.map((key) => get(rowRef(key, uid))));
    const changes: Record<string, unknown> = {};
    rows.forEach((snap, i) => {
      if (!snap.exists()) return;
      changes[`${ALL_BOARDS[i]}/${uid}/name`] = nick;
      changes[`${ALL_BOARDS[i]}/${uid}/helmet`] = helmet;
    });
    if (Object.keys(changes).length) await update(ref(firebase().db, 'leaderboards'), changes);
  } catch {
    // The old name stays until the next record; nothing else depends on it.
  }
}

/** Removes this driver from every leaderboard (when the account is deleted). */
export async function removeMyRecords(uid: string): Promise<void> {
  await Promise.all(ALL_BOARDS.map((key) => remove(rowRef(key, uid)).catch(() => {})));
}
