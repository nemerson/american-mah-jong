import React, { useEffect, useMemo, useState } from 'react';
import type { Player, Tile } from '../types/mahjong';
import type { GameTransport, PlayerView, PlayerSeatView } from '../net/types';
import { createLocalTransport } from '../net/createTransport';
import { checkMahJong, getTileKey } from '../engine/rules';
import { defaultCallTiles, exposureKey } from '../engine/calls';
import { BLIND_PASS_PHASES } from '../engine/charleston';
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

const OpponentColumn: React.FC<{ seat: PlayerSeatView; side: 'left' | 'right'; isActive: boolean }> = ({ seat, side, isActive }) => (
    <div className={`opponent-${side}${isActive ? ' is-active-seat' : ''}`}>
        <div className={`player-label${isActive ? ' is-active' : ''}`}>{seat.name}</div>
        <div className="vertical-hand" role="img" aria-label={`${seat.handCount} face-down tiles`}>
            {Array.from({ length: seat.handCount }).map((_, i) => (
                <div key={i} className="mini-tile-back" />
            ))}
        </div>
        <ExposureDisplay exposures={seat.exposures} />
    </div>
);

// A seat-view exposes only its own hand contents; everything an engine
// predicate needs from "me" (hand + exposures) is public for my own seat, so
// reconstruct a Player to reuse defaultCallTiles / checkMahJong unchanged.
const seatAsPlayer = (seat: PlayerSeatView): Player => ({
    id: seat.id,
    name: seat.name,
    isBot: seat.isBot,
    hand: seat.hand ?? [],
    exposures: seat.exposures,
});

interface ExposedJoker {
    ownerIndex: number;
    exposureIndex: number;
    key: string;
}

// Same as engine findExposedJokers, but over the (public) seat exposures in a view.
function findExposedJokersInView(view: PlayerView): ExposedJoker[] {
    const found: ExposedJoker[] = [];
    view.seats.forEach((seat, ownerIndex) => {
        seat.exposures.forEach((exposure, exposureIndex) => {
            if (exposure.some(t => t.type === 'joker')) {
                const key = exposureKey(exposure);
                if (key) found.push({ ownerIndex, exposureIndex, key });
            }
        });
    });
    return found;
}

interface GameBoardProps {
    /**
     * The authority the board talks to. Omitted in single-player / Electron,
     * where the board spins up its own in-process LocalTransport. In
     * multiplayer the App passes the RemoteConnection's transport.
     */
    transport?: GameTransport;
}

export const GameBoard: React.FC<GameBoardProps> = ({ transport: injected }) => {
    // One stable transport for this board's lifetime (lazy init runs once). A
    // provided transport (multiplayer) is reused; otherwise we run locally.
    const [transport] = useState<GameTransport>(() => injected ?? createLocalTransport());

    const [view, setView] = useState<PlayerView | null>(null);
    const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [handOrder, setHandOrder] = useState<string[]>([]);

    useEffect(() => {
        const unsub = transport.subscribe(setView);
        return () => { unsub(); };
    }, [transport]);

    useEffect(() => () => transport.dispose(), [transport]);

    // Mirror the local pause flag onto the in-process clock (no-op for remote).
    useEffect(() => {
        transport.setPaused?.(isPaused);
    }, [transport, isPaused]);

    // Drag-reorder is presentation-only and stays local to this client: keep a
    // display order of tile ids and project the view's hand through it (newly
    // drawn tiles, absent from the order, sort to the end).
    const mySeatView = view ? view.seats[view.mySeat] : null;
    const myHand = useMemo(() => mySeatView?.hand ?? [], [mySeatView]);
    const orderedHand = useMemo(() => {
        if (handOrder.length === 0) return myHand;
        const pos = new Map(handOrder.map((id, i) => [id, i] as const));
        return [...myHand].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity));
    }, [myHand, handOrder]);

    if (!view || !mySeatView) return null;

    const humanPlayer = seatAsPlayer(mySeatView);
    const acrossSeat = view.seats[(view.mySeat + 2) % 4];
    const rightSeat = view.seats[(view.mySeat + 1) % 4];
    const leftSeat = view.seats[(view.mySeat + 3) % 4];

    // Active-seat highlighting: only meaningful during draw/discard turns.
    const showTurnIndicator = view.phase === 'draw' || view.phase === 'discard';
    const isMyActiveTurn = showTurnIndicator && view.currentPlayerIndex === view.mySeat;
    const isAcrossActive = showTurnIndicator && view.currentPlayerIndex === (view.mySeat + 2) % 4;
    const isRightActive = showTurnIndicator && view.currentPlayerIndex === (view.mySeat + 1) % 4;
    const isLeftActive = showTurnIndicator && view.currentPlayerIndex === (view.mySeat + 3) % 4;

    const handleReorder = (newHand: Tile[]) => setHandOrder(newHand.map(t => t.id));

    const handleTileClick = (tile: Tile) => {
        if (selectedTileIds.includes(tile.id)) {
            setSelectedTileIds(selectedTileIds.filter(id => id !== tile.id));
        } else {
            // In charleston, allow up to 3 selections
            if (view.phase === 'charleston') {
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
        if (selectedTileIds.length !== 1 || view.phase !== 'discard' || view.currentPlayerIndex !== view.mySeat) return;
        transport.send({ type: 'discard', tileId: selectedTileIds[0] });
        setSelectedTileIds([]);
        resumeClock();
    };

    const latestDiscard = view.discards.length > 0
        ? view.discards[view.discards.length - 1]
        : null;

    // Call-window countdown ring. The authority reports the remaining ms in the
    // view; we drive a CSS depletion animation whose duration is that remaining
    // time. The window's identity is the discard it opened on, so a fresh
    // discard restarts the animation (via the React key) rather than letting it
    // resume mid-deplete. `prefers-reduced-motion` neutralizes the animation
    // globally, leaving a static (non-distracting) button.
    const callWindowMs = view.phase === 'call' ? view.callWindowMs : undefined;
    const showCallCountdown = callWindowMs !== undefined && callWindowMs > 0;

    // The human may call when someone else discarded and the tiles in hand
    // can legally join the discard as an exposure
    const canHumanCall = view.phase === 'call'
        && view.currentPlayerIndex !== view.mySeat
        && latestDiscard !== null
        && defaultCallTiles(humanPlayer, latestDiscard) !== null;

    const handleCall = () => {
        if (!canHumanCall || !latestDiscard) return;
        const tiles = defaultCallTiles(humanPlayer, latestDiscard);
        if (!tiles) return;
        transport.send({ type: 'call', handTileIds: tiles.map(t => t.id) });
        setSelectedTileIds([]);
        setStatusMessage(null);
        resumeClock();
    };

    // Decline the discard: bots get their chance, then play moves on
    const handlePassCall = () => {
        if (view.phase !== 'call') return;
        transport.send({ type: 'passCall' });
        resumeClock();
    };

    // Joker exchange: on the human's turn before discarding, a selected
    // natural tile matching a joker in any exposure may be swapped for it
    const selectedTile = selectedTileIds.length === 1
        ? myHand.find(t => t.id === selectedTileIds[0])
        : undefined;
    const jokerSwapTarget = (view.phase === 'discard'
        && view.currentPlayerIndex === view.mySeat
        && selectedTile
        && selectedTile.type !== 'joker')
        ? findExposedJokersInView(view).find(j => j.key === getTileKey(selectedTile))
        : undefined;

    const handleJokerSwap = () => {
        if (!jokerSwapTarget || !selectedTile) return;
        transport.send({
            type: 'jokerSwap',
            handTileId: selectedTile.id,
            ownerIndex: jokerSwapTarget.ownerIndex,
            exposureIndex: jokerSwapTarget.exposureIndex,
        });
        setSelectedTileIds([]);
        setStatusMessage('Swapped your tile for an exposed joker!');
        setTimeout(() => setStatusMessage(null), 3000);
        resumeClock();
    };

    const handleCallMahJong = () => {
        let totalTiles = humanPlayer.hand.length;
        for (const exp of humanPlayer.exposures) totalTiles += exp.length;

        // A discard can complete the hand only if someone else threw it
        const claimableDiscard = view.phase === 'call' && view.currentPlayerIndex !== view.mySeat
            ? latestDiscard
            : null;
        const win = claimableDiscard
            ? checkMahJong(humanPlayer, claimableDiscard)
            : checkMahJong(humanPlayer);

        if (win) {
            transport.send({ type: 'callMahJong' });
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
        if (!view.charlestonPhase) return;
        const isCourtesy = view.charlestonPhase === 'courtesy';
        const isBlind = BLIND_PASS_PHASES.includes(view.charlestonPhase);
        const validCount = isCourtesy || isBlind ? selectedTileIds.length <= 3 : selectedTileIds.length === 3;
        if (!validCount) return;

        transport.send({ type: 'charlestonPass', tileIds: selectedTileIds });
        setSelectedTileIds([]); // Clear selection after pass
        resumeClock();
    };

    const handleStopCharleston = () => {
        transport.send({ type: 'stopCharleston' });
        setSelectedTileIds([]);
        setStatusMessage('Charleston stopped — courtesy pass next.');
        setTimeout(() => setStatusMessage(null), 3000);
        resumeClock();
    };

    const getPassDirectionText = () => {
        if (!view.charlestonPhase) return '';
        const p = view.charlestonPhase.toLowerCase();
        if (p.includes('right')) return 'Right';
        if (p.includes('across')) return 'Across';
        if (p.includes('left')) return 'Left';
        if (p === 'courtesy') return 'Across (Courtesy)';
        return '';
    };

    const getPhaseLabel = (): string => {
        const currentName = view.seats[view.currentPlayerIndex]?.name ?? '';
        const isMine = view.currentPlayerIndex === view.mySeat;
        switch (view.phase) {
            case 'charleston': {
                if (!view.charlestonPhase) return 'Charleston';
                if (view.charlestonPhase === 'courtesy') return 'Courtesy pass — select 0–3 tiles';
                const num = view.charlestonPhase.startsWith('first') ? '1 of 2' : '2 of 2';
                return `Charleston ${num} · Pass ${getPassDirectionText()}`;
            }
            case 'draw':
                return isMine ? 'Your turn · Drawing…' : `${currentName}'s turn`;
            case 'discard':
                return isMine ? 'Your turn · Discard a tile' : `${currentName} is discarding`;
            case 'call':
                return canHumanCall ? 'Call or pass this discard' : 'Waiting for calls…';
            case 'end':
                return 'Game over';
            default:
                return view.phase;
        }
    };

    const handleNewGame = () => {
        transport.send({ type: 'newGame' });
        setSelectedTileIds([]);
        setStatusMessage(null);
        setHandOrder([]);
        resumeClock();
    };

    const isCourtesyPhase = view.charlestonPhase === 'courtesy';
    const isBlindPhase = view.charlestonPhase !== undefined
        && BLIND_PASS_PHASES.includes(view.charlestonPhase);
    const canPass = isCourtesyPhase || isBlindPhase
        ? selectedTileIds.length <= 3
        : selectedTileIds.length === 3;
    const blindCount = 3 - selectedTileIds.length;
    const winner = view.winner;
    const winnerPlayer = winner ? view.seats[winner.playerIndex] : null;

    return (
        <div className="game-board">
            {/* Top Area: Opponent (Across) */}
            <div className={`opponent-across${isAcrossActive ? ' is-active-seat' : ''}`}>
                <div className={`player-label${isAcrossActive ? ' is-active' : ''}`}>{acrossSeat.name}</div>
                <PlayerHand count={acrossSeat.handCount} />
                <ExposureDisplay exposures={acrossSeat.exposures} />
            </div>

            {/* Middle Area: Left/Right Opponents + Discard Center */}
            <div className="middle-section">
                <OpponentColumn seat={leftSeat} side="left" isActive={isLeftActive} />

                <div className="center-table">
                    <div className={`phase-indicator title-glow${isMyActiveTurn ? ' is-my-turn' : ''}`}>
                        {getPhaseLabel()}
                    </div>
                    <div className="wall-counter">
                        Tiles remaining: {view.wallCount}
                    </div>
                    {isPaused && (
                        <div className="paused-banner" role="status">
                            Game paused — take your time, nothing will advance
                        </div>
                    )}

                    <div className="discard-pile">
                        {view.discards.length === 0 ? (
                            <div className="empty-discards">No Discards Yet</div>
                        ) : (
                            <div className="recent-discards-container">
                                {view.discards.map((tile, i) => (
                                    <div key={`${tile.id}-${i}`} className={`discarded-tile-wrapper ${i === view.discards.length - 1 && view.phase === 'call' ? 'latest-discard' : ''}`}>
                                        <MahJongTile
                                            tile={tile}
                                            selected={i === view.discards.length - 1 && view.phase === 'call'}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <OpponentColumn seat={rightSeat} side="right" isActive={isRightActive} />
            </div>

            {/* Status Message */}
            {statusMessage && (
                <div className="status-message">{statusMessage}</div>
            )}

            {/* End of game */}
            {view.phase === 'end' && (
                <div className="end-overlay" role="dialog" aria-label="Game over">
                    <div className="end-panel">
                        <h2 className="end-title">
                            {winner
                                ? winner.playerIndex === view.mySeat
                                    ? '🀄 Mah Jong — You win! 🎉'
                                    : `🀄 ${view.seats[winner.playerIndex].name} wins`
                                : 'Wall game — no winner'}
                        </h2>
                        {winner && (
                            <p className="end-detail">
                                {winner.section} #{winner.handNumber} — {winner.points} points
                            </p>
                        )}
                        {winnerPlayer && (
                            <div className="end-hand">
                                {[...winnerPlayer.exposures.flat(), ...(winnerPlayer.hand ?? [])].map(tile => (
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
            <div className={`human-player-area${isMyActiveTurn ? ' is-active-seat' : ''}`}>
                <WinningHandsReference />
                <ExposureDisplay exposures={humanPlayer.exposures} />
                <div className="tile-count">Your tiles: {humanPlayer.hand.length}</div>
                <div className="player-actions">
                    {view.phase === 'charleston' ? (
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
                            {view.charlestonPhase === 'secondLeft' && (
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
                                disabled={selectedTileIds.length !== 1 || view.phase !== 'discard' || view.currentPlayerIndex !== view.mySeat}
                                onClick={handleDiscard}
                            >
                                Discard Selected
                            </button>
                            <div className="call-btn-wrap">
                                <button
                                    className={`action-btn ${canHumanCall ? 'call-ready' : ''}`}
                                    disabled={!canHumanCall}
                                    onClick={handleCall}
                                    title={view.phase === 'call' && !canHumanCall
                                        ? 'You need two matching tiles in hand (or one plus a joker) to call'
                                        : undefined}
                                >
                                    Call Discard
                                </button>
                                {showCallCountdown && (
                                    <span
                                        key={`call-${view.discards.length}`}
                                        className="call-countdown"
                                        style={{ animationDuration: `${callWindowMs}ms` }}
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                            <button
                                className="action-btn"
                                style={{ visibility: view.phase === 'call' ? 'visible' : 'hidden' }}
                                tabIndex={view.phase === 'call' ? 0 : -1}
                                onClick={handlePassCall}
                            >
                                Pass
                            </button>
                            <button
                                className="action-btn"
                                style={{ visibility: jokerSwapTarget ? 'visible' : 'hidden' }}
                                tabIndex={jokerSwapTarget ? 0 : -1}
                                onClick={handleJokerSwap}
                            >
                                Swap for Joker
                            </button>
                            <button
                                className="action-btn primary-btn"
                                onClick={handleCallMahJong}
                            >
                                MAH JONG!
                            </button>
                        </>
                    )}
                    {view.phase !== 'end' && (
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
                    hand={orderedHand}
                    onTileClick={handleTileClick}
                    selectedTileIds={selectedTileIds}
                    onReorder={handleReorder}
                />
            </div>
        </div>
    );
};
