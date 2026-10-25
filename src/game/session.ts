import { MAX_MINUTES, MIN_MINUTES, MINUTE_MS, type RaceLength } from './length';

/** One finished lap of a session. */
export interface LapRecord {
  /** Lap time in ms, penalties included. */
  ms: number;
  /** Split times of the lap (see LapState.splits). */
  splits: number[];
  mistakes: number;
}

/**
 * A solo practice session on one track and mode: a number of laps, or a time limit.
 * Laps run back to back, so the race clock is the sum of the lap times.
 */
export interface Session {
  length: RaceLength;
  laps: LapRecord[];
}

export const MIN_LAPS = 1;
export const MAX_LAPS = 99;

/** Parses the typed lap count. Returns null unless it is a whole number in range. */
export function parseLapCount(input: string): number | null {
  const text = input.trim();
  if (!/^\d+$/.test(text)) return null;
  const laps = Number(text);
  return laps >= MIN_LAPS && laps <= MAX_LAPS ? laps : null;
}

/** Accepts a RaceLength, or a lap count for short. */
export function createSession(length: RaceLength | number): Session {
  const target: RaceLength = typeof length === 'number' ? { kind: 'laps', laps: length } : length;
  if (target.kind === 'laps') {
    if (!Number.isInteger(target.laps) || target.laps < MIN_LAPS || target.laps > MAX_LAPS) {
      throw new Error(`Invalid lap count: ${target.laps}`);
    }
  } else if (target.ms < MIN_MINUTES * MINUTE_MS || target.ms > MAX_MINUTES * MINUTE_MS) {
    throw new Error(`Invalid time limit: ${target.ms}`);
  }
  return { length: target, laps: [] };
}

export function addLap(session: Session, lap: LapRecord): Session {
  if (isComplete(session)) return session;
  return { ...session, laps: [...session.laps, lap] };
}

/** Lap race: all laps done. Timed race: a lap ended on or after the time limit. */
export function isComplete(session: Session): boolean {
  if (session.length.kind === 'laps') return session.laps.length >= session.length.laps;
  return session.laps.length > 0 && totalTime(session) >= session.length.ms;
}

/** Lap number of the lap being driven now (1-based). */
export function currentLapNumber(session: Session): number {
  return session.laps.length + 1;
}

/** True while the next lap to drive is the last one. */
/**
 * True while the lap being driven is the last one.
 * Timed race: once the race clock (`raceNow`, penalties included) passes the limit.
 */
export function isFinalLap(session: Session, raceNow = totalTime(session)): boolean {
  if (isComplete(session)) return false;
  if (session.length.kind === 'laps') return session.laps.length === session.length.laps - 1;
  return raceNow >= session.length.ms;
}

/** Timed race: time left on the race clock (0 when up). Null for lap races. */
export function timeLeft(session: Session, raceNow: number): number | null {
  if (session.length.kind !== 'time') return null;
  return Math.max(0, session.length.ms - raceNow);
}

/** Index of the fastest lap (first one on a tie), or -1. */
export function sessionBestIndex(session: Session): number {
  let best = -1;
  session.laps.forEach((lap, i) => {
    if (best === -1 || lap.ms < session.laps[best].ms) best = i;
  });
  return best;
}

/** Fastest lap so far, or null before the first lap. */
export function sessionBest(session: Session): LapRecord | null {
  const i = sessionBestIndex(session);
  return i === -1 ? null : session.laps[i];
}

export function totalTime(session: Session): number {
  return session.laps.reduce((sum, lap) => sum + lap.ms, 0);
}
