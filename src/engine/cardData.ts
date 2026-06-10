// International Mahjong Card 2026 — Year of the Horse
// 51 winning hands across 9 sections.
//
// Each hand carries two representations kept side by side:
//   - segments: the colored pattern text shown in the reference panel
//     ('a'/'b'/'c' = suit variables, 'n' = neutral/suitless)
//   - variants: machine-readable specs the rules engine validates against
//     (see handMatcher.ts for the schema and matching algorithm)
//
// NOTE: A few hands as originally printed did not sum to 14 tiles or were
// physically impossible with a real tile set; they have been corrected
// minimally to match their descriptions. Corrections are marked [corrected].

import type { GroupSpec, HandVariant, SuitVar, TileSpec } from './handMatcher';

export type SuitColor = 'a' | 'b' | 'c' | 'n';

export interface PatternSegment {
    text: string;
    suit: SuitColor;
}

export interface CardHand {
    segments: PatternSegment[];
    description: string;
    points: number;
    variants: HandVariant[];
}

export interface CardSection {
    name: string;
    hands: CardHand[];
}

// --- Builders -------------------------------------------------------------

const S = (text: string, suit: SuitColor): PatternSegment => ({ text, suit });

const G = (size: number, tile: TileSpec): GroupSpec => ({ size, tile });
const num = (size: number, lit: number, suit: SuitVar): GroupSpec => G(size, { t: 'num', v: { lit }, suit });
const run = (size: number, off: number, suit: SuitVar): GroupSpec => G(size, { t: 'num', v: { off }, suit });
const drg = (size: number, suit: SuitVar | 'any'): GroupSpec => G(size, { t: 'dragon', suit });
const soap = (size: number): GroupSpec => G(size, { t: 'soap' });
const wnd = (size: number, wind: 'N' | 'E' | 'W' | 'S' | 'any'): GroupSpec => G(size, { t: 'wind', wind });
const flo = (size: number): GroupSpec => G(size, { t: 'flower' });

const NEWS: GroupSpec[] = [wnd(1, 'N'), wnd(1, 'E'), wnd(1, 'W'), wnd(1, 'S')];
const singles = (values: number[], suit: SuitVar): GroupSpec[] => values.map(v => num(1, v, suit));
const runSingles = (offs: number[], suit: SuitVar): GroupSpec[] => offs.map(o => run(1, o, suit));

const V = (groups: GroupSpec[], base?: 'even' | 'odd'): HandVariant => ({ groups, base });

// "2026" in a year hand: 2 in one suit, soap as 0, 2 in another, 6 in a third
const year2026 = (a: SuitVar, b: SuitVar, c: SuitVar): GroupSpec[] =>
    [num(1, 2, a), soap(1), num(1, 2, b), num(1, 6, c)];

// --- The card --------------------------------------------------------------

export const internationalMahjongCard: CardSection[] = [
    {
        name: 'Year of the Horse 2026',
        hands: [
            {
                segments: [S('NEWS', 'n'), S(' 2', 'a'), S('0', 'n'), S('2', 'b'), S('6', 'c'), S(' DDD', 'a'), S(' DDD', 'b')],
                description: 'Any 3 suits', points: 50,
                variants: [V([...NEWS, ...year2026('A', 'B', 'C'), drg(3, 'A'), drg(3, 'B')])],
            },
            {
                segments: [S('222', 'a'), S(' 000', 'n'), S(' 2222', 'b'), S(' 6666', 'c')],
                description: 'Any 3 suits', points: 50,
                variants: [V([num(3, 2, 'A'), soap(3), num(4, 2, 'B'), num(4, 6, 'C')])],
            },
            {
                segments: [S('FFFF', 'n'), S(' 22', 'a'), S(' 0000', 'n'), S(' 22', 'a'), S(' 66', 'b')],
                description: 'Any 2 suits, pairs of 2\'s same suit', points: 50,
                variants: [V([flo(4), num(2, 2, 'A'), soap(4), num(2, 2, 'A'), num(2, 6, 'B')])],
            },
            {
                segments: [S('222', 'a'), S(' 00', 'n'), S(' 222', 'b'), S(' 66', 'a'), S(' 66', 'b'), S(' 66', 'c')],
                description: 'Any 3 suits', points: 50,
                variants: [V([num(3, 2, 'A'), soap(2), num(3, 2, 'B'), num(2, 6, 'A'), num(2, 6, 'B'), num(2, 6, 'C')])],
            },
            {
                segments: [S('FF', 'n'), S(' 2', 'a'), S('0', 'n'), S('2', 'a'), S('6', 'a'), S(' FF', 'n'), S(' DDD', 'b'), S(' DDD', 'c')],
                description: 'Any 3 suits', points: 75,
                variants: [V([flo(2), ...year2026('A', 'A', 'A'), flo(2), drg(3, 'B'), drg(3, 'C')])],
            },
            {
                segments: [S('NEWS', 'n'), S(' 2', 'a'), S('0', 'n'), S('2', 'b'), S('6', 'c'), S(' 2', 'a'), S('0', 'n'), S('2', 'b'), S('6', 'c'), S(' DD', 'a')],
                description: 'Any 3 suits', points: 100,
                variants: [V([...NEWS, ...year2026('A', 'B', 'C'), ...year2026('A', 'B', 'C'), drg(2, 'A')])],
            },
        ]
    },
    {
        name: 'Pungs & Chows',
        hands: [
            {
                segments: [S('FF', 'n'), S(' 222', 'a'), S(' 222', 'b'), S(' 222', 'c'), S(' DDD', 'a')],
                description: 'Any 3 suits, pungs any same even no., any dragon', points: 50,
                variants: [V([flo(2), run(3, 0, 'A'), run(3, 0, 'B'), run(3, 0, 'C'), drg(3, 'any')], 'even')],
            },
            {
                segments: [S('111', 'a'), S(' 222', 'a'), S(' 333', 'b'), S(' 444', 'b'), S(' NN', 'n')],
                description: 'Any 2 suits, any 4 consec. nos, pair of any wind', points: 50,
                variants: [V([run(3, 0, 'A'), run(3, 1, 'A'), run(3, 2, 'B'), run(3, 3, 'B'), wnd(2, 'any')])],
            },
            {
                segments: [S('FF', 'n'), S(' 000', 'n'), S(' 123', 'a'), S(' 444', 'b'), S(' 567', 'c')],
                description: 'Any 7 consec. nos, any 3 suits', points: 75,
                variants: [V([flo(2), soap(3), ...runSingles([0, 1, 2], 'A'), run(3, 3, 'B'), ...runSingles([4, 5, 6], 'C')])],
            },
            {
                segments: [S('FFF', 'n'), S(' 123', 'a'), S(' 456', 'b'), S(' 789', 'c'), S(' NN', 'n')],
                description: 'Any 3 suits, pair of any wind', points: 75,
                variants: [V([flo(3), ...singles([1, 2, 3], 'A'), ...singles([4, 5, 6], 'B'), ...singles([7, 8, 9], 'C'), wnd(2, 'any')])],
            },
            {
                segments: [S('123', 'a'), S(' D', 'a'), S(' NEWS', 'n'), S(' 456', 'b'), S(' D', 'b'), S(' DD', 'c')],
                description: 'Any 3 suits, chows any 6 consec. nos, pair opp. dragons', points: 100,
                variants: [V([...runSingles([0, 1, 2], 'A'), drg(1, 'A'), ...NEWS, ...runSingles([3, 4, 5], 'B'), drg(1, 'B'), drg(2, 'C')])],
            },
        ]
    },
    {
        name: 'Flower Bouquet',
        hands: [
            {
                segments: [S('FFF', 'n'), S(' 1111', 'a'), S(' FFF', 'n'), S(' DD', 'b'), S(' DD', 'c')],
                description: 'Any 3 suits, kong any no., pairs opp. dragons', points: 50,
                variants: [V([flo(3), run(4, 0, 'A'), flo(3), drg(2, 'B'), drg(2, 'C')])],
            },
            {
                segments: [S('FFFF', 'n'), S(' 111', 'a'), S(' 2', 'b'), S('0', 'n'), S('2', 'b'), S('6', 'b'), S(' 999', 'c')],
                description: 'Any 3 suits', points: 50,
                variants: [V([flo(4), num(3, 1, 'A'), ...year2026('B', 'B', 'B'), num(3, 9, 'C')])],
            },
            {
                segments: [S('F', 'n'), S(' 22', 'a'), S(' F', 'n'), S(' 44', 'b'), S(' F', 'n'), S(' 66', 'c'), S(' F', 'n'), S(' 8888', 'a')],
                description: 'Any 3 suits, 2\'s and 8\'s same suit', points: 75,
                variants: [V([flo(1), num(2, 2, 'A'), flo(1), num(2, 4, 'B'), flo(1), num(2, 6, 'C'), flo(1), num(4, 8, 'A')])],
            },
            {
                segments: [S('FFF', 'n'), S(' 11', 'a'), S(' 2345678', 'a'), S(' 99', 'a')],
                description: 'Any 1 or 2 suits', points: 75,
                variants: [
                    V([flo(3), num(2, 1, 'A'), ...singles([2, 3, 4, 5, 6, 7, 8], 'A'), num(2, 9, 'A')]),
                    V([flo(3), num(2, 1, 'A'), ...singles([2, 3, 4, 5, 6, 7, 8], 'B'), num(2, 9, 'A')]),
                ],
            },
            {
                segments: [S('FF', 'n'), S(' 123456789', 'a'), S(' D', 'a'), S(' FF', 'n')],
                description: 'Any 1 suit, matching dragon', points: 100,
                variants: [V([flo(2), ...singles([1, 2, 3, 4, 5, 6, 7, 8, 9], 'A'), drg(1, 'A'), flo(2)])],
            },
        ]
    },
    {
        name: 'Consecutive Numbers',
        hands: [
            {
                segments: [S('1123', 'a'), S(' 1111', 'b'), S(' D', 'a'), S(' 1111', 'c'), S(' D', 'a')],
                description: 'Any 3 consec. nos, pair any no. in run, kongs match pair', points: 50,
                variants: [
                    V([run(2, 0, 'A'), run(1, 1, 'A'), run(1, 2, 'A'), run(4, 0, 'B'), drg(1, 'A'), run(4, 0, 'C'), drg(1, 'A')]),
                    V([run(2, 1, 'A'), run(1, 0, 'A'), run(1, 2, 'A'), run(4, 1, 'B'), drg(1, 'A'), run(4, 1, 'C'), drg(1, 'A')]),
                    V([run(2, 2, 'A'), run(1, 0, 'A'), run(1, 1, 'A'), run(4, 2, 'B'), drg(1, 'A'), run(4, 2, 'C'), drg(1, 'A')]),
                ],
            },
            {
                segments: [S('FFFF', 'n'), S(' 11', 'a'), S(' 222', 'b'), S(' 333', 'a'), S(' 44', 'b')],
                description: 'Any 2 suits, any 4 consec. nos', points: 50,
                variants: [V([flo(4), run(2, 0, 'A'), run(3, 1, 'B'), run(3, 2, 'A'), run(2, 3, 'B')])],
            },
            {
                segments: [S('11', 'a'), S(' 22', 'a'), S(' 333', 'a'), S('444', 'a'), S(' 5555', 'a')],
                description: 'Any 1 or 2 suits, any 5 consec. nos', points: 50,
                variants: [
                    V([run(2, 0, 'A'), run(2, 1, 'A'), run(3, 2, 'A'), run(3, 3, 'A'), run(4, 4, 'A')]),
                    V([run(2, 0, 'A'), run(2, 1, 'B'), run(3, 2, 'A'), run(3, 3, 'B'), run(4, 4, 'A')]),
                ],
            },
            {
                // [corrected] originally printed "112 112233 112233" (15 tiles)
                segments: [S('11', 'a'), S(' 112233', 'b'), S(' 112233', 'c')],
                description: 'Any 3 suits, any 3 consec. nos', points: 50,
                variants: [V([run(2, 0, 'A'), run(2, 0, 'B'), run(2, 1, 'B'), run(2, 2, 'B'), run(2, 0, 'C'), run(2, 1, 'C'), run(2, 2, 'C')])],
            },
            {
                segments: [S('111', 'a'), S(' 23', 'a'), S(' 44', 'a'), S(' 11', 'b'), S(' 23', 'b'), S(' 444', 'b')],
                description: 'Any 2 suits, any 4 consec. nos', points: 75,
                variants: [V([run(3, 0, 'A'), run(1, 1, 'A'), run(1, 2, 'A'), run(2, 3, 'A'), run(2, 0, 'B'), run(1, 1, 'B'), run(1, 2, 'B'), run(3, 3, 'B')])],
            },
            {
                segments: [S('NEWS', 'n'), S(' 11', 'a'), S(' 22', 'b'), S(' 33', 'a'), S(' 44', 'b'), S(' 55', 'a')],
                description: 'Any 2 suits, any 5 consec. nos', points: 100,
                variants: [V([...NEWS, run(2, 0, 'A'), run(2, 1, 'B'), run(2, 2, 'A'), run(2, 3, 'B'), run(2, 4, 'A')])],
            },
        ]
    },
    {
        name: 'Same Number',
        hands: [
            {
                segments: [S('FFFF', 'n'), S(' 111', 'a'), S(' DD', 'a'), S(' 111', 'b'), S(' DD', 'b')],
                description: 'Any 2 suits', points: 50,
                variants: [V([flo(4), run(3, 0, 'A'), drg(2, 'A'), run(3, 0, 'B'), drg(2, 'B')])],
            },
            {
                segments: [S('111', 'a'), S(' 1111', 'b'), S(' 111', 'c'), S(' NNNN', 'n')],
                description: 'Any 3 suits, any wind', points: 50,
                variants: [V([run(3, 0, 'A'), run(4, 0, 'B'), run(3, 0, 'C'), wnd(4, 'any')])],
            },
            {
                segments: [S('FFF', 'n'), S(' 1111', 'a'), S(' FFF', 'n'), S(' 1111', 'b')],
                description: 'Any 2 suits', points: 50,
                variants: [V([flo(3), run(4, 0, 'A'), flo(3), run(4, 0, 'B')])],
            },
            {
                // [corrected] originally printed "FF 11 FF FF NNNN" (12 tiles); second pair restored
                segments: [S('FF', 'n'), S(' 11', 'a'), S(' FF', 'n'), S(' 11', 'b'), S(' FF', 'n'), S(' NNNN', 'n')],
                description: 'Any 2 suits, pairs any same no., kong any wind', points: 75,
                variants: [V([flo(2), run(2, 0, 'A'), flo(2), run(2, 0, 'B'), flo(2), wnd(4, 'any')])],
            },
            {
                // [corrected] originally printed "FF 11 D 11 D 11 D 11 D" in one suit,
                // which needs 8 copies of one tile (impossible with 4 per tile)
                segments: [S('FFFF', 'n'), S(' 11', 'a'), S(' 11', 'b'), S(' 11', 'c'), S(' DDDD', 'n')],
                description: 'Any 3 suits, pairs any same no., kong any dragon', points: 100,
                variants: [V([flo(4), run(2, 0, 'A'), run(2, 0, 'B'), run(2, 0, 'C'), drg(4, 'any')])],
            },
        ]
    },
    {
        name: 'Windy Dragons',
        hands: [
            {
                segments: [S('NNN', 'n'), S(' EEE', 'n'), S(' WWW', 'n'), S(' SSS', 'n'), S(' 11', 'a')],
                description: '1 suit, pair any no.', points: 50,
                variants: [V([wnd(3, 'N'), wnd(3, 'E'), wnd(3, 'W'), wnd(3, 'S'), run(2, 0, 'A')])],
            },
            {
                segments: [S('FFFF', 'n'), S(' 1111', 'a'), S(' DDD', 'b'), S(' DDD', 'c')],
                description: 'Any 3 suits, any no., pungs opp. dragons', points: 50,
                variants: [V([flo(4), run(4, 0, 'A'), drg(3, 'B'), drg(3, 'C')])],
            },
            {
                segments: [S('EEE', 'n'), S(' WWW', 'n'), S(' 111', 'a'), S(' 111', 'b'), S(' DD', 'c')],
                description: 'Any 3 suits, any same odd no.', points: 50,
                variants: [V([wnd(3, 'E'), wnd(3, 'W'), run(3, 0, 'A'), run(3, 0, 'B'), drg(2, 'C')], 'odd')],
            },
            {
                segments: [S('NNN', 'n'), S(' SSS', 'n'), S(' 222', 'a'), S(' 222', 'b'), S(' DD', 'c')],
                description: 'Any 3 suits, any same even no.', points: 50,
                variants: [V([wnd(3, 'N'), wnd(3, 'S'), run(3, 0, 'A'), run(3, 0, 'B'), drg(2, 'C')], 'even')],
            },
            {
                segments: [S('NEWS', 'n'), S(' 1111', 'a'), S(' 2222', 'b'), S(' DD', 'a')],
                description: 'Any 2 suits, any 2 consec. nos', points: 50,
                variants: [V([...NEWS, run(4, 0, 'A'), run(4, 1, 'B'), drg(2, 'A')])],
            },
            {
                segments: [S('NN', 'n'), S(' EE', 'n'), S(' WW', 'n'), S(' SS', 'n'), S(' DDD', 'a'), S(' DDD', 'b')],
                description: 'Any 2 suits, pungs opp. dragons', points: 75,
                variants: [V([wnd(2, 'N'), wnd(2, 'E'), wnd(2, 'W'), wnd(2, 'S'), drg(3, 'A'), drg(3, 'B')])],
            },
            {
                segments: [S('NEWS', 'n'), S(' 123', 'a'), S(' NEWS', 'n'), S(' 456', 'b')],
                description: 'Any 2 suits', points: 100,
                variants: [V([...NEWS, ...runSingles([0, 1, 2], 'A'), ...NEWS, ...runSingles([3, 4, 5], 'B')])],
            },
        ]
    },
    {
        name: 'Evens',
        hands: [
            {
                segments: [S('222', 'a'), S(' 4444', 'a'), S(' 6666', 'b'), S(' 888', 'b')],
                description: 'Any 2 suits', points: 50,
                variants: [V([num(3, 2, 'A'), num(4, 4, 'A'), num(4, 6, 'B'), num(3, 8, 'B')])],
            },
            {
                segments: [S('FF', 'n'), S(' 222', 'a'), S(' 444', 'b'), S(' 666', 'c'), S(' 888', 'a')],
                description: 'Any 1 or 3 suits', points: 50,
                variants: [
                    V([flo(2), num(3, 2, 'A'), num(3, 4, 'B'), num(3, 6, 'C'), num(3, 8, 'A')]),
                    V([flo(2), num(3, 2, 'A'), num(3, 4, 'A'), num(3, 6, 'A'), num(3, 8, 'A')]),
                ],
            },
            {
                segments: [S('FFFF', 'n'), S(' 2222', 'a'), S(' 444', 'a'), S(' 66', 'a'), S(' 8', 'a')],
                description: 'Any 1 or 3 suits', points: 50,
                variants: [
                    V([flo(4), num(4, 2, 'A'), num(3, 4, 'A'), num(2, 6, 'A'), num(1, 8, 'A')]),
                    V([flo(4), num(4, 2, 'A'), num(3, 4, 'B'), num(2, 6, 'C'), num(1, 8, 'A')]),
                ],
            },
            {
                segments: [S('2222', 'a'), S(' NEWS', 'n'), S(' 222', 'b'), S(' 222', 'c')],
                description: 'Any 3 suits, any same even no.', points: 50,
                variants: [V([run(4, 0, 'A'), ...NEWS, run(3, 0, 'B'), run(3, 0, 'C')], 'even')],
            },
            {
                // [corrected] originally printed "FF 2468 DD 222" (11 tiles); second pung restored
                segments: [S('FF', 'n'), S(' 2468', 'a'), S(' DD', 'a'), S(' 222', 'b'), S(' 222', 'c')],
                description: 'Any 3 suits, pungs any same even no.', points: 75,
                variants: [V([flo(2), ...singles([2, 4, 6, 8], 'A'), drg(2, 'A'), run(3, 0, 'B'), run(3, 0, 'C')], 'even')],
            },
            {
                segments: [S('FF', 'n'), S(' 2468', 'a'), S(' 2468', 'b'), S(' 2468', 'c')],
                description: 'Any 3 suits', points: 100,
                variants: [V([flo(2), ...singles([2, 4, 6, 8], 'A'), ...singles([2, 4, 6, 8], 'B'), ...singles([2, 4, 6, 8], 'C')])],
            },
        ]
    },
    {
        name: 'Odds',
        hands: [
            {
                segments: [S('FF', 'n'), S(' 1', 'a'), S(' D', 'a'), S(' 333', 'b'), S(' 55', 'a'), S(' 777', 'c'), S(' 9', 'a'), S(' D', 'a')],
                description: 'Any 3 suits', points: 50,
                variants: [V([flo(2), num(1, 1, 'A'), drg(1, 'A'), num(3, 3, 'B'), num(2, 5, 'A'), num(3, 7, 'C'), num(1, 9, 'A'), drg(1, 'A')])],
            },
            {
                // [corrected] originally printed "1111 33 55 77 99999" (15 tiles); quint reduced to kong
                segments: [S('1111', 'a'), S(' 33', 'a'), S(' 55', 'a'), S(' 77', 'a'), S(' 9999', 'a')],
                description: 'Any 1 or 3 suits', points: 50,
                variants: [
                    V([num(4, 1, 'A'), num(2, 3, 'A'), num(2, 5, 'A'), num(2, 7, 'A'), num(4, 9, 'A')]),
                    V([num(4, 1, 'A'), num(2, 3, 'B'), num(2, 5, 'C'), num(2, 7, 'B'), num(4, 9, 'A')]),
                ],
            },
            {
                segments: [S('FFF', 'n'), S(' 1111', 'a'), S(' 3333', 'b'), S(' DDD', 'c')],
                description: 'Any 3 suits, kongs any odd consec. nos.', points: 50,
                variants: [V([flo(3), run(4, 0, 'A'), run(4, 2, 'B'), drg(3, 'C')], 'odd')],
            },
            {
                segments: [S('FFF', 'n'), S(' 111', 'a'), S(' 33', 'b'), S(' 55', 'a'), S(' 77', 'b'), S(' 99', 'a')],
                description: 'Any 3 suits', points: 75,
                variants: [V([flo(3), num(3, 1, 'A'), num(2, 3, 'B'), num(2, 5, 'A'), num(2, 7, 'B'), num(2, 9, 'A')])],
            },
            {
                segments: [S('11', 'a'), S(' 3', 'a'), S(' 5', 'a'), S(' 77', 'a'), S(' 11', 'b'), S(' 3', 'b'), S(' 5', 'b'), S(' 77', 'b'), S(' DD', 'c')],
                description: 'Any 3 suits', points: 100,
                variants: [V([num(2, 1, 'A'), num(1, 3, 'A'), num(1, 5, 'A'), num(2, 7, 'A'), num(2, 1, 'B'), num(1, 3, 'B'), num(1, 5, 'B'), num(2, 7, 'B'), drg(2, 'C')])],
            },
        ]
    },
    {
        name: 'Lucky Eights',
        hands: [
            {
                segments: [S('111', 'a'), S(' 8888', 'a'), S(' 111', 'b'), S(' 8888', 'b')],
                description: 'Any 2 suits', points: 50,
                variants: [V([num(3, 1, 'A'), num(4, 8, 'A'), num(3, 1, 'B'), num(4, 8, 'B')])],
            },
            {
                segments: [S('FF', 'n'), S(' 2222', 'a'), S(' + ', 'n'), S('6666', 'b'), S(' = ', 'n'), S('8888', 'c')],
                description: 'Any 3 suits', points: 50,
                variants: [V([flo(2), num(4, 2, 'A'), num(4, 6, 'B'), num(4, 8, 'C')])],
            },
            {
                segments: [S('FF', 'n'), S(' 3333', 'a'), S(' + ', 'n'), S('5555', 'b'), S(' = ', 'n'), S('8888', 'c')],
                description: 'Any 3 suits', points: 50,
                variants: [V([flo(2), num(4, 3, 'A'), num(4, 5, 'B'), num(4, 8, 'C')])],
            },
            {
                segments: [S('8888', 'a'), S(' DDD', 'a'), S(' 8888', 'b'), S(' DDD', 'b')],
                description: 'Any 2 suits, matching dragons', points: 50,
                variants: [V([num(4, 8, 'A'), drg(3, 'A'), num(4, 8, 'B'), drg(3, 'B')])],
            },
            {
                segments: [S('FF', 'n'), S(' 22', 'a'), S('+', 'n'), S('66', 'b'), S('−', 'n'), S('88', 'c'), S(' DDD', 'a'), S(' DDD', 'b')],
                description: 'Any 3 suits', points: 75,
                variants: [V([flo(2), num(2, 2, 'A'), num(2, 6, 'B'), num(2, 8, 'C'), drg(3, 'A'), drg(3, 'B')])],
            },
            {
                segments: [S('FF', 'n'), S(' 11', 'a'), S('+', 'n'), S('77', 'a'), S('−', 'n'), S('88', 'a'), S(' 22', 'b'), S('+', 'n'), S('66', 'b'), S('−', 'n'), S('88', 'b')],
                description: 'Any 2 suits', points: 100,
                variants: [V([flo(2), num(2, 1, 'A'), num(2, 7, 'A'), num(2, 8, 'A'), num(2, 2, 'B'), num(2, 6, 'B'), num(2, 8, 'B')])],
            },
        ]
    },
];
