import React, { useState, useEffect, useRef } from 'react';
import type { GameState, Tile } from '../types/mahjong';
import { initializeGame, drawTile, discardTile, advanceTurn, reorderPlayerHand } from '../engine/game';
import { executeCharlestonPasses } from '../engine/charleston';
import type { CharlestonPass } from '../engine/charleston';
import { decideBotCharlestonPass, decideBotDiscard } from '../engine/bot';
import { checkMahJong } from '../engine/rules';
import { PlayerHand } from './PlayerHand';
import { MahJongTile } from './Tile';
import { WinningHandsReference } from './WinningHandsReference';
import './GameBoard.css';

export const GameBoard: React.FC = () => {
    // Basic state initialization for MVP
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
    const [showWinningHands, setShowWinningHands] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const isReordering = useRef(false);

    useEffect(() => {
        // Start a fresh game component mount
        const newGame = initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']);
        setGameState(newGame);
    }, []);

    useEffect(() => {
        if (!gameState) return;

        // Skip game loop processing if this was just a cosmetic reorder
        if (isReordering.current) {
            isReordering.current = false;
            return;
        }

        let timeoutId: ReturnType<typeof setTimeout>;

        // Main game loop driver
        if (gameState.phase === 'draw') {
            timeoutId = setTimeout(() => {
                setGameState(drawTile(gameState, gameState.currentPlayerIndex));
            }, 600);
        } else if (gameState.phase === 'discard') {
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            if (currentPlayer.isBot) {
                timeoutId = setTimeout(() => {
                    const discard = decideBotDiscard(currentPlayer, gameState);
                    setGameState(discardTile(gameState, gameState.currentPlayerIndex, discard.id));
                }, 1000);
            }
        } else if (gameState.phase === 'call') {
            // MVP: Wait 2 seconds for a call. If no call, advance turn.
            timeoutId = setTimeout(() => {
                setGameState(advanceTurn(gameState));
            }, 2000);
        }

        return () => clearTimeout(timeoutId);
    }, [gameState]);

    if (!gameState) {
        return <div className="flex-center" style={{ height: '100vh' }}>Loading Mah Jong...</div>;
    }

    const handleReorder = (newHand: Tile[]) => {
        isReordering.current = true;
        setGameState(reorderPlayerHand(gameState, gameState.players[0].id, newHand));
    };

    const humanPlayer = gameState.players[0];

    const handleTileClick = (tile: Tile) => {
        if (selectedTileIds.includes(tile.id)) {
            setSelectedTileIds(selectedTileIds.filter(id => id !== tile.id));
        } else {
            // In charleston, allow up to 3 selections
            if (gameState?.phase === 'charleston') {
                const maxTiles = 3;
                if (selectedTileIds.length < maxTiles) {
                    setSelectedTileIds([...selectedTileIds, tile.id]);
                }
            } else {
                // Normal play, just 1 selection
                setSelectedTileIds([tile.id]);
            }
        }
    };

    const handleDiscard = () => {
        if (!gameState || selectedTileIds.length !== 1 || gameState.phase !== 'discard' || gameState.currentPlayerIndex !== 0) return;
        setGameState(discardTile(gameState, 0, selectedTileIds[0]));
        setSelectedTileIds([]);
    };

    const handleCall = () => {
        if (!gameState || gameState.phase !== 'call' || gameState.discards.length === 0) return;

        // Simplified MVP Call: Human takes the tile into their hand and it becomes their turn to discard
        const newState: GameState = {
            ...gameState,
            discards: [...gameState.discards],
            players: [...gameState.players.map(p => ({ ...p, hand: [...p.hand] }))]
        };
        const tile = newState.discards.pop();
        if (tile) {
            newState.players[0].hand.push(tile);
            newState.currentPlayerIndex = 0;
            newState.phase = 'discard';
            setGameState(newState);
        }
    };

    const handleCallMahJong = () => {
        if (!gameState) return;

        let isWin = false;
        let totalTiles = humanPlayer.hand.length;
        for (const exp of humanPlayer.exposures) totalTiles += exp.length;

        if (gameState.phase === 'call' && gameState.discards.length > 0) {
            const latestDiscard = gameState.discards[gameState.discards.length - 1];
            isWin = checkMahJong(humanPlayer, latestDiscard);
        } else {
            isWin = checkMahJong(humanPlayer);
        }

        if (isWin) {
            setStatusMessage('🀄 MAH JONG! You Win! 🎉');
            setGameState({ ...gameState, phase: 'end' });
        } else {
            if (totalTiles !== 14) {
                setStatusMessage(`Not a valid hand. You have ${totalTiles} tiles — need exactly 14.`);
            } else {
                setStatusMessage('Not a valid winning pattern. Keep playing!');
            }
            setTimeout(() => setStatusMessage(null), 4000);
        }
    };

    const handleCharlestonPass = () => {
        const isCourtesy = gameState?.charlestonPhase === 'courtesy';
        const validCount = isCourtesy ? selectedTileIds.length <= 3 : selectedTileIds.length === 3;

        if (!gameState || !gameState.charlestonPhase || !validCount) return;

        const humanTiles = humanPlayer.hand.filter(t => selectedTileIds.includes(t.id));

        // Generate bot passes (courtesy allows 0-3)
        const botPassCount = isCourtesy ? Math.floor(Math.random() * 4) : 3;
        const bot1Tiles = decideBotCharlestonPass(gameState.players[1], gameState, botPassCount);
        const bot2Tiles = decideBotCharlestonPass(gameState.players[2], gameState, botPassCount);
        const bot3Tiles = decideBotCharlestonPass(gameState.players[3], gameState, botPassCount);

        const passes: CharlestonPass[] = [
            { fromIndex: 0, toIndex: -1, tiles: humanTiles },
            { fromIndex: 1, toIndex: -1, tiles: bot1Tiles },
            { fromIndex: 2, toIndex: -1, tiles: bot2Tiles },
            { fromIndex: 3, toIndex: -1, tiles: bot3Tiles }
        ];

        const newState = executeCharlestonPasses(gameState, gameState.charlestonPhase, passes);
        setGameState(newState);
        setSelectedTileIds([]); // Clear selection after pass
    };

    const getPassDirectionText = () => {
        if (!gameState?.charlestonPhase) return '';
        const p = gameState.charlestonPhase.toLowerCase();
        if (p.includes('right')) return 'Right';
        if (p.includes('across')) return 'Across';
        if (p.includes('left')) return 'Left';
        if (p === 'courtesy') return 'Across (Courtesy)';
        return '';
    };

    const isCourtesyPhase = gameState?.charlestonPhase === 'courtesy';
    const canPass = isCourtesyPhase ? selectedTileIds.length <= 3 : selectedTileIds.length === 3;

    return (
        <div className="game-board">
            {showWinningHands && (
                <WinningHandsReference onClose={() => setShowWinningHands(false)} />
            )}

            <button
                className="action-btn reference-btn"
                onClick={() => setShowWinningHands(true)}
            >
                📖 Winning Hands
            </button>

            {/* Top Area: Opponent (Across) */}
            <div className="opponent-across">
                <div className="player-label">{gameState.players[2].name}</div>
                <PlayerHand hand={gameState.players[2].hand} isFaceDown={true} />
            </div>

            {/* Middle Area: Left/Right Opponents + Discard Center */}
            <div className="middle-section">
                <div className="opponent-left">
                    <div className="player-label">{gameState.players[3].name}</div>
                    <div className="vertical-hand">
                        {/* Simplified vertical representation */}
                        <div className="tile-placeholder-count">🀄 x{gameState.players[3].hand.length}</div>
                    </div>
                </div>

                <div className="center-table">
                    <div className="phase-indicator title-glow">
                        Phase: {gameState.phase.toUpperCase()}
                        {gameState.charlestonPhase && ` (${gameState.charlestonPhase})`}
                    </div>
                    <div className="wall-counter">
                        Tiles remaining: {gameState.wall.length}
                    </div>

                    <div className="discard-pile">
                        {gameState.discards.length === 0 ? (
                            <div className="empty-discards">No Discards Yet</div>
                        ) : (
                            <div className="recent-discards-container">
                                {gameState.discards.slice(-6).map((tile, i) => (
                                    <div key={`${tile.id}-${i}`} className="discarded-tile-wrapper">
                                        <MahJongTile
                                            tile={tile}
                                            // Make the very last discard pop out slightly if we want, or just normal
                                            selected={i === Math.min(gameState.discards.length - 1, 5) && gameState.phase === 'call'}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="opponent-right">
                    <div className="player-label">{gameState.players[1].name}</div>
                    <div className="vertical-hand">
                        <div className="tile-placeholder-count">🀄 x{gameState.players[1].hand.length}</div>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {statusMessage && (
                <div className="status-message">{statusMessage}</div>
            )}

            {/* Bottom Area: Human Player */}
            <div className="human-player-area">
                <div className="tile-count">Your tiles: {humanPlayer.hand.length}</div>
                <div className="player-actions">
                    {gameState.phase === 'charleston' ? (
                        <button
                            className="action-btn primary-btn"
                            disabled={!canPass}
                            onClick={handleCharlestonPass}
                        >
                            Pass {isCourtesyPhase ? '0-3' : '3'} Tiles {getPassDirectionText()} ({selectedTileIds.length}/{isCourtesyPhase ? '3' : '3'})
                        </button>
                    ) : (
                        <>
                            <button
                                className="action-btn"
                                disabled={selectedTileIds.length !== 1 || gameState.phase !== 'discard' || gameState.currentPlayerIndex !== 0}
                                onClick={handleDiscard}
                            >
                                Discard Selected
                            </button>
                            <button
                                className="action-btn"
                                disabled={gameState.phase !== 'call'}
                                onClick={handleCall}
                            >
                                Call Discard
                            </button>
                            <button
                                className="action-btn primary-btn"
                                onClick={handleCallMahJong}
                            >
                                MAH JONG!
                            </button>
                        </>
                    )}
                </div>
                <PlayerHand
                    hand={humanPlayer.hand}
                    onTileClick={handleTileClick}
                    selectedTileIds={selectedTileIds}
                    onReorder={handleReorder}
                />
            </div>
        </div>
    );
};
