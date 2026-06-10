import { describe, it, expect } from 'vitest';
import { internationalMahjongCard } from './cardData';
import type { HandVariant, TileSpec } from './handMatcher';
import { matchVariant } from './handMatcher';
import type { Tile, Suit, Dragon } from '../types/mahjong';

// Build a concrete 14-tile hand from a variant spec using a fixed binding
// (A=bams, B=craks, C=dots; lowest valid base; any-wind=north; any-dragon=red)

const SUIT_MAP = { A: 'bams', B: 'craks', C: 'dots' } as const;
const DRAGON_FOR_SUIT: Record<Suit, Dragon> = { bams: 'green', craks: 'red', dots: 'white' };
const WIND_MAP = { N: 'north', E: 'east', W: 'west', S: 'south' } as const;

let nextId = 0;

function makeTile(spec: TileSpec, base: number): Tile {
    const id = `t${nextId++}`;
    switch (spec.t) {
        case 'num': {
            const value = 'lit' in spec.v ? spec.v.lit : base + spec.v.off;
            return { type: 'suit', suit: SUIT_MAP[spec.suit], value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, id };
        }
        case 'soap':
            return { type: 'dragon', dragon: 'white', id };
        case 'dragon':
            return { type: 'dragon', dragon: spec.suit === 'any' ? 'red' : DRAGON_FOR_SUIT[SUIT_MAP[spec.suit]], id };
        case 'wind':
            return { type: 'wind', wind: spec.wind === 'any' ? 'north' : WIND_MAP[spec.wind], id };
        case 'flower':
            return { type: 'flower', value: 1, id };
    }
}

function buildTiles(variant: HandVariant): Tile[] {
    const base = variant.base === 'even' ? 2 : 1;
    const tiles: Tile[] = [];
    for (const g of variant.groups) {
        for (let i = 0; i < g.size; i++) {
            tiles.push(makeTile(g.tile, base));
        }
    }
    return tiles;
}

function tileKey(t: Tile): string {
    if (t.type === 'suit') return `suit_${t.suit}_${t.value}`;
    if (t.type === 'wind') return `wind_${t.wind}`;
    if (t.type === 'dragon') return `dragon_${t.dragon}`;
    return 'flower';
}

describe('International Mahjong Card 2026 — data integrity', () => {
    for (const section of internationalMahjongCard) {
        describe(section.name, () => {
            section.hands.forEach((hand, handIndex) => {
                hand.variants.forEach((variant, variantIndex) => {
                    const label = `hand #${handIndex + 1} variant ${variantIndex + 1}`;

                    it(`${label} sums to exactly 14 tiles`, () => {
                        const total = variant.groups.reduce((sum, g) => sum + g.size, 0);
                        expect(total).toBe(14);
                    });

                    it(`${label} is physically possible with a real tile set`, () => {
                        const counts = new Map<string, number>();
                        for (const t of buildTiles(variant)) {
                            const key = tileKey(t);
                            counts.set(key, (counts.get(key) ?? 0) + 1);
                        }
                        for (const [key, count] of counts) {
                            const limit = key === 'flower' ? 8 : 4;
                            expect(count, `${key} needs ${count} copies (max ${limit})`).toBeLessThanOrEqual(limit);
                        }
                    });

                    it(`${label} is recognized by the matcher`, () => {
                        const tiles = buildTiles(variant);
                        expect(matchVariant(tiles, variant)).toBe(true);
                    });
                });
            });
        });
    }
});
