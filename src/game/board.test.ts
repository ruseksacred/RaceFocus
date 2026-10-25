import { describe, expect, it } from 'vitest';

import { generateBoard, targetSequence } from './board';

describe('generateBoard', () => {
  it('contains every number from 1 to size² exactly once', () => {
    for (const size of [3, 4, 5, 7]) {
      const board = generateBoard(size, 'abc');
      expect([...board].sort((a, b) => a - b)).toEqual(Array.from({ length: size * size }, (_, i) => i + 1));
    }
  });

  it('gives the same layout for the same seed', () => {
    expect(generateBoard(5, 'race-42')).toEqual(generateBoard(5, 'race-42'));
  });

  it('gives different layouts for different seeds', () => {
    expect(generateBoard(5, 'race-42')).not.toEqual(generateBoard(5, 'race-43'));
  });

  it('is actually shuffled', () => {
    const sorted = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(generateBoard(5, 'x')).not.toEqual(sorted);
  });

  it('rejects invalid sizes', () => {
    expect(() => generateBoard(1, 'x')).toThrow();
    expect(() => generateBoard(2.5, 'x')).toThrow();
  });
});

describe('targetSequence', () => {
  it('counts up in ascending mode', () => {
    expect(targetSequence(2, 'ascending')).toEqual([1, 2, 3, 4]);
  });

  it('counts down in descending mode', () => {
    expect(targetSequence(2, 'descending')).toEqual([4, 3, 2, 1]);
  });
});
