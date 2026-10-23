# RaceFocus

Mobile game for training speed and concentration, with a motorsport theme.
See `CLAUDE.md` for the full concept and roadmap.

## Current version: solo practice

- Tracks: Sprint 3×3, Circuit 5×5, Endurance 7×7.
- Modes: 1 → N and countdown.
- Lights countdown, lap timer, +1 s per wrong tap, best lap and delta per track and mode.
- Best laps are kept in memory only (saved records come in roadmap step 2).

## Run

```bash
npm install
npx expo start      # scan the QR code with Expo Go, or press w for web
```

## Checks

```bash
npm test            # game logic unit tests (Vitest)
npm run typecheck
npm run lint
```

## Layout

- `src/game/` – game logic in plain TypeScript, no React: board from seed, lap state, penalties, timing. Tested.
- `src/app/` – screens (Expo Router): `index.tsx` menu, `race.tsx` lap.
- `src/store/` – app state (Zustand).
- `src/theme.ts` – colors and fonts from the design tokens.
