import type { GameState, Tile } from '../types/mahjong';
import type { Intent } from './types';
import { createGameClock, type GameClock } from '../engine/gameClock';
import { initializeGame, discardTile, advanceTurn, type InitOptions } from '../engine/game';
import { callDiscard, resolveBotClaims, exchangeJoker } from '../engine/calls';
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
// Intents carry the acting seat so this is already multiplayer-shaped. The one
// Phase-1 simplification is the Charleston: it resolves the whole table in one
// shot, auto-deciding for every non-acting seat as a bot. Phase 2 replaces
// that with collect-all-humans-then-resolve.

const DEFAULT_NAMES = ['You', 'Bot 1', 'Bot 2', 'Bot 3'];

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

    constructor(options: GameSessionOptions = {}) {
        this.names = options.names ?? DEFAULT_NAMES;
        this.init = options.init;
        this.state = initializeGame(this.names, this.init);
        this.clock = createGameClock({
            getState: () => this.state,
            setState: (next) => this.commit(next),
        });
        this.clock.start();
    }

    getState(): GameState {
        return this.state;
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
                this.commit(callDiscard(state, seat, intent.handTileIds));
                return;
            }
            case 'passCall': {
                if (state.phase !== 'call') return;
                this.commit(resolveBotClaims(state) ?? advanceTurn(state));
                return;
            }
            case 'jokerSwap': {
                this.commit(exchangeJoker(state, seat, intent.handTileId, intent.ownerIndex, intent.exposureIndex));
                return;
            }
            case 'charlestonPass': {
                this.commit(this.resolveCharleston(state, seat, intent.tileIds));
                return;
            }
            case 'stopCharleston': {
                this.commit(stopCharleston(state));
                return;
            }
            case 'callMahJong': {
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
        this.notify();
    }

    // Adopt a new canonical state, advance the clock, and notify listeners.
    private commit(next: GameState): void {
        this.state = next;
        this.clock.onStateChanged();
        this.notify();
    }

    private notify(): void {
        for (const cb of this.listeners) cb();
    }

    // Phase 1: one human submits, every other seat is auto-decided as a bot,
    // and the whole pass resolves at once. (Phase 2: gather all humans first.)
    private resolveCharleston(state: GameState, seat: number, tileIds: string[]): GameState {
        if (state.phase !== 'charleston' || !state.charlestonPhase) {
            throw new Error('Not in the Charleston');
        }
        const phase = state.charlestonPhase;
        const isCourtesy = phase === 'courtesy';
        const isBlind = BLIND_PASS_PHASES.includes(phase);

        const ownTiles = state.players[seat].hand.filter(t => tileIds.includes(t.id));
        const validCount = isCourtesy || isBlind ? ownTiles.length <= 3 : ownTiles.length === 3;
        if (!validCount) throw new Error('Invalid number of tiles for this pass');

        const passes: CharlestonPass[] = state.players.map((player, i): CharlestonPass => {
            if (i === seat) {
                return { fromIndex: i, toIndex: -1, tiles: ownTiles, blindCount: isBlind ? 3 - ownTiles.length : 0 };
            }
            const count = isCourtesy ? decideBotCourtesyCount() : 3;
            const tiles: Tile[] = decideBotCharlestonPass(player, count);
            return { fromIndex: i, toIndex: -1, tiles };
        });

        return executeCharlestonPasses(state, phase, passes);
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
