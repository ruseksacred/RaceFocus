import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

interface ProfileState {
  /** Nickname for rooms. With an account it is the account's unique nick. */
  nick: string;
  /**
   * Account whose data is stored on this device, or null for guest data.
   * Used to merge guest progress into a new account and to avoid mixing accounts.
   */
  ownerUid: string | null;
  /** The driver's helmet (avatar) as a string, see `encodeHelmet`. Null until they design one. */
  helmet: string | null;
  setNick: (nick: string) => void;
  setHelmet: (helmet: string) => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      nick: '',
      ownerUid: null,
      helmet: null,
      setNick: (nick) => set({ nick }),
      setHelmet: (helmet) => set({ helmet }),
    }),
    {
      name: 'racefocus.profile',
      storage: deviceStorage,
      version: 1,
    },
  ),
);
