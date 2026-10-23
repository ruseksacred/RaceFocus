import { describe, expect, it } from 'vitest';

import {
  accuracy,
  applyTap,
  createLap,
  elapsedMs,
  isCleared,
  lapTimeMs,
  nextTarget,
  replayLap,
  WRONG_TAP_PENALTY_MS,
  type Tap,
} from './lap';

const config = { size: 3, seed: 'test', mode: 'ascending' } as const;

function perfectTaps(count: number, step = 100): Tap[] {
  return Array.from({ length: count }, (_, i) => ({ value: i + 1, at: (i + 1) * step }));
}

describe('lap', () => {
  it('starts at the first target', () => {
    const lap = createLap(config);
    expect(nextTarget(lap)).toBe(1);
    expect(lapTimeMs(lap)).toBeNull();
  });

  it('starts at the highest number in descending mode', () => {
    expect(nextTarget(createLap({ ...config, mode: 'descending' }))).toBe(9);
  });

  it('advances on a correct tap', () => {
    const { state, result } = applyTap(createLap(config), { value: 1, at: 250 });
    expect(result).toBe('correct');
    expect(nextTarget(state)).toBe(2);
    expect(isCleared(state, 1)).toBe(true);
  });

  it('counts a wrong tap as a mistake and does not advance', () => {
    const { state, result } = applyTap(createLap(config), { value: 5, at: 250 });
    expect(result).toBe('wrong');
    expect(state.mistakes).toBe(1);
    expect(nextTarget(state)).toBe(1);
  });

  it('ignores taps on already cleared tiles', () => {
    const first = applyTap(createLap(config), { value: 1, at: 100 }).state;
    const { state, result } = applyTap(first, { value: 1, at: 200 });
    expect(result).toBe('ignored');
    expect(state.mistakes).toBe(0);
  });

  it('ignores invalid taps', () => {
    const lap = createLap(config);
    expect(applyTap(lap, { value: 0, at: 10 }).result).toBe('ignored');
    expect(applyTap(lap, { value: 10, at: 10 }).result).toBe('ignored');
    expect(applyTap(lap, { value: 1, at: -5 }).result).toBe('ignored');
    expect(applyTap(lap, { value: 1, at: Number.NaN }).result).toBe('ignored');
  });

  it('ignores taps that go back in time', () => {
    const first = applyTap(createLap(config), { value: 1, at: 500 }).state;
    expect(applyTap(first, { value: 2, at: 400 }).result).toBe('ignored');
  });

  it('finishes on the last correct tap and records the lap time', () => {
    const lap = replayLap(config, perfectTaps(9));
    expect(lap.finishedAt).toBe(900);
    expect(lapTimeMs(lap)).toBe(900);
    expect(accuracy(lap)).toBe(1);
  });

  it('adds a penalty for each wrong tap', () => {
    const taps: Tap[] = [
      { value: 1, at: 100 },
      { value: 7, at: 150 },
      { value: 8, at: 180 },
      ...perfectTaps(9).slice(1),
    ];
    const lap = replayLap(config, taps);
    expect(lap.mistakes).toBe(2);
    expect(lapTimeMs(lap)).toBe(900 + 2 * WRONG_TAP_PENALTY_MS);
    expect(accuracy(lap)).toBeCloseTo(9 / 11);
  });

  it('ignores taps after the finish', () => {
    const lap = replayLap(config, perfectTaps(9));
    expect(applyTap(lap, { value: 3, at: 1000 }).result).toBe('ignored');
  });

  it('includes penalties in the running time and freezes it at the finish', () => {
    const wrong = applyTap(createLap(config), { value: 4, at: 100 }).state;
    expect(elapsedMs(wrong, 300)).toBe(300 + WRONG_TAP_PENALTY_MS);

    const done = replayLap(config, perfectTaps(9));
    expect(elapsedMs(done, 5000)).toBe(900);
  });
});
