import type { RoomRules } from './room';

/**
 * Quick race: a ranked 1-on-1 against a driver of similar rating, found through a queue.
 * Fixed rules for now: 1 minute on 3×3, 1 s per wrong tap, the third wrong tap is a DNF.
 */
export const QUICK_RULES: RoomRules = {
  track: 'sprint',
  mode: 'ascending',
  lengthKind: 'time',
  laps: 1,
  minutes: 1,
  penaltyMs: 1000,
  maxPlayers: 2,
  quick: true,
  dnfMistakes: 3,
};

/** Rating range at the start of a search, and how it widens while waiting. */
const START_RANGE = 100;
const RANGE_STEP = 50;
const RANGE_STEP_MS = 5000;
/** After this long without a match the player is offered a bot instead. */
export const BOT_OFFER_MS = 30_000;

/** A driver waiting in the queue. */
export interface QueueEntry {
  id: string;
  nick: string;
  rating: number;
  /** Server time the driver joined the queue. */
  joinedAt: number;
  helmet?: string;
  /** Room code once matched. */
  match?: string;
}

/** Widest rating gap accepted after waiting `waitMs`. */
export function matchRange(waitMs: number): number {
  return START_RANGE + RANGE_STEP * Math.floor(Math.max(0, waitMs) / RANGE_STEP_MS);
}

/**
 * The opponent this driver should claim now, or null.
 * Both drivers see the same queue and apply the same range (from whoever has waited longer),
 * and only the driver with the smaller id makes the claim, so two drivers never claim each
 * other at once. The closest rating wins; ties go to whoever has waited longer.
 */
export function pickOpponent(me: QueueEntry, queue: readonly QueueEntry[], now: number): QueueEntry | null {
  if (me.match) return null;
  let best: QueueEntry | null = null;
  for (const other of queue) {
    if (other.id === me.id || other.match || me.id > other.id) continue;
    const range = matchRange(now - Math.min(me.joinedAt, other.joinedAt));
    const gap = Math.abs(other.rating - me.rating);
    if (gap > range) continue;
    if (
      !best ||
      gap < Math.abs(best.rating - me.rating) ||
      (gap === Math.abs(best.rating - me.rating) && other.joinedAt < best.joinedAt)
    )
      best = other;
  }
  return best;
}

/** Whether a driver with this many wrong taps is out of the race. */
export function isDnf(mistakes: number, rules: Pick<RoomRules, 'dnfMistakes'>): boolean {
  return rules.dnfMistakes !== undefined && mistakes >= rules.dnfMistakes;
}
