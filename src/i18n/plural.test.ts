import { describe, expect, it } from 'vitest';

import { en } from './en';
import { pl } from './pl';
import { enPlural, plPlural } from './plural';

describe('plurals', () => {
  it('picks English forms', () => {
    expect(enPlural(1, 'lap', 'laps')).toBe('lap');
    expect(enPlural(0, 'lap', 'laps')).toBe('laps');
    expect(enPlural(2, 'lap', 'laps')).toBe('laps');
  });

  it('picks Polish forms', () => {
    const f = (n: number) => plPlural(n, 'okrążenie', 'okrążenia', 'okrążeń');
    expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 102, 112].map(f)).toEqual([
      'okrążenie',
      'okrążenia',
      'okrążenia',
      'okrążeń',
      'okrążeń',
      'okrążeń',
      'okrążeń',
      'okrążeń',
      'okrążenia',
      'okrążeń',
      'okrążenia',
      'okrążeń',
    ]);
    expect(f(0)).toBe('okrążeń');
  });

  it('formats counts in both languages', () => {
    expect(en.common.laps(1)).toBe('1 lap');
    expect(pl.common.laps(3)).toBe('3 okrążenia');
    expect(pl.common.mistakes(5)).toBe('5 błędów');
    expect(pl.practice.numbers(25)).toBe('25 liczb');
  });
});
