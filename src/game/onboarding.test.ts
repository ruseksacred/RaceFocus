import { describe, expect, it } from 'vitest';

import { STEPS, stepsProgress } from './onboarding';

describe('stepsProgress', () => {
  it('starts at the practice lap', () => {
    const p = stepsProgress({});
    expect(p.doneCount).toBe(0);
    expect(p.total).toBe(STEPS.length);
    expect(p.current).toBe('trial');
  });

  it('points at the first step not done, in order', () => {
    const p = stepsProgress({ trial: true, bots: true });
    expect(p.doneCount).toBe(2);
    expect(p.current).toBe('sprint');
    expect(p.isDone('bots')).toBe(true);
    expect(p.isDone('street')).toBe(false);
  });

  it('has no current step once all are done', () => {
    const all = Object.fromEntries(STEPS.map((id) => [id, true]));
    const p = stepsProgress(all);
    expect(p.doneCount).toBe(STEPS.length);
    expect(p.current).toBeNull();
  });
});
