import { describe, expect, it } from 'vitest';

import {
  addLap,
  createSession,
  currentLapNumber,
  isComplete,
  sessionBest,
  sessionBestIndex,
  totalTime,
} from './session';

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
  });

  it('tracks the fastest lap and total time', () => {
    let s = createSession(3);
    s = addLap(s, 9000);
    s = addLap(s, 8000);
    s = addLap(s, 8500);
    expect(sessionBest(s)).toBe(8000);
    expect(sessionBestIndex(s)).toBe(1);
    expect(totalTime(s)).toBe(25_500);
  });

  it('completes after the target number of laps and ignores extra laps', () => {
    let s = createSession(2);
    s = addLap(s, 5000);
    expect(isComplete(s)).toBe(false);
    s = addLap(s, 4000);
    expect(isComplete(s)).toBe(true);
    expect(addLap(s, 3000).laps).toEqual([5000, 4000]);
  });

  it('never completes in open practice', () => {
    let s = createSession(null);
    for (let i = 0; i < 20; i++) s = addLap(s, 1000);
    expect(isComplete(s)).toBe(false);
    expect(currentLapNumber(s)).toBe(21);
  });

  it('picks the first lap on a tie', () => {
    let s = createSession(null);
    s = addLap(s, 7000);
    s = addLap(s, 7000);
    expect(sessionBestIndex(s)).toBe(0);
  });
});
