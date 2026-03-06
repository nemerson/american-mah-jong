import type { Tile, Player } from '../types/mahjong';

// American Mah Jong has very specific hands based on an annual card.
// Doing full real-world validation would require encoding the entire 2024/2025 NMJL card.
// For this MVP, we will define a simplified generic win condition:
// A valid Mah Jong is 14 tiles (incl. exposures) forming either:
// - 4 Pungs (3 of a kind) + 1 Pair
// - 1 Quint (5 of a kind), 1 Kong (4), 1 Pung (3), 1 Pair (2) (Sum = 14)
// Jokers can substitute for any tile in a Pung/Kong/Quint, but never in a Pair.

export function canCallTile(player: Player, discard: Tile): boolean {
    // Basic validation: Can we make an exposure (Pung, Kong, Quint) with this discard?
    // Exclude jokers from being called themselves
    if (discard.type === 'joker') return false;

    // Count how many matching tiles the player has in hand
    let matchCount = 0;
    for (const t of player.hand) {
        if (t.type === discard.type) {
            if (t.type === 'suit' && discard.type === 'suit' && t.suit === discard.suit && t.value === discard.value) {
                matchCount++;
            } else if (t.type === 'wind' && discard.type === 'wind' && t.wind === discard.wind) {
                matchCount++;
            } else if (t.type === 'dragon' && discard.type === 'dragon' && t.dragon === discard.dragon) {
                matchCount++;
            } else if (t.type === 'flower' && discard.type === 'flower') {
                // Flowers usually match any other flower in basic play styles
                matchCount++;
            }
        }
    }

    const jokerCount = player.hand.filter(t => t.type === 'joker').length;

    // Can call for a Pung (needs 2 matches + discard = 3)
    // At least 1 natural match is required (can't call with 2 jokers)
    if (matchCount >= 2 || (matchCount >= 1 && jokerCount >= 1)) {
        return true;
    }

    return false;
}

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

// Check against MVP generalized rules
export function checkMahJong(player: Player, discard?: Tile): boolean {
    const allTiles = [...player.hand];
    if (discard) allTiles.push(discard);
    for (const exp of player.exposures) {
        allTiles.push(...exp);
    }

    if (allTiles.length !== 14) return false;

    const { counts, jokers } = countTiles(allTiles);

    const standardPattern = [4, 3, 3, 2, 2];
    const quintPattern = [5, 4, 3, 2];
    const pairsPattern = [2, 2, 2, 2, 2, 2, 2];

    if (checkPattern(new Map(counts), jokers, standardPattern)) return true;
    if (checkPattern(new Map(counts), jokers, quintPattern)) return true;
    if (jokers === 0 && checkPattern(new Map(counts), 0, pairsPattern)) return true;

    return false;
}
