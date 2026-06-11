import React, { useState } from 'react';
import type { GameState, Tile } from '../types/mahjong';
import { initializeGame, discardTile, advanceTurn, reorderPlayerHand } from '../engine/game';
import { executeCharlestonPasses, stopCharleston, BLIND_PASS_PHASES } from '../engine/charleston';
import type { CharlestonPass } from '../engine/charleston';
import { decideBotCharlestonPass } from '../engine/bot';
import { checkMahJong, getTileKey } from '../engine/rules';
import { callDiscard, defaultCallTiles, exchangeJoker, findExposedJokers, resolveBotClaims } from '../engine/calls';
import { useGameLoop } from '../hooks/useGameLoop';
import { PlayerHand } from './PlayerHand';
import { MahJongTile } from './Tile';
import { WinningHandsReference } from './WinningHandsReference';
import './GameBoard.css';

const ExposureDisplay: React.FC<{ exposures: Tile[][] }> = ({ exposures }) => {
    if (exposures.length === 0) return null;
    return (
        <div className="exposures-row">
            {exposures.map((exposure, i) => (
                <div key={i} className="exposure-group">
                    {exposure.map(tile => (
                        <div key={tile.id} className="exposure-tile-wrapper">
                            <MahJongTile tile={tile} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export const GameBoard: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(() =>
        initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']));
    const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    useGameLoop(gameState, setGameState, isPaused);

    const handleReorder = (newHand: Tile[]) => {
        setGameState(reorderPlayerHand(gameState, gameState.players[0].id, newHand));
    };

    const humanPlayer = gameState.players[0];

    const handleTileClick = (tile: Tile) => {
        if (selectedTileIds.includes(tile.id)) {
            setSelectedTileIds(selectedTileIds.filter(id => id !== tile.id));
        } else {
            // In charleston, allow up to 3 selections
            if (gameState.phase === 'charleston') {
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

    // Any action that advances the game also resumes a paused clock —
    // otherwise play would silently stay frozen after the player moves on.
    const resumeClock = () => setIsPaused(false);

    const handleDiscard = () => {
        if (selectedTileIds.length !== 1 || gameState.phase !== 'discard' || gameState.currentPlayerIndex !== 0) return;
        setGameState(discardTile(gameState, 0, selectedTileIds[0]));
        setSelectedTileIds([]);
        resumeClock();
    };

    const latestDiscard = gameState.discards.length > 0
        ? gameState.discards[gameState.discards.length - 1]
        : null;

    // The human may call when someone else discarded and the tiles in hand
    // can legally join the discard as an exposure
    const canHumanCall = gameState.phase === 'call'
        && gameState.currentPlayerIndex !== 0
        && latestDiscard !== null
        && defaultCallTiles(humanPlayer, latestDiscard) !== null;

    const handleCall = () => {
        if (!canHumanCall || !latestDiscard) return;
        const tiles = defaultCallTiles(humanPlayer, latestDiscard);
        if (!tiles) return;
        setGameState(callDiscard(gameState, 0, tiles.map(t => t.id)));
        setSelectedTileIds([]);
        setStatusMessage(null);
        resumeClock();
    };

    // Decline the discard: bots get their chance, then play moves on
    const handlePassCall = () => {
        if (gameState.phase !== 'call') return;
        setGameState(resolveBotClaims(gameState) ?? advanceTurn(gameState));
        resumeClock();
    };

    // Joker exchange: on the human's turn before discarding, a selected
    // natural tile matching a joker in any exposure may be swapped for it
    const selectedTile = selectedTileIds.length === 1
        ? humanPlayer.hand.find(t => t.id === selectedTileIds[0])
        : undefined;
    const jokerSwapTarget = (gameState.phase === 'discard'
        && gameState.currentPlayerIndex === 0
        && selectedTile
        && selectedTile.type !== 'joker')
        ? findExposedJokers(gameState).find(j => j.key === getTileKey(selectedTile))
        : undefined;

    const handleJokerSwap = () => {
        if (!jokerSwapTarget || !selectedTile) return;
        setGameState(exchangeJoker(gameState, 0, selectedTile.id, jokerSwapTarget.ownerIndex, jokerSwapTarget.exposureIndex));
        setSelectedTileIds([]);
        setStatusMessage('Swapped your tile for an exposed joker!');
        setTimeout(() => setStatusMessage(null), 3000);
        resumeClock();
    };

    const handleCallMahJong = () => {
        let totalTiles = humanPlayer.hand.length;
        for (const exp of humanPlayer.exposures) totalTiles += exp.length;

        // A discard can complete the hand only if someone else threw it
        const claimableDiscard = gameState.phase === 'call' && gameState.currentPlayerIndex !== 0
            ? latestDiscard
            : null;
        const win = claimableDiscard
            ? checkMahJong(humanPlayer, claimableDiscard)
            : checkMahJong(humanPlayer);

        if (win) {
            setGameState({ ...gameState, phase: 'end', winner: { playerIndex: 0, ...win } });
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
        if (!gameState.charlestonPhase) return;
        const isCourtesy = gameState.charlestonPhase === 'courtesy';
        const isBlind = BLIND_PASS_PHASES.includes(gameState.charlestonPhase);
        const validCount = isCourtesy || isBlind ? selectedTileIds.length <= 3 : selectedTileIds.length === 3;
        if (!validCount) return;

        const humanTiles = humanPlayer.hand.filter(t => selectedTileIds.includes(t.id));

        // Generate bot passes — each bot independently picks 0-3 tiles for courtesy
        const bot1Tiles = decideBotCharlestonPass(gameState.players[1], isCourtesy ? Math.floor(Math.random() * 4) : 3);
        const bot2Tiles = decideBotCharlestonPass(gameState.players[2], isCourtesy ? Math.floor(Math.random() * 4) : 3);
        const bot3Tiles = decideBotCharlestonPass(gameState.players[3], isCourtesy ? Math.floor(Math.random() * 4) : 3);

        const passes: CharlestonPass[] = [
            // On blind-pass turns any shortfall is taken unseen from the incoming stack
            { fromIndex: 0, toIndex: -1, tiles: humanTiles, blindCount: isBlind ? 3 - humanTiles.length : 0 },
            { fromIndex: 1, toIndex: -1, tiles: bot1Tiles },
            { fromIndex: 2, toIndex: -1, tiles: bot2Tiles },
            { fromIndex: 3, toIndex: -1, tiles: bot3Tiles }
        ];

        const newState = executeCharlestonPasses(gameState, gameState.charlestonPhase, passes);
        setGameState(newState);
        setSelectedTileIds([]); // Clear selection after pass
        resumeClock();
    };

    const handleStopCharleston = () => {
        setGameState(stopCharleston(gameState));
        setSelectedTileIds([]);
        setStatusMessage('Charleston stopped — courtesy pass next.');
        setTimeout(() => setStatusMessage(null), 3000);
        resumeClock();
    };

    const getPassDirectionText = () => {
        if (!gameState.charlestonPhase) return '';
        const p = gameState.charlestonPhase.toLowerCase();
        if (p.includes('right')) return 'Right';
        if (p.includes('across')) return 'Across';
        if (p.includes('left')) return 'Left';
        if (p === 'courtesy') return 'Across (Courtesy)';
        return '';
    };

    const handleNewGame = () => {
        setGameState(initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']));
        setSelectedTileIds([]);
        setStatusMessage(null);
        resumeClock();
    };

    const isCourtesyPhase = gameState.charlestonPhase === 'courtesy';
    const isBlindPhase = gameState.charlestonPhase !== undefined
        && BLIND_PASS_PHASES.includes(gameState.charlestonPhase);
    const canPass = isCourtesyPhase || isBlindPhase
        ? selectedTileIds.length <= 3
        : selectedTileIds.length === 3;
    const blindCount = 3 - selectedTileIds.length;
    const winner = gameState.winner;
    const winnerPlayer = winner ? gameState.players[winner.playerIndex] : null;

    return (
        <div className="game-board">
            {/* Top Area: Opponent (Across) */}
            <div className="opponent-across">
                <div className="player-label">{gameState.players[2].name}</div>
                <PlayerHand hand={gameState.players[2].hand} isFaceDown={true} />
                <ExposureDisplay exposures={gameState.players[2].exposures} />
            </div>

            {/* Middle Area: Left/Right Opponents + Discard Center */}
            <div className="middle-section">
                <div className="opponent-left">
                    <div className="player-label">{gameState.players[3].name}</div>
                    <div className="vertical-hand" role="img" aria-label={`${gameState.players[3].hand.length} face-down tiles`}>
                        {Array.from({ length: gameState.players[3].hand.length }).map((_, i) => (
                            <div key={i} className="mini-tile-back" />
                        ))}
                    </div>
                    <ExposureDisplay exposures={gameState.players[3].exposures} />
                </div>

                <div className="center-table">
                    <div className="phase-indicator title-glow">
                        Phase: {gameState.phase.toUpperCase()}
                        {gameState.charlestonPhase && ` (${gameState.charlestonPhase})`}
                    </div>
                    <div className="wall-counter">
                        Tiles remaining: {gameState.wall.length}
                    </div>
                    {isPaused && (
                        <div className="paused-banner" role="status">
                            Game paused — take your time, nothing will advance
                        </div>
                    )}

                    <div className="discard-pile">
                        {gameState.discards.length === 0 ? (
                            <div className="empty-discards">No Discards Yet</div>
                        ) : (
                            <div className="recent-discards-container">
                                {gameState.discards.map((tile, i) => (
                                    <div key={`${tile.id}-${i}`} className={`discarded-tile-wrapper ${i === gameState.discards.length - 1 && gameState.phase === 'call' ? 'latest-discard' : ''}`}>
                                        <MahJongTile
                                            tile={tile}
                                            selected={i === gameState.discards.length - 1 && gameState.phase === 'call'}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="opponent-right">
                    <div className="player-label">{gameState.players[1].name}</div>
                    <div className="vertical-hand" role="img" aria-label={`${gameState.players[1].hand.length} face-down tiles`}>
                        {Array.from({ length: gameState.players[1].hand.length }).map((_, i) => (
                            <div key={i} className="mini-tile-back" />
                        ))}
                    </div>
                    <ExposureDisplay exposures={gameState.players[1].exposures} />
                </div>
            </div>

            {/* Status Message */}
            {statusMessage && (
                <div className="status-message">{statusMessage}</div>
            )}

            {/* End of game */}
            {gameState.phase === 'end' && (
                <div className="end-overlay" role="dialog" aria-label="Game over">
                    <div className="end-panel">
                        <h2 className="end-title">
                            {winner
                                ? winner.playerIndex === 0
                                    ? '🀄 Mah Jong — You win! 🎉'
                                    : `🀄 ${gameState.players[winner.playerIndex].name} wins`
                                : 'Wall game — no winner'}
                        </h2>
                        {winner && (
                            <p className="end-detail">
                                {winner.section} #{winner.handNumber} — {winner.points} points
                            </p>
                        )}
                        {winnerPlayer && (
                            <div className="end-hand">
                                {[...winnerPlayer.exposures.flat(), ...winnerPlayer.hand].map(tile => (
                                    <div key={tile.id} className="exposure-tile-wrapper">
                                        <MahJongTile tile={tile} />
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="action-btn primary-btn" onClick={handleNewGame}>
                            New Game
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Area: Human Player */}
            <div className="human-player-area">
                <WinningHandsReference />
                <ExposureDisplay exposures={humanPlayer.exposures} />
                <div className="tile-count">Your tiles: {humanPlayer.hand.length}</div>
                <div className="player-actions">
                    {gameState.phase === 'charleston' ? (
                        <>
                            <button
                                className="action-btn primary-btn"
                                disabled={!canPass}
                                onClick={handleCharlestonPass}
                                title={isBlindPhase
                                    ? 'Select fewer than 3 tiles to pass blind: the rest are taken unseen from the tiles coming to you'
                                    : undefined}
                            >
                                {isBlindPhase && selectedTileIds.length < 3
                                    ? `Blind Pass ${getPassDirectionText()} (${selectedTileIds.length} + ${blindCount} unseen)`
                                    : `Pass ${isCourtesyPhase ? '0-3' : '3'} Tiles ${getPassDirectionText()} (${selectedTileIds.length}/3)`}
                            </button>
                            {gameState.charlestonPhase === 'secondLeft' && (
                                <button
                                    className="action-btn"
                                    onClick={handleStopCharleston}
                                    title="Skip the optional second Charleston and go straight to the courtesy pass"
                                >
                                    Stop Charleston
                                </button>
                            )}
                        </>
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
                                className={`action-btn ${canHumanCall ? 'call-ready' : ''}`}
                                disabled={!canHumanCall}
                                onClick={handleCall}
                                title={gameState.phase === 'call' && !canHumanCall
                                    ? 'You need two matching tiles in hand (or one plus a joker) to call'
                                    : undefined}
                            >
                                Call Discard
                            </button>
                            {gameState.phase === 'call' && (
                                <button className="action-btn" onClick={handlePassCall}>
                                    Pass
                                </button>
                            )}
                            {jokerSwapTarget && (
                                <button
                                    className="action-btn"
                                    onClick={handleJokerSwap}
                                >
                                    Swap for Joker
                                </button>
                            )}
                            <button
                                className="action-btn primary-btn"
                                onClick={handleCallMahJong}
                            >
                                MAH JONG!
                            </button>
                        </>
                    )}
                    {gameState.phase !== 'end' && (
                        <button
                            className={`action-btn pause-btn ${isPaused ? 'is-paused' : ''}`}
                            onClick={() => setIsPaused(p => !p)}
                            aria-pressed={isPaused}
                            aria-label={isPaused ? 'Resume game' : 'Pause game'}
                            title={isPaused ? 'Resume the game clock' : 'Pause the game to study the table'}
                        >
                            {isPaused ? '▶ Resume' : '⏸ Pause'}
                        </button>
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
