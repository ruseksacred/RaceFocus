import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Mode, TrackId } from '@/game';

import { deviceStorage } from './storage';

/** What the player picked for solo practice. Home uses it for Quick start. */
export interface PracticeSetup {
  track: TrackId;
  mode: Mode;
  /** Race length: a number of laps or a time limit. */
  lengthKind: 'laps' | 'time';
  laps: number;
  minutes: number;
}

export interface SessionSummary {
  id: string;
  track: TrackId;
  mode: Mode;
  lapsDriven: number;
  targetLaps: number;
  /** Timed sessions: the time limit in minutes. */
  minutes?: number;
  bestMs: number;
  totalMs: number;
  mistakes: number;
  personalBest: boolean;
  finishedAt: number;
}

/** Totals over all solo sessions, kept even when old sessions drop off the recent list. */
export interface SoloTotals {
  sessions: number;
  laps: number;
  mistakes: number;
}

const MAX_RECENT = 20;
const EMPTY_TOTALS: SoloTotals = { sessions: 0, laps: 0, mistakes: 0 };

interface PracticeState {
  setup: PracticeSetup;
  /** Newest first. */
  recent: SessionSummary[];
  totals: SoloTotals;
  updateSetup: (change: Partial<PracticeSetup>) => void;
  addSession: (session: SessionSummary) => void;
  /** Replaces history and totals (used when loading an account from the cloud). */
  load: (data: { recent?: SessionSummary[]; totals?: SoloTotals }) => void;
  reset: () => void;
}

export function mergeRecent(a: readonly SessionSummary[], b: readonly SessionSummary[]): SessionSummary[] {
  const byId = new Map([...a, ...b].map((s) => [s.id, s]));
  return [...byId.values()].sort((x, y) => y.finishedAt - x.finishedAt).slice(0, MAX_RECENT);
}

export const usePractice = create<PracticeState>()(
  persist(
    (set) => ({
      setup: { track: 'circuit', mode: 'ascending', lengthKind: 'laps', laps: 5, minutes: 3 },
      recent: [],
      totals: EMPTY_TOTALS,
      updateSetup: (change) => set((state) => ({ setup: { ...state.setup, ...change } })),
      addSession: (session) =>
        set((state) => ({
          recent: mergeRecent([session], state.recent),
          totals: {
            sessions: state.totals.sessions + 1,
            laps: state.totals.laps + session.lapsDriven,
            mistakes: state.totals.mistakes + session.mistakes,
          },
        })),
      load: (data) =>
        set((state) => ({ recent: data.recent ?? state.recent, totals: data.totals ?? state.totals })),
      reset: () => set({ recent: [], totals: EMPTY_TOTALS }),
    }),
    {
      name: 'racefocus.practice',
      storage: deviceStorage,
      version: 2,
      // v1 setups had no race length kind or minutes.
      migrate: (persisted) => {
        const state = persisted as { setup?: Partial<PracticeSetup> };
        if (state?.setup) state.setup = { lengthKind: 'laps', minutes: 3, ...state.setup } as PracticeSetup;
        return state as PracticeState;
      },
    },
  ),
);
