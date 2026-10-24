import { createRng } from './random';

export type Mode = 'ascending' | 'descending';

export const MODES: readonly Mode[] = ['ascending', 'descending'];

/**
 * Shuffled board of numbers 1..size², row by row.
 * Same size + seed always gives the same layout.
 */
export function generateBoard(size: number, seed: string): number[] {
  if (!Number.isInteger(size) || size < 2) {
    throw new Error(`Invalid board size: ${size}`);
  }
  const rng = createRng(`${seed}:${size}`);
  const cells = Array.from({ length: size * size }, (_, i) => i + 1);
  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}

/** The order in which numbers must be tapped. */
export function targetSequence(size: number, mode: Mode): number[] {
  const count = size * size;
  const ascending = Array.from({ length: count }, (_, i) => i + 1);
  return mode === 'ascending' ? ascending : ascending.reverse();
}
