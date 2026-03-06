import type { GameState, Player, Tile } from '../types/mahjong';
import { generateDeck, shuffleDeck } from './deck';

export function initializeGame(playerNames: string[]): GameState {
    const deck = shuffleDeck(generateDeck());
    const players: Player[] = playerNames.map((name, index) => ({
        id: `player-${index}`,
        name,
        isBot: index !== 0, // Assumption: Player 0 is the human user
        hand: [],
        exposures: []
    }));

    // Deal 13 tiles to everyone, 14 to East
    const eastPlayerIndex = 0; // For now, human is always East

    for (let i = 0; i < players.length; i++) {
        const tilesToDeal = i === eastPlayerIndex ? 14 : 13;
        players[i].hand = deck.splice(0, tilesToDeal);
    }

    return {
        wall: deck,
        discards: [],
        players,
        currentPlayerIndex: eastPlayerIndex,
        eastPlayerIndex,
        phase: 'charleston', // Start with Charleston phase
        charlestonPhase: 'firstRight',
    };
}

export function drawTile(state: GameState, playerIndex: number): GameState {
    if (state.wall.length === 0) {
        // Handle wall out of tiles (game over/draw depending on rules, simplifying for now)
        return { ...state, phase: 'end' };
    }

    const newState = { ...state };
    const newWall = [...newState.wall];
    const tile = newWall.shift();

    if (tile) {
        newState.wall = newWall;
        newState.players[playerIndex].hand.push(tile);
    }

    newState.phase = 'discard';
    return newState;
}

export function discardTile(state: GameState, playerIndex: number, tileId: string): GameState {
    const player = state.players[playerIndex];
    const tileIndex = player.hand.findIndex(t => t.id === tileId);

    if (tileIndex === -1) {
        throw new Error("Tile not found in hand");
    }

    const newHand = [...player.hand];
    const [discardedTile] = newHand.splice(tileIndex, 1);

    const newState: GameState = {
        ...state,
        players: state.players.map((p, i) => i === playerIndex ? { ...p, hand: newHand } : p),
        discards: [...state.discards, discardedTile],
        phase: 'call'
    };

    return newState;
}

export function advanceTurn(state: GameState): GameState {
    const newState: GameState = {
        ...state,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % 4,
        phase: 'draw'
    };
    return newState;
}

export function reorderPlayerHand(state: GameState, playerId: string, newHand: Tile[]): GameState {
    return {
        ...state,
        players: state.players.map(p => p.id === playerId ? { ...p, hand: newHand } : p)
    };
}
