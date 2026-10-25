import { describe, expect, it } from 'vitest';

import {
  addLap,
  createSession,
  currentLapNumber,
  isComplete,
  isFinalLap,
  parseLapCount,
  timeLeft,
  sessionBest,
  sessionBestIndex,
  totalTime,
  type LapRecord,
} from './session';

const lap = (ms: number, mistakes = 0): LapRecord => ({ ms, splits: [ms], mistakes });

describe('parseLapCount', () => {
  it('accepts whole numbers from 1 to 99', () => {
    expect(parseLapCount('1')).toBe(1);
    expect(parseLapCount(' 12 ')).toBe(12);
    expect(parseLapCount('99')).toBe(99);
  });

  it('rejects anything else', () => {
    for (const input of ['', '0', '100', '-3', '2.5', 'abc', '5 laps']) {
      expect(parseLapCount(input)).toBeNull();
    }
  });
});

describe('session', () => {
  it('starts empty', () => {
    const s = createSession(3);
    expect(sessionBest(s)).toBeNull();
    expect(sessionBestIndex(s)).toBe(-1);
    expect(currentLapNumber(s)).toBe(1);
    expect(isComplete(s)).toBe(false);
  });

  it('rejects invalid lap counts', () => {
    expect(() => createSession(0)).toThrow();
    expect(() => createSession(2.5)).toThrow();
    expect(() => createSession(100)).toThrow();
  });

  it('tracks the fastest lap and total time', () => {
    let s = createSession(3);
    s = addLap(s, lap(9000));
    s = addLap(s, lap(8000));
    s = addLap(s, lap(8500));
    expect(sessionBest(s)?.ms).toBe(8000);
    expect(sessionBestIndex(s)).toBe(1);
    expect(totalTime(s)).toBe(25_500);
  });

  it('knows when the final lap is next', () => {
    let s = createSession(3);
    expect(isFinalLap(s)).toBe(false);
    s = addLap(s, lap(1000));
    s = addLap(s, lap(1000));
    expect(isFinalLap(s)).toBe(true);
    s = addLap(s, lap(1000));
    expect(isFinalLap(s)).toBe(false);
  });

  it('treats a one-lap session as a final lap from the start', () => {
    expect(isFinalLap(createSession(1))).toBe(true);
  });

  it('completes after the target number of laps and ignores extra laps', () => {
    let s = createSession(2);
    s = addLap(s, lap(5000));
    expect(isComplete(s)).toBe(false);
    s = addLap(s, lap(4000));
    expect(isComplete(s)).toBe(true);
    expect(addLap(s, lap(3000)).laps).toHaveLength(2);
  });

  it('picks the first lap on a tie', () => {
    let s = createSession(5);
    s = addLap(s, lap(7000));
    s = addLap(s, lap(7000));
    expect(sessionBestIndex(s)).toBe(0);
  });
});

describe('timed session', () => {
  const fiveSec = { kind: 'time' as const, ms: 60_000 };

  it('rejects limits outside 1 to 30 minutes', () => {
    expect(() => createSession({ kind: 'time', ms: 30_000 })).toThrow();
    expect(() => createSession({ kind: 'time', ms: 31 * 60_000 })).toThrow();
  });

  it('runs until a lap ends on or after the limit', () => {
    let s = createSession(fiveSec);
    s = addLap(s, lap(25_000));
    s = addLap(s, lap(25_000));
    expect(isComplete(s)).toBe(false);
    // 50 s on the clock: still racing, not the final lap yet.
    expect(isFinalLap(s, 55_000)).toBe(false);
    // Time is up during lap 3: that lap is the last one.
    expect(isFinalLap(s, 61_000)).toBe(true);
    s = addLap(s, lap(25_000));
    expect(isComplete(s)).toBe(true);
    expect(addLap(s, lap(1000)).laps).toHaveLength(3);
  });

  it('reports the time left', () => {
    const s = createSession(fiveSec);
    expect(timeLeft(s, 20_000)).toBe(40_000);
    expect(timeLeft(s, 70_000)).toBe(0);
    expect(timeLeft(createSession(3), 1000)).toBeNull();
  });
});
