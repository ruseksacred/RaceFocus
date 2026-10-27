import type { Mode } from './board';
import { lapsLength, timeLength, type RaceLength } from './length';
import type { TrackId } from './tracks';

/** Rules the host sets for a private room. Everyone in the room races with them. */
export interface RoomRules {
  track: TrackId;
  mode: Mode;
  /** Race by laps, or by time (the leader finishes the lap they are on when time is up). */
  lengthKind: 'laps' | 'time';
  laps: number;
  minutes: number;
  penaltyMs: number;
  maxPlayers: number;
  /** Ranked 1-on-1 quick race from matchmaking (no invite, starts by itself). */
  quick?: boolean;
  /** This many wrong taps end a driver's race (DNF). Unset: no limit. */
  dnfMistakes?: number;
}

export const PENALTY_OPTIONS_MS = [500, 1000, 2000] as const;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export const DEFAULT_RULES: RoomRules = {
  track: 'circuit',
  mode: 'ascending',
  lengthKind: 'laps',
  laps: 3,
  minutes: 3,
  penaltyMs: 1000,
  maxPlayers: 8,
};

/** Race length from the rules. Rooms made before timed races have no lengthKind: they are lap races. */
export function roomLength(rules: RoomRules): RaceLength {
  return rules.lengthKind === 'time' ? timeLength(rules.minutes) : lapsLength(rules.laps);
}

/** No 0/O or 1/I so codes are easy to read out loud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

export function generateRoomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Uppercases and strips anything that cannot be in a code. Returns null unless complete. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return null;
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

export const NICK_MAX_LENGTH = 16;

/** Trimmed nick, or null when empty. */
export function normalizeNick(input: string): string | null {
  const nick = input.trim().replace(/\s+/g, ' ').slice(0, NICK_MAX_LENGTH);
  return nick.length > 0 ? nick : null;
}

/** Seed for one lap of a race: same for every driver in the room. */
export function lapSeed(raceSeed: string, lapIndex: number): string {
  return `${raceSeed}:lap${lapIndex}`;
}
