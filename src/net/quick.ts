import {
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
} from 'firebase/database';

import { generateRoomCode, QUICK_RULES, type QueueEntry } from '@/game';
import { useCareer } from '@/store/career';
import { useProfile } from '@/store/profile';

import { firebase, signIn } from './firebase';
import { createRoomWithCode } from './rooms';

/**
 * Matchmaking for quick races, without a server: drivers wait in queue/quick, each client
 * looks for an opponent (see `pickOpponent`), and the one with the smaller id claims the pair
 * with two transactions (its own entry first, then the opponent's), then creates the room.
 * The opponent sees the room code in its entry and joins.
 */

const queueRef = () => ref(firebase().db, 'queue/quick');
const entryRef = (uid: string) => ref(firebase().db, `queue/quick/${uid}`);
const matchRef = (uid: string) => ref(firebase().db, `queue/quick/${uid}/match`);

/** Puts this driver (an account) in the queue. Leaving the app removes the entry. */
export async function joinQueue(): Promise<string> {
  const uid = await signIn();
  const { nick, helmet } = useProfile.getState();
  await set(entryRef(uid), {
    nick,
    rating: Math.round(useCareer.getState().rating),
    joinedAt: serverTimestamp(),
    ...(helmet ? { helmet } : {}),
  });
  await onDisconnect(entryRef(uid)).remove();
  return uid;
}

export async function leaveQueue(uid: string): Promise<void> {
  await onDisconnect(entryRef(uid)).cancel().catch(() => {});
  await remove(entryRef(uid)).catch(() => {});
}

/** Everyone waiting, including this driver. */
export function watchQueue(onChange: (queue: QueueEntry[]) => void, onError: () => void): () => void {
  return onValue(
    queueRef(),
    (snap) => {
      const queue: QueueEntry[] = [];
      snap.forEach((child) => {
        const v = child.val() as Partial<QueueEntry> | null;
        if (v && typeof v.nick === 'string' && typeof v.rating === 'number' && typeof v.joinedAt === 'number')
          queue.push({
            id: child.key!,
            nick: v.nick,
            rating: v.rating,
            joinedAt: v.joinedAt,
            helmet: typeof v.helmet === 'string' ? v.helmet : undefined,
            match: typeof v.match === 'string' ? v.match : undefined,
          });
      });
      onChange(queue);
    },
    onError,
  );
}

/**
 * Claims `opponent` for a quick race. Returns the room code, or null when someone else was
 * faster (the driver stays in the queue and keeps looking).
 */
export async function claimOpponent(uid: string, opponent: QueueEntry): Promise<string | null> {
  const code = generateRoomCode();
  // Lock this driver first, so nobody claims them meanwhile.
  const mine = await runTransaction(matchRef(uid), (current) => (current === null ? code : undefined));
  if (!mine.committed) return null;
  const theirs = await runTransaction(matchRef(opponent.id), (current) => (current === null ? code : undefined));
  if (!theirs.committed) {
    await set(matchRef(uid), null);
    return null;
  }
  const { nick } = useProfile.getState();
  if (!(await createRoomWithCode(code, nick, QUICK_RULES))) {
    // Code taken (very rare): free this driver; the opponent gives up waiting on its own.
    await set(matchRef(uid), null);
    return null;
  }
  return code;
}

/** Back to searching after a match fell through. */
export function clearMatch(uid: string): Promise<void> {
  return set(matchRef(uid), null);
}
