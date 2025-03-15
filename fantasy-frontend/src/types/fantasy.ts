export interface FantasySheet {
    fantasy_top_hero_page?: string;
    hero_id?: number;
    name: string;
    handle?: string;
    flags?: string;
    new_hero_yn?: number;
    created_at: string;
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
    hero_id: number;
    name: string;
    picture: string;
    handle?: string;
    hero_rarity_index?: string | number;
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
