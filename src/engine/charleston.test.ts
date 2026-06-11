import { describe, it, expect } from 'vitest';
import { executeCharlestonPasses, stopCharleston } from './charleston';
import type { CharlestonPass } from './charleston';
import { initializeGame } from './game';

describe('The Charleston', () => {
    it('should correctly pass tiles to the right', () => {
        const state = initializeGame(['Player1', 'Bot1', 'Bot2', 'Bot3']);

        // Take the first 3 tiles from each player to act as their pass
        const p0PassTiles = state.players[0].hand.slice(0, 3);
        const p1PassTiles = state.players[1].hand.slice(0, 3);
        const p2PassTiles = state.players[2].hand.slice(0, 3);
        const p3PassTiles = state.players[3].hand.slice(0, 3);

        const passes: CharlestonPass[] = [
            { fromIndex: 0, toIndex: 1, tiles: p0PassTiles },
            { fromIndex: 1, toIndex: 2, tiles: p1PassTiles },
            { fromIndex: 2, toIndex: 3, tiles: p2PassTiles },
            { fromIndex: 3, toIndex: 0, tiles: p3PassTiles }
        ];

        const newState = executeCharlestonPasses(state, 'firstRight', passes);

        // Player 0 should have Player 3's tiles
        const p0HasPassedTiles = p3PassTiles.every(pt => newState.players[0].hand.some(t => t.id === pt.id));
        expect(p0HasPassedTiles).toBe(true);

        // Player 1 should have Player 0's tiles
        const p1HasPassedTiles = p0PassTiles.every(pt => newState.players[1].hand.some(t => t.id === pt.id));
        expect(p1HasPassedTiles).toBe(true);

        // Hands should remain the expected sizes (East 14, others 13)
        expect(newState.players[0].hand.length).toBe(14);
        expect(newState.players[1].hand.length).toBe(13);
        expect(newState.players[2].hand.length).toBe(13);
        expect(newState.players[3].hand.length).toBe(13);
    });

    it('should correctly transition to next phase after courtesy', () => {
        const state = initializeGame(['Player1', 'Bot1', 'Bot2', 'Bot3']);

        // Nobody passes during courtesy for this test
        const passes: CharlestonPass[] = [
            { fromIndex: 0, toIndex: 2, tiles: [] },
            { fromIndex: 1, toIndex: 3, tiles: [] },
            { fromIndex: 2, toIndex: 0, tiles: [] },
            { fromIndex: 3, toIndex: 1, tiles: [] }
        ];

        const newState = executeCharlestonPasses(state, 'courtesy', passes);
        expect(newState.phase).toBe('discard');
    });

    describe('blind pass (third and sixth passes)', () => {
        function makeBlindPasses(state: ReturnType<typeof initializeGame>, blindCount: number) {
            // Player 0 passes (3 - blindCount) own tiles, rest blind from incoming
            const p0Chosen = state.players[0].hand.slice(0, 3 - blindCount);
            const p1PassTiles = state.players[1].hand.slice(0, 3); // player 1 passes to 0 on a left pass
            const passes: CharlestonPass[] = [
                { fromIndex: 0, toIndex: -1, tiles: p0Chosen, blindCount },
                { fromIndex: 1, toIndex: -1, tiles: p1PassTiles },
                { fromIndex: 2, toIndex: -1, tiles: state.players[2].hand.slice(0, 3) },
                { fromIndex: 3, toIndex: -1, tiles: state.players[3].hand.slice(0, 3) }
            ];
            return { passes, p0Chosen, p1PassTiles };
        }

        it('completes the pass with unseen tiles from the incoming stack', () => {
            const state = initializeGame(['Player1', 'Bot1', 'Bot2', 'Bot3']);
            const { passes, p0Chosen, p1PassTiles } = makeBlindPasses(state, 2);

            const newState = executeCharlestonPasses(state, 'firstLeft', passes);

            // Hand sizes preserved (East 14, others 13)
            expect(newState.players.map(p => p.hand.length)).toEqual([14, 13, 13, 13]);

            // Player 3 (player 0's target on a left pass) received player 0's
            // chosen tile plus exactly 2 of the tiles player 1 passed
            const p3Hand = newState.players[3].hand;
            expect(p0Chosen.every(t => p3Hand.some(h => h.id === t.id))).toBe(true);
            const blindForwarded = p1PassTiles.filter(t => p3Hand.some(h => h.id === t.id));
            expect(blindForwarded).toHaveLength(2);

            // The blind tiles never entered player 0's hand: only the one
            // remaining incoming tile did
            const p0Hand = newState.players[0].hand;
            const incomingKept = p1PassTiles.filter(t => p0Hand.some(h => h.id === t.id));
            expect(incomingKept).toHaveLength(1);
        });

        it('allows a fully blind pass of 3 unseen tiles', () => {
            const state = initializeGame(['Player1', 'Bot1', 'Bot2', 'Bot3']);
            const { passes, p1PassTiles } = makeBlindPasses(state, 3);

            const newState = executeCharlestonPasses(state, 'firstLeft', passes);

            expect(newState.players.map(p => p.hand.length)).toEqual([14, 13, 13, 13]);
            // Everything player 1 passed went straight through to player 3
            const p3Hand = newState.players[3].hand;
            expect(p1PassTiles.every(t => p3Hand.some(h => h.id === t.id))).toBe(true);
        });

        it('rejects blind passes outside the third and sixth passes', () => {
            const state = initializeGame(['Player1', 'Bot1', 'Bot2', 'Bot3']);
            const { passes } = makeBlindPasses(state, 2);
            expect(() => executeCharlestonPasses(state, 'firstRight', passes)).toThrow();
        });

        it('rejects passes where chosen plus blind does not equal 3', () => {
            const state = initializeGame(['Player1', 'Bot1', 'Bot2', 'Bot3']);
            const passes: CharlestonPass[] = [
                { fromIndex: 0, toIndex: -1, tiles: state.players[0].hand.slice(0, 2), blindCount: 2 },
                { fromIndex: 1, toIndex: -1, tiles: state.players[1].hand.slice(0, 3) },
                { fromIndex: 2, toIndex: -1, tiles: state.players[2].hand.slice(0, 3) },
                { fromIndex: 3, toIndex: -1, tiles: state.players[3].hand.slice(0, 3) }
            ];
            expect(() => executeCharlestonPasses(state, 'firstLeft', passes)).toThrow();
        });
    });

    describe('stopping the Charleston', () => {
        it('skips the second Charleston from the decision point', () => {
            const state = initializeGame(['Player1', 'Bot1', 'Bot2', 'Bot3']);
            state.charlestonPhase = 'secondLeft'; // first three passes done
            const newState = stopCharleston(state);
            expect(newState.charlestonPhase).toBe('courtesy');
            expect(newState.phase).toBe('charleston');
        });

        it('cannot stop mid-way through the first Charleston', () => {
            const state = initializeGame(['Player1', 'Bot1', 'Bot2', 'Bot3']);
            state.charlestonPhase = 'firstAcross';
            expect(() => stopCharleston(state)).toThrow();
        });
    });
});
