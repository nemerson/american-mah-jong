// International Mahjong Card 2026 — Year of the Horse
// All 53 winning hands across 9 sections

export interface CardHand {
    pattern: string;
    description: string;
    points: number;
}

export interface CardSection {
    name: string;
    hands: CardHand[];
}

export const internationalMahjongCard: CardSection[] = [
    {
        name: 'Year of the Horse 2026',
        hands: [
            { pattern: 'NEWS 2026 DDD DDD', description: 'Any 3 suits', points: 50 },
            { pattern: '222 000 2222 6666', description: 'Any 3 suits', points: 50 },
            { pattern: 'FFFF 22 0000 22 66', description: 'Any 2 suits, pairs of 2\'s same suit', points: 50 },
            { pattern: '222 00 222 66 66 66', description: 'Any 3 suits', points: 50 },
            { pattern: 'FF 2026 FF DDD DDD', description: 'Any 3 suits', points: 75 },
            { pattern: 'NEWS 2026 2026 DD', description: 'Any 3 suits', points: 100 },
        ]
    },
    {
        name: 'Pungs & Chows',
        hands: [
            { pattern: 'FF 222 222 222 DDD', description: 'Any 3 suits, pungs any same even no., any dragon', points: 50 },
            { pattern: '111 222 333 444 NN', description: 'Any 2 suits, any 4 consec. nos, pair of any wind', points: 50 },
            { pattern: 'FF 000 123 444 567', description: 'Any 7 consec. nos, any 3 suits', points: 75 },
            { pattern: 'FFF 123 456 789 NN', description: 'Any 3 suits, pair of any wind', points: 75 },
            { pattern: '123 D NEWS 456 D DD', description: 'Any 3 suits, chows any 6 consec. nos, pair opp. dragons', points: 100 },
        ]
    },
    {
        name: 'Flower Bouquet',
        hands: [
            { pattern: 'FFF 1111 FFF DD DD', description: 'Any 3 suits, kong any no., pairs opp. dragons', points: 50 },
            { pattern: 'FFFF 111 2026 999', description: 'Any 3 suits', points: 50 },
            { pattern: 'F 22 F 44 F 66 F 8888', description: 'Any 3 suits, 2\'s and 8\'s same suit', points: 75 },
            { pattern: 'FFF 11 2345678 99', description: 'Any 1 or 2 suits', points: 75 },
            { pattern: 'FF 123456789 D FF', description: 'Any 1 suit, matching dragon', points: 100 },
        ]
    },
    {
        name: 'Consecutive Numbers',
        hands: [
            { pattern: '1123 1111 D 1111 D', description: 'Any 3 consec. nos, pair any no. in run, kongs match pair', points: 50 },
            { pattern: 'FFFF 11 222 333 44', description: 'Any 2 suits, any 4 consec. nos', points: 50 },
            { pattern: '11 22 333444 5555', description: 'Any 1 or 2 suits, any 5 consec. nos', points: 50 },
            { pattern: '112 112233 112233', description: 'Any 3 suits, any 3 consec. nos', points: 50 },
            { pattern: '111 23 44 11 23 444', description: 'Any 2 suits, any 4 consec. nos', points: 75 },
            { pattern: 'NEWS 11 22 33 44 55', description: 'Any 2 suits, any 5 consec. nos', points: 100 },
        ]
    },
    {
        name: 'Same Number',
        hands: [
            { pattern: 'FFFF 111 DD 111 DD', description: 'Any 2 suits', points: 50 },
            { pattern: '111 1111 111 NNNN', description: 'Any 3 suits, any wind', points: 50 },
            { pattern: 'FFF 1111 FFF 1111', description: 'Any 2 suits', points: 50 },
            { pattern: 'FF 11 FF FF NNNN', description: 'Any 2 suits, pairs any same no., kong any wind', points: 75 },
            { pattern: 'FF 11 D 11 D 11 D 11 D', description: 'Any 1 suit', points: 100 },
        ]
    },
    {
        name: 'Windy Dragons',
        hands: [
            { pattern: 'NNN EEE WWW SSS 11', description: '1 suit, pair any no.', points: 50 },
            { pattern: 'FFFF 1111 DDD DDD', description: 'Any 3 suits, any no., pungs opp. dragons', points: 50 },
            { pattern: 'EEE WWW 111 111 DD', description: 'Any 3 suits, any same odd no.', points: 50 },
            { pattern: 'NNN SSS 222 222 DD', description: 'Any 3 suits, any same even no.', points: 50 },
            { pattern: 'NEWS 1111 2222 DD', description: 'Any 2 suits, any 2 consec. nos', points: 50 },
            { pattern: 'NN EE WW SS DDD DDD', description: 'Any 2 suits, any 6 consec. nos', points: 75 },
            { pattern: 'NEWS 123 NEWS 456', description: 'Any 2 suits', points: 100 },
        ]
    },
    {
        name: 'Evens',
        hands: [
            { pattern: '222 4444 6666 888', description: 'Any 2 suits', points: 50 },
            { pattern: 'FF 222 444 666 888', description: 'Any 1 or 3 suits', points: 50 },
            { pattern: 'FFFF 2222 444 66 8', description: 'Any 1 or 3 suits', points: 50 },
            { pattern: '2222 NEWS 222 222', description: 'Any 3 suits, any same even no.', points: 50 },
            { pattern: 'FF 2468 DD 222', description: 'Any 3 suits, pungs any same even no.', points: 75 },
            { pattern: 'FF 2468 2468 2468', description: 'Any 3 suits', points: 100 },
        ]
    },
    {
        name: 'Odds',
        hands: [
            { pattern: 'FF 1 D 333 55 777 9 D', description: 'Any 3 suits', points: 50 },
            { pattern: '1111 33 55 77 99999', description: 'Any 1 or 3 suits', points: 50 },
            { pattern: 'FFF 1111 3333 DDD', description: 'Any 3 suits, kongs any odd consec. nos.', points: 50 },
            { pattern: 'FFF 111 33 55 77 99', description: 'Any 3 suits', points: 75 },
            { pattern: '11 3 5 77 11 3 5 77 DD', description: 'Any 3 suits', points: 100 },
        ]
    },
    {
        name: 'Lucky Eights',
        hands: [
            { pattern: '111 8888 111 8888', description: 'Any 2 suits', points: 50 },
            { pattern: 'FF 2222 + 6666 = 8888', description: 'Any 3 suits', points: 50 },
            { pattern: 'FF 3333 + 5555 = 8888', description: 'Any 3 suits', points: 50 },
            { pattern: '8888 DDD 8888 DDD', description: 'Any 2 suits, matching dragons', points: 50 },
            { pattern: 'FF 22+66−88 DDD DDD', description: 'Any 3 suits', points: 75 },
            { pattern: 'FF 11+77−88 22+66−88', description: 'Any 2 suits', points: 100 },
        ]
    },
];
