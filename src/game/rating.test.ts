import { describe, expect, it } from 'vitest';

import { expectedScore, licenceFor, ratingDelta, START_RATING, type RatedResult } from './rating';

const r = (id: string, position: number, rating = START_RATING, retired = false): RatedResult => ({
  id,
  position,
  rating,
  retired,
});

describe('expectedScore', () => {
  it('is even between equal ratings', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
  });

  it('favours the higher rating', () => {
    expect(expectedScore(1700, 1500)).toBeGreaterThan(0.7);
  });
});

describe('ratingDelta', () => {
  it('moves equal drivers by K/2 in a duel', () => {
    const field = [r('a', 1), r('b', 2)];
    expect(ratingDelta(field[0], field)).toBe(16);
    expect(ratingDelta(field[1], field)).toBe(-16);
  });

  it('sums to about zero across the field', () => {
    const field = [r('a', 1, 1600), r('b', 2, 1500), r('c', 3, 1450), r('d', 4, 1550, true)];
    const total = field.reduce((sum, d) => sum + ratingDelta(d, field), 0);
    expect(Math.abs(total)).toBeLessThanOrEqual(2);
  });

  it('gives less for beating a weaker driver', () => {
    const strongWins = ratingDelta(r('a', 1, 1800), [r('a', 1, 1800), r('b', 2, 1400)]);
    const weakWins = ratingDelta(r('b', 1, 1400), [r('a', 2, 1800), r('b', 1, 1400)]);
    expect(strongWins).toBeLessThan(weakWins);
  });

  it('ranks retirements behind finishers and level with each other', () => {
    const field = [r('a', 1), r('b', 2, START_RATING, true), r('c', 3, START_RATING, true)];
    expect(ratingDelta(field[1], field)).toBe(-8);
    expect(ratingDelta(field[2], field)).toBe(-8);
  });

  it('is zero when racing alone', () => {
    expect(ratingDelta(r('a', 1), [r('a', 1)])).toBe(0);
  });
});

describe('licenceFor', () => {
  it('keeps new drivers as rookies', () => {
    expect(licenceFor(2000, 2)).toBe('Rookie');
  });

  it('maps rating to a class', () => {
    expect(licenceFor(1450, 5)).toBe('D');
    expect(licenceFor(1500, 5)).toBe('C');
    expect(licenceFor(1700, 5)).toBe('B');
    expect(licenceFor(1850, 5)).toBe('A');
  });
});
