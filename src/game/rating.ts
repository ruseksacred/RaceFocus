/**
 * Multiplayer Elo for room races (beta).
 *
 * Each driver is compared with every other driver in the race: finishing ahead
 * counts as a win, behind as a loss. Between two retirements (or DNFs) the one who got
 * further wins; equal progress is a draw. The change is the
 * K factor times the average of (score - expected) over all opponents.
 *
 * For now each client computes its own rating; it moves to the server before any
 * public ranking (see CLAUDE.md, "The server validates times").
 */
export const START_RATING = 1500;
export const K_FACTOR = 32;

export interface RatedResult {
  id: string;
  rating: number;
  /**
   * Finishing position, 1-based. Retired drivers are placed after all finishers,
   * ordered among themselves by how far they got.
   */
  position: number;
  retired: boolean;
}

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

function pairScore(me: RatedResult, other: RatedResult): number {
  if (me.retired !== other.retired) return me.retired ? 0 : 1;
  if (me.position === other.position) return 0.5;
  return me.position < other.position ? 1 : 0;
}

/** Rating change for one driver, rounded to a whole point. 0 when racing alone. */
export function ratingDelta(me: RatedResult, field: readonly RatedResult[]): number {
  const opponents = field.filter((r) => r.id !== me.id);
  if (opponents.length === 0) return 0;
  const sum = opponents.reduce((acc, o) => acc + pairScore(me, o) - expectedScore(me.rating, o.rating), 0);
  return Math.round((K_FACTOR * sum) / opponents.length);
}

export type Licence = 'Rookie' | 'D' | 'C' | 'B' | 'A';

/** Licence class from rating and number of rated races. */
export function licenceFor(rating: number, races: number): Licence {
  if (races < 3) return 'Rookie';
  if (rating >= 1800) return 'A';
  if (rating >= 1650) return 'B';
  if (rating >= 1500) return 'C';
  return 'D';
}
