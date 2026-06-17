import type { Server, Socket } from 'socket.io';
import type { Intent } from '../src/net/types';
import { GameSession } from '../src/net/gameSession';
import { viewFor } from '../src/net/viewFor';

// Phase 1: a single room with one human seat (0) and three bots. Every
// connection controls and views seat 0, which is enough to prove the
// authoritative loop over the network. Phase 2 turns this into a room registry
// with real per-connection seat assignment and per-seat views.

const HUMAN_SEAT = 0;

export class GameRoom {
    private session = new GameSession();

    constructor(private io: Server) {
        this.session.onChange(() => this.broadcast());
    }

    handleConnection(socket: Socket): void {
        socket.data.seat = HUMAN_SEAT;
        // Send the joining client the current view immediately.
        socket.emit('view', viewFor(this.session.getState(), HUMAN_SEAT));

        socket.on('intent', (intent: Intent) => {
            try {
                this.session.applyIntent(socket.data.seat, intent);
            } catch {
                // Reject forged/illegal intents silently, like the local path.
            }
        });
    }

    private broadcast(): void {
        // Phase 1: one shared seat, so one view fans out to everyone. Phase 2
        // emits a distinct viewFor(state, seat) to each connection.
        this.io.emit('view', viewFor(this.session.getState(), HUMAN_SEAT));
    }
}
