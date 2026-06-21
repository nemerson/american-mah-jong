import { describe, it, expect } from 'vitest';
import type { PlayerView } from './types';
import { LocalTransport } from './localTransport';

// LocalTransport is the in-process authority. These assert the two properties
// the multiplayer refactor hinges on: opponents are hidden, and intents drive
// real engine transitions.

describe('LocalTransport', () => {
    it('delivers a view that hides opponent hands but reveals your own', () => {
        const t = new LocalTransport();
        let view: PlayerView | undefined;
        t.subscribe(v => { view = v; });

        expect(view).toBeDefined();
        expect(view!.mySeat).toBe(0);
        expect(view!.phase).toBe('charleston');
        // Own seat: full hand (East deals 14).
        expect(view!.seats[0].hand).toHaveLength(14);
        // Opponents: count only, contents withheld.
        for (let i = 1; i < 4; i++) {
            expect(view!.seats[i].hand).toBeUndefined();
            expect(view!.seats[i].handCount).toBe(13);
        }
        t.dispose();
    });

    it('applies a Charleston pass intent and advances the phase', () => {
        const t = new LocalTransport();
        let view!: PlayerView;
        t.subscribe(v => { view = v; });

        expect(view.charlestonPhase).toBe('firstRight');
        const threeOwnTiles = view.seats[0].hand!.slice(0, 3).map(tile => tile.id);

        t.send({ type: 'charlestonPass', tileIds: threeOwnTiles });

        expect(view.charlestonPhase).toBe('firstAcross');
        // East passed 3 right and received 3, still holding 14.
        expect(view.seats[0].hand).toHaveLength(14);
        t.dispose();
    });

    it('keeps delivering views after a dispose-then-resubscribe (StrictMode remount)', () => {
        // React StrictMode dev double-mounts: setup -> cleanup -> setup, reusing
        // the same transport instance. The cleanup disposes it; the second setup
        // re-subscribes. Without re-arming the session link this left the UI
        // frozen — intents mutated state internally but no view was ever emitted.
        const t = new LocalTransport();
        const unsub = t.subscribe(() => {});
        unsub();
        t.dispose(); // StrictMode cleanup severs the session link + stops the clock

        let view!: PlayerView;
        t.subscribe(v => { view = v; }); // StrictMode second setup re-subscribes

        expect(view).toBeDefined();
        expect(view.charlestonPhase).toBe('firstRight');
        const threeOwnTiles = view.seats[0].hand!.slice(0, 3).map(tile => tile.id);

        t.send({ type: 'charlestonPass', tileIds: threeOwnTiles });

        // The re-armed link must emit the advanced view — not stay frozen.
        expect(view.charlestonPhase).toBe('firstAcross');
        t.dispose();
    });

    it('ignores an illegal intent without throwing or changing state', () => {
        const t = new LocalTransport();
        let view!: PlayerView;
        t.subscribe(v => { view = v; });
        const before = view.charlestonPhase;

        // Discarding during the Charleston is illegal; should be a no-op.
        expect(() => t.send({ type: 'discard', tileId: view.seats[0].hand![0].id })).not.toThrow();

        expect(view.charlestonPhase).toBe(before);
        t.dispose();
    });
});
