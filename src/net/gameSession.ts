import type { GameState, Tile } from '../types/mahjong';
import type { Intent } from './types';
import { createGameClock, type GameClock } from '../engine/gameClock';
import { initializeGame, discardTile, advanceTurn, type InitOptions } from '../engine/game';
import {
    exchangeJoker,
    defaultCallTiles,
    resolveClaims,
    decideBotClaim,
    type Claim,
} from '../engine/calls';
import { checkMahJong } from '../engine/rules';
import {
    executeCharlestonPasses,
    stopCharleston,
    BLIND_PASS_PHASES,
    type CharlestonPass,
} from '../engine/charleston';
import { decideBotCharlestonPass, decideBotCourtesyCount } from '../engine/bot';

// The authoritative game core, independent of any transport. It owns the one
// true GameState, runs the game clock, and applies seat-scoped intents through
// the engine (which validates and throws on anything illegal). Both
// LocalTransport (single-player, in the browser) and the server wrap a
// GameSession, so the rules and timing live in exactly one place.
//
// Two table-wide decisions are gathered here rather than in the engine, since
// they span multiple seats and a timing window:
//
//   * The call window — every seat's claim on a discard is collected, then
//     resolved with one arbitration rule (mahjong beats exposure; ties by seat
//     proximity to the discarder). Bots claim immediately; humans claim during
//     the window; unsubmitted humans default to a pass when it elapses.
//   * The Charleston — all four seats' passes are gathered before the engine's
//     executeCharlestonPasses runs. Bots auto-submit immediately, so in
//     single-player (one human + three bots) the pass still resolves at once.

const DEFAULT_NAMES = ['You', 'Bot 1', 'Bot 2', 'Bot 3'];

// Call-window timing. A human who can use the discard gets a generous window;
// when only bots could possibly act we still wait briefly so resolution feels
// natural, but don't make anyone sit through a long countdown.
const HUMAN_CALL_WINDOW_MS = 8000;
const BOT_ONLY_CALL_WINDOW_MS = 1500;

export interface GameSessionOptions {
    names?: string[];
    init?: InitOptions;
}

export class GameSession {
    private state: GameState;
    private clock: GameClock;
    private listeners = new Set<() => void>();
    private readonly names: string[];
    private readonly init?: InitOptions;

    // Per-seat bot flags, derived once from init (defaults to "seat 0 human").
    private readonly isBot: boolean[];

    // Ephemeral collection state, valid only within the current window. Both
    // are keyed by seat and reset whenever a new window opens.
    private claims = new Map<number, Claim>();
    private charlestonPasses = new Map<number, CharlestonPass>();
    // The progress key of the window these collections belong to, so a new
    // call/charleston phase resets them exactly once.
    private windowKey = '';

    constructor(options: GameSessionOptions = {}) {
        this.names = options.names ?? DEFAULT_NAMES;
        this.init = options.init;
        this.state = initializeGame(this.names, this.init);
        this.isBot = this.state.players.map(p => p.isBot);
        this.clock = createGameClock({
            getState: () => this.state,
            setState: (next) => this.commit(next),
            getCallWindowMs: () => this.callWindowMs(),
            resolveCallWindow: () => this.resolveCallWindow(),
        });
        this.clock.start();
        this.syncWindow();
    }

    getState(): GameState {
        return this.state;
    }

    /**
     * Remaining time (ms) on the live call-window countdown, or `undefined`
     * when no call window is running. Forwarded into `viewFor` so each seat's
     * view can drive a depleting Call-button ring; identical in single-player
     * (clock in-browser) and multiplayer (clock on the server).
     */
    getCallWindowRemainingMs(): number | undefined {
        return this.clock.callWindowRemainingMs();
    }

    /** Subscribe to state changes; returns an unsubscribe fn. */
    onChange(cb: () => void): () => void {
        this.listeners.add(cb);
        return () => { this.listeners.delete(cb); };
    }

    setPaused(paused: boolean): void {
        if (paused) this.clock.stop();
        else this.clock.start();
    }

    dispose(): void {
        this.clock.stop();
        this.listeners.clear();
    }

    /** Validate and apply one seat's intent. Throws if the engine rejects it. */
    applyIntent(seat: number, intent: Intent): void {
        const state = this.state;
        switch (intent.type) {
            case 'discard': {
                if (state.phase !== 'discard' || state.currentPlayerIndex !== seat) return;
                this.commit(discardTile(state, seat, intent.tileId));
                return;
            }
            case 'call': {
                this.registerClaim({ seat, kind: 'exposure', handTileIds: intent.handTileIds });
                return;
            }
            case 'passCall': {
                this.registerClaim({ seat, kind: 'pass' });
                return;
            }
            case 'jokerSwap': {
                this.commit(exchangeJoker(state, seat, intent.handTileId, intent.ownerIndex, intent.exposureIndex));
                return;
            }
            case 'charlestonPass': {
                this.registerCharlestonPass(seat, intent.tileIds);
                return;
            }
            case 'stopCharleston': {
                this.registerStopCharleston(seat);
                return;
            }
            case 'callMahJong': {
                // During a call window this is a claim on the discard; otherwise
                // it's a self-draw mahjong on the player's own turn.
                if (state.phase === 'call' && state.currentPlayerIndex !== seat) {
                    this.registerClaim({ seat, kind: 'mahjong' });
                    return;
                }
                const next = this.tryMahJong(state, seat);
                if (next) this.commit(next);
                return;
            }
            case 'newGame': {
                this.reset();
                return;
            }
        }
    }

    private reset(): void {
        this.state = initializeGame(this.names, this.init);
        this.clock.start();
        this.syncWindow();
        this.notify();
    }

    // Adopt a new canonical state, advance the clock, refresh window collection
    // for the new phase, and notify listeners.
    private commit(next: GameState): void {
        this.state = next;
        this.clock.onStateChanged();
        this.syncWindow();
        this.notify();
    }

    private notify(): void {
        for (const cb of this.listeners) cb();
    }

    // ---- Call window -------------------------------------------------------

    private callWindowMs(): number {
        const state = this.state;
        if (state.phase !== 'call' || state.discards.length === 0) return BOT_ONLY_CALL_WINDOW_MS;
        const discard = state.discards[state.discards.length - 1];
        const anyHumanCanUse = state.players.some((p, seat) =>
            !this.isBot[seat]
            && seat !== state.currentPlayerIndex
            && (defaultCallTiles(p, discard) !== null || checkMahJong(p, discard) !== null));
        return anyHumanCanUse ? HUMAN_CALL_WINDOW_MS : BOT_ONLY_CALL_WINDOW_MS;
    }

    private registerClaim(claim: Claim): void {
        if (this.state.phase !== 'call') return;
        if (claim.seat === this.state.currentPlayerIndex) return; // can't claim own discard
        this.claims.set(claim.seat, claim);
        // Resolve early once every seat that could act has responded, so a
        // contested call doesn't always wait out the full window.
        if (this.allClaimsIn()) this.resolveCallWindow();
    }

    private allClaimsIn(): boolean {
        const state = this.state;
        for (let seat = 0; seat < state.players.length; seat++) {
            if (seat === state.currentPlayerIndex) continue;
            if (!this.claims.has(seat)) return false;
        }
        return true;
    }

    private resolveCallWindow(): void {
        const state = this.state;
        if (state.phase !== 'call') return;
        const claims = Array.from(this.claims.values());
        this.commit(resolveClaims(state, claims) ?? advanceTurn(state));
    }

    // ---- Charleston --------------------------------------------------------

    private registerStopCharleston(seat: number): void {
        const state = this.state;
        if (state.phase !== 'charleston' || state.charlestonPhase !== 'secondLeft') return;
        if (this.isBot[seat]) return; // bots never stop the Charleston
        // A stop is a table decision: skip straight to the courtesy pass.
        this.commit(stopCharleston(state));
    }

    private registerCharlestonPass(seat: number, tileIds: string[]): void {
        const state = this.state;
        if (state.phase !== 'charleston' || !state.charlestonPhase) return;
        const phase = state.charlestonPhase;
        const isCourtesy = phase === 'courtesy';
        const isBlind = BLIND_PASS_PHASES.includes(phase);

        const ownTiles = state.players[seat].hand.filter(t => tileIds.includes(t.id));
        const validCount = isCourtesy || isBlind ? ownTiles.length <= 3 : ownTiles.length === 3;
        if (!validCount) throw new Error('Invalid number of tiles for this pass');

        this.charlestonPasses.set(seat, {
            fromIndex: seat,
            toIndex: -1,
            tiles: ownTiles,
            blindCount: isBlind ? 3 - ownTiles.length : 0,
        });
        this.maybeResolveCharleston();
    }

    // Gather every seat's pass for the current phase before executing it. Bots
    // are auto-decided here, so single-player (3 bots) resolves the instant the
    // human submits — identical to the old one-shot behaviour.
    private maybeResolveCharleston(): void {
        const state = this.state;
        if (state.phase !== 'charleston' || !state.charlestonPhase) return;
        const phase = state.charlestonPhase;
        const isCourtesy = phase === 'courtesy';

        for (let seat = 0; seat < state.players.length; seat++) {
            if (this.charlestonPasses.has(seat)) continue;
            if (!this.isBot[seat]) return; // still waiting on a human
            const count = isCourtesy ? decideBotCourtesyCount() : 3;
            const tiles: Tile[] = decideBotCharlestonPass(state.players[seat], count);
            this.charlestonPasses.set(seat, { fromIndex: seat, toIndex: -1, tiles });
        }

        const passes = Array.from(this.charlestonPasses.values());
        this.commit(executeCharlestonPasses(state, phase, passes));
    }

    // Reset and seed the ephemeral collection whenever a new window opens. For
    // a call window we pre-fill bot claims so the resolver always has them; for
    // a Charleston phase the bots are filled lazily once a human has acted (or
    // immediately if there are no humans left to wait on).
    private syncWindow(): void {
        const key = this.windowProgressKey();
        if (key === this.windowKey) return;
        this.windowKey = key;
        this.claims.clear();
        this.charlestonPasses.clear();

        const state = this.state;
        if (state.phase === 'call' && state.discards.length > 0) {
            for (let seat = 0; seat < state.players.length; seat++) {
                if (seat === state.currentPlayerIndex) continue;
                if (this.isBot[seat]) this.claims.set(seat, decideBotClaim(state, seat));
            }
            // A table of all bots (or bots-only remainder) can resolve at once.
            if (this.allClaimsIn()) this.resolveCallWindow();
        } else if (state.phase === 'charleston') {
            // If there are no humans, resolve immediately; otherwise wait.
            const anyHuman = this.isBot.some(b => !b);
            if (!anyHuman) this.maybeResolveCharleston();
        }
    }

    // The collection above is scoped to one window; this key changes exactly
    // when a new window opens (a new discard, a new Charleston phase, etc.).
    private windowProgressKey(): string {
        const s = this.state;
        return `${s.phase}|${s.charlestonPhase ?? ''}|${s.currentPlayerIndex}|${s.discards.length}`;
    }

    // A discard can complete a hand only if another seat threw it. Returns the
    // winning end-state, or null when the claim isn't actually a win.
    private tryMahJong(state: GameState, seat: number): GameState | null {
        const player = state.players[seat];
        const latestDiscard = state.discards.length > 0
            ? state.discards[state.discards.length - 1]
            : undefined;
        const claimableDiscard = state.phase === 'call' && state.currentPlayerIndex !== seat
            ? latestDiscard
            : undefined;

        const win = claimableDiscard
            ? checkMahJong(player, claimableDiscard)
            : checkMahJong(player);

        if (!win) return null;
        return { ...state, phase: 'end', winner: { playerIndex: seat, ...win } };
    }
}
