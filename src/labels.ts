import type { Mode } from '@/game';

export const MODE_LABELS: Record<Mode, string> = {
  ascending: '1 → N',
  descending: 'Countdown N → 1',
};

export const MODE_SHORT: Record<Mode, string> = {
  ascending: '1 → N',
  descending: 'Countdown',
};

/** "14:32" for today, "Mon 14:32" for older. */
export function formatWhen(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (new Date(now).toDateString() === date.toDateString()) return `Today ${time}`;
  return `${date.toLocaleDateString('en', { weekday: 'short' })} ${time}`;
}
