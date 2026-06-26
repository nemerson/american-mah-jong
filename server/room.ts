import { randomUUID } from 'node:crypto';
import type { Socket } from 'socket.io';
import type { Intent, LobbySeat, LobbyState, StartResult } from '../src/net/types';
import { GameSession } from '../src/net/gameSession';
import { viewFor } from '../src/net/viewFor';

// One table. Before the game starts it is a waiting room with four seats, each
// empty, held by a connected human, or filled by a bot. "start" freezes the
// seating into a GameSession (the same authoritative core single-player uses)
// and from then on every connected human is broadcast only their own seat's
// view — the hidden-information boundary that protects multiple humans.

const SEATS = 4;

interface Seat {
    socket?: Socket;   // a connected human controls this seat
    bot: boolean;      // filled by a bot
    name: string;
    token?: string;    // secret reconnection token for a human seat
}

export class GameRoom {
    readonly code: string;
    private seats: Seat[] = Array.from({ length: SEATS }, (_, i) => ({ bot: false, name: `Seat ${i + 1}` }));
    private eastIndex = 0;
    private session?: GameSession;
    private unsubscribe?: () => void;

    constructor(code: string, private onEmpty: (code: string) => void) {
        this.code = code;
    }

    get started(): boolean {
        return this.session !== undefined;
    }

    /** Whether the room has no connected humans (eligible for cleanup). */
    get isEmpty(): boolean {
        return this.seats.every(s => s.socket === undefined);
    }

    /**
     * Seat a newly connected human in the first free seat. Returns it, or -1.
     * Mints a secret reconnection token, delivered to that client in their own
     * lobby snapshot so they can later `rejoin` the seat if their socket drops.
     */
    seatHuman(socket: Socket, name?: string): number {
        if (this.started) return -1;
        const seat = this.seats.findIndex(s => !s.socket && !s.bot);
        if (seat === -1) return -1;
        this.seats[seat] = { socket, bot: false, name: name?.trim() || `Player ${seat + 1}`, token: randomUUID() };
        return seat;
    }

    addBot(seat: number): void {
        if (this.started) return;
        if (seat < 0 || seat >= SEATS) return;
        if (this.seats[seat].socket || this.seats[seat].bot) return;
        this.seats[seat] = { bot: true, name: `Bot ${seat + 1}` };
    }

    /** Clear a seat (a bot is removed; a human seat is only cleared on leave). */
    removeSeat(seat: number, by: Socket): void {
        if (this.started) return;
        if (seat < 0 || seat >= SEATS) return;
        const target = this.seats[seat];
        // Only let a human remove a bot, or vacate their own seat.
        if (target.socket && target.socket !== by) return;
        this.seats[seat] = { bot: false, name: `Seat ${seat + 1}` };
        this.ensureEastOccupied();
    }

    setEast(seat: number): void {
        if (this.started) return;
        if (seat < 0 || seat >= SEATS) return;
        if (!this.seats[seat].socket && !this.seats[seat].bot) return;
        this.eastIndex = seat;
    }

    /**
     * Keep the invariant "eastIndex always references an occupied seat". Called
     * after clearing a seat: if East was just emptied, move it to the first
     * still-occupied seat (none occupied leaves it as-is; start() will reject).
     */
    private ensureEastOccupied(): void {
        const east = this.seats[this.eastIndex];
        if (east.socket || east.bot) return;
        const next = this.seats.findIndex(s => s.socket || s.bot);
        if (next !== -1) this.eastIndex = next;
    }

    /**
     * Begin the game once every seat is filled (by a human or a bot). Returns a
     * discriminated result so the caller can report exactly why a start was
     * refused (an empty seat vs. an empty East vs. an already-running game)
     * instead of one overloaded message.
     */
    start(): StartResult {
        if (this.started) return { ok: false, reason: 'already' };
        if (!this.seats.every(s => s.socket || s.bot)) return { ok: false, reason: 'seats' };
        // East must be an occupied seat.
        if (!this.seats[this.eastIndex].socket && !this.seats[this.eastIndex].bot) {
            return { ok: false, reason: 'east' };
        }

        const names = this.seats.map(s => s.name);
        const isBot = this.seats.map(s => s.bot);
        this.session = new GameSession({ names, init: { eastIndex: this.eastIndex, isBot } });
        this.unsubscribe = this.session.onChange(() => this.broadcastGame());
        // Tell every seated human the game has started so their lobby UI hands
        // off to the board. The board then subscribes and RemoteTransport
        // replays the latest `view` it captured below.
        this.broadcastLobby();
        this.broadcastGame();
        return { ok: true };
    }

    /** Apply a human's in-game intent for their own seat. */
    applyIntent(socket: Socket, intent: Intent): void {
        if (!this.session) return;
        const seat = this.seatOf(socket);
        if (seat === -1) return;
        try {
            this.session.applyIntent(seat, intent);
        } catch {
            // Reject forged/illegal intents silently, like the local path.
        }
    }

    /** Free a leaving human's seat (pre-game) or hold it for reconnection (mid-game). */
    leave(socket: Socket): void {
        const seat = this.seatOf(socket);
        if (seat === -1) return;
        if (!this.started) {
            // Pre-game: free the seat outright, and reap the room if it empties —
            // there's no game state worth preserving.
            this.seats[seat] = { bot: false, name: `Seat ${seat + 1}` };
            this.ensureEastOccupied();
            if (this.isEmpty) {
                this.dispose();
                this.onEmpty(this.code);
            }
        } else {
            // Mid-game: hold the seat but drop the socket, keeping the seat's
            // token so the player can `rejoin`. The room is deliberately NOT
            // reaped when the last human drops — a solo human (1 human + 3 bots)
            // must be able to reconnect to a game that's still here. A seat-hold
            // timeout that bots an unreclaimed seat and eventually reaps a truly
            // abandoned room is the next sub-task.
            this.seats[seat] = { ...this.seats[seat], socket: undefined };
        }
    }

    /**
     * Re-attach a reconnecting human to the seat they still hold, identified by
     * the secret token minted at `seatHuman` — the socket id changes across a
     * reconnect, so identity can't be by socket. Returns the seat index, or -1
     * if no seat matches the token. This is the one path allowed to seat a human
     * into an already-started room (normal `join` is rejected once `started`).
     */
    rejoin(socket: Socket, token: string): number {
        if (!token) return -1;
        const seat = this.seats.findIndex(s => s.token === token);
        if (seat === -1) return -1;
        // Replace whatever socket the seat had — none if disconnected, or a
        // stale one on a double rejoin (two tabs). Seat membership is by socket
        // identity, so swapping the reference never duplicates the seat.
        this.seats[seat] = { ...this.seats[seat], socket };
        return seat;
    }

    dispose(): void {
        this.unsubscribe?.();
        this.session?.dispose();
        this.session = undefined;
    }

    /** Push the right snapshot (lobby or game view) to every connected human. */
    pushAll(): void {
        if (this.started) this.broadcastGame();
        else this.broadcastLobby();
    }

    /** Push a snapshot to one connected human (e.g. right after they join). */
    pushTo(socket: Socket): void {
        const seat = this.seatOf(socket);
        if (seat === -1) return;
        if (this.started && this.session) {
            socket.emit('view', viewFor(this.session.getState(), seat, this.session.getCallWindowRemainingMs()));
        } else {
            socket.emit('lobby', this.lobbyStateFor(seat));
        }
    }

    private broadcastLobby(): void {
        for (const s of this.seats) {
            if (s.socket) s.socket.emit('lobby', this.lobbyStateFor(this.seatOf(s.socket)));
        }
    }

    private broadcastGame(): void {
        if (!this.session) return;
        const state = this.session.getState();
        const callWindowMs = this.session.getCallWindowRemainingMs();
        for (const s of this.seats) {
            if (s.socket) s.socket.emit('view', viewFor(state, this.seatOf(s.socket), callWindowMs));
        }
    }

    private lobbyStateFor(mySeat: number): LobbyState {
        const seats: LobbySeat[] = this.seats.map((s, index) => ({
            index,
            name: s.name,
            occupant: s.socket ? 'human' : s.bot ? 'bot' : 'empty',
            isYou: index === mySeat,
            isEast: index === this.eastIndex,
        }));
        // The token is the recipient's own secret — only ever in their snapshot.
        const token = mySeat >= 0 ? this.seats[mySeat].token : undefined;
        return { code: this.code, mySeat, seats, started: this.started, token };
    }

    private seatOf(socket: Socket): number {
        return this.seats.findIndex(s => s.socket === socket);
    }
}
