import { create } from 'zustand';

interface ProfileState {
  /** Nickname shown to other drivers in rooms. In memory until accounts exist. */
  nick: string;
  setNick: (nick: string) => void;
}

export const useProfile = create<ProfileState>((set) => ({
  nick: '',
  setNick: (nick) => set({ nick }),
}));
