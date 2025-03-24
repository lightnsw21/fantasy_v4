export interface FantasySheet {
    fantasy_top_hero_page?: string;
    hero_id?: number;
    name: string;
    handle?: string;
    flags?: string;
    new_hero_yn?: number;
    created_at: string;
    medianLast4?: number;
    lastTournament1?: number;
    lastTournament2?: number;
    averageLast2?: number;
    floorCommon?: number;
    floorRare?: number;
    floorEpic?: number;
    floorLegendary?: number;
    stars?: number;
    historical_scores?: { [date: string]: number };
}

export interface Card {
    name: string;
    rarity: 'Legendary' | 'Epic' | 'Rare' | 'Common';
    stars: number;
    averageLast2: number;
    hero_rarity_index: string | number;
    handle?: string;
    heroId?: number;
    role?: string;
    team?: string;
    price?: number;
    floorPrice?: number;
    totalGames?: number;
    naturalRarity?: string;
    adjustedScore?: number;
    count?: number;
    potentialScores?: {
        legendary: number;
        epic: number;
        rare: number;
        natural: number;
    };
}

export interface PlayerCard {
    _id: string;
    hero_id: string;
    name: string;
    picture: string;
    handle?: string;
    hero_rarity_index: number;
    count: number;
    stars: number;
    medianLast4?: number;
    lastTournament1?: number;
    lastTournament2?: number;
    averageLast2?: number;
}

export interface DeckForm {
    numDecks: number;
    maxStars: number;
    numLegendaries: number;
    numEpics: number;
    numRares: number;
    noLimitMode: boolean;
    reverseMode: boolean;
}
