import { describe, it, expect } from 'vitest';
import { matchVariant } from './handMatcher';
import type { HandVariant } from './handMatcher';
import { internationalMahjongCard } from './cardData';
import { checkMahJong } from './rules';
import type { Tile, Suit, Wind, Dragon, Player } from '../types/mahjong';

let nextId = 0;
const suit = (s: Suit, value: number): Tile =>
    ({ type: 'suit', suit: s, value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, id: `t${nextId++}` });
const wind = (w: Wind): Tile => ({ type: 'wind', wind: w, id: `t${nextId++}` });
const dragon = (d: Dragon): Tile => ({ type: 'dragon', dragon: d, id: `t${nextId++}` });
const flower = (): Tile => ({ type: 'flower', value: 1, id: `t${nextId++}` });
const joker = (): Tile => ({ type: 'joker', id: `t${nextId++}` });

const repeat = (n: number, make: () => Tile): Tile[] => Array.from({ length: n }, make);

function findVariant(sectionName: string, handIndex: number): HandVariant {
    const section = internationalMahjongCard.find(s => s.name === sectionName)!;
    return section.hands[handIndex].variants[0];
}

describe('hand matcher', () => {
    describe('joker rules', () => {
        // Lucky Eights #2: FF 2222 6666 8888 (any 3 suits)
        const luckyKongs = findVariant('Lucky Eights', 1);

        it('allows jokers to fill kongs', () => {
            const tiles = [
                ...repeat(2, flower),
                ...repeat(4, () => suit('bams', 2)),
                ...repeat(3, () => suit('craks', 6)), joker(),
                ...repeat(4, () => suit('dots', 8)),
            ];
            expect(matchVariant(tiles, luckyKongs)).toBe(true);
        });

        it('rejects jokers in pairs', () => {
            // Lucky Eights #6: FF 11 77 88 / 22 66 88 — all pairs
            const allPairs = findVariant('Lucky Eights', 5);
            const valid = [
                ...repeat(2, flower),
                suit('bams', 1), suit('bams', 1), suit('bams', 7), suit('bams', 7), suit('bams', 8), suit('bams', 8),
                suit('craks', 2), suit('craks', 2), suit('craks', 6), suit('craks', 6), suit('craks', 8), suit('craks', 8),
            ];
            expect(matchVariant(valid, allPairs)).toBe(true);

            const withJoker = [...valid.slice(0, 13), joker()];
            expect(matchVariant(withJoker, allPairs)).toBe(false);
        });

        it('rejects jokers as singles', () => {
            // Flower Bouquet #5: FF 123456789 D FF — run of singles
            const runHand = findVariant('Flower Bouquet', 4);
            const valid = [
                ...repeat(4, flower),
                ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => suit('bams', v)),
                dragon('green'),
            ];
            expect(matchVariant(valid, runHand)).toBe(true);

            const withJoker = [
                ...repeat(4, flower),
                ...[1, 2, 3, 4, 6, 7, 8, 9].map(v => suit('bams', v)), joker(),
                dragon('green'),
            ];
            expect(matchVariant(withJoker, runHand)).toBe(false);
        });

        it('requires at least one natural tile in a joker-filled group', () => {
            // Windy Dragons #2: FFFF 1111 DDD DDD — replace a whole pung with jokers
            const windyDragons = findVariant('Windy Dragons', 1);
            const tiles = [
                ...repeat(4, flower),
                ...repeat(4, () => suit('bams', 1)),
                ...repeat(3, joker),
                ...repeat(3, () => dragon('white')),
            ];
            expect(matchVariant(tiles, windyDragons)).toBe(false);
        });
    });

    describe('variable binding', () => {
        it('tries all suit assignments', () => {
            // Evens #1: 222 4444 6666 888 (any 2 suits) — built with dots/bams instead of bams/craks
            const evens = findVariant('Evens', 0);
            const tiles = [
                ...repeat(3, () => suit('dots', 2)),
                ...repeat(4, () => suit('dots', 4)),
                ...repeat(4, () => suit('bams', 6)),
                ...repeat(3, () => suit('bams', 8)),
            ];
            expect(matchVariant(tiles, evens)).toBe(true);
        });

        it('enumerates base values for consecutive runs', () => {
            // Pungs & Chows #2: any 4 consecutive numbers — run starting at 5
            const consec = findVariant('Pungs & Chows', 1);
            const tiles = [
                ...repeat(3, () => suit('bams', 5)),
                ...repeat(3, () => suit('bams', 6)),
                ...repeat(3, () => suit('craks', 7)),
                ...repeat(3, () => suit('craks', 8)),
                wind('south'), wind('south'),
            ];
            expect(matchVariant(tiles, consec)).toBe(true);

            // Non-consecutive numbers must fail
            const broken = [
                ...repeat(3, () => suit('bams', 5)),
                ...repeat(3, () => suit('bams', 6)),
                ...repeat(3, () => suit('craks', 7)),
                ...repeat(3, () => suit('craks', 9)),
                wind('south'), wind('south'),
            ];
            expect(matchVariant(broken, consec)).toBe(false);
        });

        it('enforces even/odd parity constraints', () => {
            // Windy Dragons #4: NNN SSS 222 222 DD — any same even number
            const evens = findVariant('Windy Dragons', 3);
            const withEvens = [
                ...repeat(3, () => wind('north')),
                ...repeat(3, () => wind('south')),
                ...repeat(3, () => suit('bams', 4)),
                ...repeat(3, () => suit('craks', 4)),
                dragon('white'), dragon('white'),
            ];
            expect(matchVariant(withEvens, evens)).toBe(true);

            const withOdds = [
                ...repeat(3, () => wind('north')),
                ...repeat(3, () => wind('south')),
                ...repeat(3, () => suit('bams', 3)),
                ...repeat(3, () => suit('craks', 3)),
                dragon('white'), dragon('white'),
            ];
            expect(matchVariant(withOdds, evens)).toBe(false);
        });

        it('treats soap (zero) as the white dragon', () => {
            // Year #2: 222 000 2222 6666
            const year = findVariant('Year of the Horse 2026', 1);
            const tiles = [
                ...repeat(3, () => suit('bams', 2)),
                ...repeat(3, () => dragon('white')),
                ...repeat(4, () => suit('craks', 2)),
                ...repeat(4, () => suit('dots', 6)),
            ];
            expect(matchVariant(tiles, year)).toBe(true);
        });
    });

    describe('checkMahJong integration', () => {
        const makePlayer = (hand: Tile[]): Player =>
            ({ id: 'p0', name: 'Test', isBot: false, hand, exposures: [] });

        it('returns the matched card hand with points', () => {
            const player = makePlayer([
                ...repeat(3, () => suit('bams', 2)),
                ...repeat(3, () => dragon('white')),
                ...repeat(4, () => suit('craks', 2)),
                ...repeat(4, () => suit('dots', 6)),
            ]);
            const win = checkMahJong(player);
            expect(win).not.toBeNull();
            expect(win!.section).toBe('Year of the Horse 2026');
            expect(win!.handNumber).toBe(2);
            expect(win!.points).toBe(50);
        });

        it('returns null for 13 tiles', () => {
            const player = makePlayer([
                ...repeat(3, () => suit('bams', 2)),
                ...repeat(3, () => dragon('white')),
                ...repeat(4, () => suit('craks', 2)),
                ...repeat(3, () => suit('dots', 6)),
            ]);
            expect(checkMahJong(player)).toBeNull();
        });

        it('returns null for 14 tiles matching no card hand', () => {
            const player = makePlayer([
                ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => suit('bams', v)),
                ...[1, 2, 3, 4, 5].map(v => suit('craks', v)),
            ]);
            expect(checkMahJong(player)).toBeNull();
        });
    });
});
