import { describe, expect, it } from 'vitest';

import { decodeHelmet, defaultHelmet, encodeHelmet, helmetOf, type Helmet } from './helmet';

describe('helmet', () => {
  const helmet: Helmet = { color: 'red', pattern: 'stripe', accent: 'white', number: 44 };

  it('round-trips through its string form', () => {
    expect(encodeHelmet(helmet)).toBe('red.stripe.white.44');
    expect(decodeHelmet('red.stripe.white.44')).toEqual(helmet);
    expect(decodeHelmet('navy.solid.yellow.0')).toEqual({
      color: 'navy',
      pattern: 'solid',
      accent: 'yellow',
      number: 0,
    });
  });

  it('rejects anything invalid', () => {
    for (const bad of [null, 5, '', 'red.stripe.white', 'gold.stripe.white.1', 'red.zebra.white.1', 'red.stripe.white.100', 'red.stripe.white.-1', 'red.stripe.white.4.5']) {
      expect(decodeHelmet(bad)).toBeNull();
    }
  });

  it('gives each name a stable default with a visible accent', () => {
    expect(defaultHelmet('Max')).toEqual(defaultHelmet(' max '));
    for (const name of ['Ala', 'Bob', 'Cezary', 'Max', 'Lando', '']) {
      const h = defaultHelmet(name);
      expect(h.accent).not.toBe(h.color);
      expect(decodeHelmet(encodeHelmet(h))).toEqual(h);
    }
    expect(new Set(['Ala', 'Bob', 'Cezary', 'Max'].map((n) => encodeHelmet(defaultHelmet(n)))).size).toBe(4);
  });

  it('falls back to the default for a missing helmet', () => {
    expect(helmetOf(undefined, 'Bob')).toEqual(defaultHelmet('Bob'));
    expect(helmetOf('red.stripe.white.44', 'Bob')).toEqual(helmet);
  });
});
