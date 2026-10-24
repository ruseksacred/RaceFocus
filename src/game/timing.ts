export type DeltaKind = 'improvement' | 'slower' | 'equal' | 'none';

/** Lap time minus best lap. Negative means faster. Null when there is no best lap yet. */
export function deltaMs(lapMs: number, bestMs: number | null | undefined): number | null {
  return bestMs == null ? null : lapMs - bestMs;
}

/**
 * Live delta against a reference lap, updated as the player taps.
 *
 * At each cleared number it compares the current split with the reference split
 * for the same number. Between taps, once the clock passes the reference time for
 * the next number, the delta keeps growing so a slow stretch shows at once.
 * Returns null when there is no reference or nothing to compare yet.
 */
export function liveDeltaMs(
  splits: readonly number[],
  reference: readonly number[] | null | undefined,
  now?: number,
): number | null {
  if (!reference || reference.length === 0) return null;
  const k = splits.length;
  const atSplit = k > 0 && k <= reference.length ? splits[k - 1] - reference[k - 1] : null;
  const nextRef = reference[k];
  const running = now !== undefined && nextRef !== undefined && now > nextRef ? now - nextRef : null;
  if (atSplit === null) return running;
  if (running === null) return atSplit;
  return Math.max(atSplit, running);
}

export function deltaKind(delta: number | null): DeltaKind {
  if (delta === null) return 'none';
  if (delta < 0) return 'improvement';
  if (delta > 0) return 'slower';
  return 'equal';
}

/** "00:17.91" (minutes:seconds.hundredths). Truncates, like a race clock. */
export function formatLapTime(ms: number): string {
  const centis = Math.floor(Math.max(0, ms) / 10);
  const minutes = Math.floor(centis / 6000);
  const seconds = Math.floor((centis % 6000) / 100);
  const hundredths = centis % 100;
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
}

/** "−0.31" / "+1.20" in seconds, with a real minus sign. */
export function formatDelta(ms: number): string {
  const sign = ms < 0 ? '−' : '+';
  const abs = Math.abs(ms);
  const seconds = Math.floor(abs / 1000);
  const hundredths = Math.floor((abs % 1000) / 10);
  return `${sign}${seconds}.${pad(hundredths)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
