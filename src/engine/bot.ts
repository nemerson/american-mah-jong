import type { Player, Tile } from '../types/mahjong';
import { getTileKey } from './rules';

// Very basic bot that prioritizes keeping pairs/pungs and discards generic tiles
export function decideBotDiscard(bot: Player): Tile {
    const hand = bot.hand;

    // Group tiles by type and value
    const counts = new Map<string, number>();
    for (const t of hand) {
        if (t.type === 'joker') continue; // never discard joker voluntarily if we don't have to

        let key = t.type;
        if (t.type === 'suit') key += `-${t.suit}-${t.value}`;
        if (t.type === 'wind') key += `-${t.wind}`;
        if (t.type === 'dragon') key += `-${t.dragon}`;
        if (t.type === 'flower') key += `-flower`;

        counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Find a tile with count 1 (a singleton) to discard
    // Simplification: just discard the first singleton found
    for (const t of hand) {
        if (t.type === 'joker') continue;

        let key = t.type;
        if (t.type === 'suit') key += `-${t.suit}-${t.value}`;
        if (t.type === 'wind') key += `-${t.wind}`;
        if (t.type === 'dragon') key += `-${t.dragon}`;
        if (t.type === 'flower') key += `-flower`;

        if (counts.get(key) === 1) {
            return t;
        }
    }

    // If no singletons (everything is paired or pung'd, unlikely early, but possible), just discard anything (except joker)
    const nonJokers = hand.filter(t => t.type !== 'joker');
    if (nonJokers.length > 0) {
        return nonJokers[Math.floor(Math.random() * nonJokers.length)];
    }

    // Absolute fallback
    return hand[0];
}

export function decideBotCall(bot: Player, discard: Tile): boolean {
    // Only call with two natural matches in hand (a real pung) — the bot
    // never spends a joker on a call
    if (discard.type === 'joker') return false;
    const key = getTileKey(discard);
    const matches = bot.hand.filter(t => t.type !== 'joker' && getTileKey(t) === key).length;
    return matches >= 2;
}

export function decideBotCharlestonPass(bot: Player, count: number): Tile[] {
    // Very naive bot: pick `count` tiles that are singletons, or random non-jokers
    const hand = bot.hand;
    const nonJokers = hand.filter(t => t.type !== 'joker');

    // Simplification: Just take the first 3 non-jokers for now. 
    // A real bot would prioritize single winds/dragons and off-suit tiles.
    return nonJokers.slice(0, count);
}
