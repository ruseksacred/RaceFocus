import { HELMET_COLOR_IDS, HELMET_PATTERNS, MAX_HELMET_NUMBER, encodeHelmet } from './helmet';
import { WRONG_TAP_PENALTY_MS } from './lap';
import { createRng } from './random';
import type { Mode } from './board';
import type { TrackId } from './tracks';
import { getTrack } from './tracks';

/**
 * Track records: each driver's best lap per track and mode, from online (room) races only.
 * Stored at leaderboards/{boardKey}/{uid}.
 */

export interface LeaderboardEntry {
  /** Driver uid (or "test-…" for test data). */
  id: string;
  name: string;
  /** Helmet string, see `encodeHelmet`. */
  helmet?: string;
  /** Best lap in ms, penalties included. */
  ms: number;
  /** When the lap was set (ms since epoch). */
  at: number;
  /** Shown only while testing; never stored. */
  test?: boolean;
}

export interface RankedEntry extends LeaderboardEntry {
  position: number;
  /** Behind P1 in ms; 0 for the leader. */
  gap: number;
}

/**
 * TEMPORARY, for testing: solo practice laps also go to the leaderboards.
 * Set to false to keep records to online races only.
 */
export const SOLO_LAPS_COUNT_FOR_RECORDS = true;

export function boardKey(track: TrackId, mode: Mode): string {
  return `${track}_${mode}`;
}

/** Laps faster than this cannot be real (about 50 ms per tap even on the smallest track). */
export function minPlausibleLapMs(track: TrackId): number {
  const size = getTrack(track)?.size ?? 3;
  return size * size * 50;
}

/**
 * Whether a room race can set a track record: the same penalty as solo practice or heavier,
 * so a lighter penalty never buys a record.
 */
export function countsForRecords(penaltyMs: number): boolean {
  return penaltyMs >= WRONG_TAP_PENALTY_MS;
}

/** Fastest first; the earlier lap wins a tie (it was set first). */
export function rankEntries(entries: readonly LeaderboardEntry[]): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => a.ms - b.ms || a.at - b.at);
  const best = sorted[0]?.ms ?? 0;
  return sorted.map((entry, i) => ({ ...entry, position: i + 1, gap: entry.ms - best }));
}

/** Reads one stored row; returns null for anything malformed. */
export function parseEntry(id: string, value: unknown): LeaderboardEntry | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== 'string' || typeof row.ms !== 'number' || !Number.isFinite(row.ms)) return null;
  return {
    id,
    name: row.name,
    ms: row.ms,
    at: typeof row.at === 'number' ? row.at : 0,
    helmet: typeof row.helmet === 'string' ? row.helmet : undefined,
  };
}

const TEST_NAMES = [
  'Kuba_77', 'MaxPower', 'Ola.R', 'Szybki Lis', 'Tomek GT', 'Nina', 'Apex', 'Bartek', 'Zosia_F1',
  'Drift King', 'Marta', 'LateBraker', 'Piotrek', 'Kasia 33', 'Slipstream', 'Wojtek', 'Ania',
  'Turbo', 'Michał', 'Pit Wall',
];

/**
 * Made-up drivers for trying the leaderboard before there are real records.
 * Stable for a given board, with lap times that fit the track size.
 */
export function testEntries(track: TrackId, mode: Mode): LeaderboardEntry[] {
  const size = getTrack(track)?.size ?? 5;
  const rng = createRng(`test:${boardKey(track, mode)}`);
  // Roughly 0.3 s per number for a quick driver, slower down the field; countdown is a bit harder.
  const base = size * size * (mode === 'descending' ? 330 : 300);
  return TEST_NAMES.map((name, i) => {
    const color = HELMET_COLOR_IDS[Math.floor(rng() * HELMET_COLOR_IDS.length)];
    const others = HELMET_COLOR_IDS.filter((c) => c !== color);
    return {
      id: `test-${i}`,
      name,
      ms: Math.round(base * (1 + i * 0.045 + rng() * 0.04)),
      at: Date.UTC(2026, 9, 1) + i * 3_600_000,
      helmet: encodeHelmet({
        color,
        pattern: HELMET_PATTERNS[Math.floor(rng() * HELMET_PATTERNS.length)],
        accent: others[Math.floor(rng() * others.length)],
        number: Math.floor(rng() * (MAX_HELMET_NUMBER + 1)),
      }),
      test: true,
    };
  });
}
