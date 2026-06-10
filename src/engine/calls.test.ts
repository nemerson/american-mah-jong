import { describe, it, expect } from 'vitest';
import { callDiscard, defaultCallTiles, exchangeJoker, findExposedJokers, isValidExposure, resolveBotClaims } from './calls';
import type { GameState, Player, Tile, Suit, Dragon } from '../types/mahjong';

let nextId = 0;
const suit = (s: Suit, value: number): Tile =>
    ({ type: 'suit', suit: s, value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, id: `t${nextId++}` });
const dragon = (d: Dragon): Tile => ({ type: 'dragon', dragon: d, id: `t${nextId++}` });
const joker = (): Tile => ({ type: 'joker', id: `t${nextId++}` });
const repeat = (n: number, make: () => Tile): Tile[] => Array.from({ length: n }, make);

const makePlayer = (index: number, hand: Tile[]): Player =>
    ({ id: `player-${index}`, name: `P${index}`, isBot: index !== 0, hand, exposures: [] });

function makeCallState(discarderIndex: number, callerHand: Tile[], discard: Tile): GameState {
    const players = [0, 1, 2, 3].map(i => makePlayer(i, i === 0 ? callerHand : [suit('dots', 9)]));
    return {
        wall: [suit('bams', 5)],
        discards: [discard],
        players,
        currentPlayerIndex: discarderIndex,
        eastPlayerIndex: 0,
        phase: 'call',
    };
}

describe('calling discards', () => {
    it('validates exposures: 3-5 matching tiles, jokers allowed, no joker claims', () => {
        const five = suit('bams', 5);
        expect(isValidExposure(five, [suit('bams', 5), suit('bams', 5)])).toBe(true);
        expect(isValidExposure(five, [suit('bams', 5), joker()])).toBe(true);
        expect(isValidExposure(five, [suit('bams', 5)])).toBe(false); // only 2 total
        expect(isValidExposure(five, [suit('bams', 6), suit('bams', 5)])).toBe(false); // mismatch
        expect(isValidExposure(joker(), [suit('bams', 5), suit('bams', 5)])).toBe(false);
    });

    it('builds default call tiles from naturals, topping up with a joker only when needed', () => {
        const five = suit('bams', 5);
        const twoNaturals = makePlayer(0, [suit('bams', 5), suit('bams', 5), joker(), suit('dots', 1)]);
        expect(defaultCallTiles(twoNaturals, five)!.every(t => t.type !== 'joker')).toBe(true);

        const oneNatural = makePlayer(0, [suit('bams', 5), joker(), suit('dots', 1)]);
        const tiles = defaultCallTiles(oneNatural, five)!;
        expect(tiles).toHaveLength(2);
        expect(tiles.some(t => t.type === 'joker')).toBe(true);

        const noNaturals = makePlayer(0, [joker(), joker(), suit('dots', 1)]);
        expect(defaultCallTiles(noNaturals, five)).toBeNull();
    });

    it('moves the discard and hand tiles into a new exposure and gives the caller the turn', () => {
        const discard = suit('craks', 3);
        const hand = [suit('craks', 3), suit('craks', 3), suit('dots', 7)];
        const state = makeCallState(2, hand, discard);

        const next = callDiscard(state, 0, [hand[0].id, hand[1].id]);

        expect(next.discards).toHaveLength(0);
        expect(next.players[0].hand).toHaveLength(1);
        expect(next.players[0].exposures).toHaveLength(1);
        expect(next.players[0].exposures[0]).toHaveLength(3);
        expect(next.currentPlayerIndex).toBe(0);
        expect(next.phase).toBe('discard');
    });

    it('rejects calling your own discard', () => {
        const discard = suit('craks', 3);
        const hand = [suit('craks', 3), suit('craks', 3)];
        const state = makeCallState(0, hand, discard); // human is the discarder

        expect(() => callDiscard(state, 0, hand.map(t => t.id))).toThrow();
    });

    it('rejects tiles that do not match the discard', () => {
        const discard = suit('craks', 3);
        const hand = [suit('craks', 4), suit('craks', 4)];
        const state = makeCallState(1, hand, discard);

        expect(() => callDiscard(state, 0, hand.map(t => t.id))).toThrow();
    });
});

describe('resolveBotClaims', () => {
    function makeState(botHand: Tile[], discard: Tile): GameState {
        return {
            wall: [suit('bams', 5)],
            discards: [discard],
            players: [
                makePlayer(0, [suit('dots', 9)]),
                makePlayer(1, botHand),
                makePlayer(2, [suit('dots', 9)]),
                makePlayer(3, [suit('dots', 9)]),
            ],
            currentPlayerIndex: 0, // human discarded
            eastPlayerIndex: 0,
            phase: 'call',
        };
    }

    it('returns null when no bot wants the discard', () => {
        const state = makeState([suit('bams', 1), suit('craks', 2)], suit('dots', 5));
        expect(resolveBotClaims(state)).toBeNull();
    });

    it('lets a bot claim a discard that advances its target hand', () => {
        // One 8 crak short of Lucky Eights #1
        const botHand = [
            ...repeat(3, () => suit('bams', 1)),
            ...repeat(4, () => suit('bams', 8)),
            ...repeat(3, () => suit('craks', 1)),
            ...repeat(2, () => suit('craks', 8)),
            suit('dots', 3),
        ];
        const next = resolveBotClaims(makeState(botHand, suit('craks', 8)));
        expect(next).not.toBeNull();
        expect(next!.players[1].exposures).toHaveLength(1);
        expect(next!.currentPlayerIndex).toBe(1);
        expect(next!.phase).toBe('discard');
    });

    it('lets a bot claim a discard for mahjong, which ends the game', () => {
        // Year #2 (222 000 2222 6666) minus one 6 dot
        const botHand = [
            ...repeat(3, () => suit('bams', 2)),
            ...repeat(3, () => dragon('white')),
            ...repeat(4, () => suit('craks', 2)),
            ...repeat(3, () => suit('dots', 6)),
        ];
        const next = resolveBotClaims(makeState(botHand, suit('dots', 6)));
        expect(next).not.toBeNull();
        expect(next!.phase).toBe('end');
        expect(next!.winner).toMatchObject({ playerIndex: 1, points: 50 });
        expect(next!.players[1].hand).toHaveLength(14);
    });
});

describe('joker exchange', () => {
    function makeExchangeState(): GameState {
        const exposedJoker = joker();
        const owner = makePlayer(1, [suit('dots', 9)]);
        owner.exposures = [[suit('bams', 5), suit('bams', 5), exposedJoker]];
        const human = makePlayer(0, [suit('bams', 5), suit('craks', 2)]);
        return {
            wall: [],
            discards: [],
            players: [human, owner, makePlayer(2, []), makePlayer(3, [])],
            currentPlayerIndex: 0,
            eastPlayerIndex: 0,
            phase: 'discard',
        };
    }

    it('finds exposed jokers with the kind they stand for', () => {
        const state = makeExchangeState();
        const found = findExposedJokers(state);
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ ownerIndex: 1, exposureIndex: 0, key: 'suit_bams_5' });
    });

    it('swaps a matching natural for the exposed joker', () => {
        const state = makeExchangeState();
        const matching = state.players[0].hand[0]; // 5 bams

        const next = exchangeJoker(state, 0, matching.id, 1, 0);

        expect(next.players[0].hand.some(t => t.type === 'joker')).toBe(true);
        expect(next.players[0].hand.some(t => t.id === matching.id)).toBe(false);
        const exposure = next.players[1].exposures[0];
        expect(exposure.some(t => t.type === 'joker')).toBe(false);
        expect(exposure.filter(t => t.type === 'suit' && t.value === 5)).toHaveLength(3);
    });

    it('rejects a tile that does not match the exposure', () => {
        const state = makeExchangeState();
        const nonMatching = state.players[0].hand[1]; // 2 craks

        expect(() => exchangeJoker(state, 0, nonMatching.id, 1, 0)).toThrow();
    });

    it('rejects exchanging into an exposure without a joker', () => {
        const state = makeExchangeState();
        state.players[1].exposures = [[suit('bams', 5), suit('bams', 5), suit('bams', 5)]];
        const matching = state.players[0].hand[0];

        expect(() => exchangeJoker(state, 0, matching.id, 1, 0)).toThrow();
    });
});
