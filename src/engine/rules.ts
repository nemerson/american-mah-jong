import type { Tile, Player } from '../types/mahjong';
import type { WinResult } from './handMatcher';
import { matchVariant } from './handMatcher';
import { internationalMahjongCard } from './cardData';

export type { WinResult } from './handMatcher';

export type TileCounts = {
    counts: Map<string, number>;
    jokers: number;
};

// Helper to uniquely identify a natural tile
export function getTileKey(t: Tile): string {
    if (t.type === 'suit') return `${t.type}_${t.suit}_${t.value}`;
    if (t.type === 'wind') return `${t.type}_${t.wind}`;
    if (t.type === 'dragon') return `${t.type}_${t.dragon}`;
    if (t.type === 'flower') return `flower`; // Treat all flowers as matching for MVPs
    return 'unknown';
}

export function countTiles(tiles: Tile[]): TileCounts {
    const counts = new Map<string, number>();
    let jokers = 0;

    for (const t of tiles) {
        if (t.type === 'joker') {
            jokers++;
        } else {
            const key = getTileKey(t);
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
    return { counts, jokers };
}

/**
 * Recursively attempts to satisfy an array of required group sizes (e.g., [4,3,3,2,2])
 * using available tile counts and jokers.
 */
export function checkPattern(counts: Map<string, number>, jokers: number, requiredGroups: number[]): boolean {
    if (requiredGroups.length === 0) {
        return true; // Successfully satisfied all groups
    }

    // Work on the largest requirement first for efficiency
    const targetSize = requiredGroups[0];
    const remainingGroups = requiredGroups.slice(1);

    // Try satisfying this requirement with each available natural tile type
    for (const [key, available] of Array.from(counts.entries())) {
        // Pairs MUST be completely natural (0 jokers allowed)
        if (targetSize === 2) {
            if (available >= 2) {
                // Try consuming 2 naturals for this pair
                counts.set(key, available - 2);
                if (checkPattern(counts, jokers, remainingGroups)) return true;
                // Backtrack
                counts.set(key, available);
            }
        } else {
            // Pungs(3), Kongs(4), Quints(5) can use jokers
            // Need at least 1 natural tile base (cannot be entirely jokers)
            if (available >= 1) {
                const maxUsableNaturals = Math.min(available, targetSize);

                // Try consuming different amounts of naturals (from max possible down to 1)
                for (let n = maxUsableNaturals; n >= 1; n--) {
                    const jokersNeeded = targetSize - n;
                    if (jokers >= jokersNeeded) {
                        counts.set(key, available - n);
                        if (checkPattern(counts, jokers - jokersNeeded, remainingGroups)) return true;
                        // Backtrack
                        counts.set(key, available);
                    }
                }
            }
        }
    }

    // If we tried all tiles and couldn't satisfy this group, this path is dead
    return false;
}

/**
 * Validate a full 14-tile hand (concealed tiles + exposures + an optional
 * just-discarded tile) against every hand on the card. Returns the first
 * matching card hand with its points, or null if nothing matches.
 */
export function checkMahJong(player: Player, discard?: Tile): WinResult | null {
    const allTiles = [...player.hand];
    if (discard) allTiles.push(discard);
    for (const exp of player.exposures) {
        allTiles.push(...exp);
    }

    if (allTiles.length !== 14) return null;

    for (const section of internationalMahjongCard) {
        for (let i = 0; i < section.hands.length; i++) {
            const hand = section.hands[i];
            for (const variant of hand.variants) {
                if (matchVariant(allTiles, variant)) {
                    return {
                        section: section.name,
                        handNumber: i + 1,
                        description: hand.description,
                        points: hand.points,
                    };
                }
            }
        }
    }
    return null;
}
