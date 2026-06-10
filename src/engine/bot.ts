import type { Player, Tile } from '../types/mahjong';
import { getTileKey } from './rules';
import { scoreVariantFit } from './handMatcher';
import { internationalMahjongCard } from './cardData';

// Card-aware bot: every decision starts from the card hand the bot's tiles
// fit best, then keeps tiles that contribute and sheds tiles that don't.

export interface BotTarget {
    score: number;            // tiles already contributing toward the target
    points: number;           // the target hand's value (tie-breaker)
    usedTileIds: Set<string>; // which tiles contribute
}

/** The card hand these tiles are closest to completing. */
export function findBestTarget(tiles: Tile[]): BotTarget {
    let best: BotTarget = { score: -1, points: 0, usedTileIds: new Set() };
    for (const section of internationalMahjongCard) {
        for (const hand of section.hands) {
            for (const variant of hand.variants) {
                const fit = scoreVariantFit(tiles, variant);
                if (fit.score > best.score || (fit.score === best.score && hand.points > best.points)) {
                    best = { score: fit.score, points: hand.points, usedTileIds: new Set(fit.usedTileIds) };
                }
            }
        }
    }
    return best;
}

// Exposed tiles are committed to the hand, so they count toward the target
const committedTiles = (bot: Player): Tile[] => [...bot.hand, ...bot.exposures.flat()];

export function decideBotDiscard(bot: Player): Tile {
    const target = findBestTarget(committedTiles(bot));
    const unused = bot.hand.filter(t => t.type !== 'joker' && !target.usedTileIds.has(t.id));
    if (unused.length > 0) return unused[0];

    // Every tile contributes; give up a random natural rather than a joker
    const nonJokers = bot.hand.filter(t => t.type !== 'joker');
    if (nonJokers.length > 0) {
        return nonJokers[Math.floor(Math.random() * nonJokers.length)];
    }
    return bot.hand[0];
}

export function decideBotCall(bot: Player, discard: Tile): boolean {
    if (discard.type === 'joker') return false;

    // Two natural matches required: the bot never spends a joker on a call
    const key = getTileKey(discard);
    const naturalMatches = bot.hand.filter(t => t.type !== 'joker' && getTileKey(t) === key).length;
    if (naturalMatches < 2) return false;

    // Only call when the tile actually advances the target hand
    const tiles = committedTiles(bot);
    const without = findBestTarget(tiles);
    const withTile = findBestTarget([...tiles, discard]);
    return withTile.score > without.score;
}

export function decideBotCharlestonPass(bot: Player, count: number): Tile[] {
    if (count === 0) return [];

    // Pass tiles that do not serve the target hand; jokers may never be
    // passed in the Charleston
    const target = findBestTarget(bot.hand);
    const nonJokers = bot.hand.filter(t => t.type !== 'joker');
    const unused = nonJokers.filter(t => !target.usedTileIds.has(t.id));
    const contributing = nonJokers.filter(t => target.usedTileIds.has(t.id));
    return [...unused, ...contributing].slice(0, count);
}
