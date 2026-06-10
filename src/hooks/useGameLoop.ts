import { useEffect, useRef } from 'react';
import type { GameState } from '../types/mahjong';
import { drawTile, discardTile, advanceTurn } from '../engine/game';
import { decideBotDiscard } from '../engine/bot';

// Drives timed game progression: automatic draws, bot discards, and the
// call-window countdown. The effect keys off the fields that mark real game
// progress (phase, turn, wall, discards) rather than the whole state object,
// so cosmetic updates like hand reordering neither reset nor cancel a
// pending timer.
export function useGameLoop(gameState: GameState, setGameState: (next: GameState) => void) {
    const stateRef = useRef(gameState);
    useEffect(() => {
        stateRef.current = gameState;
    });

    const { phase, currentPlayerIndex } = gameState;
    const wallCount = gameState.wall.length;
    const discardCount = gameState.discards.length;

    useEffect(() => {
        const state = stateRef.current;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

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
                    const discard = decideBotDiscard(bot);
                    setGameState(discardTile(s, s.currentPlayerIndex, discard.id));
                }, 1000);
            }
        } else if (state.phase === 'call') {
            // Give the player a window to call the discard before play moves on
            timeoutId = setTimeout(() => {
                const s = stateRef.current;
                if (s.phase !== 'call') return;
                setGameState(advanceTurn(s));
            }, 5000);
        }

        return () => clearTimeout(timeoutId);
    }, [phase, currentPlayerIndex, wallCount, discardCount, setGameState]);
}
