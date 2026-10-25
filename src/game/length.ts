/**
 * How long a race is: a number of laps, or a time limit.
 *
 * Timed races follow the motorsport rule: when the time is up, the leader
 * finishes the lap they are on and takes the chequered flag; every other driver
 * then finishes at the end of their own current lap.
 */
export type RaceLength = { kind: 'laps'; laps: number } | { kind: 'time'; ms: number };

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 30;
export const MINUTE_MS = 60_000;

export const lapsLength = (laps: number): RaceLength => ({ kind: 'laps', laps });
export const timeLength = (minutes: number): RaceLength => ({ kind: 'time', ms: minutes * MINUTE_MS });

/** Parses the typed minutes. Returns null unless a whole number in range. */
export function parseMinutes(input: string): number | null {
  const text = input.trim();
  if (!/^\d+$/.test(text)) return null;
  const minutes = Number(text);
  return minutes >= MIN_MINUTES && minutes <= MAX_MINUTES ? minutes : null;
}

/** "3 laps", "1 lap", "5 min". */
export function describeLength(length: RaceLength): string {
  if (length.kind === 'laps') return `${length.laps} ${length.laps === 1 ? 'lap' : 'laps'}`;
  return `${Math.round(length.ms / MINUTE_MS)} min`;
}

/** Race time at the end of each completed lap. */
export function lapEndTimes(crossings: readonly number[], numbersPerLap: number): number[] {
  const ends: number[] = [];
  for (let i = numbersPerLap - 1; i < crossings.length; i += numbersPerLap) ends.push(crossings[i]);
  return ends;
}

export interface LengthDriver {
  crossings: readonly number[];
  retired?: boolean;
}

/**
 * Timed race: race time when the leader takes the chequered flag, or null while it is not out yet.
 * The leader is whoever had cleared the most numbers when the time ran out (earliest wins a tie).
 * If that driver retires before finishing, the next one in that order is the leader.
 */
export function chequeredFlagTime(
  drivers: readonly LengthDriver[],
  numbersPerLap: number,
  limitMs: number,
): number | null {
  const atLimit = drivers
    .map((d) => {
      let count = 0;
      while (count < d.crossings.length && d.crossings[count] <= limitMs) count++;
      return { d, count, last: count > 0 ? d.crossings[count - 1] : 0 };
    })
    .sort((a, b) => b.count - a.count || a.last - b.last);
  for (const { d } of atLimit) {
    const end = lapEndTimes(d.crossings, numbersPerLap).find((t) => t >= limitMs);
    if (end !== undefined) return end;
    if (!d.retired) return null;
  }
  return null;
}

/**
 * Numbers cleared at this driver's finish, or null while still racing.
 * Laps: after the last lap. Time: at the first lap end on or after the chequered flag.
 */
export function finishCount(
  crossings: readonly number[],
  numbersPerLap: number,
  length: RaceLength,
  flagTime: number | null,
): number | null {
  if (length.kind === 'laps') {
    const total = length.laps * numbersPerLap;
    return crossings.length >= total ? total : null;
  }
  if (flagTime === null) return null;
  const ends = lapEndTimes(crossings, numbersPerLap);
  const lap = ends.findIndex((t) => t >= flagTime);
  return lap === -1 ? null : (lap + 1) * numbersPerLap;
}
