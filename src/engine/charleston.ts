import type { GameState, Tile } from '../types/mahjong';

// The Charleston has standard phases in American Mah Jong
export type CharlestonPhase =
    | 'firstRight'
    | 'firstAcross'
    | 'firstLeft'
    | 'secondLeft' // (Optional, requires agreement, assuming yes for bots)
    | 'secondAcross'
    | 'secondRight'
    | 'courtesy'; // (Optional pass of 1-3 tiles with across player)

export interface CharlestonPass {
    fromIndex: number;
    toIndex: number;
    tiles: Tile[];
}

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
    'firstLeft': 'secondLeft', // simplified: usually an agreement phase, forcing it for now
    'secondLeft': 'secondAcross',
    'secondAcross': 'secondRight',
    'secondRight': 'courtesy',
    'courtesy': 'done' // Proceed to actual gameplay
};

export function executeCharlestonPasses(
    state: GameState,
    phase: CharlestonPhase,
    passes: CharlestonPass[] // Expecting 4 passes, one from each player
): GameState {
    if (passes.length !== 4) {
        throw new Error("Require passes from all 4 players to execute the phase.");
    }

    // Validate everyone passed 3 tiles (except courtesy which can be 0-3)
    if (phase !== 'courtesy' && passes.some(p => p.tiles.length !== 3)) {
        throw new Error("Must pass exactly 3 tiles during standard Charleston phases.");
    }

    const newState = { ...state };
    const newPlayers = [...state.players.map(p => ({ ...p, hand: [...p.hand] }))];

    // For courtesy phase, enforce the minimum-of-two rule between across-table partners
    // Pairs: 0↔2 and 1↔3
    if (phase === 'courtesy') {
        const pair1Min = Math.min(passes[0].tiles.length, passes[2].tiles.length);
        const pair2Min = Math.min(passes[1].tiles.length, passes[3].tiles.length);
        passes[0].tiles = passes[0].tiles.slice(0, pair1Min);
        passes[2].tiles = passes[2].tiles.slice(0, pair1Min);
        passes[1].tiles = passes[1].tiles.slice(0, pair2Min);
        passes[3].tiles = passes[3].tiles.slice(0, pair2Min);
    }

    // Apply removals first
    for (const pass of passes) {
        const player = newPlayers[pass.fromIndex];
        const tileIdsToDrop = pass.tiles.map(t => t.id);
        player.hand = player.hand.filter(t => !tileIdsToDrop.includes(t.id));
    }

    // Apply additions
    for (const pass of passes) {
        const receivingPlayerIndex = passDirections[phase][pass.fromIndex];
        const receivingPlayer = newPlayers[receivingPlayerIndex];
        receivingPlayer.hand.push(...pass.tiles);
    }

    newState.players = newPlayers;

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
