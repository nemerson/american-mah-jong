import type { GameState } from '../types/mahjong';
import { drawTile, discardTile, advanceTurn } from './game';
import { decideBotDiscard } from './bot';
import { defaultCallTiles, resolveBotClaims } from './calls';
import { checkMahJong } from './rules';

// The game clock: timed, authority-side progression — automatic draws, bot
// discards, and the call-window countdown. Extracted verbatim from the old
// useGameLoop hook so it can run wherever the authoritative state lives (the
// browser for single-player via LocalTransport, the server for multiplayer).
//
// It is transport-agnostic: it reads the canonical state through `getState`
// and pushes transitions through `setState`. After every state change the
// owner must call `onStateChanged()`; the clock reschedules only when the
// fields that mark real progress (phase, turn, wall, discards) change, so a
// cosmetic update such as hand reordering neither resets nor cancels a pending
// timer.
//
// NOTE: the call window still grants seat 0 (the lone human in single-player)
// exclusive priority. Phase 2 replaces this block with real multi-seat claim
// arbitration.

export interface GameClockDeps {
    getState: () => GameState;
    setState: (next: GameState) => void;
}

export interface GameClock {
    /** Reschedule timers for the current state (call after every change). */
    onStateChanged(): void;
    /** Resume scheduling and kick off timers for the current state. */
    start(): void;
    /** Freeze the clock: clear pending timers and stop scheduling. */
    stop(): void;
}

const progressKey = (s: GameState) =>
    `${s.phase}|${s.currentPlayerIndex}|${s.wall.length}|${s.discards.length}`;

export function createGameClock({ getState, setState }: GameClockDeps): GameClock {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let botCallTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let stopped = true;
    let lastKey = '';

    const clear = () => {
        clearTimeout(timeoutId);
        clearTimeout(botCallTimeoutId);
        timeoutId = undefined;
        botCallTimeoutId = undefined;
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
            // If the human can use this discard (exposure or mahjong), they get
            // a long window with exclusive priority before bots may act.
            // Otherwise the window is short and bots act quickly.
            const discard = state.discards[state.discards.length - 1];
            const human = state.players[0];
            const humanCanUse = state.currentPlayerIndex !== 0 && discard !== undefined
                && (defaultCallTiles(human, discard) !== null || checkMahJong(human, discard) !== null);

            const botDelay = humanCanUse ? 6000 : 1500;
            const windowMs = humanCanUse ? 8000 : 4000;

            botCallTimeoutId = setTimeout(() => {
                const s = getState();
                if (s.phase !== 'call') return;
                const claimed = resolveBotClaims(s);
                if (claimed) setState(claimed);
            }, botDelay);

            timeoutId = setTimeout(() => {
                const s = getState();
                if (s.phase !== 'call') return;
                setState(advanceTurn(s));
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
    };
}
