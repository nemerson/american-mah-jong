export type Suit = 'bams' | 'craks' | 'dots';
export type Wind = 'north' | 'east' | 'south' | 'west';
export type Dragon = 'red' | 'green' | 'white';

export interface SuitedTile {
    type: 'suit';
    suit: Suit;
    value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    id: string; // Unique identifier for React keys
}

export interface WindTile {
    type: 'wind';
    wind: Wind;
    id: string;
}

export interface DragonTile {
    type: 'dragon';
    dragon: Dragon;
    id: string;
}

export interface FlowerTile {
    type: 'flower';
    value: 1 | 2 | 3 | 4; // Often numbered 1-4 for seasons/flowers
    id: string;
}

export interface JokerTile {
    type: 'joker';
    id: string;
}

export type Tile = SuitedTile | WindTile | DragonTile | FlowerTile | JokerTile;

export interface Player {
    id: string;
    name: string;
    isBot: boolean;
    hand: Tile[];
    exposures: Tile[][]; // Groups of tiles called from discards
}

export interface GameState {
    wall: Tile[];
    discards: Tile[];
    players: Player[];
    currentPlayerIndex: number;
    eastPlayerIndex: number;
    phase: 'setup' | 'charleston' | 'draw' | 'discard' | 'call' | 'end';
    charlestonPhase?: 'firstRight' | 'firstAcross' | 'firstLeft' | 'secondLeft' | 'secondAcross' | 'secondRight' | 'courtesy';
}
