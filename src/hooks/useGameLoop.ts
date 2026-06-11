import { useEffect, useRef } from 'react';
import type { GameState } from '../types/mahjong';
import { drawTile, discardTile, advanceTurn } from '../engine/game';
import { decideBotDiscard } from '../engine/bot';
import { defaultCallTiles, resolveBotClaims } from '../engine/calls';
import { checkMahJong } from '../engine/rules';

// Drives timed game progression: automatic draws, bot discards, and the
// call-window countdown. The effect keys off the fields that mark real game
// progress (phase, turn, wall, discards) rather than the whole state object,
// so cosmetic updates like hand reordering neither reset nor cancel a
// pending timer.
//
// While `paused` is true nothing is scheduled, freezing the game wherever it
// stands; pending timers are cleared by the effect cleanup. Resuming restarts
// the current phase's window from the beginning.
export function useGameLoop(gameState: GameState, setGameState: (next: GameState) => void, paused = false) {
    const stateRef = useRef(gameState);
    useEffect(() => {
        stateRef.current = gameState;
    });

    const { phase, currentPlayerIndex } = gameState;
    const wallCount = gameState.wall.length;
    const discardCount = gameState.discards.length;

    useEffect(() => {
        if (paused) return;

        const state = stateRef.current;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let botCallTimeoutId: ReturnType<typeof setTimeout> | undefined;

        if (state.phase === 'draw') {
            timeoutId = setTimeout(() => {
                const s = stateRef.current;
                if (s.phase !== 'draw') return;
                setGameState(drawTile(s, s.currentPlayerIndex));
            }, 600);
        } else if (state.phase === 'discard') {
            const currentPlayer = state.players[state.currentPlayerIndex];
            if (currentPlayer.isBot) {
                timeoutId = setTimeout(() => {
                    const s = stateRef.current;
                    if (s.phase !== 'discard') return;
                    const bot = s.players[s.currentPlayerIndex];

                    // A bot with a complete hand declares mahjong instead of discarding
                    const win = checkMahJong(bot);
                    if (win) {
                        setGameState({ ...s, phase: 'end', winner: { playerIndex: s.currentPlayerIndex, ...win } });
                        return;
                    }

                    const discard = decideBotDiscard(bot);
                    setGameState(discardTile(s, s.currentPlayerIndex, discard.id));
                }, 1000);
            }
        } else if (state.phase === 'call') {
            // If the human can use this discard (exposure or mahjong), they
            // get a long window with exclusive priority before bots may act.
            // Otherwise the window is short and bots act quickly.
            const discard = state.discards[state.discards.length - 1];
            const human = state.players[0];
            const humanCanUse = state.currentPlayerIndex !== 0 && discard !== undefined
                && (defaultCallTiles(human, discard) !== null || checkMahJong(human, discard) !== null);

            const botDelay = humanCanUse ? 6000 : 1500;
            const windowMs = humanCanUse ? 8000 : 4000;

            botCallTimeoutId = setTimeout(() => {
                const s = stateRef.current;
                if (s.phase !== 'call') return;
                const claimed = resolveBotClaims(s);
                if (claimed) setGameState(claimed);
            }, botDelay);

            timeoutId = setTimeout(() => {
                const s = stateRef.current;
                if (s.phase !== 'call') return;
                setGameState(advanceTurn(s));
            }, windowMs);
        }

        return () => {
            clearTimeout(timeoutId);
            clearTimeout(botCallTimeoutId);
        };
    }, [phase, currentPlayerIndex, wallCount, discardCount, paused, setGameState]);
}
