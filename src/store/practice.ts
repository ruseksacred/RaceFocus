import { create } from 'zustand';

import type { Mode, TrackId } from '@/game';

/** What the player picked for solo practice. Home uses it for Quick start. */
export interface PracticeSetup {
  track: TrackId;
  mode: Mode;
  laps: number;
}

export interface SessionSummary {
  id: string;
  track: TrackId;
  mode: Mode;
  lapsDriven: number;
  targetLaps: number;
  bestMs: number;
  totalMs: number;
  mistakes: number;
  personalBest: boolean;
  finishedAt: number;
}

const MAX_RECENT = 10;

interface PracticeState {
  setup: PracticeSetup;
  /** Newest first. Kept in memory only for now. */
  recent: SessionSummary[];
  updateSetup: (change: Partial<PracticeSetup>) => void;
  addSession: (session: SessionSummary) => void;
}

export const usePractice = create<PracticeState>((set) => ({
  setup: { track: 'circuit', mode: 'ascending', laps: 5 },
  recent: [],
  updateSetup: (change) => set((state) => ({ setup: { ...state.setup, ...change } })),
  addSession: (session) => set((state) => ({ recent: [session, ...state.recent].slice(0, MAX_RECENT) })),
}));
