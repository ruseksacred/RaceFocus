import { generateBoard, targetSequence, type Mode } from './board';

/** Default time added for each wrong tap. */
export const WRONG_TAP_PENALTY_MS = 1000;

export interface LapConfig {
  size: number;
  seed: string;
  mode: Mode;
  /** Time added per wrong tap. Defaults to WRONG_TAP_PENALTY_MS. */
  penaltyMs?: number;
}

/** A tap on a tile. `at` is milliseconds since the lap started. */
export interface Tap {
  value: number;
  at: number;
}

export type TapResult = 'correct' | 'wrong' | 'ignored' | 'finished';

export interface LapState {
  config: LapConfig;
  board: number[];
  targets: number[];
  /** Index in `targets` of the number to tap next. */
  nextIndex: number;
  mistakes: number;
  /** Time of the last correct tap, set once the lap is complete. */
  finishedAt: number | null;
  taps: Tap[];
  /**
   * Split time at each correct tap, penalties included.
   * splits[i] is the running lap time when target i was cleared.
   * Used for the live delta against a reference lap.
   */
  splits: number[];
}

export function createLap(config: LapConfig): LapState {
  return {
    config,
    board: generateBoard(config.size, config.seed),
    targets: targetSequence(config.size, config.mode),
    nextIndex: 0,
    mistakes: 0,
    finishedAt: null,
    taps: [],
    splits: [],
  };
}

export function nextTarget(state: LapState): number | null {
  return state.targets[state.nextIndex] ?? null;
}

export function isCleared(state: LapState, value: number): boolean {
  return state.targets.indexOf(value) < state.nextIndex;
}

/** Apply one tap. Pure: returns a new state. */
export function applyTap(state: LapState, tap: Tap): { state: LapState; result: TapResult } {
  const total = state.targets.length;
  const valid =
    state.finishedAt === null &&
    Number.isInteger(tap.value) &&
    tap.value >= 1 &&
    tap.value <= total &&
    Number.isFinite(tap.at) &&
    tap.at >= 0 &&
    tap.at >= (state.taps.at(-1)?.at ?? 0);

  // Taps after the finish, on cleared tiles or out of order in time do nothing.
  if (!valid || isCleared(state, tap.value)) {
    return { state, result: 'ignored' };
  }

  const taps = [...state.taps, tap];
  if (tap.value !== nextTarget(state)) {
    return { state: { ...state, taps, mistakes: state.mistakes + 1 }, result: 'wrong' };
  }

  const nextIndex = state.nextIndex + 1;
  const done = nextIndex === total;
  const splits = [...state.splits, tap.at + penaltyMs(state)];
  return {
    state: { ...state, taps, splits, nextIndex, finishedAt: done ? tap.at : null },
    result: done ? 'finished' : 'correct',
  };
}

export function penaltyMs(state: LapState): number {
  return state.mistakes * (state.config.penaltyMs ?? WRONG_TAP_PENALTY_MS);
}

/** Running lap time including penalties. `now` is ms since the lap started. */
export function elapsedMs(state: LapState, now: number): number {
  const raw = state.finishedAt ?? Math.max(0, now);
  return raw + penaltyMs(state);
}

/** Final lap time including penalties, or null if the lap is not finished. */
export function lapTimeMs(state: LapState): number | null {
  return state.finishedAt === null ? null : state.finishedAt + penaltyMs(state);
}

export function accuracy(state: LapState): number {
  const counted = state.nextIndex + state.mistakes;
  return counted === 0 ? 1 : state.nextIndex / counted;
}

/**
 * Rebuild a lap from its tap sequence. This is how the server will compute
 * lap times later: it trusts the taps, never a time sent by the client.
 */
export function replayLap(config: LapConfig, taps: readonly Tap[]): LapState {
  return taps.reduce((state, tap) => applyTap(state, tap).state, createLap(config));
}
