# RaceFocus

Mobile game for training speed and concentration, with a motorsport theme.
Communicate with the user in Polish. Code, comments and identifiers in English.

UI prototype (3 screens + logo concepts): https://claude.ai/artifact/TwpgGvPBKNcGeaQPXoH5t1

## Core game

- The board is an N×N grid of numbers 1..N², shuffled. The player taps them in order, as fast as possible.
- One completed board = one **lap**. Board size = **track** (3×3 Sprint, 4×4 Street, 5×5 Circuit, 7×7 Endurance; more can be added).
- Modes: ascending, descending (countdown), later harder variants (mixed colors, disappearing numbers).
- A wrong tap adds a time penalty, so speed does not beat accuracy.
- Every board is generated from a **seed**. Same seed = same layout for every player in a given race.
- Timing: lap time, best lap per track, delta to own best lap (green = improvement, purple = fastest of the race).
- Solo session: the player types the lap count (1–99). Lights before lap 1 only (three red, then all green, then go); each next lap starts the instant the previous one ends, with no pause (its clock starts at the final tap), like a real race. The previous lap result shows in a strip above the board. Live delta to the session best and the personal best, compared split by split. Flags: yellow after a wrong tap, white before the final lap, chequered at the finish, then a session summary.

## Features and decisions

1. **Solo:** local records per track, delta to personal best, private statistics (lap-time trend, accuracy, consistency, heat map of where time is lost).
2. **Championships (asynchronous, first multiplayer version):** organizer picks tracks and number of laps, sets a time window, invites by code or link. Standings show position, gap to leader, gap to the driver ahead, delta to own best lap.
3. **Daily race (asynchronous):** one shared race per day, same seed for all, rotating tracks, streak counter. Undecided: one attempt per day or several.
4. **Live races (real-time):** private rooms (host sets tracks and laps, join by code) and daily matchmaking at fixed times (lobby opens a few minutes earlier; split into groups of 8-12 when many players). Each player solves the board on their own device; the server only syncs the start (server time, F1-style lights countdown) and broadcasts progress.
5. **Leaderboards** per track and mode (global, friends, weekly/season).
6. **Rating (later, once there are enough players):** iRacing-style. An Elo-based rating computed after a race closes, a separate accuracy rating (like Safety Rating), and license classes (Rookie → D → C → B → A).

Shared race engine to build once: lobby, server-time start, shared seed, live standings, result storage. Rooms, daily and championships are only different ways to create a race.

## Rules that must hold

- **The server validates times.** The client sends the tap sequence with timestamps; the server checks it and computes the lap time. Never trust a time sent by the client for rankings.
- No pay-to-win. Monetization is cosmetics (tile/number skins, themes, helmets, car colors) and a Premium subscription (advanced stats, unlimited private rooms and own championships, no ads). Ads only between races, never during a lap. Possible later: B2B (schools, coaches, clubs).
- Ranked fairness first: same seed, same rules for everyone in a race.

## Tech stack (proposed)

- React Native with Expo, TypeScript. Expo Router for navigation, Zustand for state, expo-notifications for push.
- Backend: Supabase (auth, Postgres, Realtime, scheduled jobs for daily races) or Firebase. Decide before building accounts.
- Builds and store submission through EAS (no Mac needed for iOS builds).
- Error reporting: Sentry.
- Keep game logic (board generation from seed, order check, timing, penalties, delta) in plain TypeScript modules with unit tests, separate from UI.

## Design

Style inspired by F1.com colors (palette only). Do not use the F1 logo, its typeface or other trademarks.

| Token | Value | Use |
| --- | --- | --- |
| red | `#E10600` | accent, primary buttons (white text on red), meta/progress |
| carbon | `#15151E` | background |
| surface | `#1F1F2B` | cards, tab bar |
| surface2 | `#2A2A38` | tiles, raised elements |
| line | `#38384A` | borders |
| text | `#F2F4F8` | main text |
| muted | `#A3ACBD` | secondary text |
| purple | `#B57BFF` | fastest lap in a race |
| green | `#3DDC84` | personal best / improvement |
| yellow | `#FFD12E` | yellow flag after a wrong tap |

Fonts: Barlow Condensed (headings, numbers, timers) and Inter (body). Use tabular numbers for all timers. Keep text contrast at least 4.5:1.

Screens in the prototype: Home (daily race card with countdown, tracks with best times, solo and private room, tab bar), Race (lap counter, large timer, delta to best, gap to P1, next number, 5×5 grid, progress), Results (standings with best lap and gap, rating and accuracy).

Logo: concept A is chosen: double chevron "fast forward" (white + red) with a checkered strip, on the carbon background. Concept B (RF monogram) was dropped. The wordmark is RACEFOCUS, slanted forward, with FOCUS in red. App icons live in `assets/images/`.

## Roadmap (build in this order)

1. Scaffold the Expo project and build the solo game core with tests (board, timer, penalties, lap, best lap, delta).
2. Local records and private statistics.
3. Accounts and backend.
4. Race engine, then private rooms.
5. Daily races, then championships and leaderboards.
6. Rating, then polish (sounds, start lights animation, results board).

## Publishing notes (verify current rules before release)

- Google Play: one-time $25 developer fee. Personal accounts created after 13 Nov 2023 need a closed test with 12 testers for 14 days before production. Organization accounts are exempt. New apps must target a recent Android API level.
- App Store: Apple Developer Program, $99 per year. Test with TestFlight. If third-party sign-in is offered, Sign in with Apple is required, and the app must let users delete their account.
- Both stores need a privacy policy, store listing assets, age rating and data disclosures. Stores take a commission on in-app purchases.

## Open decisions

- Framework confirmation (React Native + Expo proposed) and backend choice (Supabase vs Firebase).
- Daily race: one attempt or several per day.
- Premium contents and prices.

## Working style

- Ask before making large architectural decisions; propose options with a recommendation.
- Keep changes small and runnable; the app should always start after each step.
- Prefer simple solutions first; add live multiplayer and rating only after the single-player and asynchronous parts work.
