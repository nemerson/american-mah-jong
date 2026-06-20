import React, { useEffect, useMemo, useState } from 'react';
import type { LobbyState } from '../net/types';
import { RemoteConnection } from '../net/remoteTransport';
import { detectRemote } from '../net/createTransport';
import { GameBoard } from './GameBoard';
import './Lobby.css';

// Multiplayer entry point. Owns the single RemoteConnection for the page,
// renders the Home screen (Create / Join by code) and the waiting room (seat
// list, add bot, pick dealer, start), and hands off to GameBoard once the
// server says the game has started. Single-player never mounts this — App
// renders GameBoard directly when the page isn't in remote mode.

const SeatRow: React.FC<{
    lobby: LobbyState;
    seat: LobbyState['seats'][number];
    onAddBot: (seat: number) => void;
    onRemove: (seat: number) => void;
    onSetEast: (seat: number) => void;
}> = ({ seat, onAddBot, onRemove, onSetEast }) => (
    <div className={`lobby-seat occupant-${seat.occupant}`}>
        <span className="seat-index">Seat {seat.index + 1}</span>
        <span className="seat-name">
            {seat.occupant === 'empty' ? '— empty —' : seat.name}
            {seat.isYou && ' (you)'}
            {seat.isEast && <span className="east-badge" title="Dealer (East)">East</span>}
        </span>
        <span className="seat-actions">
            {seat.occupant === 'empty' && (
                <button className="lobby-btn small" onClick={() => onAddBot(seat.index)}>Add bot</button>
            )}
            {seat.occupant === 'bot' && (
                <button className="lobby-btn small ghost" onClick={() => onRemove(seat.index)}>Remove</button>
            )}
            {seat.occupant !== 'empty' && !seat.isEast && (
                <button className="lobby-btn small ghost" onClick={() => onSetEast(seat.index)}>Make East</button>
            )}
        </span>
    </div>
);

export const Lobby: React.FC = () => {
    const choice = useMemo(() => detectRemote(), []);
    const [connection] = useState(() => new RemoteConnection(choice.url));
    const [lobby, setLobby] = useState<LobbyState | null>(null);
    const [name, setName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const offLobby = connection.onLobby(setLobby);
        const offError = connection.onError(msg => {
            setError(msg);
            setTimeout(() => setError(null), 4000);
        });
        return () => { offLobby(); offError(); };
    }, [connection]);

    useEffect(() => () => connection.dispose(), [connection]);

    // Once the game starts, the board takes over the same connection/socket.
    if (lobby?.started) {
        return <GameBoard transport={connection.transport} />;
    }

    const create = () => connection.sendLobby({ type: 'create', name: name.trim() || undefined });
    const join = () => {
        if (!joinCode.trim()) return;
        connection.sendLobby({ type: 'join', code: joinCode.trim(), name: name.trim() || undefined });
    };

    // Home: not in a room yet.
    if (!lobby) {
        return (
            <div className="lobby-shell">
                <div className="lobby-card">
                    <h1 className="lobby-title">American Mah Jong</h1>
                    <p className="lobby-subtitle">Play a real 4-handed game with friends.</p>
                    <label className="lobby-field">
                        <span>Your name</span>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Player"
                            maxLength={16}
                        />
                    </label>
                    <button className="lobby-btn primary" onClick={create}>Create a room</button>
                    <div className="lobby-divider">or join by code</div>
                    <div className="lobby-join-row">
                        <input
                            className="lobby-code-input"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="CODE"
                            maxLength={6}
                            onKeyDown={e => { if (e.key === 'Enter') join(); }}
                        />
                        <button className="lobby-btn" onClick={join}>Join</button>
                    </div>
                    {error && <div className="lobby-error" role="alert">{error}</div>}
                </div>
            </div>
        );
    }

    // Waiting room.
    const allFilled = lobby.seats.every(s => s.occupant !== 'empty');

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(lobby.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard can be blocked (insecure origin / denied permission);
            // the code stays visible on screen, so this is a soft failure.
        }
    };
    return (
        <div className="lobby-shell">
            <div className="lobby-card wide">
                <h1 className="lobby-title">Waiting room</h1>
                <p className="lobby-subtitle">
                    Share this code so others can join:
                    <span className="lobby-code-display">{lobby.code}</span>
                    <button
                        className="lobby-copy-btn"
                        onClick={copyCode}
                        title="Copy join code to clipboard"
                        aria-label={copied ? 'Join code copied' : 'Copy join code'}
                    >
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                </p>
                <div className="lobby-seats">
                    {lobby.seats.map(seat => (
                        <SeatRow
                            key={seat.index}
                            lobby={lobby}
                            seat={seat}
                            onAddBot={s => connection.sendLobby({ type: 'addBot', seat: s })}
                            onRemove={s => connection.sendLobby({ type: 'removeSeat', seat: s })}
                            onSetEast={s => connection.sendLobby({ type: 'setEast', seat: s })}
                        />
                    ))}
                </div>
                <button
                    className="lobby-btn primary"
                    disabled={!allFilled}
                    onClick={() => connection.sendLobby({ type: 'start' })}
                    title={allFilled ? undefined : 'Fill every seat (with players or bots) to start'}
                >
                    Start game
                </button>
                {error && <div className="lobby-error" role="alert">{error}</div>}
            </div>
        </div>
    );
};
