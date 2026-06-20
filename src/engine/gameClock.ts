import type { GameState } from '../types/mahjong';
import { drawTile, discardTile, advanceTurn } from './game';
import { decideBotDiscard } from './bot';
import { resolveBotClaims } from './calls';
import { checkMahJong } from './rules';

// The game clock: timed, authority-side progression — automatic draws, bot
// discards, and the call-window countdown. Extracted from the old useGameLoop
// hook so it can run wherever the authoritative state lives (the browser for
// single-player via LocalTransport, the server for multiplayer).
//
// It is transport-agnostic: it reads the canonical state through `getState`
// and pushes transitions through `setState`. After every state change the
// owner must call `onStateChanged()`; the clock reschedules only when the
// fields that mark real progress (phase, turn, wall, discards) change, so a
// cosmetic update such as hand reordering neither resets nor cancels a pending
// timer.
//
// The call window is owned by the authority (GameSession), which collects
// claims from every seat and resolves them. The clock just runs the countdown
// and asks the authority to resolve when it elapses. When no authority hook is
// supplied (the engine's own clock tests), it falls back to the legacy
// seat-order bot-claim resolution so those paths keep working.

export interface GameClockDeps {
    getState: () => GameState;
    setState: (next: GameState) => void;
    /**
     * How long the call window lasts (ms) for the current state. The authority
     * sizes this (e.g. shorter when only bots can act). Defaults to a fixed
     * window when omitted.
     */
    getCallWindowMs?: () => number;
    /**
     * Resolve the call window now: the authority applies the winning claim (or
     * advances the turn if nobody claimed). When omitted, the clock falls back
     * to legacy bot-claim resolution + advanceTurn.
     */
    resolveCallWindow?: () => void;
}

export interface GameClock {
    /** Reschedule timers for the current state (call after every change). */
    onStateChanged(): void;
    /** Resume scheduling and kick off timers for the current state. */
    start(): void;
    /** Freeze the clock: clear pending timers and stop scheduling. */
    stop(): void;
    /**
     * Remaining time (ms) on the current call-window countdown, or `undefined`
     * when no call window is running. Lets the authority surface the countdown
     * to clients so the UI can render a depleting ring on the Call button.
     */
    callWindowRemainingMs(): number | undefined;
}

const progressKey = (s: GameState) =>
    `${s.phase}|${s.currentPlayerIndex}|${s.wall.length}|${s.discards.length}`;

// Legacy fallback window when the authority doesn't size it: long enough for a
// lone human to react, matching the old single-player feel.
const DEFAULT_CALL_WINDOW_MS = 4000;

export function createGameClock(deps: GameClockDeps): GameClock {
    const { getState, setState, getCallWindowMs, resolveCallWindow } = deps;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let stopped = true;
    let lastKey = '';
    // Absolute time (ms, Date.now epoch) the active call window elapses, or
    // undefined when no call window is running. Used to report the remaining
    // countdown without a separate ticking timer.
    let callDeadline: number | undefined;

    const clear = () => {
        clearTimeout(timeoutId);
        timeoutId = undefined;
        callDeadline = undefined;
    };

    const schedule = () => {
        clear();
        if (stopped) return;
        const state = getState();

        if (state.phase === 'draw') {
            timeoutId = setTimeout(() => {
                const s = getState();
                if (s.phase !== 'draw') return;
                setState(drawTile(s, s.currentPlayerIndex));
            }, 600);
        } else if (state.phase === 'discard') {
            const currentPlayer = state.players[state.currentPlayerIndex];
            if (currentPlayer.isBot) {
                timeoutId = setTimeout(() => {
                    const s = getState();
                    if (s.phase !== 'discard') return;
                    const bot = s.players[s.currentPlayerIndex];

                    // A bot with a complete hand declares mahjong instead of discarding
                    const win = checkMahJong(bot);
                    if (win) {
                        setState({ ...s, phase: 'end', winner: { playerIndex: s.currentPlayerIndex, ...win } });
                        return;
                    }

                    const discard = decideBotDiscard(bot);
                    setState(discardTile(s, s.currentPlayerIndex, discard.id));
                }, 1000);
            }
        } else if (state.phase === 'call') {
            // The authority owns claim collection; the clock just runs the
            // window and asks it to resolve when the countdown elapses.
            const windowMs = getCallWindowMs ? getCallWindowMs() : DEFAULT_CALL_WINDOW_MS;
            callDeadline = Date.now() + windowMs;
            timeoutId = setTimeout(() => {
                const s = getState();
                if (s.phase !== 'call') return;
                if (resolveCallWindow) {
                    resolveCallWindow();
                } else {
                    // Legacy fallback for the engine's standalone clock tests.
                    setState(resolveBotClaims(s) ?? advanceTurn(s));
                }
            }, windowMs);
        }
    };

    return {
        onStateChanged() {
            if (stopped) return;
            const key = progressKey(getState());
            if (key === lastKey) return; // cosmetic-only change: leave timers alone
            lastKey = key;
            schedule();
        },
        start() {
            stopped = false;
            lastKey = progressKey(getState());
            schedule();
        },
        stop() {
            stopped = true;
            clear();
        },
        callWindowRemainingMs() {
            if (callDeadline === undefined) return undefined;
            return Math.max(0, callDeadline - Date.now());
        },
    };
}
