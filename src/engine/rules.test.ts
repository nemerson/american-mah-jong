import { describe, it, expect } from 'vitest';
import { checkPattern, countTiles } from './rules';
import type { Tile } from '../types/mahjong';

describe('Mah Jong Win Condition Engine', () => {

    const createTile = (type: Tile['type'], id: string, extra?: any): Tile => {
        if (type === 'joker') return { id, type };
        if (type === 'flower') return { id, type, value: extra || 1 };
        if (type === 'dragon') return { id, type, dragon: extra || 'red' };
        if (type === 'wind') return { id, type, wind: extra || 'east' };
        return { id, type: 'suit', suit: extra?.suit || 'bam', value: extra?.value || 1 } as Tile;
    };

    describe('countTiles helper', () => {
        it('should correctly organize natural tiles and jokers', () => {
            const hand: Tile[] = [
                createTile('suit', '1', { suit: 'bam', value: 1 }),
                createTile('suit', '2', { suit: 'bam', value: 1 }),
                createTile('dragon', '3', 'red'),
                createTile('joker', '4'),
                createTile('joker', '5'),
            ];

            const result = countTiles(hand);
            expect(result.jokers).toBe(2);
            expect(result.counts.get('suit_bam_1')).toBe(2);
            expect(result.counts.get('dragon_red')).toBe(1);
        });
    });

    describe('checkPattern algorithm', () => {
        it('should match a full standard structure (4-3-3-2-2) with no jokers', () => {
            const counts = new Map<string, number>();
            counts.set('A', 4);
            counts.set('B', 3);
            counts.set('C', 3);
            counts.set('D', 2);
            counts.set('E', 2);

            const result = checkPattern(counts, 0, [4, 3, 3, 2, 2]);
            expect(result).toBe(true);
        });

        it('should match a standard structure with jokers filling in Pungs/Kongs', () => {
            const counts = new Map<string, number>();
            counts.set('A', 2); // needs 2 jokers for Kong
            counts.set('B', 2); // needs 1 joker for Pung
            counts.set('C', 3); // Pung complete
            counts.set('D', 2); // Pair complete
            counts.set('E', 2); // Pair complete

            const result = checkPattern(counts, 3, [4, 3, 3, 2, 2]);
            expect(result).toBe(true);
        });

        it('should FAIL if jokers are used to fill a Pair constraint', () => {
            const counts = new Map<string, number>();
            counts.set('A', 4);
            counts.set('B', 3);
            counts.set('C', 3);
            counts.set('D', 2);
            counts.set('E', 1); // Only 1, needs joker for pair

            const result = checkPattern(counts, 1, [4, 3, 3, 2, 2]);
            expect(result).toBe(false); // Jokers can't be pairs
        });

        it('should match a pairs structure (2-2-2-2-2-2-2) with no jokers', () => {
            const counts = new Map<string, number>();
            counts.set('A', 2); counts.set('B', 2); counts.set('C', 2); counts.set('D', 2);
            counts.set('E', 2); counts.set('F', 2); counts.set('G', 2);

            const result = checkPattern(counts, 0, [2, 2, 2, 2, 2, 2, 2]);
            expect(result).toBe(true);
        });

        it('should FAIL a pairs structure if any jokers are present', () => {
            const counts = new Map<string, number>();
            counts.set('A', 2); counts.set('B', 2); counts.set('C', 2); counts.set('D', 2);
            counts.set('E', 2); counts.set('F', 2); counts.set('G', 1);

            // Even though we have 1 joker, we are strictly forbidding jokers in pairs structure
            const result = checkPattern(counts, 1, [2, 2, 2, 2, 2, 2, 2]);
            expect(result).toBe(false);
        });

        it('should match a Quint structure (5-4-3-2)', () => {
            const counts = new Map<string, number>();
            counts.set('A', 3); // needs 2 jokers for Quint (max 4 identical tiles in a real deck)
            counts.set('B', 4);
            counts.set('C', 3);
            counts.set('D', 2);

            const result = checkPattern(counts, 2, [5, 4, 3, 2]);
            expect(result).toBe(true);
        });
    });
});
