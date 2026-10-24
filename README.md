# RaceFocus

Mobile game for training speed and concentration, with a motorsport theme.
See `CLAUDE.md` for the full concept and roadmap.

## Current version: solo practice

- Tracks: Sprint 3×3, Street 4×4, Circuit 5×5, Endurance 7×7.
- Modes: 1 → N and countdown.
- Session length typed by the player (1–99 laps); laps run back to back with no pause, then a session summary.
- Lights countdown before lap 1, lap timer, +1 s per wrong tap.
- Live delta to the session best and personal best, updated at every tap.
- Flags: yellow after a wrong tap, white before the final lap, chequered at the finish.
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
- `src/app/(tabs)/` – tab screens (Expo Router): Home, Practice, Stats, Profile, with a custom icon tab bar.
- `src/app/race.tsx` – the race screen (lights, laps, flags, summary).
- `src/components/` – shared UI: tab bar and icons, flags, wordmark, cards.
- `src/store/` – app state (Zustand): records, practice setup and recent sessions, in memory for now.
- `src/theme.ts` – colors and fonts from the design tokens.
