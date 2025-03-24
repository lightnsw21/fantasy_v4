import axios from 'axios';
import { FantasySheet } from '../types/fantasy';

const API_URL = 'http://localhost:8000';

export const getFantasySheets = async (): Promise<FantasySheet[]> => {
    const response = await axios.get(`${API_URL}/all_cards`);
    return response.data as FantasySheet[];
};

export const importFantasySheet = async (file: File): Promise<{ message: string; record_count: number }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/import-sheet`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data as { message: string; record_count: number };
};

interface InvestmentSuggestion {
    name: string;
    hero_id: string;
    rarity: string;
    floor_price: number;
    average_last_2: number;
    historical_average: number;
    score_consistency: number;
    score_efficiency: number;
    investment_score: number;
    historical_games: number;
    stars: number;
    historical_scores: { [key: string]: number };
}

interface InvestmentSuggestionsResponse {
    success: boolean;
    count: number;
    suggestions: InvestmentSuggestion[];
}

export const getInvestmentSuggestions = async (
    maxPrice?: number,
    minHistoricalGames: number = 3,
    rarity?: string,
    limit: number = 10
): Promise<InvestmentSuggestion[]> => {
    const params = new URLSearchParams();
    if (maxPrice !== undefined) params.append('max_price', maxPrice.toString());
    if (minHistoricalGames !== undefined) params.append('min_historical_games', minHistoricalGames.toString());
    if (rarity) params.append('rarity', rarity);
    if (limit) params.append('limit', limit.toString());

    const response = await axios.get<InvestmentSuggestionsResponse>(`${API_URL}/investment-suggestions?${params.toString()}`);
    return response.data.suggestions;
};
