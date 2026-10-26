import { describe, expect, it } from 'vitest';

import { deltaBarFill, deltaKind, deltaMs, formatDelta, formatLapTime, liveDeltaMs } from './timing';

describe('formatLapTime', () => {
  it('formats minutes, seconds and hundredths', () => {
    expect(formatLapTime(0)).toBe('00:00.00');
    expect(formatLapTime(17_912)).toBe('00:17.91');
    expect(formatLapTime(62_370)).toBe('01:02.37');
  });

  it('truncates instead of rounding', () => {
    expect(formatLapTime(6_849)).toBe('00:06.84');
  });
});

describe('delta', () => {
  it('is null without a best lap', () => {
    expect(deltaMs(10_000, null)).toBeNull();
    expect(deltaKind(null)).toBe('none');
  });

  it('is negative when faster', () => {
    const delta = deltaMs(17_600, 17_910);
    expect(delta).toBe(-310);
    expect(deltaKind(delta)).toBe('improvement');
    expect(formatDelta(-310)).toBe('−0.31');
  });

  it('is positive when slower', () => {
    expect(deltaKind(840)).toBe('slower');
    expect(formatDelta(840)).toBe('+0.84');
    expect(formatDelta(12_345)).toBe('+12.34');
  });

  it('is equal when the same', () => {
    expect(deltaKind(0)).toBe('equal');
  });
});

describe('liveDeltaMs', () => {
  const reference = [1000, 2000, 3000];

  it('is null without a reference', () => {
    expect(liveDeltaMs([900], null, 950)).toBeNull();
    expect(liveDeltaMs([900], [], 950)).toBeNull();
  });

  it('is null before the first split while still ahead of the reference', () => {
    expect(liveDeltaMs([], reference, 500)).toBeNull();
  });

  it('grows before the first split once the reference time has passed', () => {
    expect(liveDeltaMs([], reference, 1300)).toBe(300);
  });

  it('compares splits at the same number', () => {
    expect(liveDeltaMs([800, 1700], reference, 1750)).toBe(-300);
    expect(liveDeltaMs([1200, 2400], reference, 2500)).toBe(400);
  });

  it('keeps growing between taps once the next reference split has passed', () => {
    // Ahead by 0.3 s at number 2, but the clock is already 0.5 s past reference number 3.
    expect(liveDeltaMs([800, 1700], reference, 3500)).toBe(500);
  });

  it('matches the lap delta at the finish', () => {
    expect(liveDeltaMs([900, 1900, 2800], reference, 2800)).toBe(-200);
  });
});

describe('deltaBarFill', () => {
  it('fills right when faster and left when slower', () => {
    expect(deltaBarFill(-500, 10000)).toBe(0.5);
    expect(deltaBarFill(500, 10000)).toBe(-0.5);
    expect(deltaBarFill(0, 10000)).toBe(0);
  });

  it('is empty with no reference or no delta', () => {
    expect(deltaBarFill(null, 10000)).toBe(0);
    expect(deltaBarFill(-300, null)).toBe(0);
  });

  it('clamps to the ends and keeps a sensible range on short and long laps', () => {
    expect(deltaBarFill(-5000, 10000)).toBe(1);
    expect(deltaBarFill(9000, 10000)).toBe(-1);
    // 2 s lap: range is the 0.5 s minimum.
    expect(deltaBarFill(250, 2000)).toBe(-0.5);
    // 60 s lap: range is the 3 s maximum.
    expect(deltaBarFill(-1500, 60000)).toBe(0.5);
  });
});
