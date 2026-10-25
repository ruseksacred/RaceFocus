import { MINUTE_MS, type RaceLength } from '@/game';
import type { Messages } from '@/i18n';
import type { Language } from '@/store/settings';

/** "Today 14:32" for today, "Mon 14:32" (or "pon. 14:32") for older. */
export function formatWhen(m: Messages, language: Language, timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (new Date(now).toDateString() === date.toDateString()) return `${m.common.today} ${time}`;
  return `${date.toLocaleDateString(language, { weekday: 'short' })} ${time}`;
}

/** "5 laps" / "5 okrążeń" or "3 min". */
export function describeLength(m: Messages, length: RaceLength): string {
  return length.kind === 'laps'
    ? m.common.laps(length.laps)
    : m.common.minutes(Math.round(length.ms / MINUTE_MS));
}

/** "1" or "0.5" seconds, for penalties. */
export function seconds(ms: number): string {
  return String(ms / 1000);
}
