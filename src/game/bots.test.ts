import { describe, expect, it } from 'vitest';

import { botNumberMs, botRun, botsAt, makeBots, MAX_BOTS } from './bots';
import { decodeHelmet } from './helmet';
import { lapsLength, timeLength } from './length';
import { lapTimesFromCrossings, raceStandings } from './standings';

const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('bots', () => {
  it('drives the exact number of laps in a lap race, always forward in time', () => {
    const run = botRun('s', 'medium', 5, lapsLength(3), 1000);
    expect(run.crossings).toHaveLength(75);
    for (let i = 1; i < run.crossings.length; i++) expect(run.crossings[i]).toBeGreaterThan(run.crossings[i - 1]);
  });

  it('is the same for the same seed', () => {
    expect(botRun('x', 'hard', 4, lapsLength(2), 1000)).toEqual(botRun('x', 'hard', 4, lapsLength(2), 1000));
  });

  it('gets faster with the level and slower on bigger boards', () => {
    const lap = (level: 'easy' | 'medium' | 'hard' | 'expert', size = 5) =>
      average(
        Array.from({ length: 20 }, (_, i) =>
          average(lapTimesFromCrossings(botRun(`r${i}`, level, size, lapsLength(3), 1000).crossings, size * size)),
        ),
      );
    expect(lap('easy')).toBeGreaterThan(lap('medium'));
    expect(lap('medium')).toBeGreaterThan(lap('hard'));
    expect(lap('hard')).toBeGreaterThan(lap('expert'));
    expect(botNumberMs('medium', 7)).toBeGreaterThan(botNumberMs('medium', 3));
    // A medium bot laps a 5×5 board in roughly 18 s.
    expect(lap('medium')).toBeGreaterThan(15000);
    expect(lap('medium')).toBeLessThan(22000);
  });

  it('matches the player when asked', () => {
    expect(botNumberMs('matched', 5, 20000)).toBe(800);
    expect(botNumberMs('matched', 5, null)).toBe(botNumberMs('medium', 5));
  });

  it('drives past the end of a timed race so it can finish its last lap', () => {
    const run = botRun('t', 'expert', 3, timeLength(1), 1000);
    expect(run.crossings.at(-1)!).toBeGreaterThan(60000);
    expect(run.crossings.length % 9).toBe(0);
  });

  it('makes a field with different names and valid helmets', () => {
    const bots = makeBots('seed', 20, 'medium', 5, lapsLength(2), 1000);
    expect(bots).toHaveLength(MAX_BOTS);
    expect(new Set(bots.map((b) => b.name)).size).toBe(MAX_BOTS);
    for (const bot of bots) expect(decodeHelmet(bot.helmet)).not.toBeNull();
  });

  it('reveals only what has happened so far and works with the standings', () => {
    const bots = makeBots('seed', 3, 'hard', 3, lapsLength(2), 1000);
    const early = botsAt(bots, 2000);
    for (const b of early) expect(b.crossings.every((c) => c <= 2000)).toBe(true);
    const end = botsAt(bots, 10 * 60_000);
    const { standings } = raceStandings(end, 9, lapsLength(2), 10 * 60_000);
    expect(standings.every((s) => s.finished)).toBe(true);
    expect(standings.map((s) => s.position)).toEqual([1, 2, 3]);
  });
});
