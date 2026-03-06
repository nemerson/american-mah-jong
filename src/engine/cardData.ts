// International Mahjong Card 2026 — Year of the Horse
// All 53 winning hands across 9 sections
// Color-coded by suit: 'a' = Suit A, 'b' = Suit B, 'c' = Suit C, 'n' = Neutral/suitless

export type SuitColor = 'a' | 'b' | 'c' | 'n';

export interface PatternSegment {
    text: string;
    suit: SuitColor;
}

export interface CardHand {
    segments: PatternSegment[];
    description: string;
    points: number;
}

export interface CardSection {
    name: string;
    hands: CardHand[];
}

// Helper to build segments quickly
const S = (text: string, suit: SuitColor): PatternSegment => ({ text, suit });

export const internationalMahjongCard: CardSection[] = [
    {
        name: 'Year of the Horse 2026',
        hands: [
            { segments: [S('NEWS', 'n'), S(' 2', 'a'), S('0', 'n'), S('2', 'b'), S('6', 'c'), S(' DDD', 'a'), S(' DDD', 'b')], description: 'Any 3 suits', points: 50 },
            { segments: [S('222', 'a'), S(' 000', 'n'), S(' 2222', 'b'), S(' 6666', 'c')], description: 'Any 3 suits', points: 50 },
            { segments: [S('FFFF', 'n'), S(' 22', 'a'), S(' 0000', 'n'), S(' 22', 'a'), S(' 66', 'b')], description: 'Any 2 suits, pairs of 2\'s same suit', points: 50 },
            { segments: [S('222', 'a'), S(' 00', 'n'), S(' 222', 'b'), S(' 66', 'a'), S(' 66', 'b'), S(' 66', 'c')], description: 'Any 3 suits', points: 50 },
            { segments: [S('FF', 'n'), S(' 2', 'a'), S('0', 'n'), S('2', 'a'), S('6', 'a'), S(' FF', 'n'), S(' DDD', 'b'), S(' DDD', 'c')], description: 'Any 3 suits', points: 75 },
            { segments: [S('NEWS', 'n'), S(' 2', 'a'), S('0', 'n'), S('2', 'b'), S('6', 'c'), S(' 2', 'a'), S('0', 'n'), S('2', 'b'), S('6', 'c'), S(' DD', 'a')], description: 'Any 3 suits', points: 100 },
        ]
    },
    {
        name: 'Pungs & Chows',
        hands: [
            { segments: [S('FF', 'n'), S(' 222', 'a'), S(' 222', 'b'), S(' 222', 'c'), S(' DDD', 'a')], description: 'Any 3 suits, pungs any same even no., any dragon', points: 50 },
            { segments: [S('111', 'a'), S(' 222', 'a'), S(' 333', 'b'), S(' 444', 'b'), S(' NN', 'n')], description: 'Any 2 suits, any 4 consec. nos, pair of any wind', points: 50 },
            { segments: [S('FF', 'n'), S(' 000', 'n'), S(' 123', 'a'), S(' 444', 'b'), S(' 567', 'c')], description: 'Any 7 consec. nos, any 3 suits', points: 75 },
            { segments: [S('FFF', 'n'), S(' 123', 'a'), S(' 456', 'b'), S(' 789', 'c'), S(' NN', 'n')], description: 'Any 3 suits, pair of any wind', points: 75 },
            { segments: [S('123', 'a'), S(' D', 'a'), S(' NEWS', 'n'), S(' 456', 'b'), S(' D', 'b'), S(' DD', 'c')], description: 'Any 3 suits, chows any 6 consec. nos, pair opp. dragons', points: 100 },
        ]
    },
    {
        name: 'Flower Bouquet',
        hands: [
            { segments: [S('FFF', 'n'), S(' 1111', 'a'), S(' FFF', 'n'), S(' DD', 'b'), S(' DD', 'c')], description: 'Any 3 suits, kong any no., pairs opp. dragons', points: 50 },
            { segments: [S('FFFF', 'n'), S(' 111', 'a'), S(' 2', 'b'), S('0', 'n'), S('2', 'b'), S('6', 'b'), S(' 999', 'c')], description: 'Any 3 suits', points: 50 },
            { segments: [S('F', 'n'), S(' 22', 'a'), S(' F', 'n'), S(' 44', 'b'), S(' F', 'n'), S(' 66', 'c'), S(' F', 'n'), S(' 8888', 'a')], description: 'Any 3 suits, 2\'s and 8\'s same suit', points: 75 },
            { segments: [S('FFF', 'n'), S(' 11', 'a'), S(' 2345678', 'a'), S(' 99', 'a')], description: 'Any 1 or 2 suits', points: 75 },
            { segments: [S('FF', 'n'), S(' 123456789', 'a'), S(' D', 'a'), S(' FF', 'n')], description: 'Any 1 suit, matching dragon', points: 100 },
        ]
    },
    {
        name: 'Consecutive Numbers',
        hands: [
            { segments: [S('1123', 'a'), S(' 1111', 'b'), S(' D', 'a'), S(' 1111', 'c'), S(' D', 'a')], description: 'Any 3 consec. nos, pair any no. in run, kongs match pair', points: 50 },
            { segments: [S('FFFF', 'n'), S(' 11', 'a'), S(' 222', 'b'), S(' 333', 'a'), S(' 44', 'b')], description: 'Any 2 suits, any 4 consec. nos', points: 50 },
            { segments: [S('11', 'a'), S(' 22', 'a'), S(' 333', 'a'), S('444', 'a'), S(' 5555', 'a')], description: 'Any 1 or 2 suits, any 5 consec. nos', points: 50 },
            { segments: [S('112', 'a'), S(' 112233', 'b'), S(' 112233', 'c')], description: 'Any 3 suits, any 3 consec. nos', points: 50 },
            { segments: [S('111', 'a'), S(' 23', 'a'), S(' 44', 'a'), S(' 11', 'b'), S(' 23', 'b'), S(' 444', 'b')], description: 'Any 2 suits, any 4 consec. nos', points: 75 },
            { segments: [S('NEWS', 'n'), S(' 11', 'a'), S(' 22', 'b'), S(' 33', 'a'), S(' 44', 'b'), S(' 55', 'a')], description: 'Any 2 suits, any 5 consec. nos', points: 100 },
        ]
    },
    {
        name: 'Same Number',
        hands: [
            { segments: [S('FFFF', 'n'), S(' 111', 'a'), S(' DD', 'a'), S(' 111', 'b'), S(' DD', 'b')], description: 'Any 2 suits', points: 50 },
            { segments: [S('111', 'a'), S(' 1111', 'b'), S(' 111', 'c'), S(' NNNN', 'n')], description: 'Any 3 suits, any wind', points: 50 },
            { segments: [S('FFF', 'n'), S(' 1111', 'a'), S(' FFF', 'n'), S(' 1111', 'b')], description: 'Any 2 suits', points: 50 },
            { segments: [S('FF', 'n'), S(' 11', 'a'), S(' FF', 'n'), S(' FF', 'n'), S(' NNNN', 'n')], description: 'Any 2 suits, pairs any same no., kong any wind', points: 75 },
            { segments: [S('FF', 'n'), S(' 11', 'a'), S(' D', 'a'), S(' 11', 'a'), S(' D', 'a'), S(' 11', 'a'), S(' D', 'a'), S(' 11', 'a'), S(' D', 'a')], description: 'Any 1 suit', points: 100 },
        ]
    },
    {
        name: 'Windy Dragons',
        hands: [
            { segments: [S('NNN', 'n'), S(' EEE', 'n'), S(' WWW', 'n'), S(' SSS', 'n'), S(' 11', 'a')], description: '1 suit, pair any no.', points: 50 },
            { segments: [S('FFFF', 'n'), S(' 1111', 'a'), S(' DDD', 'b'), S(' DDD', 'c')], description: 'Any 3 suits, any no., pungs opp. dragons', points: 50 },
            { segments: [S('EEE', 'n'), S(' WWW', 'n'), S(' 111', 'a'), S(' 111', 'b'), S(' DD', 'c')], description: 'Any 3 suits, any same odd no.', points: 50 },
            { segments: [S('NNN', 'n'), S(' SSS', 'n'), S(' 222', 'a'), S(' 222', 'b'), S(' DD', 'c')], description: 'Any 3 suits, any same even no.', points: 50 },
            { segments: [S('NEWS', 'n'), S(' 1111', 'a'), S(' 2222', 'b'), S(' DD', 'a')], description: 'Any 2 suits, any 2 consec. nos', points: 50 },
            { segments: [S('NN', 'n'), S(' EE', 'n'), S(' WW', 'n'), S(' SS', 'n'), S(' DDD', 'a'), S(' DDD', 'b')], description: 'Any 2 suits, any 6 consec. nos', points: 75 },
            { segments: [S('NEWS', 'n'), S(' 123', 'a'), S(' NEWS', 'n'), S(' 456', 'b')], description: 'Any 2 suits', points: 100 },
        ]
    },
    {
        name: 'Evens',
        hands: [
            { segments: [S('222', 'a'), S(' 4444', 'a'), S(' 6666', 'b'), S(' 888', 'b')], description: 'Any 2 suits', points: 50 },
            { segments: [S('FF', 'n'), S(' 222', 'a'), S(' 444', 'b'), S(' 666', 'c'), S(' 888', 'a')], description: 'Any 1 or 3 suits', points: 50 },
            { segments: [S('FFFF', 'n'), S(' 2222', 'a'), S(' 444', 'a'), S(' 66', 'a'), S(' 8', 'a')], description: 'Any 1 or 3 suits', points: 50 },
            { segments: [S('2222', 'a'), S(' NEWS', 'n'), S(' 222', 'b'), S(' 222', 'c')], description: 'Any 3 suits, any same even no.', points: 50 },
            { segments: [S('FF', 'n'), S(' 2468', 'a'), S(' DD', 'b'), S(' 222', 'c')], description: 'Any 3 suits, pungs any same even no.', points: 75 },
            { segments: [S('FF', 'n'), S(' 2468', 'a'), S(' 2468', 'b'), S(' 2468', 'c')], description: 'Any 3 suits', points: 100 },
        ]
    },
    {
        name: 'Odds',
        hands: [
            { segments: [S('FF', 'n'), S(' 1', 'a'), S(' D', 'a'), S(' 333', 'b'), S(' 55', 'a'), S(' 777', 'c'), S(' 9', 'a'), S(' D', 'a')], description: 'Any 3 suits', points: 50 },
            { segments: [S('1111', 'a'), S(' 33', 'a'), S(' 55', 'a'), S(' 77', 'a'), S(' 99999', 'a')], description: 'Any 1 or 3 suits', points: 50 },
            { segments: [S('FFF', 'n'), S(' 1111', 'a'), S(' 3333', 'b'), S(' DDD', 'c')], description: 'Any 3 suits, kongs any odd consec. nos.', points: 50 },
            { segments: [S('FFF', 'n'), S(' 111', 'a'), S(' 33', 'b'), S(' 55', 'a'), S(' 77', 'b'), S(' 99', 'a')], description: 'Any 3 suits', points: 75 },
            { segments: [S('11', 'a'), S(' 3', 'a'), S(' 5', 'a'), S(' 77', 'a'), S(' 11', 'b'), S(' 3', 'b'), S(' 5', 'b'), S(' 77', 'b'), S(' DD', 'c')], description: 'Any 3 suits', points: 100 },
        ]
    },
    {
        name: 'Lucky Eights',
        hands: [
            { segments: [S('111', 'a'), S(' 8888', 'a'), S(' 111', 'b'), S(' 8888', 'b')], description: 'Any 2 suits', points: 50 },
            { segments: [S('FF', 'n'), S(' 2222', 'a'), S(' + ', 'n'), S('6666', 'b'), S(' = ', 'n'), S('8888', 'c')], description: 'Any 3 suits', points: 50 },
            { segments: [S('FF', 'n'), S(' 3333', 'a'), S(' + ', 'n'), S('5555', 'b'), S(' = ', 'n'), S('8888', 'c')], description: 'Any 3 suits', points: 50 },
            { segments: [S('8888', 'a'), S(' DDD', 'a'), S(' 8888', 'b'), S(' DDD', 'b')], description: 'Any 2 suits, matching dragons', points: 50 },
            { segments: [S('FF', 'n'), S(' 22', 'a'), S('+', 'n'), S('66', 'b'), S('−', 'n'), S('88', 'c'), S(' DDD', 'a'), S(' DDD', 'b')], description: 'Any 3 suits', points: 75 },
            { segments: [S('FF', 'n'), S(' 11', 'a'), S('+', 'n'), S('77', 'a'), S('−', 'n'), S('88', 'a'), S(' 22', 'b'), S('+', 'n'), S('66', 'b'), S('−', 'n'), S('88', 'b')], description: 'Any 2 suits', points: 100 },
        ]
    },
];
