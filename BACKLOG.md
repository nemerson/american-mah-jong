# Backlog

Pending work ordered roughly by priority. See `CLAUDE.md` for architecture context.

## Phase 3 — Internet play & polish

These were scoped in `multiplayer_plan.md` but not yet started.

### Internet connectivity (Phase 3 network)
- **Tunnel support** — expose the local server over the internet via Tailscale or
  ngrok. Server already reads `HOST`/`PORT`/`CORS_ORIGIN` env vars; no code changes
  needed beyond documenting the tunnel setup.
- **Reconnection** — session tokens so a disconnected player can rejoin their seat
  mid-game. `server/room.ts` already holds the seat without bot takeover on disconnect;
  needs the token handshake and `RemoteTransport` reconnect logic.
- **Synced countdown UI** — expose remaining call-window ms in `PlayerView` so the
  client can render a depleting ring/bar on the Call button. Requires a small
  `PlayerView` addition and a `viewFor.ts` change to include `callWindowMs?`.

### UX improvements (from UI/UX review — not yet implemented)
- **Call window countdown timer** — depleting visual on the Call button during the
  8-second window. Blocked on `callWindowMs?` in `PlayerView` above.
- **Joker swap discoverability** — badge/glow on an exposed joker when your hand
  contains the natural tile that could swap it. Currently only the Swap button appears
  after you select the right tile.
- **Lobby quality-of-life:**
  - Copy-to-clipboard button on the join code chip (`.lobby-code-display`)
  - Leave room / back button for the host
  - Per-seat connection indicator (connected dot for human seats)

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
