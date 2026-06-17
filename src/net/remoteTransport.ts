import { io, type Socket } from 'socket.io-client';
import type { GameTransport, Intent, LobbyRequest, LobbyState, PlayerView } from './types';

// Client side of multiplayer over a Socket.IO connection to the authoritative
// server. The one socket carries both lobby traffic (waiting room) and, once
// the game starts, per-seat `view` snapshots. RemoteTransport implements the
// in-game GameTransport; RemoteConnection wraps the same socket to also drive
// the lobby, so the App can move from waiting room to board without
// reconnecting. There is deliberately no setPaused: a shared server clock can't
// be frozen by one client.

export class RemoteTransport implements GameTransport {
    private socket: Socket;
    private subscribers = new Set<(view: PlayerView) => void>();
    private lastView?: PlayerView;

    constructor(socket: Socket) {
        this.socket = socket;
        this.socket.on('view', (view: PlayerView) => {
            this.lastView = view;
            for (const cb of this.subscribers) cb(view);
        });
    }

    subscribe(cb: (view: PlayerView) => void): () => void {
        this.subscribers.add(cb);
        if (this.lastView) cb(this.lastView); // replay latest for late subscribers
        return () => { this.subscribers.delete(cb); };
    }

    send(intent: Intent): void {
        this.socket.emit('intent', intent);
    }

    dispose(): void {
        // The socket is owned by RemoteConnection; just stop listening.
        this.subscribers.clear();
    }
}

/**
 * Owns the Socket.IO connection and exposes the lobby surface plus a
 * GameTransport over the same socket. The App subscribes to lobby state, sends
 * lobby requests, and once `started` flips, hands the transport to GameBoard.
 */
export class RemoteConnection {
    readonly socket: Socket;
    readonly transport: RemoteTransport;
    private lobbyListeners = new Set<(state: LobbyState) => void>();
    private errorListeners = new Set<(message: string) => void>();
    private lastLobby?: LobbyState;

    constructor(url?: string) {
        // Default to same-origin (the server that served this page).
        this.socket = io(url ?? undefined, { transports: ['websocket', 'polling'] });
        this.transport = new RemoteTransport(this.socket);
        this.socket.on('lobby', (state: LobbyState) => {
            this.lastLobby = state;
            for (const cb of this.lobbyListeners) cb(state);
        });
        this.socket.on('lobbyError', (message: string) => {
            for (const cb of this.errorListeners) cb(message);
        });
    }

    onLobby(cb: (state: LobbyState) => void): () => void {
        this.lobbyListeners.add(cb);
        if (this.lastLobby) cb(this.lastLobby);
        return () => { this.lobbyListeners.delete(cb); };
    }

    onError(cb: (message: string) => void): () => void {
        this.errorListeners.add(cb);
        return () => { this.errorListeners.delete(cb); };
    }

    sendLobby(req: LobbyRequest): void {
        this.socket.emit('lobby', req);
    }

    dispose(): void {
        this.lobbyListeners.clear();
        this.errorListeners.clear();
        this.transport.dispose();
        this.socket.disconnect();
    }
}
