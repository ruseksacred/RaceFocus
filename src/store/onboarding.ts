import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { StepId } from '@/game';

import { useCareer } from './career';
import { usePractice } from './practice';
import { useRecords } from './records';
import { deviceStorage } from './storage';

interface OnboardingState {
  /** Set once the stores are loaded and we know whether this is a new player. */
  initialized: boolean;
  welcomeSeen: boolean;
  /** The first wrong tap ever gets a short explanation; later ones only the yellow flag. */
  mistakeExplained: boolean;
  /** The player hid the First steps card. */
  stepsHidden: boolean;
  done: Partial<Record<StepId, boolean>>;
  seeWelcome: () => void;
  explainMistake: () => void;
  hideSteps: () => void;
  markDone: (id: StepId) => void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      initialized: false,
      welcomeSeen: false,
      mistakeExplained: false,
      stepsHidden: false,
      done: {},
      seeWelcome: () => set({ welcomeSeen: true }),
      explainMistake: () => set({ mistakeExplained: true }),
      hideSteps: () => set({ stepsHidden: true }),
      markDone: (id) => set((state) => (state.done[id] ? state : { done: { ...state.done, [id]: true } })),
    }),
    {
      name: 'racefocus.onboarding',
      storage: deviceStorage,
      version: 1,
      partialize: ({ initialized, welcomeSeen, mistakeExplained, stepsHidden, done }) => ({
        initialized,
        welcomeSeen,
        mistakeExplained,
        stepsHidden,
        done,
      }),
    },
  ),
);

/**
 * Decides once, after every store has loaded, whether this is a new player. Players who already
 * raced before this screen existed skip the welcome and the First steps card.
 */
export function startOnboarding() {
  const stores = [useOnboarding, usePractice, useRecords, useCareer];
  const check = () => {
    if (!stores.every((store) => store.persist.hasHydrated())) return;
    if (useOnboarding.getState().initialized) return;
    const played =
      usePractice.getState().totals.sessions > 0 ||
      Object.keys(useRecords.getState().bestLaps).length > 0 ||
      useCareer.getState().races > 0;
    useOnboarding.setState(
      played
        ? { initialized: true, welcomeSeen: true, stepsHidden: true, mistakeExplained: true }
        : { initialized: true },
    );
  };
  for (const store of stores) store.persist.onFinishHydration(check);
  check();
}
