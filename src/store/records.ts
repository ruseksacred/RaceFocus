import { create } from 'zustand';

import type { Mode, TrackId } from '@/game';

export type RecordKey = `${TrackId}:${Mode}`;

export function recordKey(track: TrackId, mode: Mode): RecordKey {
  return `${track}:${mode}`;
}

interface RecordsState {
  /** Best lap per track and mode, in ms. Kept in memory for now. */
  bestLaps: Partial<Record<RecordKey, number>>;
  /** Saves the lap if it beats the best. Returns true for a new personal best. */
  submitLap: (key: RecordKey, lapMs: number) => boolean;
}

export const useRecords = create<RecordsState>((set, get) => ({
  bestLaps: {},
  submitLap: (key, lapMs) => {
    const best = get().bestLaps[key];
    if (best !== undefined && best <= lapMs) return false;
    set((state) => ({ bestLaps: { ...state.bestLaps, [key]: lapMs } }));
    return true;
  },
}));
