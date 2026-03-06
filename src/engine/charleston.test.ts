import { describe, it, expect } from 'vitest';
import { executeCharlestonPasses } from './charleston';
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
});
