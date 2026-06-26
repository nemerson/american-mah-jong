# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

American Mah Jong desktop/web game: React 19 + TypeScript + Vite, wrapped in Electron
for single-player and served via a Socket.IO server for LAN multiplayer. The human
plays against three bots using a custom card ("International Mahjong Card 2026 — Year
of the Horse", 51 hands in 9 sections) modeled on NMJL rules.

**Status:** Phases 0–2 complete (decouple, LAN server, lobby + multi-human). Phase 3
**polish track** done (call-window countdown, joker-swap discoverability, lobby QoL).
Phase 3 **internet play** in progress: tunnel support validated end-to-end (Cloudflare
quick tunnel, no server code changes — see "Exposing over the internet" below);
**reconnection** is mid-build (per-seat session tokens landed; rejoin handler, seat-hold
timeout w/ bot takeover, and client auto-rejoin still to do). See `BACKLOG.md` for the
sequenced sub-tasks.

## Commands

```powershell
# Single-player (Electron desktop)
npm run dev          # Vite + Electron in dev mode (window loads localhost:5173)
npm run build        # tsc -b, vite build, then electron tsconfig build
npm run package      # electron-packager Windows build into release-builds/

# Multiplayer (browser)
# Double-click start-server.bat  ← builds then serves; keeps URL on screen
npm run server       # tsx server/index.ts (serves dist/ on port 5174)
npm run dev:server   # tsx watch server/index.ts (hot-reload server only)
npm run build:server # esbuild → dist-server/index.mjs

# Quality
npm test                  # vitest run — 259 tests across 13 files
npm run lint              # eslint — keep it at zero errors
npm run typecheck:server  # tsc type-check server/ only (does not emit)
```

**Multiplayer workflow:** `start-server.bat` (double-click) runs `npm run build` then
`npm run server`. The browser URL and LAN IP stay visible in the console. Always build
before serving — the server serves `dist/` and won't reflect source changes otherwise.

**Electron launch gotcha:** shells spawned by Claude Code inherit
`ELECTRON_RUN_AS_NODE=1`, which makes `electron.exe` act as plain Node. Clear it first:
`Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; npm run dev`.
Also kill stale node/electron processes — a leftover Vite server on 5173 makes the new
one silently move to 5174 while `electron/main.cts` hardcodes 5173.

**Stale port cleanup:**
```powershell
Get-NetTCPConnection -LocalPort 5174 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Exposing over the internet (tunnel):** the server takes no code changes to go public —
its `HOST`/`PORT`/`CORS_ORIGIN` env vars are enough. Validated path is a Cloudflare quick
tunnel (`cloudflared`, installed via `winget install Cloudflare.cloudflared`):
```powershell
# 1. build + serve locally first (server must be up on 5174)
npm run build; npm run server
# 2. in another shell, expose it — prints a public https://<random>.trycloudflare.com URL
cloudflared tunnel --url http://localhost:5174
```
The quick-tunnel URL is ephemeral (new one each run) and the lobby has no auth yet
(`CORS_ORIGIN` defaults to `*`) — fine for a controlled test, tighten before leaving a
tunnel up. A WebSocket round-trip (Socket.IO) is confirmed working through the tunnel.
For a stable URL later, switch to a named Cloudflare tunnel / ngrok reserved domain /
Tailscale Funnel — no app changes, just a different tunnel command.

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
  Used by the Electron app (single-player). No network involved. `subscribe()` re-arms
  the session→UI link (and restarts the clock via `GameSession.resume()`) so the same
  instance survives a `dispose()`-then-resubscribe — e.g. React StrictMode's dev
  double-mount. Don't move that link back into the constructor only: that reintroduces
  the dev-mode freeze where intents mutate state but no view is ever emitted.
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
(1 s), and the call-window countdown. Transport-agnostic (`getState`/`setState`
callbacks); runs in the browser for single-player and on the server for multiplayer.
Keys reschedules off `phase|turn|wall|discards` only, so cosmetic changes never cancel
pending timers.

> `src/hooks/useGameLoop.ts` no longer exists — its logic was extracted into
> `gameClock.ts` and `GameSession`.

### Engine modules (`src/engine/`)

- `deck.ts` — 152-tile deck; flowers tagged value 1–8 (Flowers 1–4, Seasons 5–8)
- `game.ts` — init/deal, draw, discard, advanceTurn, reorder
- `charleston.ts` — the six passes + courtesy pass
- `calls.ts` — claiming discards into exposures, joker exchange, `resolveClaims` (note: test file is `claims.test.ts`)
- `gameClock.ts` — timed authority-side progression
- `handMatcher.ts` — card-hand spec schema + matching/scoring algorithms (card-agnostic)
- `cardData.ts` — the 51 hands: display segments AND validation specs side by side
- `rules.ts` — `checkMahJong`, `getTileKey`, legacy `checkPattern`
- `bot.ts` — card-aware decisions via `findBestTarget`

### Visual / theme layer

Tile and mat theming is split across CSS variables and a React context:

- `src/theme/themes.ts` — `TILE_SETS` (7 sets) and `MATS` (7 mats); `useTheme` hook
  persists selection to localStorage via `[data-tiles]` / `[data-mat]` on the app shell.
- `src/theme/TileStyleContext.tsx` — React context that carries `TileArtStyle` from the
  active set to `TileFace` without prop-drilling. Provided once in `App.tsx`.
- `src/components/TileFace.tsx` — SVG tile art; artwork-driven (pips, bamboo canes,
  Chinese numerals, compass-rose winds, etc.). Art style (neon glow, jade bevel, gold
  inlay, watercolor wash, etc.) driven by `TileArtStyle` via SVG filters.
- `src/components/Tile.css` — per-`[data-tiles]` color palettes.
- `src/index.css` — per-`[data-mat]` felt variables + `--mat-motif` CSS patterns for
  the embroidery layer rendered by `GameBoard.css::after`.

**Tile sets (7):** Classic Ivory, Vintage Bakelite, Imperial Jade, Onyx & Gold, Rose
Quartz, Neon Arcade, Watercolor Garden. Each has a distinct `artStyle` and tile back.

**Mats (7):** Emerald Felt, Burgundy Club, Midnight Blue, Walnut Table, Pacific Teal,
Year of the Horse, Art Deco Parlor. Each has a low-contrast felt motif layer.

**FlowerTile.value** is now 1–8 (was 1–4 cycling). Values 1–4 render as four distinct
flower blooms; 5–8 render as the four Seasons (Spring/Summer/Autumn/Winter). All 8
remain rules-interchangeable.

### Server (`server/`)

Express + Socket.IO authoritative game server on port 5174 (configurable via `PORT`).
Serves the built client from `dist/` with `__MAHJONG_REMOTE__` injected. Electron
loads the same build without the flag, staying single-player.

- `server/index.ts` — HTTP + Socket.IO setup, LAN URL logging
- `server/lobby.ts` — connection handler; routes socket events to rooms
- `server/room.ts` — one room per game: wraps `GameSession`, handles seat assignment,
  per-player view filtering, claim collection, Charleston sync. Mid-game disconnect
  holds the seat (drops the socket, no bot takeover) for reconnection. Each human seat
  is minted a secret `randomUUID` token at `seatHuman`, delivered only in that client's
  own `LobbyState.token` — the basis for the in-progress `rejoin` flow (see `BACKLOG.md`).

### Net layer (`src/net/`)

- `types.ts` — `GameTransport`, `PlayerView`, `PlayerSeatView`, `Intent`, `LobbyState`,
  `LobbyRequest`, `StartResult`
- `gameSession.ts` — shared authority core
- `localTransport.ts` — in-process single-player transport
- `remoteTransport.ts` — Socket.IO-backed multiplayer transport
- `viewFor.ts` — strips `GameState` to per-seat `PlayerView` (hides opponent hands)
- `createTransport.ts` — factory: `LocalTransport` or `RemoteTransport`

## Multiplayer progress

- **Phase 0 (decouple UI from engine)** — ✅ done.
- **Phase 1 (server + LAN, 1 human + bots)** — ✅ done.
- **Phase 2 (multiple humans, room codes, view filtering)** — ✅ done.
- **Phase 3 (internet play)** — in progress: tunnel support validated; reconnection
  mid-build (session tokens done). Mobile/responsive layout deferred. See `BACKLOG.md`.

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
  unseen from the incoming stack. Bots always pass 3 of their own and never blind-pass.
- Calling: discard + 2 matching naturals minimum (or 1 natural + 1 joker); the call
  window gives the human exclusive priority (bots wait 6s of an 8s window) when they
  can use the tile, otherwise a quick 4s window with bots acting at 1.5s.
- Mahjong on a discard beats exposure calls; you can't claim your own discard.
- All flowers are interchangeable; wall exhaustion = wall game (no winner).

## Backlog management

`BACKLOG.md` is the source of truth for the Notion project tracker, which syncs nightly —
keep it accurate so the sync reflects reality.

- **Mark tasks done as work completes.** Don't wait until the end of a session; update
  `BACKLOG.md` as soon as a task is finished.
- **Add new tasks as they surface.** If development uncovers a bug, a follow-up, or a
  dependency that wasn't tracked, add it immediately with a `[ ]` status.
- **Use a consistent format:**
  - `[ ] Title` — pending
  - `[x] Title` — done
  - Optionally add a note on the same line or indented below for blockers or dependencies,
    e.g. `[ ] Reconnection logic — blocked on Phase 3 socket auth`
- **End-of-session pass.** Before wrapping up, do a quick review of `BACKLOG.md`: mark
  anything completed during the session as `[x]`, and add any new items that surfaced.

## Testing

Engine logic is thoroughly unit-tested (vitest). Test files live alongside the source:
`src/engine/*.test.ts` covers the core engine; `src/net/*.test.ts` covers the transport
layer; `server/room.test.ts` covers the server room. No component tests (no
jsdom/testing-library installed).

When adding a card hand or matcher feature, extend the self-validating pattern in
`cardData.test.ts` rather than writing one-off assertions.
