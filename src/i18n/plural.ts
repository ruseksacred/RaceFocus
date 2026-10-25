/** English plural: "1 lap", "2 laps". */
export function enPlural(n: number, one: string, other: string): string {
  return n === 1 ? one : other;
}

/**
 * Polish plural: 1 okrążenie, 2–4 okrążenia (but 12–14 okrążeń), 5+ okrążeń.
 * Fractions are not counted here; callers pass whole numbers.
 */
export function plPlural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  if (units >= 2 && units <= 4 && (tens < 12 || tens > 14)) return few;
  return many;
}
