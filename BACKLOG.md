# Backlog

Pending work ordered roughly by priority. See `CLAUDE.md` for architecture context.

## Phase 3 — Internet play

The Phase 3 **polish track** (countdown UI, joker discoverability, lobby QoL) is
done — see Completed below. What remains is actual internet play. Scoped in
`multiplayer_plan.md`.

### Internet connectivity (next up)
- [ ] **Tunnel support** — expose the local server over the internet via Tailscale or
  ngrok. Server already reads `HOST`/`PORT`/`CORS_ORIGIN` env vars; no code changes
  needed beyond documenting the tunnel setup. Cheapest win — gets remote players
  connecting.
  - [ ] Validate a tunnel end-to-end (two remote clients through ngrok/Tailscale),
    confirming `CORS_ORIGIN` is set correctly and Socket.IO upgrades over the tunnel —
    "no code changes needed" is unproven until a real remote session works.
- [ ] **Reconnection** — session tokens so a disconnected player can rejoin their seat
  mid-game. `server/room.ts` already holds the seat without bot takeover on disconnect;
  needs the token handshake and `RemoteTransport` reconnect logic. The risky one —
  internet play without it strands a seat on any blip, so pair it with tunnel support.
  - [ ] Decide and implement a seat-hold timeout — an indefinitely held empty seat
    blocks the table. Need either a reclaim window after which the seat frees (or bot
    takes over) or an explicit host "drop seat" control.

### Mobile / responsive layout (deferred)
- [ ] **Responsive tile + board layout** — tile sizes are fixed px and opponent hands
  use `transform: rotate()`. Need `clamp()`-based tile dimensions and a portrait-safe
  layout for rotated hands. Explicitly deferred — tackle when the game reaches mobile
  users.

---

## Completed (for reference)

### Phase 3 — Polish track ✅ (2026-06-20)
- **Synced countdown UI / `callWindowMs` plumbing** — `GameClock` tracks the
  call-window deadline (`callWindowRemainingMs()`), `GameSession` forwards it, and
  `viewFor(state, seat, callWindowMs?)` threads it into `PlayerView.callWindowMs`.
  Works in all three modes (clock in-browser for single-player, on the server for
  LAN/internet).
- **Call-window countdown timer** — depleting gold bar under the Call button, driven
  by `view.callWindowMs` (CSS depletion animation keyed per discard, so a new discard
  restarts it). Respects `prefers-reduced-motion`.
- **Joker-swap discoverability** — exposed jokers the player can swap (they hold the
  matching natural and it's their discard turn) get a gold glow + ⇄ badge, computed
  independent of selection across all four seats' exposures. The Swap button still
  completes the move once the natural is selected.
- **Lobby quality-of-life** — copy-to-clipboard on the join-code chip
  (`.lobby-code-display`, soft-fails on insecure origins); leave-room/back button for
  the host (disconnect frees the seat via the existing server handler); per-seat
  connection dot for human seats in the waiting room.
- **Bugfix — dev-mode single-player freeze on StrictMode remount.** Under `npm run dev`,
  single-player froze after the first Charleston pass: `LocalTransport` wired its
  session→UI link once in the constructor, and React StrictMode's dev double-mount ran
  `GameBoard`'s cleanup → `dispose()`, severing it permanently (and stopping the clock)
  with no re-arm on remount. Fixed by re-arming in `subscribe()` via an idempotent
  `connect()` + `GameSession.resume()`; `dispose()` nulls the link so `connect()`
  rebuilds it. Idempotent — production was never affected. Regression test in
  `localTransport.test.ts`. `RemoteTransport` checked and unaffected.

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
