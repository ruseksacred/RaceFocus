/**
 * Deterministic random numbers from a string seed.
 * The same seed must give the same sequence on every device (and later on the server).
 */

/** 32-bit FNV-1a hash of a string. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32 generator. Returns floats in [0, 1). */
export function createRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random seed for solo laps. */
export function randomSeed(): string {
  return Math.floor(Math.random() * 0xffffffff).toString(36);
}
