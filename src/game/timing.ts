export type DeltaKind = 'improvement' | 'slower' | 'equal' | 'none';

/** Lap time minus best lap. Negative means faster. Null when there is no best lap yet. */
export function deltaMs(lapMs: number, bestMs: number | null | undefined): number | null {
  return bestMs == null ? null : lapMs - bestMs;
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
