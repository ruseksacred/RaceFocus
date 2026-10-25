import { describe, expect, it } from 'vitest';

import { chequeredFlagTime, describeLength, finishCount, lapEndTimes, parseMinutes } from './length';
import { raceStandings } from './standings';

// 2 numbers per lap keeps the crossings short: lap ends are at indexes 1, 3, 5...
const N = 2;
const d = (id: string, crossings: number[], retired = false) => ({
  id,
  name: id,
  crossings,
  mistakes: 0,
  retired,
});
const timed = (ms: number) => ({ kind: 'time' as const, ms });

describe('parseMinutes and describeLength', () => {
  it('accepts 1 to 30 minutes', () => {
    expect(parseMinutes('5')).toBe(5);
    expect(parseMinutes('0')).toBeNull();
    expect(parseMinutes('31')).toBeNull();
    expect(parseMinutes('2.5')).toBeNull();
  });

  it('describes both kinds', () => {
    expect(describeLength({ kind: 'laps', laps: 1 })).toBe('1 lap');
    expect(describeLength({ kind: 'laps', laps: 5 })).toBe('5 laps');
    expect(describeLength(timed(300_000))).toBe('5 min');
  });
});

describe('lapEndTimes', () => {
  it('picks the last number of each lap', () => {
    expect(lapEndTimes([1, 2, 3, 4, 5], N)).toEqual([2, 4]);
  });
});

describe('chequeredFlagTime', () => {
  it('is null until the leader finishes the lap they are on when time runs out', () => {
    // Leader is on lap 3 at the limit (10) and has not ended it yet.
    expect(chequeredFlagTime([d('a', [3, 5, 7, 9, 10])], N, 10)).toBeNull();
  });

  it('is the leader’s first lap end after the time limit', () => {
    expect(chequeredFlagTime([d('a', [3, 5, 7, 9, 10, 12]), d('b', [4, 8, 11])], N, 10)).toBe(12);
  });

  it('ignores a slower driver who ends a lap first', () => {
    // b ends lap 2 at 11, but the leader a (more numbers by the limit) ends lap 3 at 13.
    expect(chequeredFlagTime([d('a', [2, 4, 6, 8, 9, 13]), d('b', [5, 6, 9, 11])], N, 10)).toBe(13);
  });

  it('moves to the next driver when the leader retires', () => {
    expect(chequeredFlagTime([d('a', [2, 4, 6, 8, 9], true), d('b', [5, 6, 9, 11])], N, 10)).toBe(11);
  });
});

describe('finishCount', () => {
  it('lap race: after the last lap', () => {
    expect(finishCount([1, 2, 3, 4], N, { kind: 'laps', laps: 2 }, null)).toBe(4);
    expect(finishCount([1, 2, 3], N, { kind: 'laps', laps: 2 }, null)).toBeNull();
  });

  it('timed race: first lap end on or after the flag', () => {
    expect(finishCount([3, 5, 7, 9, 11, 13], N, timed(10), 12)).toBe(6);
    expect(finishCount([3, 5, 7, 9, 11], N, timed(10), 12)).toBeNull();
    expect(finishCount([1, 2], N, timed(10), null)).toBeNull();
  });
});

describe('raceStandings in a timed race', () => {
  it('finishes the leader, then each driver at the end of their lap, ignoring later laps', () => {
    const { standings, flagTime } = raceStandings(
      [d('a', [2, 4, 6, 8, 9, 12, 13, 14]), d('b', [3, 5, 7, 11, 12, 14, 15, 16])],
      N,
      timed(10),
    );
    expect(flagTime).toBe(12);
    const [p1, p2] = standings;
    expect(p1).toMatchObject({ id: 'a', finished: true, totalMs: 12, lap: 3, lapsDown: 0 });
    // b ends a lap at 14 (after the flag): finishes with 3 laps too, behind a.
    expect(p2).toMatchObject({ id: 'b', finished: true, totalMs: 14, lap: 3, lapsDown: 0 });
  });

  it('marks lapped finishers', () => {
    const { standings } = raceStandings(
      [d('a', [1, 2, 3, 4, 5, 6, 11, 12]), d('b', [5, 10, 12, 13])],
      N,
      timed(10),
    );
    expect(standings[0]).toMatchObject({ id: 'a', lap: 4 });
    expect(standings[1]).toMatchObject({ id: 'b', finished: true, lap: 2, lapsDown: 2 });
  });

  it('keeps everyone racing before the flag', () => {
    const { standings, flagTime } = raceStandings([d('a', [3, 5, 7]), d('b', [4, 6])], N, timed(10));
    expect(flagTime).toBeNull();
    expect(standings.every((s) => !s.finished)).toBe(true);
    expect(standings[0].lap).toBe(2);
  });
});
