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
  - [x] Validate a tunnel end-to-end — Cloudflare quick tunnel (`cloudflared tunnel
    --url http://localhost:5174`) verified 2026-06-26: HTTP 200 with the
    `__MAHJONG_REMOTE__` flag injected, a Socket.IO WebSocket round-trip (create room →
    lobby snapshot) succeeds through the tunnel, and a real remote client reached the
    game room via the public URL. No server code changes were needed — the existing
    `HOST`/`PORT`/`CORS_ORIGIN` env config is sufficient. (Still worth a full live
    two-human hand for latency/feel, but the connectivity path is proven.)
- [ ] **Reconnection** — session tokens so a disconnected player can rejoin their seat
  mid-game. The risky one — internet play without it strands a seat on any blip, so
  pair it with tunnel support. Already in place: `room.ts` `leave()` holds the seat
  mid-game (drops only the socket, no bot takeover); Socket.IO auto-reconnects the
  socket; `RemoteTransport` replays the latest `view` to a re-subscribing board. Gap:
  the reconnected socket is a new identity with no `socket.data.code`, so the server
  can't tell it owns the held seat. Scoped 2026-06-26 — sequence:
  - [ ] **Stable player identity** — mint a per-seat token (`crypto.randomUUID()`) at
    join, store on the `Seat`, return to that client. Add `token` to the handshake and
    a `{ type: 'rejoin'; code: string; token: string }` `LobbyRequest`
    (`server/room.ts`, `src/net/types.ts`).
  - [ ] **Server rejoin handler** (`server/lobby.ts`) — match `token` to the held seat,
    re-attach the socket, set `socket.data.code` / `socket.join(code)`, `pushTo`. Must
    bypass the `room.started` rejection that normal `join` enforces — correct for
    newcomers, exactly what we skip for the seat owner.
  - [ ] **Seat-hold timeout → bot takeover** (`server/room.ts`, `src/net/gameSession.ts`)
    — on mid-game disconnect start a ~90s reclaim timer; on expiry a bot plays the seat
    to end of game (chosen over freeing the seat, which would kill everyone's game).
    Needs a new `GameSession` method to promote a seat to bot-controlled at runtime
    (`isBot` is currently `readonly`, derived once at init): flip
    `state.players[seat].isBot` + the cached array, then nudge the clock if it's that
    seat's turn. Clear the timer on successful rejoin; reject rejoin after takeover.
  - [ ] **Client persistence + auto-rejoin** (`src/components/Lobby.tsx`,
    `src/net/remoteTransport.ts`) — persist `{ code, token }` to `sessionStorage`;
    auto-send `rejoin` on the socket's `reconnect` event / on mount with a stored token;
    the existing `lobby.started` branch hands back to `GameBoard`. Clear the token on
    intentional leave and game end.
  - [ ] **Edge cases + tests** — double rejoin / two tabs (replace socket, don't
    duplicate seat); rejoin to a disposed room (clear token, "game has ended"); rejoin
    after bot takeover (rejected); pre-start disconnect keeps the current free-the-seat
    behavior. Extend `server/room.test.ts`'s `FakeSocket` harness.

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
