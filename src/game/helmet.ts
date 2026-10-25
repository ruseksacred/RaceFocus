/**
 * Driver helmet used as the avatar: base colour, pattern, accent colour and race number.
 * Stored and sent as a short string, e.g. "red.stripe.white.44".
 */

export const HELMET_COLORS = {
  red: '#E10600',
  orange: '#FF8000',
  yellow: '#FFD12E',
  green: '#3DDC84',
  teal: '#00C2B2',
  blue: '#2F6BFF',
  navy: '#1B2A6B',
  purple: '#B57BFF',
  pink: '#FF5FA2',
  white: '#F2F4F8',
  silver: '#A3ACBD',
  black: '#0E0E14',
} as const;

export type HelmetColor = keyof typeof HELMET_COLORS;
export const HELMET_COLOR_IDS = Object.keys(HELMET_COLORS) as HelmetColor[];

export const HELMET_PATTERNS = ['solid', 'stripe', 'twin', 'halves', 'chevron', 'chequered', 'crown'] as const;
export type HelmetPattern = (typeof HELMET_PATTERNS)[number];

export const MAX_HELMET_NUMBER = 99;

export interface Helmet {
  color: HelmetColor;
  pattern: HelmetPattern;
  accent: HelmetColor;
  number: number;
}

const isColor = (value: string): value is HelmetColor => value in HELMET_COLORS;
const isPattern = (value: string): value is HelmetPattern =>
  (HELMET_PATTERNS as readonly string[]).includes(value);

export function encodeHelmet(helmet: Helmet): string {
  return `${helmet.color}.${helmet.pattern}.${helmet.accent}.${helmet.number}`;
}

/** Reads a helmet string from the device or the network. Returns null for anything invalid. */
export function decodeHelmet(value: unknown): Helmet | null {
  if (typeof value !== 'string') return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [color, pattern, accent, numberText] = parts;
  if (!isColor(color) || !isPattern(pattern) || !isColor(accent) || !/^\d{1,2}$/.test(numberText)) return null;
  return { color, pattern, accent, number: Number(numberText) };
}

/** Stable helmet for a driver who has not designed one, so everyone still looks different. */
export function defaultHelmet(name: string): Helmet {
  let hash = 2166136261;
  for (const char of name.trim().toLowerCase()) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const color = HELMET_COLOR_IDS[hash % HELMET_COLOR_IDS.length];
  const pattern = HELMET_PATTERNS[(hash >>> 8) % HELMET_PATTERNS.length];
  // The accent must differ from the base colour or the pattern disappears.
  const offset = 1 + ((hash >>> 16) % (HELMET_COLOR_IDS.length - 1));
  const accent = HELMET_COLOR_IDS[(HELMET_COLOR_IDS.indexOf(color) + offset) % HELMET_COLOR_IDS.length];
  return { color, pattern, accent, number: (hash >>> 4) % (MAX_HELMET_NUMBER + 1) };
}

/** The driver's own helmet if valid, else the default for their name. */
export function helmetOf(encoded: unknown, name: string): Helmet {
  return decodeHelmet(encoded) ?? defaultHelmet(name);
}
