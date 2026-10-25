import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { START_RATING, type Mode, type TrackId } from '@/game';

import { deviceStorage } from './storage';

/** One finished (or retired) room race, from this driver's point of view. */
export interface RaceRecord {
  /** `${roomCode}:${startAt}`, unique per race. */
  id: string;
  roomCode: string;
  track: TrackId;
  mode: Mode;
  laps: number;
  drivers: number;
  /** Null when retired. */
  position: number | null;
  totalMs: number | null;
  bestLapMs: number | null;
  mistakes: number;
  ratingBefore: number;
  ratingDelta: number;
  finishedAt: number;
}

export interface Career {
  rating: number;
  ratedRaces: number;
  races: number;
  wins: number;
  podiums: number;
  dnfs: number;
  /** Newest first. */
  history: RaceRecord[];
}

const MAX_HISTORY = 30;

export const EMPTY_CAREER: Career = {
  rating: START_RATING,
  ratedRaces: 0,
  races: 0,
  wins: 0,
  podiums: 0,
  dnfs: 0,
  history: [],
};

interface CareerState extends Career {
  /** Adds a race once; repeated calls with the same race id do nothing. Returns true when added. */
  addRace: (race: RaceRecord) => boolean;
  load: (career: Career) => void;
  reset: () => void;
}

export function applyRace(career: Career, race: RaceRecord): Career {
  if (career.history.some((r) => r.id === race.id)) return career;
  return {
    rating: career.rating + race.ratingDelta,
    ratedRaces: career.ratedRaces + (race.drivers > 1 ? 1 : 0),
    races: career.races + 1,
    wins: career.wins + (race.position === 1 ? 1 : 0),
    podiums: career.podiums + (race.position !== null && race.position <= 3 ? 1 : 0),
    dnfs: career.dnfs + (race.position === null ? 1 : 0),
    history: [race, ...career.history].slice(0, MAX_HISTORY),
  };
}

export function careerOf(state: Career): Career {
  const { rating, ratedRaces, races, wins, podiums, dnfs, history } = state;
  return { rating, ratedRaces, races, wins, podiums, dnfs, history };
}

export const useCareer = create<CareerState>()(
  persist(
    (set, get) => ({
      ...EMPTY_CAREER,
      addRace: (race) => {
        const before = careerOf(get());
        const after = applyRace(before, race);
        if (after === before) return false;
        set(after);
        return true;
      },
      load: (career) => set({ ...EMPTY_CAREER, ...career }),
      reset: () => set(EMPTY_CAREER),
    }),
    { name: 'racefocus.career', storage: deviceStorage, version: 1 },
  ),
);
