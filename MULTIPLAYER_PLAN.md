# Multiplayer Plan — Host on Your PC, Real Players Join from Other Devices

Goal: run the game on your PC as a host. Friends open a URL on a phone, tablet,
or laptop and play a real 4-handed game together. Empty seats are filled by the
existing bots.

---

## The core idea: an authoritative server

Today the **client knows everything** — every player's hand lives in the browser
(`GameBoard.tsx` holds the whole `GameState` in `useState`). That's fine for
solitaire-vs-bots, but in real multiplayer it would mean every player can see
everyone else's tiles.

The fix is the standard model for hidden-information card games:

> **The server owns the one true `GameState`. Clients send _intents_
> ("discard this tile", "call", "pass"), never state. The server validates each
> intent with the engine, updates the state, and sends each player back only the
> view they're allowed to see.**

Two things make this almost a natural fit for your code:

1. **The engine is already pure — verified.** `initializeGame`, `drawTile`,
   `discardTile`, `advanceTurn`, `callDiscard`, `executeCharlestonPasses`,
   `checkMahJong`, `defaultCallTiles`, the bot — all take a `GameState` (or a
   player) and return a result with no side effects. An import audit of
   `src/engine/` shows its only external dependency is `uuid`; there are no
   React, DOM, or browser APIs anywhere in it. It runs on Node as-is.
2. **The engine is also the validator.** Functions like `defaultCallTiles` and
   `checkMahJong` already encode what's legal. The server reuses them to reject
   illegal/forged moves — no separate rules code needed.

---

## What moves where

| Concern | Today | After |
|---|---|---|
| Canonical `GameState` | Client `useState` | **Server**, one per room |
| Turn clock, bot timing, call window | `useGameLoop` (`setTimeout`) | **Server** loop (authoritative) |
| Bot decisions | Client hook | **Server** |
| Deck shuffle / wall | Client | **Server only** (contents never sent) |
| "Which seat am I?" | Hardcoded player 0 | Server assigns, tells client |
| Rendering, input, **themes** | Client | **Client** (themes stay local per device) |

Nice property: **mat/tile theme stays a per-device localStorage preference.**
Everyone picks their own look; nothing to sync.

---

## Components to build

### 1. Shared engine (refactor, no behavior change)
Make `src/engine` + `src/types/mahjong.ts` importable by both the server and the
client. Simplest path: a small workspace so both sides import the same source.
The engine stays pure; the only changes are additive (see "Server-side rule gaps
to close" below — e.g. moving the joker-swap turn check into the engine).

### 2. Server (Node)
- **Transport:** WebSockets. Recommend **Socket.IO** (built-in rooms,
  reconnection, heartbeats) over raw `ws`.
- **Rooms/lobby:** create room → short join code → others join. Humans take
  seats; remaining seats become bots.
- **Authority:** receives intents → validates with engine → updates room state →
  broadcasts.
- **Game loop:** the logic currently in `useGameLoop` (auto-draw 600ms, bot
  discard 1s, call windows 4–8s) moves here so the clock is the same for everyone.
- **View filtering:** a `viewFor(state, seat)` that strips other players' hand
  _contents_ down to counts. Discards, exposures, wall count, whose turn — all
  public. Your own hand — private to you.

### 3. Client (your existing React app, lightly rewired)
- Replace local `useState<GameState>` + `useGameLoop` with a socket connection:
  receive `view` updates, render them.
- `GameBoard`, `PlayerHand`, `Tile`, and the new theming barely change — they
  already render from a `GameState`-shaped prop.
- Action handlers (`handleDiscard`, `handleCall`, `handlePassCall`,
  `handleCharlestonPass`, `handleCallMahJong`, joker swap) **emit socket events**
  instead of calling engine functions directly.
- Stop assuming "you" is index 0 — the server says which seat you are.
- **Count-driven opponent rendering.** The left/right opponents already render
  from counts (`mini-tile-back` divs) — exactly what a filtered server view
  provides. But the across opponent still renders a real `Tile[]` face-down via
  `PlayerHand`. Give `PlayerHand` a count-only mode (or reuse the mini-back
  rendering) so the client's opponent view model is just
  `{ handCount, exposures }` and never contains hidden tiles.

### 4. Lobby UI (new)
Home (Create / Join by code) → waiting room (who's in, seat list, "add bot",
"start") → board. Today the app boots straight into a game; that becomes the
post-lobby state.

---

## Hosting on your PC so others can connect

- **Same wifi (LAN):** server listens on `0.0.0.0:PORT`; others open
  `http://<your-LAN-IP>:PORT`. Works out of the box at home.
- **Over the internet:** your PC is behind your router (NAT). Easiest options,
  no router config:
  - **Tailscale** — private network; friends install Tailscale too. Most secure.
  - **ngrok / Cloudflare Tunnel** — gives a public URL anyone can open.
  - (Manual port-forwarding + dynamic DNS also works but exposes a public port.)
- The **same Node server can serve the built web client** (`dist/`), so players
  just open a link in any browser — no install.
- **Electron "Host mode."** `electron/main.cts` is a minimal window loader,
  easy to extend: add a **"Host game" button** that starts the Node server in
  the Electron main process, then shows the LAN URL + a QR code players scan to
  join from their phones. The host plays in the same window; guests use
  browsers. The Electron app becomes the host's launcher, not a requirement
  for guests.

---

## Real considerations to design for

- **Hidden info:** only ever send a player their own hand. (Server-enforced.)
  Tile IDs are already `uuid`s (`deck.ts`), so they're opaque and non-guessable —
  safe to send for your own hand and public tiles, no re-keying needed.
- **Validation:** every intent re-checked server-side (your turn? hold that tile?
  legal call?). Reuse engine predicates — `callDiscard` already validates turn,
  ownership, and exposure legality internally and throws on violations.
- **Reconnection:** drop → seat held N seconds → optional bot takeover → rejoin
  with room code + session token. Socket.IO makes this manageable.
- **Synced timers:** server emits the call-window countdown so every client shows
  the same clock.
- **Charleston with multiple humans:** server must collect *all* passes before
  resolving. `executeCharlestonPasses` already takes all four at once, so the
  server just gathers them and shows "waiting for others."
- **Mobile layout:** the board is currently sized for desktop. Phones/tablets
  joining will need a responsive pass (this is a real chunk of work). Helpfully,
  the tile faces are now SVG (`TileFace.tsx`), so the artwork scales cleanly to
  any size — the work is layout, not assets.
- **Determinism:** `Math.random` is fine server-side (single source of truth).
  Only need seeded RNG if we later want replays.

### Server-side rule gaps to close (found in code review)

These are spots where today's code relies on the UI or on timing tricks for
correctness — the server must own them:

- **`exchangeJoker` (calls.ts) doesn't check phase/turn internally.** Only
  `GameBoard.tsx` enforces "your turn, after draw, before discard" today. Either
  the server gates the intent, or — cleaner — the check moves into the engine
  function itself.
- **`initializeGame` (game.ts) hardcodes seat 0 as East** and always deals it
  14 tiles. Needs seat assignment and East selection/rotation as parameters.
- **Unified claim arbitration.** `resolveBotClaims` (calls.ts) resolves bots in
  seat order, and the human gets priority purely via UI timing (`useGameLoop`
  gives them a 6-second head start). With multiple humans the server needs a
  real claim window: collect claims from all seats during the window, then
  resolve — any mahjong claim beats any exposure claim, ties broken by seat
  proximity to the discarder. This replaces the timing trick entirely.
- **Charleston blind-pass counts are decided client-side.** `GameBoard.tsx`
  rolls `Math.floor(Math.random() * 4)` for bot courtesy passes — this moves
  server-side with the rest of the bot logic.
- **Hand reordering stays client-local.** `reorderPlayerHand` is
  presentation-only; don't round-trip drag-reorders through the server (latency
  would make dragging feel broken). Each client keeps its own display order for
  its own hand.

---

## Suggested phases (so we can pick this up in chunks)

- **Phase 0 — Decouple UI from engine.** Introduce a `GameTransport` interface; a
  `LocalTransport` reproduces today's single-player behavior exactly. Extract the
  shared engine module. Specific seams now known: extract the game-clock logic
  out of `useGameLoop.ts` (it's the piece that moves server-side verbatim),
  parameterize `initializeGame` (seats/East), move the turn/phase check into
  `exchangeJoker`, and add `PlayerHand`'s count-only mode. _No visible change_,
  but everything after gets easy.
- **Phase 1 — Server + LAN, 1 human + bots.** Stand up Socket.IO server running
  the engine and the moved game loop. Client plays today's game, server-authoritative,
  over the local network. Proves the loop.
- **Phase 2 — Lobby & multiple humans.** Room codes, seat assignment, waiting
  room, bots fill empties, per-player view filtering, multi-human Charleston sync.
- **Phase 3 — Internet play & polish.** Serve client from server, Tailscale/ngrok
  setup notes, reconnection + session tokens, synced timers, disconnect UX.
- **Phase 4 — Optional.** Accounts/persistence, match history, seeded replays,
  full mobile-responsive layout.

---

## Decisions to make when we start

- Socket.IO vs raw `ws` (recommend Socket.IO).
- Workspace/monorepo vs simple shared import for the engine.
- Keep Electron as the host's launcher, or go pure-web for everyone.
- LAN-only first, or wire up a tunnel from the start.
