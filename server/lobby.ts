import type { Socket } from 'socket.io';
import type { Intent, LobbyRequest } from '../src/net/types';
import { GameRoom } from './room';

// The room registry: maps short join codes to live GameRooms and routes each
// connection's lobby requests and in-game intents to the room it belongs to.
// Replaces Phase 1's single shared room with real create/join-by-code and
// per-connection seat assignment.

const CODE_LENGTH = 4;
// No vowels or easily-confused characters, so codes are easy to read aloud.
const CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXYZ23456789';

export class Lobby {
    private rooms = new Map<string, GameRoom>();

    handleConnection(socket: Socket): void {
        socket.on('lobby', (req: LobbyRequest) => this.handleRequest(socket, req));
        socket.on('intent', (intent: Intent) => {
            const room = this.roomOf(socket);
            room?.applyIntent(socket, intent);
        });
        socket.on('disconnect', () => this.handleLeave(socket));
    }

    private handleRequest(socket: Socket, req: LobbyRequest): void {
        switch (req.type) {
            case 'create': {
                if (this.roomOf(socket)) return; // already in a room
                const room = this.createRoom();
                this.joinRoom(socket, room, req.name);
                return;
            }
            case 'join': {
                if (this.roomOf(socket)) return;
                const room = this.rooms.get(normalizeCode(req.code));
                if (!room || room.started) {
                    socket.emit('lobbyError', room ? 'That game has already started.' : 'No room with that code.');
                    return;
                }
                if (!this.joinRoom(socket, room, req.name)) {
                    socket.emit('lobbyError', 'That room is full.');
                }
                return;
            }
            case 'rejoin': {
                if (this.roomOf(socket)) return; // already attached to a room
                // Unlike `join`, this is allowed into a started room — it's how a
                // dropped player reclaims their held seat by its secret token.
                const room = this.rooms.get(normalizeCode(req.code));
                const seat = room?.rejoin(socket, req.token) ?? -1;
                if (!room || seat === -1) {
                    socket.emit('lobbyError', 'Could not rejoin that game.');
                    return;
                }
                socket.data.code = room.code;
                socket.join(room.code);
                room.pushTo(socket); // hand back their current view (game or lobby)
                return;
            }
            case 'addBot': {
                const room = this.roomOf(socket);
                room?.addBot(req.seat);
                room?.pushAll();
                return;
            }
            case 'removeSeat': {
                const room = this.roomOf(socket);
                room?.removeSeat(req.seat, socket);
                room?.pushAll();
                return;
            }
            case 'setEast': {
                const room = this.roomOf(socket);
                room?.setEast(req.seat);
                room?.pushAll();
                return;
            }
            case 'start': {
                const room = this.roomOf(socket);
                if (!room) return;
                const result = room.start();
                if (result.ok) {
                    // start() broadcasts the started lobby snapshot + first view.
                    return;
                }
                switch (result.reason) {
                    case 'seats':
                        // The requester's snapshot may be stale (another human
                        // just filled a seat). Push the authoritative lobby
                        // back so this client self-corrects instead of dead-
                        // ending on an error, then surface the reason.
                        room.pushTo(socket);
                        socket.emit('lobbyError', 'Every seat must be filled before starting.');
                        return;
                    case 'east':
                        socket.emit('lobbyError', 'Pick a dealer (East) before starting.');
                        return;
                    case 'already':
                        // The game is already running (e.g. a double-click after
                        // a successful start). Stay silent — never the seat error.
                        return;
                }
                return;
            }
        }
    }

    private joinRoom(socket: Socket, room: GameRoom, name?: string): boolean {
        const seat = room.seatHuman(socket, name);
        if (seat === -1) return false;
        socket.data.code = room.code;
        socket.join(room.code);
        room.pushAll(); // tell everyone the seat list changed
        room.pushTo(socket); // and the joiner their own snapshot
        return true;
    }

    private handleLeave(socket: Socket): void {
        const room = this.roomOf(socket);
        if (!room) return;
        room.leave(socket);
        // leave() disposes + removes the room from elsewhere via onEmpty; if it
        // still has humans, refresh their lobby/seat list.
        if (this.rooms.has(room.code)) room.pushAll();
    }

    private roomOf(socket: Socket): GameRoom | undefined {
        const code = socket.data.code as string | undefined;
        return code ? this.rooms.get(code) : undefined;
    }

    private createRoom(): GameRoom {
        let code = this.generateCode();
        while (this.rooms.has(code)) code = this.generateCode();
        const room = new GameRoom(code, c => this.rooms.delete(c));
        this.rooms.set(code, room);
        return room;
    }

    private generateCode(): string {
        let code = '';
        for (let i = 0; i < CODE_LENGTH; i++) {
            code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
        }
        return code;
    }
}

function normalizeCode(code: string): string {
    return code.trim().toUpperCase();
}
