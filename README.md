# RaceFocus

Mobile game for training speed and concentration, with a motorsport theme.
See `CLAUDE.md` for the full concept and roadmap.

## Current version: solo practice

- Tracks: Sprint 3×3, Street 4×4, Circuit 5×5, Endurance 7×7.
- Modes: 1 → N and countdown.
- Race length: laps (1–99) or time (1–30 min). When time is up you finish the lap you are on. Laps run back to back with no pause, then a session summary.
- Lights countdown before lap 1, lap timer, +1 s per wrong tap.
- Live delta to the session best and personal best, updated at every tap.
- Flags: yellow after a wrong tap, white before the final lap, chequered at the finish.
- Records, recent sessions, setup and nick are saved on the device.

## Private rooms (live races)

- Race tab: create a room (track, mode, laps or time, penalty per wrong tap, max drivers) or join one with a 5-letter code and a nick.
- Timed races: when time is up the leader finishes the lap they are on and takes the chequered flag; everyone else then finishes at the end of their current lap. Order is laps completed, then time; lapped drivers show “+N laps”.
- Lobby shows the drivers; the host starts the race. Everyone gets the same boards and counts down to the same server time.
- During the race: position, gap to P1 and to the car ahead (F1-style, at the same number), live standings, flags, and your own lap time with a live delta to your best lap of the race and your personal best.
- Results: finishing order, gap to the winner, best laps (fastest of the race in purple), mistakes, accuracy. The host can start a new race in the same room.

Rooms use the Firebase project `racefocus-b709c` (Realtime Database in europe-west1 + anonymous sign-in); its web config is in `src/net/firebase.ts`. When `database.rules.json` changes, paste it into Realtime Database → Rules in the Firebase console (or `npx firebase deploy --only database`). To use another project, set the variables from `.env.example`.

To try rooms without a project, run `npm run emulators` (needs Java) and put `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost` in `.env` (your computer's LAN IP when testing on a phone).

## Invite links and languages

- In a room lobby, **Invite drivers** opens the share sheet (or copies the link) with `…/join/CODE`. The link opens a join screen: type a nick, tap **Join race**.
- The app speaks English and Polish. It follows the phone language; change it in **Profile → Settings**. Texts are in `src/i18n/`.

## Helmet (avatar)

- Profile → **Edit helmet**: colour, design, design colour and race number. Other drivers see it in rooms and results.
- After `database.rules.json` changes, publish it again in the Firebase console (Realtime Database → Rules), or helmets do not show in rooms.

## Sound and vibration

- Beeps for the start lights, a click per correct tap, a buzz and a vibration on a wrong tap, chimes for laps and best laps, a fanfare at the finish. Turn either off in **Profile → Settings**.
- Sounds are generated in code (`src/feedback/synth.ts`); `npm run sounds` writes the WAV files the phone app uses.
- Vibration works in Android browsers and the phone app; Safari on iPhone does not support it.

## Leaders

- **Leaders** tab: track records per track and mode, podium for the top three, then the list. Only laps from online races (private rooms with a penalty of at least 1 s) by drivers with an account count; solo practice does not.
- **Test data** switch on the tab mixes in made-up drivers marked TEST, for trying it out.
- Your stats are in **Profile → All stats**.
- Publish `database.rules.json` again in the Firebase console after this change (new `leaderboards` rules and index).

## Accounts

- Play as a guest (data on the device) or create an account in **Profile**: e-mail and password, or Google (web).
- Guest progress moves into the new account. With an account, records, solo totals, race stats and rating are saved in the cloud and restored after signing in on any device.
- Nicks are unique (case-insensitive). Sign out clears the device; delete account removes the account, nick and data.
- Rating (beta): multiplayer Elo from private-room races (start 1500, K 32, pairwise vs every other driver; retiring counts as finishing behind everyone). Licence: Rookie for the first 3 rated races, then D/C/B/A by rating. Computed on each phone for now.

Firebase console setup for accounts: Authentication → Sign-in method → enable **Email/Password** and **Google**; Authentication → Settings → Authorized domains → add the Netlify domain. Publish `database.rules.json` again after it changes.

## Install on a phone (PWA)

The web build is an installable app (manifest, icons, service worker, works offline after the first visit).

Deploy with Netlify (free):

1. Sign in at https://app.netlify.com with GitHub → **Add new site → Import an existing project** → pick this repo.
2. Netlify reads `netlify.toml`: build `npx expo export --platform web`, publish `dist`. Choose the branch to deploy.

Then open the site on the phone:

- **Android (Chrome):** menu ⋮ → **Install app** (or *Add to Home screen*).
- **iPhone (Safari):** Share → **Add to Home Screen**.

## Android app (APK for testers)

Builds run on Expo's servers (EAS, free plan). `eas.json` has two profiles: `preview` makes an APK to send to testers directly, `production` makes the bundle for Google Play. The Android package id is `com.racefocus.app` (cannot change after the first Play upload).

1. Create a free account at https://expo.dev and a project named `racefocus`; put its project id into `app.json` (`expo.extra.eas.projectId`) and the account name into `expo.owner`.
2. Either connect the GitHub repo in the project's settings on expo.dev and start a build there (platform Android, profile `preview`), or run `npx eas-cli build -p android --profile preview` on a computer.
3. Send testers the link to the finished APK; Android asks them to allow installing from this source.

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
- `src/store/` – app state (Zustand), saved on the device: records, practice setup and history, career (races, rating), profile.
- `src/net/account.ts` – sign-in, unique nicks, cloud sync of the stores (`users/{uid}/data` private, `users/{uid}/profile` public).
- `src/theme.ts` – colors and fonts from the design tokens.
