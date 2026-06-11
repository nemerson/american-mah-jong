import type { GameState, Tile } from '../types/mahjong';

// The Charleston has standard phases in American Mah Jong
export type CharlestonPhase =
    | 'firstRight'
    | 'firstAcross'
    | 'firstLeft'
    | 'secondLeft' // optional: any player may stop the Charleston here instead
    | 'secondAcross'
    | 'secondRight'
    | 'courtesy'; // (Optional pass of 0-3 tiles with across player)

export interface CharlestonPass {
    fromIndex: number;
    toIndex: number;
    tiles: Tile[];
    /**
     * Blind pass (third and sixth passes only): take this many tiles, unseen,
     * from the stack being passed to you to complete your 3 outgoing tiles.
     * Blind tiles go straight through — they never enter your hand.
     */
    blindCount?: number;
}

// The last pass of each Charleston allows a blind pass
export const BLIND_PASS_PHASES: CharlestonPhase[] = ['firstLeft', 'secondRight'];

// Direction mappings for passing 3 tiles
// Player order: 0 (East/Human), 1 (South), 2 (West), 3 (North)
const passDirections: Record<CharlestonPhase, number[]> = {
    'firstRight': [1, 2, 3, 0],   // 0 passes to 1, 1 to 2, 2 to 3, 3 to 0
    'firstAcross': [2, 3, 0, 1],  // 0 passes to 2, 1 to 3, 2 to 0, 3 to 1
    'firstLeft': [3, 0, 1, 2],    // 0 passes to 3, 1 to 0, 2 to 1, 3 to 2
    'secondLeft': [3, 0, 1, 2],
    'secondAcross': [2, 3, 0, 1],
    'secondRight': [1, 2, 3, 0],
    'courtesy': [2, 3, 0, 1] // Similar to across but variable # of tiles
};

const nextPhaseMap: Record<CharlestonPhase, CharlestonPhase | 'done'> = {
    'firstRight': 'firstAcross',
    'firstAcross': 'firstLeft',
    'firstLeft': 'secondLeft', // entry into the optional second Charleston (see stopCharleston)
    'secondLeft': 'secondAcross',
    'secondAcross': 'secondRight',
    'secondRight': 'courtesy',
    'courtesy': 'done' // Proceed to actual gameplay
};

/**
 * Stop the Charleston after the first three passes. The second Charleston is
 * optional and only happens if all players agree, so any player may decline
 * it at the decision point (right after the first left pass) and the table
 * moves straight to the courtesy pass.
 */
export function stopCharleston(state: GameState): GameState {
    if (state.phase !== 'charleston' || state.charlestonPhase !== 'secondLeft') {
        throw new Error('The Charleston can only be stopped right after the first three passes');
    }
    return { ...state, charlestonPhase: 'courtesy' };
}

export function executeCharlestonPasses(
    state: GameState,
    phase: CharlestonPhase,
    passes: CharlestonPass[] // Expecting 4 passes, one from each player
): GameState {
    if (passes.length !== 4) {
        throw new Error("Require passes from all 4 players to execute the phase.");
    }

    // Normalize so byFrom[i] is player i's pass
    const byFrom: CharlestonPass[] = [];
    for (const pass of passes) byFrom[pass.fromIndex] = pass;
    if (byFrom.length !== 4 || byFrom.some(p => !p)) {
        throw new Error("Require exactly one pass from each player.");
    }

    const directions = passDirections[phase];
    // sourceOf[j] = the player passing to j this phase
    const sourceOf: number[] = [];
    directions.forEach((target, from) => { sourceOf[target] = from; });

    // Validate tile counts; blind passes only on the third and sixth passes
    for (const pass of byFrom) {
        const blind = pass.blindCount ?? 0;
        if (blind < 0 || blind > 3) throw new Error("Blind count must be between 0 and 3.");
        if (blind > 0 && !BLIND_PASS_PHASES.includes(phase)) {
            throw new Error("Blind passes are only allowed on the third and sixth passes.");
        }
        if (phase === 'courtesy') {
            if (pass.tiles.length > 3) throw new Error("Courtesy pass is at most 3 tiles.");
        } else if (pass.tiles.length + blind !== 3) {
            throw new Error("Must pass exactly 3 tiles (own plus blind) during standard Charleston phases.");
        }
    }

    // For courtesy phase, enforce the minimum-of-two rule between across-table partners
    // Pairs: 0↔2 and 1↔3
    if (phase === 'courtesy') {
        const pair1Min = Math.min(byFrom[0].tiles.length, byFrom[2].tiles.length);
        const pair2Min = Math.min(byFrom[1].tiles.length, byFrom[3].tiles.length);
        byFrom[0] = { ...byFrom[0], tiles: byFrom[0].tiles.slice(0, pair1Min) };
        byFrom[2] = { ...byFrom[2], tiles: byFrom[2].tiles.slice(0, pair1Min) };
        byFrom[1] = { ...byFrom[1], tiles: byFrom[1].tiles.slice(0, pair2Min) };
        byFrom[3] = { ...byFrom[3], tiles: byFrom[3].tiles.slice(0, pair2Min) };
    }

    const newPlayers = state.players.map(p => ({ ...p, hand: [...p.hand] }));

    // Remove every player's chosen tiles from their hand
    for (const pass of byFrom) {
        const tileIdsToDrop = pass.tiles.map(t => t.id);
        newPlayers[pass.fromIndex].hand =
            newPlayers[pass.fromIndex].hand.filter(t => !tileIdsToDrop.includes(t.id));
    }

    // outgoing[i] = the stack player i sends to directions[i]
    const outgoing: Tile[][] = byFrom.map(pass => [...pass.tiles]);

    // Resolve blind passes: draw unseen tiles from the stack headed to the
    // blind passer and append them to their own outgoing stack. Resolve
    // players whose source has no pending blind first so chained blind
    // passes draw from completed stacks.
    const pendingBlind = new Set(
        byFrom.filter(p => (p.blindCount ?? 0) > 0).map(p => p.fromIndex)
    );
    while (pendingBlind.size > 0) {
        const order = Array.from(pendingBlind);
        const next = order.find(i => !pendingBlind.has(sourceOf[i])) ?? order[0];
        const incoming = outgoing[sourceOf[next]];
        for (let n = byFrom[next].blindCount ?? 0; n > 0; n--) {
            if (incoming.length === 0) {
                throw new Error("Not enough incoming tiles to complete the blind pass.");
            }
            const pick = Math.floor(Math.random() * incoming.length);
            outgoing[next].push(...incoming.splice(pick, 1));
        }
        pendingBlind.delete(next);
    }

    // Deliver each stack to its recipient
    for (let j = 0; j < newPlayers.length; j++) {
        newPlayers[j].hand.push(...outgoing[sourceOf[j]]);
    }

    const newState = { ...state, players: newPlayers };

    const nextPhase = nextPhaseMap[phase];
    if (nextPhase === 'done') {
        newState.phase = 'discard'; // East already has 14 tiles, starts by discarding
        newState.charlestonPhase = undefined;
    } else {
        newState.charlestonPhase = nextPhase;
    }

    return newState;
}

export function determineNextCharlestonPhase(currentPhase: CharlestonPhase): CharlestonPhase | 'done' {
    return nextPhaseMap[currentPhase];
}
