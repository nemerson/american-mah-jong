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
