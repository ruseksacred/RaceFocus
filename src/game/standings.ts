import { liveDeltaMs } from './timing';

/**
 * Live race standings.
 *
 * Each driver reports crossings: the race time (ms since the start, penalties
 * included) at every number they clear, across all laps in order. Comparing
 * crossing times at the same point of the race gives F1-style gaps.
 */
export interface DriverProgress {
  id: string;
  name: string;
  crossings: number[];
  mistakes: number;
  /** Left the room before finishing. */
  retired?: boolean;
}

export interface Standing {
  id: string;
  name: string;
  position: number;
  /** Lap being driven, 1-based, capped at the race length. */
  lap: number;
  /** Numbers cleared across the race. */
  cleared: number;
  finished: boolean;
  retired: boolean;
  /** Race time at the finish, or null while racing. */
  totalMs: number | null;
  /** Gap to the leader at the same point of the race. Null for the leader or before the first number. */
  gapToLeader: number | null;
  gapToAhead: number | null;
  mistakes: number;
}

/**
 * Sorts drivers by progress and works out the gaps.
 * `now` is the current race time; with it gaps keep growing for a driver who is
 * stuck on a number the car ahead has already cleared.
 */
export function computeStandings(
  drivers: readonly DriverProgress[],
  numbersPerLap: number,
  totalLaps: number,
  now?: number,
): Standing[] {
  const total = numbersPerLap * totalLaps;
  const sorted = [...drivers].sort((a, b) => {
    if (!!a.retired !== !!b.retired) return a.retired ? 1 : -1;
    const ca = Math.min(a.crossings.length, total);
    const cb = Math.min(b.crossings.length, total);
    if (ca !== cb) return cb - ca;
    if (ca === 0) return a.name.localeCompare(b.name);
    return a.crossings[ca - 1] - b.crossings[cb - 1];
  });

  const leader = sorted[0];
  return sorted.map((driver, i) => {
    const cleared = Math.min(driver.crossings.length, total);
    const finished = cleared === total;
    const gap = (other: DriverProgress | undefined) => {
      if (!other || other === driver || driver.retired) return null;
      const reference = other.crossings.slice(0, total);
      return liveDeltaMs(driver.crossings.slice(0, total), reference, finished ? undefined : now) ?? null;
    };
    return {
      id: driver.id,
      name: driver.name,
      position: i + 1,
      lap: Math.min(Math.floor(cleared / numbersPerLap) + 1, totalLaps),
      cleared,
      finished,
      retired: !!driver.retired,
      totalMs: finished ? driver.crossings[total - 1] : null,
      gapToLeader: i === 0 ? null : gap(leader),
      gapToAhead: i === 0 ? null : gap(sorted[i - 1]),
      mistakes: driver.mistakes,
    };
  });
}

/** Lap times from crossings: the time between the last number of one lap and the next. */
export function lapTimesFromCrossings(crossings: readonly number[], numbersPerLap: number): number[] {
  const laps: number[] = [];
  for (let end = numbersPerLap - 1; end < crossings.length; end += numbersPerLap) {
    const start = end - numbersPerLap >= 0 ? crossings[end - numbersPerLap] : 0;
    laps.push(crossings[end] - start);
  }
  return laps;
}
