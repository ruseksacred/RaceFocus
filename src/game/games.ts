/**
 * The games in the app. Today there is one (the number board); the welcome and How to play
 * screens list them all, so a new game only needs an entry here and its texts in `games` (i18n).
 */
export type GameId = 'board' | 'reaction' | 'pitstop';

export interface GameInfo {
  id: GameId;
  available: boolean;
}

export const GAMES: readonly GameInfo[] = [
  { id: 'board', available: true },
  { id: 'reaction', available: false },
  { id: 'pitstop', available: false },
];
