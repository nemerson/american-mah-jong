import { describe, it, expect, afterEach } from 'vitest';
import type { Socket } from 'socket.io';
import type { LobbyState, PlayerView } from '../src/net/types';
import { GameRoom } from './room';

// GameRoom is the per-table waiting room and, once started, the per-seat view
// broadcaster. These tests cover the pre-game seating logic that's pure enough
// to exercise with a fake socket: the discriminated start() result, the
// lobby-snapshot-on-start handoff, and the "East always references an occupied
// seat" invariant. A fake socket is sufficient because the room only ever
// calls socket.emit and compares socket identity.

interface Emitted { event: string; payload: unknown; }

class FakeSocket {
    readonly emitted: Emitted[] = [];
    emit(event: string, payload: unknown): void {
        this.emitted.push({ event, payload });
    }
    /** The last lobby snapshot this socket received, if any. */
    lastLobby(): LobbyState | undefined {
        for (let i = this.emitted.length - 1; i >= 0; i--) {
            if (this.emitted[i].event === 'lobby') return this.emitted[i].payload as LobbyState;
        }
        return undefined;
    }
    events(name: string): unknown[] {
        return this.emitted.filter(e => e.event === name).map(e => e.payload);
    }
}

const asSocket = (f: FakeSocket): Socket => f as unknown as Socket;

const rooms: GameRoom[] = [];
function makeRoom(): GameRoom {
    const room = new GameRoom('TEST', () => {});
    rooms.push(room);
    return room;
}

afterEach(() => {
    for (const r of rooms.splice(0)) r.dispose();
});

describe('GameRoom.start discriminated result', () => {
    it('rejects with reason "seats" when a seat is empty', () => {
        const room = makeRoom();
        const host = new FakeSocket();
        room.seatHuman(asSocket(host), 'Host'); // seat 0 only
        expect(room.start()).toEqual({ ok: false, reason: 'seats' });
        expect(room.started).toBe(false);
    });

    it('starts (ok) once every seat is filled with humans/bots', () => {
        const room = makeRoom();
        const host = new FakeSocket();
        room.seatHuman(asSocket(host), 'Host');
        room.addBot(1);
        room.addBot(2);
        room.addBot(3);
        expect(room.start()).toEqual({ ok: true });
        expect(room.started).toBe(true);
    });

    it('rejects a second start with reason "already" (never the seat error)', () => {
        const room = makeRoom();
        const host = new FakeSocket();
        room.seatHuman(asSocket(host), 'Host');
        room.addBot(1);
        room.addBot(2);
        room.addBot(3);
        expect(room.start()).toEqual({ ok: true });
        expect(room.start()).toEqual({ ok: false, reason: 'already' });
    });
});

describe('GameRoom start handoff', () => {
    it('emits a lobby snapshot with started:true to seated humans on start', () => {
        const room = makeRoom();
        const host = new FakeSocket();
        room.seatHuman(asSocket(host), 'Host');
        room.addBot(1);
        room.addBot(2);
        room.addBot(3);

        host.emitted.length = 0; // ignore pre-start lobby pushes
        expect(room.start()).toEqual({ ok: true });

        const startedLobbies = host.events('lobby').filter(l => (l as LobbyState).started);
        expect(startedLobbies.length).toBeGreaterThan(0);
        // And a first game view follows so the board can replay it.
        const views = host.events('view') as PlayerView[];
        expect(views.length).toBeGreaterThan(0);
    });
});

describe('GameRoom East invariant on seat clear', () => {
    it('reassigns East to an occupied seat when East is removed (removeSeat)', () => {
        const room = makeRoom();
        const host = new FakeSocket();
        room.seatHuman(asSocket(host), 'Host'); // seat 0 human
        room.addBot(1);
        room.addBot(2);
        room.setEast(1); // East = bot seat 1
        expect(room.start()).toEqual({ ok: false, reason: 'seats' }); // seat 3 empty
        room.removeSeat(1, asSocket(host)); // remove the East bot

        // East must no longer point at the now-empty seat 1.
        room.pushTo(asSocket(host));
        const snap = host.lastLobby()!;
        const east = snap.seats.find(s => s.isEast)!;
        expect(snap.seats[east.index].occupant).not.toBe('empty');
        expect(east.index).toBe(0); // first still-occupied seat
    });

    it('reassigns East when the East human leaves pre-game', () => {
        const room = makeRoom();
        const host = new FakeSocket();
        const guest = new FakeSocket();
        room.seatHuman(asSocket(host), 'Host');  // seat 0
        room.seatHuman(asSocket(guest), 'Guest'); // seat 1
        room.setEast(1); // East = guest (seat 1)
        room.leave(asSocket(guest)); // guest vacates East seat

        room.pushTo(asSocket(host));
        const snap = host.lastLobby()!;
        const east = snap.seats.find(s => s.isEast)!;
        expect(snap.seats[east.index].occupant).not.toBe('empty');
        expect(east.index).toBe(0);
    });
});
