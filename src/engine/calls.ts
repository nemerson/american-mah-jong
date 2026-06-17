import type { GameState, Player, Tile } from '../types/mahjong';
import { getTileKey, checkMahJong } from './rules';
import { decideBotCall } from './bot';

// Calling a discard: the claimed tile plus matching tiles from the caller's
// hand form a face-up exposure (pung/kong/quint). Jokers may stand in for
// the matching tile. Jokers themselves can never be claimed.

/** The tile kind an exposure stands for (the key of its natural tiles). */
export function exposureKey(exposure: Tile[]): string | null {
    const natural = exposure.find(t => t.type !== 'joker');
    return natural ? getTileKey(natural) : null;
}

/** Can these hand tiles legally join the discard as one exposure? */
export function isValidExposure(discard: Tile, handTiles: Tile[]): boolean {
    if (discard.type === 'joker') return false;
    const total = handTiles.length + 1;
    if (total < 3 || total > 5) return false;
    const key = getTileKey(discard);
    return handTiles.every(t => t.type === 'joker' || getTileKey(t) === key);
}

/**
 * Default tile selection for a one-click call: every matching natural in
 * hand (capped at 4, for up to a quint), or one natural plus a joker when
 * that's the only way to reach a pung. Jokers are never spent beyond that.
 * Returns null if no legal call exists.
 */
export function defaultCallTiles(player: Player, discard: Tile): Tile[] | null {
    if (discard.type === 'joker') return null;
    const key = getTileKey(discard);
    const naturals = player.hand.filter(t => t.type !== 'joker' && getTileKey(t) === key);
    if (naturals.length >= 2) return naturals.slice(0, 4);
    if (naturals.length === 1) {
        const joker = player.hand.find(t => t.type === 'joker');
        if (joker) return [naturals[0], joker];
    }
    return null;
}

/**
 * Execute a call: the latest discard plus the given hand tiles become a new
 * exposure for the caller, who then continues with their own discard.
 * During the call phase currentPlayerIndex is still the discarder, so a
 * player can never claim their own tile.
 */
export function callDiscard(state: GameState, callerIndex: number, handTileIds: string[]): GameState {
    if (state.phase !== 'call' || state.discards.length === 0) {
        throw new Error('No discard available to call');
    }
    if (callerIndex === state.currentPlayerIndex) {
        throw new Error('Cannot call your own discard');
    }

    const caller = state.players[callerIndex];
    const handTiles = handTileIds.map(id => {
        const tile = caller.hand.find(t => t.id === id);
        if (!tile) throw new Error('Tile not found in hand');
        return tile;
    });
    const discard = state.discards[state.discards.length - 1];
    if (!isValidExposure(discard, handTiles)) {
        throw new Error('Selected tiles do not form a valid exposure with the discard');
    }

    return {
        ...state,
        discards: state.discards.slice(0, -1),
        players: state.players.map((p, i) => i === callerIndex
            ? {
                ...p,
                hand: p.hand.filter(t => !handTileIds.includes(t.id)),
                exposures: [...p.exposures, [discard, ...handTiles]],
            }
            : p),
        currentPlayerIndex: callerIndex,
        phase: 'discard',
    };
}

/**
 * Let the bots claim the latest discard, in turn order after the discarder.
 * Mahjong on the discard beats an exposure call. Returns the new state if a
 * bot claimed the tile, or null when no bot wants it.
 */
export function resolveBotClaims(state: GameState): GameState | null {
    if (state.phase !== 'call' || state.discards.length === 0) return null;
    const discard = state.discards[state.discards.length - 1];

    for (let offset = 1; offset < state.players.length; offset++) {
        const idx = (state.currentPlayerIndex + offset) % state.players.length;
        const bot = state.players[idx];
        if (!bot.isBot) continue;

        const win = checkMahJong(bot, discard);
        if (win) {
            return {
                ...state,
                discards: state.discards.slice(0, -1),
                players: state.players.map((p, i) => i === idx ? { ...p, hand: [...p.hand, discard] } : p),
                phase: 'end',
                winner: { playerIndex: idx, ...win },
            };
        }

        if (decideBotCall(bot, discard)) {
            const tiles = defaultCallTiles(bot, discard);
            if (tiles) return callDiscard(state, idx, tiles.map(t => t.id));
        }
    }
    return null;
}

/**
 * A single seat's response to a discard during the call window. `pass` means
 * the seat declines; `exposure` claims the discard into a face-up group using
 * the given hand tiles; `mahjong` claims the discard to complete the hand.
 */
export type Claim =
    | { seat: number; kind: 'pass' }
    | { seat: number; kind: 'exposure'; handTileIds: string[] }
    | { seat: number; kind: 'mahjong' };

/**
 * Unified claim arbitration: given every seat's response to the latest
 * discard, pick the winner and apply it. Replaces the old seat-order +
 * UI-timing approach (`resolveBotClaims`) with a single rule that works for
 * any mix of humans and bots:
 *
 *   1. Any mahjong claim beats any exposure claim.
 *   2. Within the same kind, the claim closest to the discarder in turn order
 *      (the next seat to play) wins.
 *
 * Returns the resulting state, or null when no seat claimed the tile (the
 * caller then advances the turn). The discarder's own claim is ignored — you
 * can never claim your own tile.
 */
export function resolveClaims(state: GameState, claims: Claim[]): GameState | null {
    if (state.phase !== 'call' || state.discards.length === 0) return null;
    const discard = state.discards[state.discards.length - 1];

    // Proximity to the discarder: the seat that would play next is closest.
    const distance = (seat: number) =>
        (seat - state.currentPlayerIndex + state.players.length) % state.players.length;

    const eligible = claims.filter(c => c.kind !== 'pass' && c.seat !== state.currentPlayerIndex);

    const mahjongs = eligible
        .filter((c): c is Extract<Claim, { kind: 'mahjong' }> => c.kind === 'mahjong')
        .filter(c => checkMahJong(state.players[c.seat], discard) !== null)
        .sort((a, b) => distance(a.seat) - distance(b.seat));

    if (mahjongs.length > 0) {
        const winner = mahjongs[0];
        const win = checkMahJong(state.players[winner.seat], discard)!;
        return {
            ...state,
            discards: state.discards.slice(0, -1),
            players: state.players.map((p, i) =>
                i === winner.seat ? { ...p, hand: [...p.hand, discard] } : p),
            phase: 'end',
            winner: { playerIndex: winner.seat, ...win },
        };
    }

    const exposures = eligible
        .filter((c): c is Extract<Claim, { kind: 'exposure' }> => c.kind === 'exposure')
        .filter(c => {
            const handTiles = c.handTileIds
                .map(id => state.players[c.seat].hand.find(t => t.id === id))
                .filter((t): t is Tile => t !== undefined);
            return handTiles.length === c.handTileIds.length && isValidExposure(discard, handTiles);
        })
        .sort((a, b) => distance(a.seat) - distance(b.seat));

    if (exposures.length > 0) {
        const winner = exposures[0];
        return callDiscard(state, winner.seat, winner.handTileIds);
    }

    return null;
}

/**
 * What a bot at `seat` would claim for the latest discard: a mahjong if the
 * discard completes its hand, otherwise an exposure if calling advances its
 * target, otherwise a pass. Used to fold bots into the unified claim window.
 */
export function decideBotClaim(state: GameState, seat: number): Claim {
    if (state.phase !== 'call' || state.discards.length === 0) return { seat, kind: 'pass' };
    if (seat === state.currentPlayerIndex) return { seat, kind: 'pass' };

    const bot = state.players[seat];
    const discard = state.discards[state.discards.length - 1];

    if (checkMahJong(bot, discard)) return { seat, kind: 'mahjong' };

    if (decideBotCall(bot, discard)) {
        const tiles = defaultCallTiles(bot, discard);
        if (tiles) return { seat, kind: 'exposure', handTileIds: tiles.map(t => t.id) };
    }
    return { seat, kind: 'pass' };
}

export interface ExposedJoker {
    ownerIndex: number;
    exposureIndex: number;
    key: string; // tile kind the joker stands for
}

/** Every joker currently sitting in any player's exposures. */
export function findExposedJokers(state: GameState): ExposedJoker[] {
    const found: ExposedJoker[] = [];
    state.players.forEach((player, ownerIndex) => {
        player.exposures.forEach((exposure, exposureIndex) => {
            if (exposure.some(t => t.type === 'joker')) {
                const key = exposureKey(exposure);
                if (key) found.push({ ownerIndex, exposureIndex, key });
            }
        });
    });
    return found;
}

/**
 * Swap a natural tile from a player's hand for a joker in any exposure
 * (their own or an opponent's). Standard rule: allowed on your own turn,
 * after drawing and before discarding.
 */
export function exchangeJoker(
    state: GameState,
    playerIndex: number,
    handTileId: string,
    ownerIndex: number,
    exposureIndex: number,
): GameState {
    // Standard rule, enforced here rather than relying on the UI: only on your
    // own turn, after drawing and before discarding.
    if (state.phase !== 'discard' || state.currentPlayerIndex !== playerIndex) {
        throw new Error('Joker exchange is only allowed on your turn, before discarding');
    }

    const player = state.players[playerIndex];
    const handTile = player.hand.find(t => t.id === handTileId);
    if (!handTile || handTile.type === 'joker') {
        throw new Error('Select a natural tile from your hand to exchange');
    }

    const exposure = state.players[ownerIndex]?.exposures[exposureIndex];
    if (!exposure) throw new Error('No such exposure');
    const jokerIndex = exposure.findIndex(t => t.type === 'joker');
    if (jokerIndex === -1) throw new Error('That exposure has no joker');
    if (exposureKey(exposure) !== getTileKey(handTile)) {
        throw new Error('Tile does not match what the joker stands for');
    }

    const joker = exposure[jokerIndex];
    const newExposure = exposure.map((t, i) => i === jokerIndex ? handTile : t);

    return {
        ...state,
        players: state.players.map((p, i) => {
            let next = p;
            if (i === ownerIndex) {
                next = { ...next, exposures: next.exposures.map((e, ei) => ei === exposureIndex ? newExposure : e) };
            }
            if (i === playerIndex) {
                next = { ...next, hand: [...next.hand.filter(t => t.id !== handTileId), joker] };
            }
            return next;
        }),
    };
}
