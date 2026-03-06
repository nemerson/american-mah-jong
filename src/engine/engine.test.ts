import { describe, it, expect } from 'vitest';
import { generateDeck } from './deck';
import { initializeGame } from './game';

describe('Mah Jong Deck Generation', () => {
    it('should generate exactly 152 tiles', () => {
        const deck = generateDeck();
        expect(deck.length).toBe(152);
    });

    it('should have correct counts for groups of tiles', () => {
        const deck = generateDeck();
        const suits = deck.filter(t => t.type === 'suit');
        // 3 suits * 9 values * 4 copies
        expect(suits.length).toBe(108);

        const winds = deck.filter(t => t.type === 'wind');
        expect(winds.length).toBe(16);

        const dragons = deck.filter(t => t.type === 'dragon');
        expect(dragons.length).toBe(12);

        const flowers = deck.filter(t => t.type === 'flower');
        expect(flowers.length).toBe(8);

        const jokers = deck.filter(t => t.type === 'joker');
        expect(jokers.length).toBe(8);
    });
});

describe('Game Initialization', () => {
    it('should initialize a game state properly', () => {
        const playerNames = ['Player1', 'Bot1', 'Bot2', 'Bot3'];
        const state = initializeGame(playerNames);

        expect(state.phase).toBe('charleston');
        expect(state.charlestonPhase).toBe('firstRight');
        expect(state.players.length).toBe(4);

        // East gets 14
        expect(state.players[0].hand.length).toBe(14);
        // Others get 13
        expect(state.players[1].hand.length).toBe(13);
        expect(state.players[2].hand.length).toBe(13);
        expect(state.players[3].hand.length).toBe(13);

        // 152 total tiles - (14 + 13 + 13 + 13) = 99 remaining in wall
        expect(state.wall.length).toBe(99);
    });
});
