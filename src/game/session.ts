/**
 * A solo practice session: a run of laps on one track and mode.
 * `targetLaps` null means open practice with no lap limit.
 */
export interface Session {
  targetLaps: number | null;
  /** Finished lap times in ms, in order. */
  laps: number[];
}

/** Lap counts offered for solo practice. null = open practice. */
export const LAP_OPTIONS: readonly (number | null)[] = [3, 5, 10, null];

export function createSession(targetLaps: number | null): Session {
  if (targetLaps !== null && (!Number.isInteger(targetLaps) || targetLaps < 1)) {
    throw new Error(`Invalid lap count: ${targetLaps}`);
  }
  return { targetLaps, laps: [] };
}

export function addLap(session: Session, lapMs: number): Session {
  if (isComplete(session)) return session;
  return { ...session, laps: [...session.laps, lapMs] };
}

export function isComplete(session: Session): boolean {
  return session.targetLaps !== null && session.laps.length >= session.targetLaps;
}

/** Fastest lap so far, or null before the first lap. */
export function sessionBest(session: Session): number | null {
  return session.laps.length === 0 ? null : Math.min(...session.laps);
}

/** Index of the fastest lap (first one on a tie), or -1. */
export function sessionBestIndex(session: Session): number {
  const best = sessionBest(session);
  return best === null ? -1 : session.laps.indexOf(best);
}

export function totalTime(session: Session): number {
  return session.laps.reduce((sum, lap) => sum + lap, 0);
}

/** Lap number shown to the player for the lap being driven now (1-based). */
export function currentLapNumber(session: Session): number {
  return session.laps.length + 1;
}
