import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

export type Language = 'en' | 'pl';
/** 'system' follows the phone's language. */
export type LanguageSetting = Language | 'system';

interface SettingsState {
  language: LanguageSetting;
  setLanguage: (language: LanguageSetting) => void;
}

/** App settings. Kept on the device; signing out does not clear them. */
export const useSettings = create<SettingsState>()(
  persist((set) => ({ language: 'system', setLanguage: (language) => set({ language }) }), {
    name: 'racefocus.settings',
    storage: deviceStorage,
    version: 1,
  }),
);
