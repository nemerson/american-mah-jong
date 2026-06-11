# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

A single-player American Mah Jong desktop game: React 19 + TypeScript + Vite, wrapped
in Electron. The human plays against three bots using a custom card ("International
Mahjong Card 2026 — Year of the Horse", 51 hands in 9 sections) modeled on NMJL rules.

## Commands

```powershell
npm run dev       # Vite + Electron in dev mode (window loads localhost:5173)
npm test          # vitest run (engine unit tests)
npm run lint      # eslint — keep it at zero errors
npm run build     # tsc -b, vite build, then electron tsconfig build
npm run package   # electron-packager Windows build into release-builds/
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

State lives in one immutable `GameState` (src/types/mahjong.ts), held in `GameBoard`
via `useState`. All transitions are pure functions in `src/engine/`; components never
mutate state. Timed progression (auto-draw, bot discards, the call window) is driven
by `src/hooks/useGameLoop.ts`, whose effect keys off phase/turn/wall/discards — NOT
the whole state object — so cosmetic updates (hand reordering) can't reset or cancel
pending timers. Keep it that way.

Engine modules:

- `deck.ts` — 152-tile deck generation and shuffle
- `game.ts` — init/deal, draw, discard, advanceTurn, reorder
- `charleston.ts` — the six passes + courtesy pass
- `calls.ts` — claiming discards into exposures, joker exchange, `resolveBotClaims`
- `handMatcher.ts` — card-hand spec schema + matching/scoring algorithms (card-agnostic)
- `cardData.ts` — the 51 hands: display segments AND validation specs side by side
- `rules.ts` — `checkMahJong` (validates 14 tiles against the card, returns the
  matched hand + points), `getTileKey`, legacy `checkPattern`
- `bot.ts` — card-aware decisions: every choice derives from `findBestTarget`
  (best-fitting card hand for the bot's tiles)

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

Engine logic is thoroughly unit-tested (vitest, `src/engine/*.test.ts`); there are no
component tests (no jsdom/testing-library installed). When adding a card hand or
matcher feature, extend the self-validating pattern in `cardData.test.ts` rather than
writing one-off assertions.
