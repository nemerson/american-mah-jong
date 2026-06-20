import { describe, it, expect, vi, afterEach } from 'vitest';
import type { GameState } from '../types/mahjong';
import { initializeGame } from './game';
import { createGameClock } from './gameClock';

// Drives the extracted clock with fake timers, the way the old useGameLoop
// effect did under React, to confirm the timed transitions are preserved.

function driveable(initial: GameState) {
    let state = initial;
    const clock = createGameClock({
        getState: () => state,
        setState: (next) => { state = next; clock.onStateChanged(); },
    });
    return { clock, get: () => state };
}

afterEach(() => vi.useRealTimers());

describe('gameClock', () => {
    it('auto-draws for the current player after 600ms in the draw phase', () => {
        vi.useFakeTimers();
        const base = initializeGame(['You', 'B1', 'B2', 'B3']);
        const { clock, get } = driveable({ ...base, phase: 'draw', currentPlayerIndex: 1 });
        const wallBefore = get().wall.length;
        const handBefore = get().players[1].hand.length;

        clock.start();
        vi.advanceTimersByTime(600);

        expect(get().phase).toBe('discard');
        expect(get().wall.length).toBe(wallBefore - 1);
        expect(get().players[1].hand.length).toBe(handBefore + 1);
        clock.stop();
    });

    it('makes a bot discard after 1000ms in the discard phase', () => {
        vi.useFakeTimers();
        const base = initializeGame(['You', 'B1', 'B2', 'B3']);
        const { clock, get } = driveable({ ...base, phase: 'discard', currentPlayerIndex: 1 });

        clock.start();
        vi.advanceTimersByTime(1000);

        expect(get().phase).toBe('call');
        expect(get().discards.length).toBe(1);
        clock.stop();
    });

    it('reports the call-window countdown while it runs, then clears it', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const base = initializeGame(['You', 'B1', 'B2', 'B3']);
        let state: GameState = { ...base, phase: 'call', currentPlayerIndex: 1 };
        const clock = createGameClock({
            getState: () => state,
            setState: (next) => { state = next; clock.onStateChanged(); },
            getCallWindowMs: () => 8000,
        });

        // No window before start.
        expect(clock.callWindowRemainingMs()).toBeUndefined();

        clock.start();
        expect(clock.callWindowRemainingMs()).toBe(8000);

        vi.advanceTimersByTime(3000);
        expect(clock.callWindowRemainingMs()).toBe(5000);

        // Once the window elapses and the legacy fallback resolves it, the
        // countdown is gone.
        vi.advanceTimersByTime(5000);
        expect(clock.callWindowRemainingMs()).toBeUndefined();
        clock.stop();
    });

    it('schedules nothing while stopped (paused)', () => {
        vi.useFakeTimers();
        const base = initializeGame(['You', 'B1', 'B2', 'B3']);
        const { clock, get } = driveable({ ...base, phase: 'draw', currentPlayerIndex: 1 });

        clock.start();
        clock.stop();
        vi.advanceTimersByTime(5000);

        expect(get().phase).toBe('draw'); // frozen
    });
});
