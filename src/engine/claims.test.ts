import { describe, it, expect } from 'vitest';
import { resolveClaims, decideBotClaim, type Claim } from './calls';
import type { GameState, Player, Tile, Suit, Dragon } from '../types/mahjong';

// Unified claim arbitration (Phase 2): every seat's response to a discard is
// collected, then resolved with one rule — mahjong beats exposure, ties broken
// by seat proximity to the discarder. These cover the resolution logic and the
// bot's claim decision in isolation.

let nextId = 0;
const suit = (s: Suit, value: number): Tile =>
    ({ type: 'suit', suit: s, value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, id: `t${nextId++}` });
const dragon = (d: Dragon): Tile => ({ type: 'dragon', dragon: d, id: `t${nextId++}` });
const repeat = (n: number, make: () => Tile): Tile[] => Array.from({ length: n }, make);

const makePlayer = (index: number, hand: Tile[]): Player =>
    ({ id: `player-${index}`, name: `P${index}`, isBot: false, hand, exposures: [] });

// Discarder is seat 0; the given hands go to the other seats.
function callState(hands: Record<number, Tile[]>, discard: Tile): GameState {
    const players = [0, 1, 2, 3].map(i => makePlayer(i, hands[i] ?? [suit('dots', 9)]));
    return {
        wall: [suit('bams', 5)],
        discards: [discard],
        players,
        currentPlayerIndex: 0,
        eastPlayerIndex: 0,
        phase: 'call',
    };
}

describe('resolveClaims', () => {
    it('returns null when nobody claims (all passes)', () => {
        const state = callState({ 1: [suit('bams', 5), suit('bams', 5)] }, suit('craks', 3));
        const claims: Claim[] = [{ seat: 1, kind: 'pass' }, { seat: 2, kind: 'pass' }, { seat: 3, kind: 'pass' }];
        expect(resolveClaims(state, claims)).toBeNull();
    });

    it('ignores the discarder claiming their own tile', () => {
        const state = callState({ 0: [suit('craks', 3), suit('craks', 3)] }, suit('craks', 3));
        const claims: Claim[] = [{ seat: 0, kind: 'exposure', handTileIds: state.players[0].hand.map(t => t.id) }];
        expect(resolveClaims(state, claims)).toBeNull();
    });

    it('awards an exposure call and gives the caller the turn', () => {
        const hand = [suit('craks', 3), suit('craks', 3), suit('dots', 7)];
        const state = callState({ 2: hand }, suit('craks', 3));
        const claims: Claim[] = [
            { seat: 2, kind: 'exposure', handTileIds: [hand[0].id, hand[1].id] },
        ];
        const next = resolveClaims(state, claims)!;
        expect(next.phase).toBe('discard');
        expect(next.currentPlayerIndex).toBe(2);
        expect(next.players[2].exposures).toHaveLength(1);
        expect(next.discards).toHaveLength(0);
    });

    it('breaks exposure ties by seat proximity to the discarder', () => {
        // Seats 1 and 3 both can call the 5 bam; seat 1 (next after discarder 0) wins.
        const seat1 = [suit('bams', 5), suit('bams', 5), suit('dots', 1)];
        const seat3 = [suit('bams', 5), suit('bams', 5), suit('dots', 2)];
        const state = callState({ 1: seat1, 3: seat3 }, suit('bams', 5));
        const claims: Claim[] = [
            { seat: 3, kind: 'exposure', handTileIds: [seat3[0].id, seat3[1].id] },
            { seat: 1, kind: 'exposure', handTileIds: [seat1[0].id, seat1[1].id] },
        ];
        const next = resolveClaims(state, claims)!;
        expect(next.currentPlayerIndex).toBe(1);
    });

    it('lets a mahjong claim beat an exposure claim regardless of seat order', () => {
        // Seat 1 can expose; seat 3 can complete a mahjong on the same discard.
        const exposer = [suit('bams', 5), suit('bams', 5), suit('dots', 1)];
        // Year #2 (222 000 2222 6666) minus one 6 dot — completes on a 6 dot.
        const winner = [
            ...repeat(3, () => suit('bams', 2)),
            ...repeat(3, () => dragon('white')),
            ...repeat(4, () => suit('craks', 2)),
            ...repeat(3, () => suit('dots', 6)),
        ];
        const state = callState({ 1: exposer, 3: winner }, suit('dots', 6));
        const claims: Claim[] = [
            { seat: 1, kind: 'exposure', handTileIds: [exposer[0].id, exposer[1].id] },
            { seat: 3, kind: 'mahjong' },
        ];
        const next = resolveClaims(state, claims)!;
        expect(next.phase).toBe('end');
        expect(next.winner).toMatchObject({ playerIndex: 3 });
        expect(next.players[3].hand).toHaveLength(14);
    });

    it('discards a forged exposure claim whose tiles do not match', () => {
        const hand = [suit('craks', 4), suit('craks', 4)];
        const state = callState({ 2: hand }, suit('craks', 3)); // 4s can't claim a 3
        const claims: Claim[] = [
            { seat: 2, kind: 'exposure', handTileIds: hand.map(t => t.id) },
        ];
        expect(resolveClaims(state, claims)).toBeNull();
    });

    it('ignores a mahjong claim that is not actually a win', () => {
        const state = callState({ 1: [suit('bams', 1), suit('bams', 2)] }, suit('craks', 3));
        const claims: Claim[] = [{ seat: 1, kind: 'mahjong' }];
        expect(resolveClaims(state, claims)).toBeNull();
    });
});

describe('decideBotClaim', () => {
    it('passes when the discarder is the bot itself', () => {
        const state = callState({}, suit('craks', 3));
        expect(decideBotClaim(state, 0)).toEqual({ seat: 0, kind: 'pass' });
    });

    it('claims a mahjong when the discard completes the hand', () => {
        const botHand = [
            ...repeat(3, () => suit('bams', 2)),
            ...repeat(3, () => dragon('white')),
            ...repeat(4, () => suit('craks', 2)),
            ...repeat(3, () => suit('dots', 6)),
        ];
        const state = callState({ 1: botHand }, suit('dots', 6));
        expect(decideBotClaim(state, 1)).toEqual({ seat: 1, kind: 'mahjong' });
    });

    it('passes a discard that does not advance the target', () => {
        const state = callState({ 1: [suit('bams', 1), suit('craks', 2)] }, suit('dots', 5));
        expect(decideBotClaim(state, 1)).toEqual({ seat: 1, kind: 'pass' });
    });
});
