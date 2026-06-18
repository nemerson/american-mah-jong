# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

American Mah Jong desktop game (single-player, with multiplayer in progress): React 19
+ TypeScript + Vite, wrapped in Electron. The human plays against three bots using a
custom card ("International Mahjong Card 2026 — Year of the Horse", 51 hands in
9 sections) modeled on NMJL rules. A Socket.IO server (`server/`) and transport
abstraction (`src/net/`) have been added for multiplayer; single-player still works
in-process via `LocalTransport`.

## Commands

```powershell
# Single-player (Electron desktop)
npm run dev          # Vite + Electron in dev mode (window loads localhost:5173)
npm run build        # tsc -b, vite build, then electron tsconfig build
npm run package      # electron-packager Windows build into release-builds/

# Multiplayer server
npm run dev:server   # tsx watch server/index.ts (hot-reload, port 5174)
npm run server       # tsx server/index.ts (production-style)
npm run build:server # esbuild → dist-server/index.mjs

# Quality
npm test             # vitest run (engine + transport + server unit tests)
npm run lint         # eslint — keep it at zero errors
```

**Electron launch gotcha:** shells spawned by Claude Code inherit
`ELECTRON_RUN_AS_NODE=1`, which makes `electron.exe` act as plain Node, so
`require('electron')` returns a path string and `app` is undefined. Clear it first:
`Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; npm run dev`.
Also kill stale node/electron processes first — a leftover Vite server on 5173 makes
the new one silently move to 5174 while `electron/main.cts` hardcodes 5173.

## Workflow

- After every commit, `git push` immediately (remote: origin/master on GitHub).
- Run `npm test` and `npm run lint` before committing.

## Architecture

### State and transport

State is one immutable `GameState` (src/types/mahjong.ts). All transitions are pure
engine functions in `src/engine/`; no component ever mutates state directly.

The UI communicates with the game authority via a `GameTransport` interface
(`src/net/types.ts`). The transport delivers `PlayerView` snapshots (each player sees
only their own hand) and accepts `Intent` messages (discard, call, pass, etc.), which
the authority validates through the engine before applying. The UI never holds the raw
`GameState` — only the filtered view for its seat.

Two concrete transports:

- **`LocalTransport`** (`src/net/localTransport.ts`) — wraps a `GameSession` in-process.
  This is what `GameBoard` uses today (single-player). No network involved.
- **`RemoteTransport`** (`src/net/remoteTransport.ts`) — talks to the authoritative
  server over Socket.IO. Selected at runtime when `window.__MAHJONG_REMOTE__ === true`
  (the server injects that flag into `index.html` when serving the web client).

### GameSession

`GameSession` (`src/net/gameSession.ts`) is the shared authority core — it owns the
one true `GameState`, runs the `GameClock`, collects multi-seat decisions (call window,
Charleston passes), and applies intents via the engine. Both `LocalTransport` and the
server wrap a `GameSession`; rules and timing live in exactly one place.

### GameClock

`src/engine/gameClock.ts` drives timed progression — auto-draw (600 ms), bot discard
(1 s), and the call-window countdown. It is transport-agnostic (`getState`/`setState`
callbacks) and runs wherever the authority lives: in the browser for single-player, on
the server for multiplayer. It keys reschedules off `phase|turn|wall|discards` only, so
cosmetic changes (hand reordering) never cancel pending timers.

> `src/hooks/useGameLoop.ts` no longer exists — its logic was extracted into
> `gameClock.ts` and `GameSession`.

### Engine modules (`src/engine/`)

- `deck.ts` — 152-tile deck generation and shuffle
- `game.ts` — init/deal, draw, discard, advanceTurn, reorder
- `charleston.ts` — the six passes + courtesy pass
- `calls.ts` — claiming discards into exposures, joker exchange, `resolveClaims`
- `gameClock.ts` — timed authority-side progression (extracted from old useGameLoop)
- `handMatcher.ts` — card-hand spec schema + matching/scoring algorithms (card-agnostic)
- `cardData.ts` — the 51 hands: display segments AND validation specs side by side
- `rules.ts` — `checkMahJong` (validates 14 tiles against the card, returns the
  matched hand + points), `getTileKey`, legacy `checkPattern`
- `bot.ts` — card-aware decisions: every choice derives from `findBestTarget`
  (best-fitting card hand for the bot's tiles)

### Server (`server/`)

Express + Socket.IO authoritative game server. Listens on port 5174 (configurable via
`PORT` env var). Serves the built client from `dist/` with the `__MAHJONG_REMOTE__`
flag injected so browsers use `RemoteTransport`. The Electron app loads the same build
from disk without the flag, staying single-player.

- `server/index.ts` — HTTP + Socket.IO setup, LAN URL logging
- `server/lobby.ts` — connection handler; routes socket events to rooms
- `server/room.ts` — one room per game: wraps `GameSession`, handles seat assignment,
  per-player view filtering, claim collection, Charleston sync

### Net layer (`src/net/`)

- `types.ts` — `GameTransport`, `PlayerView`, `PlayerSeatView`, `Intent`, `LobbyState`,
  `LobbyRequest`, `StartResult`
- `gameSession.ts` — shared authority core (used by both LocalTransport and server)
- `localTransport.ts` — in-process single-player transport
- `remoteTransport.ts` — Socket.IO-backed multiplayer transport
- `viewFor.ts` — strips `GameState` down to the `PlayerView` for a given seat
- `createTransport.ts` — factory: returns `LocalTransport` or `RemoteTransport` based
  on `window.__MAHJONG_REMOTE__`

## Multiplayer progress

Following `MULTIPLAYER_PLAN.md` phases:

- **Phase 0 (decouple UI from engine)** — ✅ done. `GameTransport` interface,
  `GameSession`, `LocalTransport`, `gameClock.ts` extraction, `viewFor`, Lobby UI.
- **Phase 1 (server + LAN, 1 human + bots)** — ✅ done. `server/` running with
  Socket.IO, `RemoteTransport`, room/lobby handling.
- **Phase 2 (multiple humans, room codes, view filtering)** — in progress.
- **Phase 3+ (internet play, reconnection, mobile layout)** — not started.

## Card data invariants (cardData.ts)

Each hand carries `segments` (colored pattern text for the reference panel) and
`variants` (machine-readable `HandVariant` specs) in the same object — when changing
a hand, update both. `cardData.test.ts` enforces per variant: groups sum to exactly
14 tiles, the hand is physically possible (≤4 copies per tile, ≤8 flowers), and a
hand built from the spec is recognized by the matcher. Hands marked `[corrected]`
were fixed from an impossible printed form; keep the marker and reasoning.

Spec conventions: suits are variables A/B/C bound to distinct real suits at match
time; numbers are literal (`lit`) or base+offset (`off`) with optional even/odd base
parity; `soap` is the white dragon used as zero; dragons map to suits
(bams→green, craks→red, dots→white).

## Game rules implemented (house rules where ambiguous)

- Jokers: only in groups of 3+ (never singles/pairs), each group needs ≥1 natural
  tile, jokers can't be claimed from discards or passed in the Charleston.
- Charleston: the second Charleston is optional — the human can stop it at the
  decision point (entry to secondLeft) via `stopCharleston`. On the 3rd and 6th
  passes a blind pass is allowed: pick 0-3 of your own tiles, the rest are taken
  unseen from the incoming stack (they pass through without entering your hand).
  Bots always pass 3 of their own and never blind-pass or stop the Charleston.
- Calling: discard + 2 matching naturals minimum (or 1 natural + 1 joker); the call
  window gives the human exclusive priority (bots wait 6s of an 8s window) when they
  can use the tile, otherwise a quick 4s window with bots acting at 1.5s.
- Mahjong on a discard beats exposure calls; you can't claim your own discard.
- All flowers are interchangeable; wall exhaustion = wall game (no winner).

## Testing

Engine logic is thoroughly unit-tested (vitest). Test files live alongside the source:
`src/engine/*.test.ts` covers the core engine; `src/net/*.test.ts` covers the transport
layer (`gameSession`, `localTransport`); `server/room.test.ts` covers the server room.
There are no component tests (no jsdom/testing-library installed).

When adding a card hand or matcher feature, extend the self-validating pattern in
`cardData.test.ts` rather than writing one-off assertions.
