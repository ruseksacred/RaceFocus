import { describe, expect, it } from 'vitest';

import { generateRoomCode, lapSeed, normalizeNick, normalizeRoomCode, ROOM_CODE_LENGTH } from './room';

describe('room codes', () => {
  it('generates readable codes of the right length', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(code).not.toMatch(/[01IO]/);
      expect(normalizeRoomCode(code)).toBe(code);
    }
  });

  it('normalizes typed codes', () => {
    expect(normalizeRoomCode(' ab-c d2 ')).toBe('ABCD2');
    expect(normalizeRoomCode('abc')).toBeNull();
    expect(normalizeRoomCode('ABCD0')).toBeNull();
  });
});

describe('nicks', () => {
  it('trims and limits nicks', () => {
    expect(normalizeNick('  Max   V  ')).toBe('Max V');
    expect(normalizeNick('   ')).toBeNull();
    expect(normalizeNick('x'.repeat(40))).toHaveLength(16);
  });
});

describe('lapSeed', () => {
  it('gives every lap its own seed and every driver the same one', () => {
    expect(lapSeed('abc', 0)).toBe(lapSeed('abc', 0));
    expect(lapSeed('abc', 0)).not.toBe(lapSeed('abc', 1));
  });
});
