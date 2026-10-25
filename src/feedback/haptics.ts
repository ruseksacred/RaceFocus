// Web: the Vibration API (Android browsers; iPhone Safari does not support it).

export type Buzz = 'wrong' | 'go' | 'finish';

const PATTERNS: Record<Buzz, number | number[]> = {
  wrong: 160,
  go: 40,
  finish: [60, 80, 60, 80, 160],
};

export function vibrate(buzz: Buzz) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(PATTERNS[buzz]);
  } catch {
    // Not supported here.
  }
}
