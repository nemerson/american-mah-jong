import type { Tile, Suit } from '../types/mahjong';

// ---------------------------------------------------------------------------
// Hand specification schema
//
// Each winning hand on the card is encoded as one or more HandVariants.
// A variant is a list of tile groups whose suits are *variables* (A/B/C,
// bound to distinct real suits when matching) and whose numbers are either
// literal or relative to a base value (for "any consecutive numbers" /
// "any same even number" style hands).
// ---------------------------------------------------------------------------

export type SuitVar = 'A' | 'B' | 'C';

export type ValueSpec =
    | { lit: number }   // exact printed number
    | { off: number };  // base + offset, base enumerated at match time

export type TileSpec =
    | { t: 'num'; v: ValueSpec; suit: SuitVar }
    | { t: 'dragon'; suit: SuitVar | 'any' }  // dragon color tied to suit binding
    | { t: 'soap' }                            // white dragon used as zero
    | { t: 'wind'; wind: 'N' | 'E' | 'W' | 'S' | 'any' }
    | { t: 'flower' };

export interface GroupSpec {
    size: number; // 1-5; jokers allowed only in groups of 3+
    tile: TileSpec;
}

export interface HandVariant {
    groups: GroupSpec[];
    base?: 'any' | 'even' | 'odd'; // candidate bases for { off } values (default 'any')
}

export interface WinResult {
    section: string;
    handNumber: number; // 1-based position within the section, as printed
    description: string;
    points: number;
}

// American mahjong convention: each dragon "belongs" to a suit
const DRAGON_FOR_SUIT: Record<Suit, string> = {
    bams: 'green',
    craks: 'red',
    dots: 'white',
};

const WIND_NAME: Record<'N' | 'E' | 'W' | 'S', string> = {
    N: 'north', E: 'east', W: 'west', S: 'south',
};

const ALL_SUITS: Suit[] = ['bams', 'craks', 'dots'];

function tileKey(t: Tile): string {
    switch (t.type) {
        case 'suit': return `suit_${t.suit}_${t.value}`;
        case 'wind': return `wind_${t.wind}`;
        case 'dragon': return `dragon_${t.dragon}`;
        case 'flower': return 'flower'; // all flowers are interchangeable
        default: return 'unknown';
    }
}

interface ConcreteGroup {
    key: string;
    size: number;
}

function baseCandidates(variant: HandVariant): number[] {
    const offs = variant.groups
        .map(g => g.tile)
        .filter((t): t is Extract<TileSpec, { t: 'num' }> => t.t === 'num')
        .map(t => t.v)
        .filter((v): v is { off: number } => 'off' in v)
        .map(v => v.off);

    if (offs.length === 0) return [0]; // no variable numbers; single dummy pass

    const maxOff = Math.max(...offs);
    const parity = variant.base ?? 'any';
    const bases: number[] = [];
    for (let b = 1; b + maxOff <= 9; b++) {
        if (parity === 'even' && b % 2 !== 0) continue;
        if (parity === 'odd' && b % 2 !== 1) continue;
        bases.push(b);
    }
    return bases;
}

function suitsUsed(variant: HandVariant): SuitVar[] {
    const used = new Set<SuitVar>();
    for (const g of variant.groups) {
        const t = g.tile;
        if (t.t === 'num') used.add(t.suit);
        if (t.t === 'dragon' && t.suit !== 'any') used.add(t.suit);
    }
    return Array.from(used);
}

// All injective mappings of the used suit variables onto real suits
function suitBindings(vars: SuitVar[]): Array<Map<SuitVar, Suit>> {
    if (vars.length === 0) return [new Map()];
    const results: Array<Map<SuitVar, Suit>> = [];
    const assign = (i: number, taken: Set<Suit>, current: Map<SuitVar, Suit>) => {
        if (i === vars.length) {
            results.push(new Map(current));
            return;
        }
        for (const s of ALL_SUITS) {
            if (taken.has(s)) continue;
            taken.add(s);
            current.set(vars[i], s);
            assign(i + 1, taken, current);
            taken.delete(s);
        }
    };
    assign(0, new Set(), new Map());
    return results;
}

/**
 * Resolve the variant's groups to concrete tile keys given a suit binding and
 * base number. Groups with 'any' wind/dragon are expanded recursively (each
 * such group independently picks one of its options). Calls cb for each
 * complete concretization; returns true as soon as cb returns true.
 */
function forEachConcretization(
    groups: GroupSpec[],
    binding: Map<SuitVar, Suit>,
    base: number,
    cb: (concrete: ConcreteGroup[]) => boolean,
): boolean {
    const resolved: ConcreteGroup[] = [];

    const resolve = (i: number): boolean => {
        if (i === groups.length) {
            return cb(resolved.slice());
        }
        const g = groups[i];
        const t = g.tile;

        const push = (key: string): boolean => {
            resolved.push({ key, size: g.size });
            const ok = resolve(i + 1);
            resolved.pop();
            return ok;
        };

        switch (t.t) {
            case 'num': {
                const value = 'lit' in t.v ? t.v.lit : base + t.v.off;
                if (value < 1 || value > 9) return false; // invalid binding
                return push(`suit_${binding.get(t.suit)}_${value}`);
            }
            case 'soap':
                return push('dragon_white');
            case 'dragon': {
                if (t.suit === 'any') {
                    for (const s of ALL_SUITS) {
                        if (push(`dragon_${DRAGON_FOR_SUIT[s]}`)) return true;
                    }
                    return false;
                }
                return push(`dragon_${DRAGON_FOR_SUIT[binding.get(t.suit)!]}`);
            }
            case 'wind': {
                if (t.wind === 'any') {
                    for (const w of ['north', 'east', 'west', 'south']) {
                        if (push(`wind_${w}`)) return true;
                    }
                    return false;
                }
                return push(`wind_${WIND_NAME[t.wind]}`);
            }
            case 'flower':
                return push('flower');
        }
    };

    return resolve(0);
}

/**
 * Try to allocate the available natural tiles + jokers to the concrete
 * groups. Joker rules: groups of 1-2 must be entirely natural; groups of 3+
 * may use jokers but need at least one natural tile.
 */
function allocate(groups: ConcreteGroup[], counts: Map<string, number>, jokers: number): boolean {
    // Largest groups first prunes the search faster
    const sorted = [...groups].sort((a, b) => b.size - a.size);

    const solve = (i: number, jokersLeft: number): boolean => {
        if (i === sorted.length) {
            return jokersLeft === 0; // every tile in the hand must be used
        }
        const g = sorted[i];
        const avail = counts.get(g.key) ?? 0;

        if (g.size <= 2) {
            // Singles and pairs: naturals only
            if (avail < g.size) return false;
            counts.set(g.key, avail - g.size);
            if (solve(i + 1, jokersLeft)) return true;
            counts.set(g.key, avail);
            return false;
        }

        // Pungs/kongs/quints: jokers may fill in, but at least 1 natural
        const maxNaturals = Math.min(avail, g.size);
        for (let n = maxNaturals; n >= 1; n--) {
            const jokersNeeded = g.size - n;
            if (jokersNeeded > jokersLeft) continue;
            counts.set(g.key, avail - n);
            if (solve(i + 1, jokersLeft - jokersNeeded)) return true;
            counts.set(g.key, avail);
        }
        return false;
    };

    return solve(0, jokers);
}

/** Check 14 tiles against a single hand variant. */
export function matchVariant(tiles: Tile[], variant: HandVariant): boolean {
    const total = variant.groups.reduce((sum, g) => sum + g.size, 0);
    if (tiles.length !== total) return false;

    const counts = new Map<string, number>();
    let jokers = 0;
    for (const t of tiles) {
        if (t.type === 'joker') {
            jokers++;
        } else {
            const key = tileKey(t);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    for (const binding of suitBindings(suitsUsed(variant))) {
        for (const base of baseCandidates(variant)) {
            const found = forEachConcretization(variant.groups, binding, base, concrete =>
                allocate(concrete, counts, jokers)
            );
            if (found) return true;
        }
    }
    return false;
}
