import { chequeredFlagTime, finishCount, type RaceLength } from './length';
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
  /** Lap being driven (1-based), or laps completed once finished. */
  lap: number;
  /** Numbers cleared that count for the race. */
  cleared: number;
  finished: boolean;
  retired: boolean;
  /** Race time at the finish, or null while racing. */
  totalMs: number | null;
  /** Laps behind the winner at the finish (timed races), 0 when on the lead lap. */
  lapsDown: number;
  /** Gap to the leader at the same point of the race. Null for the leader or before the first number. */
  gapToLeader: number | null;
  gapToAhead: number | null;
  mistakes: number;
}

export interface StandingsResult {
  standings: Standing[];
  /** Timed races: race time of the leader's chequered flag, null before it. Always null for lap races. */
  flagTime: number | null;
}

/**
 * Sorts drivers by progress and works out the gaps.
 * `now` is the current race time; with it gaps keep growing for a driver who is
 * stuck on a number the car ahead has already cleared.
 */
export function raceStandings(
  drivers: readonly DriverProgress[],
  numbersPerLap: number,
  length: RaceLength,
  now?: number,
): StandingsResult {
  const flagTime = length.kind === 'time' ? chequeredFlagTime(drivers, numbersPerLap, length.ms) : null;
  const entries = drivers.map((driver) => {
    const finish = finishCount(driver.crossings, numbersPerLap, length, flagTime);
    const cap = length.kind === 'laps' ? length.laps * numbersPerLap : Infinity;
    const counted = driver.crossings.slice(0, finish ?? Math.min(driver.crossings.length, cap));
    return { driver, finish, counted };
  });

  entries.sort((a, b) => {
    if (!!a.driver.retired !== !!b.driver.retired) return a.driver.retired ? 1 : -1;
    const ca = a.counted.length;
    const cb = b.counted.length;
    if (ca !== cb) return cb - ca;
    if (ca === 0) return a.driver.name.localeCompare(b.driver.name);
    return a.counted[ca - 1] - b.counted[cb - 1];
  });

  const leader = entries[0];
  const leaderLaps = leader ? Math.floor(leader.counted.length / numbersPerLap) : 0;
  const standings = entries.map((entry, i) => {
    const { driver, finish, counted } = entry;
    const finished = finish !== null && !driver.retired;
    const gap = (other: (typeof entries)[number] | undefined) => {
      if (!other || other === entry || driver.retired) return null;
      return liveDeltaMs(counted, other.counted, finished ? undefined : now) ?? null;
    };
    const lapsDone = Math.floor(counted.length / numbersPerLap);
    const lapLimit = length.kind === 'laps' ? length.laps : Infinity;
    return {
      id: driver.id,
      name: driver.name,
      position: i + 1,
      lap: finished ? lapsDone : Math.min(lapsDone + 1, lapLimit),
      cleared: counted.length,
      finished,
      retired: !!driver.retired,
      totalMs: finished ? counted[counted.length - 1] : null,
      lapsDown: finished ? Math.max(0, leaderLaps - lapsDone) : 0,
      gapToLeader: i === 0 ? null : gap(leader),
      gapToAhead: i === 0 ? null : gap(entries[i - 1]),
      mistakes: driver.mistakes,
    };
  });
  return { standings, flagTime };
}

/** Lap race standings (kept for callers that only need the list). */
export function computeStandings(
  drivers: readonly DriverProgress[],
  numbersPerLap: number,
  totalLaps: number,
  now?: number,
): Standing[] {
  return raceStandings(drivers, numbersPerLap, { kind: 'laps', laps: totalLaps }, now).standings;
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
