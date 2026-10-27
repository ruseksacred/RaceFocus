import { describe, expect, it } from 'vitest';

import { isDnf, matchRange, pickOpponent, QUICK_RULES, type QueueEntry } from './quick';

const q = (id: string, rating: number, joinedAt = 0, match?: string): QueueEntry => ({
  id,
  nick: id,
  rating,
  joinedAt,
  match,
});

describe('quick race', () => {
  it('has the agreed rules', () => {
    expect(QUICK_RULES).toMatchObject({ track: 'sprint', lengthKind: 'time', minutes: 1, penaltyMs: 1000, maxPlayers: 2, dnfMistakes: 3 });
  });

  it('widens the rating range while waiting', () => {
    expect(matchRange(0)).toBe(100);
    expect(matchRange(4999)).toBe(100);
    expect(matchRange(5000)).toBe(150);
    expect(matchRange(30_000)).toBe(400);
  });

  it('picks the closest rating within range, claimed only by the smaller id', () => {
    const me = q('a', 1500);
    const queue = [me, q('b', 1580), q('c', 1530), q('d', 1900)];
    expect(pickOpponent(me, queue, 0)?.id).toBe('c');
    // "c" never claims "a": the smaller id makes the claim.
    expect(pickOpponent(queue[2], queue, 0)).toBeNull();
  });

  it('skips matched drivers and drivers out of range until the range grows', () => {
    const me = q('a', 1500);
    expect(pickOpponent(me, [me, q('b', 1520, 0, 'ROOM1')], 0)).toBeNull();
    const far = q('b', 1750);
    expect(pickOpponent(me, [me, far], 0)).toBeNull();
    expect(pickOpponent(me, [me, far], 20_000)?.id).toBe('b');
  });

  it('uses the longer wait of the two for the range', () => {
    const me = q('a', 1500, 20_000);
    const waiting = q('b', 1700, 0);
    expect(pickOpponent(me, [me, waiting], 20_000)?.id).toBe('b');
  });

  it('does nothing once matched', () => {
    const me = q('a', 1500, 0, 'X');
    expect(pickOpponent(me, [me, q('b', 1500)], 0)).toBeNull();
  });

  it('puts a driver out on the third wrong tap', () => {
    expect(isDnf(2, QUICK_RULES)).toBe(false);
    expect(isDnf(3, QUICK_RULES)).toBe(true);
    expect(isDnf(10, {})).toBe(false);
  });
});
