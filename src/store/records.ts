import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Mode, TrackId } from '@/game';

import { deviceStorage } from './storage';

export type RecordKey = `${TrackId}:${Mode}`;

export function recordKey(track: TrackId, mode: Mode): RecordKey {
  return `${track}:${mode}`;
}

export interface BestLap {
  ms: number;
  /** Split times of the best lap, used for the live delta. */
  splits: number[];
}

export type BestLaps = Partial<Record<RecordKey, BestLap>>;

interface RecordsState {
  /** Best lap per track and mode. Saved on the device and, with an account, in the cloud. */
  bestLaps: BestLaps;
  /** Saves the lap if it beats the best. Returns true for a new personal best. */
  submitLap: (key: RecordKey, lap: BestLap) => boolean;
  /** Keeps the faster lap of each pair (used when syncing with the cloud). */
  mergeBestLaps: (other: BestLaps) => void;
  reset: () => void;
}

export function fasterLaps(a: BestLaps, b: BestLaps): BestLaps {
  const merged: BestLaps = { ...a };
  for (const [key, lap] of Object.entries(b) as [RecordKey, BestLap][]) {
    const current = merged[key];
    if (lap && (!current || lap.ms < current.ms)) merged[key] = lap;
  }
  return merged;
}

export const useRecords = create<RecordsState>()(
  persist(
    (set, get) => ({
      bestLaps: {},
      submitLap: (key, lap) => {
        const best = get().bestLaps[key];
        if (best !== undefined && best.ms <= lap.ms) return false;
        set((state) => ({ bestLaps: { ...state.bestLaps, [key]: lap } }));
        return true;
      },
      mergeBestLaps: (other) => set((state) => ({ bestLaps: fasterLaps(state.bestLaps, other) })),
      reset: () => set({ bestLaps: {} }),
    }),
    { name: 'racefocus.records', storage: deviceStorage, version: 1 },
  ),
);
