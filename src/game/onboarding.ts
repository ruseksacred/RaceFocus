/**
 * First steps for a new player: a short checklist on Home that walks from the practice lap
 * to online races. Each step is marked done by the screen where it happens.
 */
export type StepId = 'trial' | 'sprint' | 'bots' | 'street' | 'quick';

export const STEPS: readonly StepId[] = ['trial', 'sprint', 'bots', 'street', 'quick'];

/** Taps that get a highlighted target in the practice lap. */
export const TRIAL_HINT_TAPS = 3;

export interface StepsProgress {
  doneCount: number;
  total: number;
  /** The first step not done yet; null once every step is done. */
  current: StepId | null;
  isDone: (id: StepId) => boolean;
}

export function stepsProgress(done: Partial<Record<StepId, boolean>>): StepsProgress {
  const isDone = (id: StepId) => done[id] === true;
  return {
    doneCount: STEPS.filter(isDone).length,
    total: STEPS.length,
    current: STEPS.find((id) => !isDone(id)) ?? null,
    isDone,
  };
}
