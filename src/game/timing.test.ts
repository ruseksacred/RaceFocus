import { describe, expect, it } from 'vitest';

import { deltaKind, deltaMs, formatDelta, formatLapTime } from './timing';

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
