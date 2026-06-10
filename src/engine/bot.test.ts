import { describe, it, expect } from 'vitest';
import { findBestTarget, decideBotDiscard, decideBotCall, decideBotCharlestonPass } from './bot';
import type { Player, Tile, Suit } from '../types/mahjong';

let nextId = 0;
const suit = (s: Suit, value: number): Tile =>
    ({ type: 'suit', suit: s, value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, id: `t${nextId++}` });
const joker = (): Tile => ({ type: 'joker', id: `t${nextId++}` });

const repeat = (n: number, make: () => Tile): Tile[] => Array.from({ length: n }, make);

const makeBot = (hand: Tile[], exposures: Tile[][] = []): Player =>
    ({ id: 'bot', name: 'Bot', isBot: true, hand, exposures });

// One tile away from Lucky Eights #1 (111 8888 111 8888 in two suits),
// holding one junk tile
const nearLuckyEights = () => {
    const junk = suit('dots', 3);
    const hand = [
        ...repeat(3, () => suit('bams', 1)),
        ...repeat(4, () => suit('bams', 8)),
        ...repeat(3, () => suit('craks', 1)),
        ...repeat(3, () => suit('craks', 8)),
        junk,
    ];
    return { hand, junk };
};

describe('card-aware bot', () => {
    it('finds a target hand that uses everything except junk', () => {
        const { hand, junk } = nearLuckyEights();
        const target = findBestTarget(hand);
        expect(target.score).toBe(13);
        expect(target.usedTileIds.has(junk.id)).toBe(false);
    });

    it('discards the tile that does not serve the target hand', () => {
        const { hand, junk } = nearLuckyEights();
        const bot = makeBot(hand);
        expect(decideBotDiscard(bot).id).toBe(junk.id);
    });

    it('never voluntarily discards a joker', () => {
        const { hand } = nearLuckyEights();
        const withJoker = [...hand.slice(0, 13), joker()];
        const bot = makeBot(withJoker);
        expect(decideBotDiscard(bot).type).not.toBe('joker');
    });

    it('calls a discard that completes a target group', () => {
        // 13 tiles needing one more 8 crak for Lucky Eights #1
        const hand = [
            ...repeat(3, () => suit('bams', 1)),
            ...repeat(4, () => suit('bams', 8)),
            ...repeat(3, () => suit('craks', 1)),
            ...repeat(2, () => suit('craks', 8)),
            suit('dots', 3),
        ];
        const bot = makeBot(hand);
        expect(decideBotCall(bot, suit('craks', 8))).toBe(true);
    });

    it('does not call without two natural matches', () => {
        const { hand } = nearLuckyEights();
        const bot = makeBot(hand.slice(0, 13));
        expect(decideBotCall(bot, suit('dots', 9))).toBe(false);
    });

    it('does not call a tile that does not advance the target', () => {
        // Two 9 dots in hand but the target hand is all 1s and 8s
        const hand = [
            ...repeat(3, () => suit('bams', 1)),
            ...repeat(4, () => suit('bams', 8)),
            ...repeat(3, () => suit('craks', 1)),
            ...repeat(3, () => suit('craks', 8)),
        ];
        // Re-target check: with only 13 tiles and 2 nines, calling a third 9
        // would still not beat the Lucky Eights fit
        const withNines = [...hand.slice(0, 11), suit('dots', 9), suit('dots', 9)];
        const bot = makeBot(withNines);
        const targetBefore = findBestTarget(withNines);
        const decision = decideBotCall(bot, suit('dots', 9));
        const targetAfter = findBestTarget([...withNines, suit('dots', 9)]);
        expect(decision).toBe(targetAfter.score > targetBefore.score);
    });

    it('passes junk first in the Charleston and never passes jokers', () => {
        const { hand, junk } = nearLuckyEights();
        const withJoker = [...hand.slice(0, 12), junk, joker()];
        const bot = makeBot(withJoker);
        const pass = decideBotCharlestonPass(bot, 3);
        expect(pass).toHaveLength(3);
        expect(pass.some(t => t.type === 'joker')).toBe(false);
        expect(pass.some(t => t.id === junk.id)).toBe(true);
    });

    it('counts exposures toward the target', () => {
        const exposure = repeat(3, () => suit('bams', 1));
        const hand = [
            ...repeat(4, () => suit('bams', 8)),
            ...repeat(3, () => suit('craks', 1)),
            ...repeat(3, () => suit('craks', 8)),
            suit('dots', 3),
        ];
        const bot = makeBot(hand, [exposure]);
        // With the exposed pung counted, the junk dot is still the discard
        expect(decideBotDiscard(bot).type).toBe('suit');
        expect((decideBotDiscard(bot) as Extract<Tile, { type: 'suit' }>).suit).toBe('dots');
    });
});
