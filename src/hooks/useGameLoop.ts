import { useEffect, useRef } from 'react';
import type { GameState } from '../types/mahjong';
import { drawTile, discardTile, advanceTurn } from '../engine/game';
import { decideBotDiscard, decideBotCall } from '../engine/bot';
import { callDiscard, defaultCallTiles } from '../engine/calls';
import { checkMahJong } from '../engine/rules';

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
            // Bots consider calling partway through the window, in turn order
            // after the discarder, so the human gets first shot at the tile
            botCallTimeoutId = setTimeout(() => {
                const s = stateRef.current;
                if (s.phase !== 'call' || s.discards.length === 0) return;
                const discard = s.discards[s.discards.length - 1];
                for (let offset = 1; offset < s.players.length; offset++) {
                    const idx = (s.currentPlayerIndex + offset) % s.players.length;
                    const bot = s.players[idx];
                    if (!bot.isBot) continue;

                    // Mahjong on the discard beats any exposure call
                    const win = checkMahJong(bot, discard);
                    if (win) {
                        setGameState({
                            ...s,
                            discards: s.discards.slice(0, -1),
                            players: s.players.map((p, i) => i === idx ? { ...p, hand: [...p.hand, discard] } : p),
                            phase: 'end',
                            winner: { playerIndex: idx, ...win },
                        });
                        return;
                    }

                    if (!decideBotCall(bot, discard)) continue;
                    const tiles = defaultCallTiles(bot, discard);
                    if (tiles) {
                        setGameState(callDiscard(s, idx, tiles.map(t => t.id)));
                        return;
                    }
                }
            }, 2500);

            // Give the player a window to call the discard before play moves on
            timeoutId = setTimeout(() => {
                const s = stateRef.current;
                if (s.phase !== 'call') return;
                setGameState(advanceTurn(s));
            }, 5000);
        }

        return () => {
            clearTimeout(timeoutId);
            clearTimeout(botCallTimeoutId);
        };
    }, [phase, currentPlayerIndex, wallCount, discardCount, setGameState]);
}
