import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

export type Language = 'en' | 'pl';
/** 'system' follows the phone's language. */
export type LanguageSetting = Language | 'system';

interface SettingsState {
  language: LanguageSetting;
  /** Sound effects: start lights, taps, wrong taps, laps, finish. */
  sounds: boolean;
  /** Short vibrations on a wrong tap (yellow flag), lights out and the finish. */
  vibration: boolean;
  /** Mix made-up drivers into the leaderboards while there are few real records. */
  testData: boolean;
  setLanguage: (language: LanguageSetting) => void;
  setSounds: (on: boolean) => void;
  setVibration: (on: boolean) => void;
  setTestData: (on: boolean) => void;
}

/** App settings. Kept on the device; signing out does not clear them. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'system',
      sounds: true,
      vibration: true,
      testData: true,
      setLanguage: (language) => set({ language }),
      setSounds: (sounds) => set({ sounds }),
      setVibration: (vibration) => set({ vibration }),
      setTestData: (testData) => set({ testData }),
    }),
    {
      name: 'racefocus.settings',
      storage: deviceStorage,
      version: 1,
    },
  ),
);
