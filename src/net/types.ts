import type { GameState, Tile, WinInfo } from '../types/mahjong';

// The transport seam between the UI and game authority. In single-player the
// authority is a LocalTransport running the engine in-process; in multiplayer
// it is a RemoteTransport talking to the server. Either way the UI only ever
// sees a PlayerView (its own filtered slice of the game) and only ever sends
// Intents (requests the authority validates) — never raw GameState.

export type GamePhase = GameState['phase'];
export type GameCharlestonPhase = GameState['charlestonPhase'];

/**
 * One seat as seen by a given viewer. `hand` is populated only for the
 * viewer's own seat; every other seat exposes just `handCount`, keeping hidden
 * tiles out of the view entirely. `exposures` are face-up and always public.
 */
export interface PlayerSeatView {
    id: string;
    name: string;
    isBot: boolean;
    handCount: number;
    exposures: Tile[][];
    hand?: Tile[]; // present only for the viewing player's own seat
}

/** Everything a single player is allowed to know about the table. */
export interface PlayerView {
    mySeat: number;
    seats: PlayerSeatView[];
    discards: Tile[];
    wallCount: number;
    currentPlayerIndex: number;
    eastPlayerIndex: number;
    phase: GamePhase;
    charlestonPhase?: GameCharlestonPhase;
    winner?: WinInfo;
    /**
     * Remaining time (ms) on the current call-window countdown, present only
     * during the `call` phase while the window is live. Drives a depleting
     * ring/bar on the Call button. The authority (GameSession's GameClock) owns
     * the real countdown, so this is correct in single-player and multiplayer.
     */
    callWindowMs?: number;
}

/**
 * A request from the UI to the authority. The authority re-validates every
 * intent against the engine before applying it, so a forged or out-of-turn
 * intent is simply rejected. Hand reordering is deliberately NOT an intent —
 * it is presentation-only and stays local to each client.
 */
export type Intent =
    | { type: 'discard'; tileId: string }
    | { type: 'call'; handTileIds: string[] }
    | { type: 'passCall' }
    | { type: 'jokerSwap'; handTileId: string; ownerIndex: number; exposureIndex: number }
    | { type: 'charlestonPass'; tileIds: string[] }
    | { type: 'stopCharleston' }
    | { type: 'callMahJong' }
    | { type: 'newGame' };

// ---- Lobby (multiplayer pre-game) -----------------------------------------

/** One seat as shown in the waiting room: empty, a human, or a bot. */
export interface LobbySeat {
    index: number;
    name: string;
    occupant: 'empty' | 'human' | 'bot';
    isYou: boolean;
    isEast: boolean;
}

/** Waiting-room snapshot the server pushes to everyone in a room. */
export interface LobbyState {
    code: string;
    mySeat: number;
    seats: LobbySeat[];
    started: boolean;
}

/**
 * Requests a client sends while in the lobby. `create` mints a room; `join`
 * enters one by code; `addBot`/`removeSeat` shape the table; `setEast` picks
 * the dealer; `start` begins the game. The server validates each (room exists,
 * seat free, table full enough) and ignores anything illegal.
 */
export type LobbyRequest =
    | { type: 'create'; name?: string }
    | { type: 'join'; code: string; name?: string }
    | { type: 'addBot'; seat: number }
    | { type: 'removeSeat'; seat: number }
    | { type: 'setEast'; seat: number }
    | { type: 'start' };

/**
 * Why a `start` request did or did not begin the game. The discriminated
 * `reason` lets the server map each failure to a distinct, accurate message
 * (or stay silent), instead of overloading one "fill every seat" error:
 * - `seats`   — at least one seat is still empty.
 * - `east`    — the chosen East seat is empty (shouldn't happen via the UI).
 * - `already` — the game has already started (e.g. a double-click); silent.
 */
export type StartResult =
    | { ok: true }
    | { ok: false; reason: 'seats' | 'east' | 'already' };

/**
 * The UI depends only on this interface. `subscribe` immediately delivers the
 * current view and then every subsequent one; it returns an unsubscribe fn.
 */
export interface GameTransport {
    subscribe(cb: (view: PlayerView) => void): () => void;
    send(intent: Intent): void;
    dispose(): void;
    /**
     * Freeze/unfreeze the game clock. Only meaningful for an in-process
     * authority (single-player); a shared multiplayer clock can't be paused,
     * so RemoteTransport omits this.
     */
    setPaused?(paused: boolean): void;
}
