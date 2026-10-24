import { create } from 'zustand';

import type { Mode, TrackId } from '@/game';

export type RecordKey = `${TrackId}:${Mode}`;

export function recordKey(track: TrackId, mode: Mode): RecordKey {
  return `${track}:${mode}`;
}

export interface BestLap {
  ms: number;
  /** Split times of the best lap, used for the live delta. */
  splits: number[];
}

interface RecordsState {
  /** Best lap per track and mode. Kept in memory for now. */
  bestLaps: Partial<Record<RecordKey, BestLap>>;
  /** Saves the lap if it beats the best. Returns true for a new personal best. */
  submitLap: (key: RecordKey, lap: BestLap) => boolean;
}

export const useRecords = create<RecordsState>((set, get) => ({
  bestLaps: {},
  submitLap: (key, lap) => {
    const best = get().bestLaps[key];
    if (best !== undefined && best.ms <= lap.ms) return false;
    set((state) => ({ bestLaps: { ...state.bestLaps, [key]: lap } }));
    return true;
  },
}));
