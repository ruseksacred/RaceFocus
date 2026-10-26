import { encodeHelmet, defaultHelmet } from './helmet';
import type { RaceLength } from './length';
import { createRng } from './random';
import type { DriverProgress } from './standings';

/**
 * Offline race against bots. Each bot's whole race is worked out before the start
 * (a crossing time for every number it clears), then revealed as the race clock runs,
 * so bots go through the same standings code as drivers in online rooms.
 */

export type BotLevel = 'easy' | 'medium' | 'hard' | 'expert' | 'matched';
export const BOT_LEVELS: readonly BotLevel[] = ['easy', 'medium', 'hard', 'expert', 'matched'];

export const MIN_BOTS = 1;
export const MAX_BOTS = 11;

/** Time per number on a 5×5 board for a typical bot of each level. */
const LEVEL_MS: Record<Exclude<BotLevel, 'matched'>, number> = {
  easy: 950,
  medium: 720,
  hard: 540,
  expert: 420,
};

/** Chance of a wrong tap at each number. */
const MISTAKE_CHANCE: Record<BotLevel, number> = {
  easy: 0.04,
  medium: 0.025,
  hard: 0.015,
  expert: 0.008,
  matched: 0.02,
};

/** How far bots of one field differ from each other (±). */
const SPREAD: Record<BotLevel, number> = {
  easy: 0.1,
  medium: 0.08,
  hard: 0.07,
  expert: 0.05,
  matched: 0.12,
};

/** Time lost on a wrong tap besides the penalty: the moment it takes to notice and look again. */
const MISTAKE_LOST_MS = 250;
/** How much single taps vary (log-normal sigma): some numbers are found at once, some take a while. */
const TAP_SIGMA = 0.35;

const BOT_NAMES = [
  'R. Kowal', 'Turbo Tomi', 'L. Apex', 'Nitro', 'M. Szybki', 'K. Drift', 'S. Pitwall', 'A. Slipstream',
  'J. Chicane', 'P. Kerb', 'D. Hairpin', 'B. Paddock',
];

export interface Bot extends DriverProgress {
  helmet: string;
  /** Race time of every wrong tap. */
  mistakeTimes: number[];
}

/** Bigger boards take longer to search, so time per number grows with the board. */
function sizeFactor(size: number): number {
  return 0.55 + 0.09 * size;
}

/**
 * Typical time per number for a level on a board size. "Matched" follows the player's
 * personal best (lap time / numbers); without one it drives like "medium".
 */
export function botNumberMs(level: BotLevel, size: number, personalBestMs?: number | null): number {
  if (level === 'matched') {
    if (personalBestMs && personalBestMs > 0) return personalBestMs / (size * size);
    return LEVEL_MS.medium * sizeFactor(size);
  }
  return LEVEL_MS[level] * sizeFactor(size);
}

/** Standard normal sample from two uniform ones (Box–Muller). */
function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** One bot's crossings and wrong taps for the whole race. */
export function botRun(
  seed: string,
  level: BotLevel,
  size: number,
  length: RaceLength,
  penaltyMs: number,
  personalBestMs?: number | null,
): { crossings: number[]; mistakeTimes: number[] } {
  const rng = createRng(seed);
  const numbersPerLap = size * size;
  const skill = 1 + (rng() * 2 - 1) * SPREAD[level];
  const perNumber = botNumberMs(level, size, personalBestMs) * skill;
  // Log-normal taps with this mean keep the average at perNumber.
  const meanFix = Math.exp((TAP_SIGMA * TAP_SIGMA) / 2);
  const lapEstimate = perNumber * numbersPerLap;
  // Timed races: drive on past the flag far enough to finish the lap the flag falls in.
  const target =
    length.kind === 'laps' ? length.laps * numbersPerLap : Number.POSITIVE_INFINITY;
  const timeLimit = length.kind === 'time' ? length.ms + 2 * lapEstimate : Number.POSITIVE_INFINITY;

  const crossings: number[] = [];
  const mistakeTimes: number[] = [];
  let t = 0;
  while (crossings.length < target) {
    if (length.kind === 'time' && t > timeLimit && crossings.length % numbersPerLap === 0) break;
    if (rng() < MISTAKE_CHANCE[level]) {
      t += perNumber * 0.5;
      mistakeTimes.push(Math.round(t));
      t += penaltyMs + MISTAKE_LOST_MS;
    }
    t += (perNumber * Math.exp(gaussian(rng) * TAP_SIGMA)) / meanFix;
    crossings.push(Math.round(t));
  }
  return { crossings, mistakeTimes };
}

/** A field of bots with different names, helmets and pace. */
export function makeBots(
  seed: string,
  count: number,
  level: BotLevel,
  size: number,
  length: RaceLength,
  penaltyMs: number,
  personalBestMs?: number | null,
): Bot[] {
  const names = [...BOT_NAMES];
  const rng = createRng(`${seed}:names`);
  // Shuffle so each race has a different line-up.
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  return Array.from({ length: Math.min(count, MAX_BOTS) }, (_, i) => {
    const name = names[i];
    const run = botRun(`${seed}:bot${i}`, level, size, length, penaltyMs, personalBestMs);
    return {
      id: `bot-${i}`,
      name,
      helmet: encodeHelmet(defaultHelmet(`${name}${seed}`)),
      crossings: run.crossings,
      mistakes: 0,
      mistakeTimes: run.mistakeTimes,
    };
  });
}

/** What the bots have done by race time `now`: only the crossings and mistakes so far. */
export function botsAt(bots: readonly Bot[], now: number): DriverProgress[] {
  return bots.map((bot) => ({
    id: bot.id,
    name: bot.name,
    crossings: bot.crossings.filter((c) => c <= now),
    mistakes: bot.mistakeTimes.filter((m) => m <= now).length,
  }));
}
