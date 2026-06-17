import { io, type Socket } from 'socket.io-client';
import type { GameTransport, Intent, PlayerView } from './types';

// Client side of multiplayer: a GameTransport backed by a Socket.IO connection
// to the authoritative server. It sends intents and forwards the per-seat
// `view` snapshots the server pushes — the UI can't tell it apart from the
// in-process LocalTransport. There is deliberately no setPaused: a shared
// server clock can't be frozen by one client.

export class RemoteTransport implements GameTransport {
    private socket: Socket;
    private subscribers = new Set<(view: PlayerView) => void>();
    private lastView?: PlayerView;

    constructor(url?: string) {
        // Default to same-origin (the server that served this page).
        this.socket = io(url ?? undefined, { transports: ['websocket', 'polling'] });
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
        this.socket.disconnect();
        this.subscribers.clear();
    }
}
