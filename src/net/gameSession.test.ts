import { describe, it, expect, vi, afterEach } from 'vitest';
import { GameSession } from './gameSession';

// GameSession owns the two table-wide collection windows added in Phase 2:
// multi-human Charleston (gather all four passes before resolving) and the
// unified call window. These exercise that collection logic while keeping
// single-player's "resolve at once" behaviour intact.

afterEach(() => vi.useRealTimers());

const ids = (session: GameSession, seat: number, n: number) =>
    session.getState().players[seat].hand.slice(0, n).map(t => t.id);

describe('GameSession Charleston collection', () => {
    it('single-player: one human pass resolves the whole phase at once', () => {
        const session = new GameSession(); // seat 0 human, 1-3 bots
        expect(session.getState().charlestonPhase).toBe('firstRight');

        session.applyIntent(0, { type: 'charlestonPass', tileIds: ids(session, 0, 3) });

        // Bots auto-submitted, so the phase advances immediately.
        expect(session.getState().charlestonPhase).toBe('firstAcross');
        session.dispose();
    });

    it('multi-human: waits for every human before resolving', () => {
        const session = new GameSession({
            names: ['H0', 'H1', 'B2', 'B3'],
            init: { isBot: [false, false, true, true] },
        });
        expect(session.getState().charlestonPhase).toBe('firstRight');

        // First human passes: still firstRight, waiting on the other human.
        session.applyIntent(0, { type: 'charlestonPass', tileIds: ids(session, 0, 3) });
        expect(session.getState().charlestonPhase).toBe('firstRight');

        // Second human passes: now all four are in, phase advances.
        session.applyIntent(1, { type: 'charlestonPass', tileIds: ids(session, 1, 3) });
        expect(session.getState().charlestonPhase).toBe('firstAcross');
        session.dispose();
    });

    it('a human stopping at secondLeft is a table decision', () => {
        const session = new GameSession();
        // Fast-forward to secondLeft by passing through the first three phases.
        for (let i = 0; i < 3; i++) {
            session.applyIntent(0, { type: 'charlestonPass', tileIds: ids(session, 0, 3) });
        }
        expect(session.getState().charlestonPhase).toBe('secondLeft');

        session.applyIntent(0, { type: 'stopCharleston' });
        expect(session.getState().charlestonPhase).toBe('courtesy');
        session.dispose();
    });
});

// Run the whole Charleston in single-player to reach live play, where seat 0
// (East) is on a 14-tile hand ready to discard.
function playToDiscard(session: GameSession): void {
    const passOwnThree = () => {
        const seat0 = session.getState().players[0];
        session.applyIntent(0, { type: 'charlestonPass', tileIds: seat0.hand.slice(0, 3).map(t => t.id) });
    };
    // firstRight, firstAcross, firstLeft, secondLeft, secondAcross, secondRight, courtesy
    for (let i = 0; i < 6; i++) passOwnThree();
    // courtesy pass (0-3 tiles); pass 0 to keep it simple.
    session.applyIntent(0, { type: 'charlestonPass', tileIds: [] });
}

describe('GameSession call window', () => {
    it('closes the window immediately when no seat can claim a discard', () => {
        vi.useFakeTimers();
        const session = new GameSession(); // seat 0 human, 1-3 bots
        playToDiscard(session);

        expect(session.getState().phase).toBe('discard');
        expect(session.getState().currentPlayerIndex).toBe(0);

        // East discards. Bots pre-submit their (auto) claims the moment the call
        // window opens; with nobody wanting the tile the window resolves at once
        // rather than making the table wait out a countdown — play moves on.
        const firstTile = session.getState().players[0].hand[0].id;
        session.applyIntent(0, { type: 'discard', tileId: firstTile });

        expect(session.getState().phase).not.toBe('call');
        expect(session.getState().discards).toHaveLength(1);
        session.dispose();
    });

    it('does not fire timers after dispose', () => {
        vi.useFakeTimers();
        const session = new GameSession();
        const phaseBefore = session.getState().phase;
        session.dispose();
        vi.advanceTimersByTime(20000);
        expect(session.getState().phase).toBe(phaseBefore);
    });
});
