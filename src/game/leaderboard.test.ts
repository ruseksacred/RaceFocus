import { describe, expect, it } from 'vitest';

import { decodeHelmet } from './helmet';
import {
  boardKey,
  countsForRecords,
  minPlausibleLapMs,
  parseEntry,
  rankEntries,
  testEntries,
} from './leaderboard';

describe('leaderboard', () => {
  it('ranks fastest first with gaps to P1, earlier lap winning a tie', () => {
    const ranked = rankEntries([
      { id: 'b', name: 'B', ms: 9000, at: 2 },
      { id: 'a', name: 'A', ms: 8000, at: 5 },
      { id: 'c', name: 'C', ms: 9000, at: 1 },
    ]);
    expect(ranked.map((r) => [r.id, r.position, r.gap])).toEqual([
      ['a', 1, 0],
      ['c', 2, 1000],
      ['b', 3, 1000],
    ]);
    expect(rankEntries([])).toEqual([]);
  });

  it('keys boards by track and mode', () => {
    expect(boardKey('circuit', 'descending')).toBe('circuit_descending');
  });

  it('only lets rooms with at least the solo penalty set records', () => {
    expect(countsForRecords(500)).toBe(false);
    expect(countsForRecords(1000)).toBe(true);
    expect(countsForRecords(2000)).toBe(true);
  });

  it('rejects malformed rows', () => {
    expect(parseEntry('x', null)).toBeNull();
    expect(parseEntry('x', { name: 'A' })).toBeNull();
    expect(parseEntry('x', { name: 'A', ms: 'fast' })).toBeNull();
    expect(parseEntry('x', { name: 'A', ms: 9000, at: 3, helmet: 'red.solid.white.1' })).toEqual({
      id: 'x',
      name: 'A',
      ms: 9000,
      at: 3,
      helmet: 'red.solid.white.1',
    });
  });

  it('makes stable, plausible test data with valid helmets', () => {
    const a = testEntries('circuit', 'ascending');
    expect(a).toEqual(testEntries('circuit', 'ascending'));
    expect(a.length).toBeGreaterThanOrEqual(10);
    for (const e of a) {
      expect(e.test).toBe(true);
      expect(e.ms).toBeGreaterThan(minPlausibleLapMs('circuit'));
      expect(decodeHelmet(e.helmet)).not.toBeNull();
    }
    const sprint = rankEntries(testEntries('sprint', 'ascending'))[0].ms;
    const endurance = rankEntries(testEntries('endurance', 'ascending'))[0].ms;
    expect(endurance).toBeGreaterThan(sprint * 4);
  });
});
