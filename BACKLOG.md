# Backlog

Pending work ordered roughly by priority. See `CLAUDE.md` for architecture context.

## Bugs

- [ ] **Dev-mode single-player stalls after the first Charleston pass** — under
  `npm run dev` (Vite dev build), single-player freezes after the human's first
  Charleston pass: the pass intent fires (selection clears) but game state never
  advances. The production build does the identical sequence flawlessly, so the
  shipped/packaged Electron app and the server are unaffected — but dev Electron
  loads the dev server, so local single-player development may be broken. Suspected
  cause: React **StrictMode** double-mount runs `GameBoard`'s effect cleanup →
  `transport.dispose()` (which `clock.stop()`s the in-process `GameSession`) during
  the simulated remount, leaving the clock stopped. Appears **pre-existing** (the
  Phase 3 polish commits don't touch the Charleston/transport-dispose path), not a
  regression. Found during runtime verification of the call-window/joker features
  (prod build at `vite preview` worked; dev build at `vite` reproduced the stall,
  including via a direct single-pass test). Root cause not yet confirmed.

## Phase 3 — Internet play & polish

These were scoped in `multiplayer_plan.md` but not yet started.

### Internet connectivity (Phase 3 network)
- **Tunnel support** — expose the local server over the internet via Tailscale or
  ngrok. Server already reads `HOST`/`PORT`/`CORS_ORIGIN` env vars; no code changes
  needed beyond documenting the tunnel setup.
- **Reconnection** — session tokens so a disconnected player can rejoin their seat
  mid-game. `server/room.ts` already holds the seat without bot takeover on disconnect;
  needs the token handshake and `RemoteTransport` reconnect logic.
- [x] **Synced countdown UI** — expose remaining call-window ms in `PlayerView` so the
  client can render a depleting ring/bar on the Call button. Done: `GameClock`
  tracks the call-window deadline (`callWindowRemainingMs()`), `GameSession`
  forwards it, and `viewFor(state, seat, callWindowMs?)` threads it into
  `PlayerView.callWindowMs`. Works in all three modes (clock runs in-browser for
  single-player, on the server for LAN/internet).

### UX improvements (from UI/UX review — not yet implemented)
- [x] **Call window countdown timer** — depleting gold bar under the Call button,
  driven by `view.callWindowMs` (CSS depletion animation keyed per discard, so a
  new discard restarts it). Respects `prefers-reduced-motion`.
- [x] **Joker swap discoverability** — exposed jokers the player can swap (they
  hold the matching natural and it's their discard turn) now get a gold glow +
  ⇄ badge, computed independent of selection across all four seats' exposures.
  The Swap button still completes the move once the natural is selected.
- **Lobby quality-of-life:**
  - [x] Copy-to-clipboard button on the join code chip (`.lobby-code-display`)
    — `navigator.clipboard` with a "✓ Copied" confirmation; soft-fails on
    insecure origins (code stays visible).
  - [x] Leave room / back button for the host — replaces the RemoteConnection
    (disconnecting frees the seat server-side via the existing disconnect
    handler) and returns to the Home screen.
  - [x] Per-seat connection indicator (connected dot for human seats) — a live
    pulsing green dot on seats whose occupant is `human` (a connected socket
    holds the seat), in the waiting-room seat list.

### Mobile / responsive layout
- Tile sizes are fixed px; opponent hands use `transform: rotate()`.
- Need `clamp()`-based tile dimensions and a portrait-safe layout for rotated hands.
- Explicitly deferred — tackle when the game reaches mobile users.

---

## Completed (for reference)

### Phase 0 — Decouple UI from engine ✅
`GameTransport` seam, `GameSession`, `LocalTransport`, `gameClock.ts` extraction,
`viewFor`, count-only opponent hands, `GameBoard` rewired to transport.

### Phase 1 — LAN server ✅
Express + Socket.IO server (`server/`), `RemoteTransport`, hidden-info filtering
server-side, `npm run server` / `npm run dev:server`.

### Phase 2 — Lobby + multi-human play ✅
Room registry with join codes, `Lobby.tsx` create/join UI, `StartResult` union,
`ensureEastOccupied`, multi-human Charleston sync, unified claim arbitration.

### Visual redesign ✅
- **Tile art (Stage 1):** artwork-driven SVG — proper pip clusters, bamboo canes with
  nodes/leaves, traditional 1-Bam bird, Chinese numeral craks, compass-rose winds,
  dragon accent rings, 4 flower blooms + 4 seasons, clear joker badge.
- **Tile sets (Stage 2):** 7 sets with distinct `TileArtStyle` drawing treatments
  (classic, engraved/jade, retro/Bakelite, inlay/onyx-gold, linework/rose quartz,
  neon glow, watercolor wash) via `TileStyleContext`. Each has its own tile back.
- **Mat motifs (Stage 3):** `--mat-motif` CSS layer on `.game-board::after`; 5 existing
  mats evolved (medallion, damask, stars, wood grain, waves); 2 new mats added
  (Year of the Horse, Art Deco Parlor).
- **Settings panel (Stage 4):** real `TileFace` previews per tile set (showing art
  style treatments); real mat motif swatches; Tiles/Table tab toggle.

### UX fixes ✅
- Active opponent label glows gold during draw/discard turns.
- Phase indicator uses plain language ("Your turn · Discard a tile", "Charleston 1 of 2
  · Pass Left", "Waiting for calls…") instead of raw enum names.
- `WinningHandsReference` moved from always-visible inline to a toggleable overlay via
  the Reference Card button (top-right corner of the board).
- Pass and Swap for Joker buttons always occupy their layout slot (visibility toggled)
  so the action row doesn't reflow during the call window.
- Global `:focus-visible` gold ring for keyboard navigation.
- `prefers-reduced-motion` media query suppresses all animations.
