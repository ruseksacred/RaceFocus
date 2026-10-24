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

## Private rooms (live races)

- Race tab: create a room (track, mode, laps, penalty per wrong tap, max drivers) or join one with a 5-letter code and a nick.
- Lobby shows the drivers; the host starts the race. Everyone gets the same boards and counts down to the same server time.
- During the race: position, gap to P1 and to the car ahead (F1-style, at the same number), live standings, flags.
- Results: finishing order, gap to the winner, best laps (fastest of the race in purple), mistakes, accuracy. The host can start a new race in the same room.

Rooms need Firebase (Realtime Database + anonymous sign-in):

1. Create a project at https://console.firebase.google.com and add a Web app.
2. Build → Authentication → Sign-in method → enable **Anonymous**.
3. Build → Realtime Database → create a database, then paste the contents of `database.rules.json` into its Rules tab (or `npx firebase deploy --only database`).
4. Copy `.env.example` to `.env` and fill in the web app config.

To try rooms without a project, run `npm run emulators` (needs Java) and put `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost` in `.env` (your computer's LAN IP when testing on a phone).

## Install on a phone (PWA)

The web build is an installable app (manifest, icons, service worker, works offline after the first visit).

Deploy with Netlify (free):

1. Sign in at https://app.netlify.com with GitHub → **Add new site → Import an existing project** → pick this repo.
2. Netlify reads `netlify.toml`: build `npx expo export --platform web`, publish `dist`. Choose the branch to deploy.
3. For private rooms, add the `EXPO_PUBLIC_FIREBASE_*` variables from `.env.example` under Site configuration → Environment variables, then redeploy.

Then open the site on the phone:

- **Android (Chrome):** menu ⋮ → **Install app** (or *Add to Home screen*).
- **iPhone (Safari):** Share → **Add to Home Screen**.

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
- `src/app/race.tsx` – the solo race screen (lights, laps, flags, summary).
- `src/app/room/[code].tsx` – private room: lobby, live race with standings, results.
- `src/net/` – Firebase client and the rooms API. `database.rules.json` holds the database rules.
- `src/components/` – shared UI: tab bar and icons, flags, wordmark, cards.
- `src/store/` – app state (Zustand): records, practice setup and recent sessions, in memory for now.
- `src/theme.ts` – colors and fonts from the design tokens.
