import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_RULES, type BotLevel, type RoomRules } from '@/game';

import { deviceStorage } from './storage';

/** Rules of a race against bots: the same as a private room, plus the field. */
export interface BotSetup extends Omit<RoomRules, 'maxPlayers'> {
  bots: number;
  level: BotLevel;
}

export const DEFAULT_BOT_SETUP: BotSetup = {
  track: DEFAULT_RULES.track,
  mode: DEFAULT_RULES.mode,
  lengthKind: DEFAULT_RULES.lengthKind,
  laps: DEFAULT_RULES.laps,
  minutes: DEFAULT_RULES.minutes,
  penaltyMs: DEFAULT_RULES.penaltyMs,
  bots: 5,
  level: 'medium',
};

interface BotsState {
  setup: BotSetup;
  updateSetup: (patch: Partial<BotSetup>) => void;
}

/** The last bot race setup, kept on the device. */
export const useBotSetup = create<BotsState>()(
  persist(
    (set) => ({
      setup: DEFAULT_BOT_SETUP,
      updateSetup: (patch) => set((state) => ({ setup: { ...state.setup, ...patch } })),
    }),
    { name: 'racefocus.bots', storage: deviceStorage, version: 1 },
  ),
);
