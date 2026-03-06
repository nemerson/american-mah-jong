import type { Tile, Suit, Wind, Dragon } from '../types/mahjong';
import { v4 as uuidv4 } from 'uuid'; // Generate unique IDs for each tile

// Standard American Mah Jong deck has 152 tiles:
// 3 suits (Bams, Craks, Dots) x 9 values x 4 copies = 108 tiles
// 4 Winds (N, E, S, W) x 4 copies = 16 tiles
// 3 Dragons (Red, Green, White) x 4 copies = 12 tiles
// 8 Flowers
// 8 Jokers

export function generateDeck(): Tile[] {
    const deck: Tile[] = [];

    const addTile = (tileDef: Omit<Tile, 'id'>) => {
        deck.push({ ...tileDef, id: uuidv4() } as Tile);
    };

    // Suited Tiles
    const suits: Suit[] = ['bams', 'craks', 'dots'];
    for (const suit of suits) {
        for (let value = 1; value <= 9; value++) {
            for (let i = 0; i < 4; i++) {
                addTile({ type: 'suit', suit, value: value as any } as unknown as Tile);
            }
        }
    }

    // Winds
    const winds: Wind[] = ['north', 'east', 'south', 'west'];
    for (const wind of winds) {
        for (let i = 0; i < 4; i++) {
            addTile({ type: 'wind', wind } as unknown as Tile);
        }
    }

    // Dragons
    const dragons: Dragon[] = ['red', 'green', 'white'];
    for (const dragon of dragons) {
        for (let i = 0; i < 4; i++) {
            addTile({ type: 'dragon', dragon } as unknown as Tile);
        }
    }

    // Flowers
    for (let i = 0; i < 8; i++) {
        // Simplification: treating all flowers identically for now, though traditionally they have pairs/seasons
        addTile({ type: 'flower', value: (i % 4) + 1 as any } as unknown as Tile);
    }

    // Jokers
    for (let i = 0; i < 8; i++) {
        addTile({ type: 'joker' });
    }

    return deck;
}

export function shuffleDeck(deck: Tile[]): Tile[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
