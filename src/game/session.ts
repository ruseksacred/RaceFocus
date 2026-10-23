/** One finished lap of a session. */
export interface LapRecord {
  /** Lap time in ms, penalties included. */
  ms: number;
  /** Split times of the lap (see LapState.splits). */
  splits: number[];
  mistakes: number;
}

/** A solo practice session: a fixed number of laps on one track and mode. */
export interface Session {
  targetLaps: number;
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

export function createSession(targetLaps: number): Session {
  if (!Number.isInteger(targetLaps) || targetLaps < MIN_LAPS || targetLaps > MAX_LAPS) {
    throw new Error(`Invalid lap count: ${targetLaps}`);
  }
  return { targetLaps, laps: [] };
}

export function addLap(session: Session, lap: LapRecord): Session {
  if (isComplete(session)) return session;
  return { ...session, laps: [...session.laps, lap] };
}

export function isComplete(session: Session): boolean {
  return session.laps.length >= session.targetLaps;
}

/** Lap number of the lap being driven now (1-based). */
export function currentLapNumber(session: Session): number {
  return session.laps.length + 1;
}

/** True while the next lap to drive is the last one. */
export function isFinalLap(session: Session): boolean {
  return session.laps.length === session.targetLaps - 1;
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
