import React, { useState, useEffect } from 'react';
import { MantineProvider, Container, Title, Paper, Group, Button, Text, Table, Badge } from '@mantine/core';
import FantasyTable from './components/FantasyTable';
import DeckPicker from './components/DeckPicker';
import PlayerCards from './components/PlayerCards';
import CardAnalytics from './components/CardAnalytics';
import '@mantine/core/styles.css';
import './App.css';
import { Card, PlayerCard } from './types/fantasy';
import { DeckForm } from './components/DeckPicker';
import HarUploader from './components/HarUploader';
import { IconRefresh } from '@tabler/icons-react';
import ImportSheet from './components/ImportSheet';
import { getFantasySheets } from './services/api';
import { FantasySheet } from './types/fantasy';

// Add a constant for the API base URL at the top of the file
const API_BASE_URL = 'http://localhost:8000';

function logWithTimestamp(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

const parseRarity = (heroRarityIndex: string | number | undefined): number => {
    // If undefined, return default rarity (Common)
    if (heroRarityIndex === undefined) {
        return 4; // Common
    }

    if (typeof heroRarityIndex === 'number') {
        // Validate number is in valid range
        if (heroRarityIndex >= 1 && heroRarityIndex <= 4) {
            return heroRarityIndex;
        }
        // Only default to Common if the number is completely out of range
        if (heroRarityIndex < 1) return 1; // If below range, treat as Legendary
        if (heroRarityIndex > 4) return 4; // If above range, treat as Common
        return heroRarityIndex;
    }
    
    try {
        const parts = heroRarityIndex.toString().split('_');
        if (parts.length >= 2) {
            const rarityToken = parseInt(parts[1], 10);
            if (!isNaN(rarityToken)) {
                // Keep the same range handling as above
                if (rarityToken < 1) return 1;
                if (rarityToken > 4) return 4;
                return rarityToken;
            }
        }
        // Try to parse the whole string as a number if splitting fails
        const wholeNumber = parseInt(heroRarityIndex, 10);
        if (!isNaN(wholeNumber)) {
            if (wholeNumber < 1) return 1;
            if (wholeNumber > 4) return 4;
            return wholeNumber;
        }
    } catch (error) {
        console.warn('Error parsing rarity:', error);
    }
    return 4; // Default to Common only if all parsing attempts fail
};

const getRarityText = (rarity: number): string => {
    switch (rarity) {
        case 1:
            return 'Legendary';
        case 2:
            return 'Epic';
        case 3:
            return 'Rare';
        case 4:
            return 'Common';
        default:
            return 'Common';
    }
};

// Add this helper function to get multiplier based on rarity
const getRarityMultiplier = (rarity: string): number => {
    switch (rarity) {
        case 'Legendary':
            return 2.5;
        case 'Epic':
            return 2.0;
        case 'Rare':
            return 1.5;
        default:
            return 1.0;
    }
};

// Add type guard for card stats
interface CardStats {
    stars: number;
    averageLast2: number;
}

// Interface for decks with priority information
interface DeckWithPriority {
    cards: Card[];
    priority: number;
}

function App() {
    const [apiAvailable, setApiAvailable] = useState(true);
    const [currentPage, setCurrentPage] = useState<'All Cards' | 'Deck Picker' | 'Player Cards' | 'Import Data' | 'Card Analytics'>('All Cards');
    const [deckData, setDeckData] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [playerCards, setPlayerCards] = useState<PlayerCard[]>([]);
    const [allDecks, setAllDecks] = useState<DeckWithPriority[]>([]);
    const [allCards, setAllCards] = useState<FantasySheet[]>([]);

    const fetchAllCards = async () => {
        try {
            setIsLoading(true);
            const cards = await getFantasySheets();
            setAllCards(cards);
        } catch (err) {
            console.error('Error fetching all cards:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch cards');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllCards();
    }, []);

    useEffect(() => {
        // Check API status with proper error handling
        fetch(`${API_BASE_URL}/api/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('API not available');
                }
                return response.json();
            })
            .then(() => {
                setApiAvailable(true);
                logWithTimestamp('API is available.');
            })
            .catch((error) => {
                console.error('API Status Error:', error);
                setApiAvailable(false);
                logWithTimestamp('API is not available.');
            });
    }, []);

    const fetchPlayerCards = async () => {
        try {
            const response = await fetch('http://localhost:8000/player_cards');
            if (!response.ok) {
                throw new Error('Failed to fetch player cards');
            }
            const data = await response.json();
            setPlayerCards(data);
        } catch (err) {
            console.error('Error fetching player cards:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch player cards');
        }
    };

    useEffect(() => {
        if (currentPage === 'Deck Picker' && playerCards.length === 0) {
            fetchPlayerCards();
        }
    }, [currentPage, playerCards.length]);

    useEffect(() => {
        if (apiAvailable) {
            fetchPlayerCards();
        }
    }, [apiAvailable]);

    const handleDeckPickerSubmit = async (params: {
        deckForms: DeckForm[];
        useAllCards: boolean;
    }) => {
        try {
            setError('');
            setDeckData([]);
            setAllDecks([]);
            setIsLoading(true);
            
            if (playerCards.length === 0) {
                throw new Error('No player cards available. Please load your cards first.');
            }

            const bestDecks: DeckWithPriority[] = [];

            // Process each form in priority order
            for (let priorityIndex = 0; priorityIndex < params.deckForms.length; priorityIndex++) {
                const form = params.deckForms[priorityIndex];
                
                try {
                    const response = await fetch(`${API_BASE_URL}/all_cards`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch card stats: ${response.statusText}`);
                    }

                    const allCards = await response.json();
                    
                    const cardStatsMap = new Map<string, CardStats>(
                        allCards.map((card: any) => [
                            card.name,
                            {
                                stars: card.stars || 0,
                                averageLast2: card.averageLast2 || 0
                            }
                        ])
                    );

                    // Update this line to use the global useAllCards parameter
                    const availableCards = params.useAllCards ? allCards
                        // First filter for cards with offers if that option is enabled
                        .filter((card: any) => {
                            if (form.useCardsWithOffer) {
                                return card.floorLegendary || card.floorEpic || card.floorRare || card.floorCommon;
                            }
                            return true;
                        })
                        .flatMap((card: any) => {
                            const variations: any[] = [];
                            
                            // In no limit mode, add all possible rarity variations regardless of count
                            if (form.noLimitMode) {
                                // Legendary version
                                variations.push({
                                    ...card,
                                    name: card.name,
                                    stars: card.stars || 0,
                                    averageLast2: card.averageLast2 || 0,
                                    hero_rarity_index: 1,
                                    rarity: 'Legendary' as const,
                                    floorPrice: card.floorLegendary,
                                    count: 1, // Set default count in no limit mode
                                    potentialScores: {
                                        legendary: (card.averageLast2 || 0) * 2.5,
                                        epic: (card.averageLast2 || 0) * 2.0,
                                        rare: (card.averageLast2 || 0) * 1.5,
                                        natural: (card.averageLast2 || 0) * 2.5
                                    }
                                });

                                // Epic version
                                variations.push({
                                    ...card,
                                    name: card.name,
                                    stars: card.stars || 0,
                                    averageLast2: card.averageLast2 || 0,
                                    hero_rarity_index: 2,
                                    rarity: 'Epic' as const,
                                    floorPrice: card.floorEpic,
                                    count: 1, // Set default count in no limit mode
                                    potentialScores: {
                                        legendary: (card.averageLast2 || 0) * 2.5,
                                        epic: (card.averageLast2 || 0) * 2.0,
                                        rare: (card.averageLast2 || 0) * 1.5,
                                        natural: (card.averageLast2 || 0) * 2.0
                                    }
                                });

                                // Rare version
                                variations.push({
                                    ...card,
                                    name: card.name,
                                    stars: card.stars || 0,
                                    averageLast2: card.averageLast2 || 0,
                                    hero_rarity_index: 3,
                                    rarity: 'Rare' as const,
                                    floorPrice: card.floorRare,
                                    count: 1, // Set default count in no limit mode
                                    potentialScores: {
                                        legendary: (card.averageLast2 || 0) * 2.5,
                                        epic: (card.averageLast2 || 0) * 2.0,
                                        rare: (card.averageLast2 || 0) * 1.5,
                                        natural: (card.averageLast2 || 0) * 1.5
                                    }
                                });

                                // Common version
                                variations.push({
                                    ...card,
                                    name: card.name,
                                    stars: card.stars || 0,
                                    averageLast2: card.averageLast2 || 0,
                                    hero_rarity_index: 4,
                                    rarity: 'Common' as const,
                                    floorPrice: card.floorCommon,
                                    count: 1, // Set default count in no limit mode
                                    potentialScores: {
                                        legendary: (card.averageLast2 || 0) * 2.5,
                                        epic: (card.averageLast2 || 0) * 2.0,
                                        rare: (card.averageLast2 || 0) * 1.5,
                                        natural: (card.averageLast2 || 0)
                                    }
                                });
                                
                                return variations;
                            }

                            // Original logic for non-no-limit mode
                            // Only add variations for rarities that have offers if useCardsWithOffer is enabled
                            // and only if the maximum number for that rarity is greater than 0
                            if ((!form.useCardsWithOffer || card.floorLegendary) && form.numLegendaries > 0 && card.count > 0) {
                                // Legendary version
                                variations.push({
                                    ...card,
                                    name: card.name,
                                    stars: card.stars || 0,
                                    averageLast2: card.averageLast2 || 0,
                                    hero_rarity_index: 1,
                                    rarity: 'Legendary' as const,
                                    floorPrice: card.floorLegendary,
                                    potentialScores: {
                                        legendary: (card.averageLast2 || 0) * 2.5,
                                        epic: (card.averageLast2 || 0) * 2.0,
                                        rare: (card.averageLast2 || 0) * 1.5,
                                        natural: (card.averageLast2 || 0) * 2.5
                                    }
                                });
                            }

                            if ((!form.useCardsWithOffer || card.floorEpic) && form.numEpics > 0 && card.count > 0) {
                                // Epic version
                                variations.push({
                                    ...card,
                                    name: card.name,
                                    stars: card.stars || 0,
                                    averageLast2: card.averageLast2 || 0,
                                    hero_rarity_index: 2,
                                    rarity: 'Epic' as const,
                                    floorPrice: card.floorEpic,
                                    potentialScores: {
                                        legendary: (card.averageLast2 || 0) * 2.5,
                                        epic: (card.averageLast2 || 0) * 2.0,
                                        rare: (card.averageLast2 || 0) * 1.5,
                                        natural: (card.averageLast2 || 0) * 2.0
                                    }
                                });
                            }

                            if ((!form.useCardsWithOffer || card.floorRare) && form.numRares > 0 && card.count > 0) {
                                // Rare version
                                variations.push({
                                    ...card,
                                    name: card.name,
                                    stars: card.stars || 0,
                                    averageLast2: card.averageLast2 || 0,
                                    hero_rarity_index: 3,
                                    rarity: 'Rare' as const,
                                    floorPrice: card.floorRare,
                                    potentialScores: {
                                        legendary: (card.averageLast2 || 0) * 2.5,
                                        epic: (card.averageLast2 || 0) * 2.0,
                                        rare: (card.averageLast2 || 0) * 1.5,
                                        natural: (card.averageLast2 || 0) * 1.5
                                    }
                                });
                            }

                            // Always add common version since it's the base rarity
                            if (!form.useCardsWithOffer || card.floorCommon) {
                                // Common version
                                if (card.count > 0) {
                                    variations.push({
                                        ...card,
                                        name: card.name,
                                        stars: card.stars || 0,
                                        averageLast2: card.averageLast2 || 0,
                                        hero_rarity_index: 4,
                                        rarity: 'Common' as const,
                                        floorPrice: card.floorCommon,
                                        potentialScores: {
                                            legendary: (card.averageLast2 || 0) * 2.5,
                                            epic: (card.averageLast2 || 0) * 2.0,
                                            rare: (card.averageLast2 || 0) * 1.5,
                                            natural: (card.averageLast2 || 0)
                                        }
                                    });
                                }
                            }
                            return variations;
                        })
                        .filter((card: any) => {
                            // Remove the count check in no limit mode
                            if (form.noLimitMode) {
                                return true;
                            }
                            const cardRarity = getRarityText(parseRarity(card.hero_rarity_index));
                            const key = `${card.name}_${cardRarity}`;
                            const currentUsage = card.count || 0;
                            const maxUses = card.count || 1;
                            return currentUsage < maxUses;
                        })
                    : playerCards
                        .filter(card => {
                            return true; // Temporarily remove count filter to see all cards
                        })
                        .map(card => {
                            const stats = cardStatsMap.get(card.name);
                            
                            // Provide default stats if none found
                            const cardStats = stats || {
                                stars: 1,
                                averageLast2: 1
                            };

                            const cardRarityIndex = parseRarity(card.hero_rarity_index);
                            const cardRarity = getRarityText(cardRarityIndex);
                            const naturalMultiplier = getRarityMultiplier(cardRarity);

                            return {
                                ...card,
                                stars: cardStats.stars,
                                averageLast2: cardStats.averageLast2,
                                hero_rarity_index: card.hero_rarity_index,
                                rarity: cardRarity as 'Legendary' | 'Epic' | 'Rare' | 'Common',
                                count: card.count || 1, // Ensure count has a default
                                potentialScores: {
                                    legendary: cardStats.averageLast2 * 2.5,
                                    epic: cardStats.averageLast2 * 2.0,
                                    rare: cardStats.averageLast2 * 1.5,
                                    natural: cardStats.averageLast2 * naturalMultiplier
                                }
                            } as Card;
                        })
                        .filter((card): card is Card => card !== null);

                    // Sort cards by their highest potential score
                    const sortedCards = availableCards
                        .filter((card: Card) => {
                            // Remove star limit check when in no limit mode
                            if (form.noLimitMode) {
                                return true;
                            }
                            return card.stars <= form.maxStars;
                        })
                        .sort((a: Card, b: Card) => {
                            const aRarityIndex = parseRarity(a.hero_rarity_index);
                            const bRarityIndex = parseRarity(b.hero_rarity_index);
                            const aRarity = getRarityText(aRarityIndex);
                            const bRarity = getRarityText(bRarityIndex);
                            const aNaturalMultiplier = getRarityMultiplier(aRarity);
                            const bNaturalMultiplier = getRarityMultiplier(bRarity);

                            // Calculate scores
                            const aMaxScore = a.averageLast2 * aNaturalMultiplier;
                            const bMaxScore = b.averageLast2 * bNaturalMultiplier;

                            // In reverse mode, prefer cards with:
                            // 1. Lower scores
                            // 2. If scores are close (within 10%), prefer lower star cards
                            if (form.reverseMode) {
                                const scoreDiff = Math.abs(aMaxScore - bMaxScore);
                                const avgScore = (aMaxScore + bMaxScore) / 2;
                                const scoreThreshold = avgScore * 0.1; // 10% threshold

                                if (scoreDiff <= scoreThreshold) {
                                    // If scores are close, prefer lower star cards
                                    return a.stars - b.stars;
                                }
                                return aMaxScore - bMaxScore;
                            }

                            // Normal mode - higher scores first
                            return bMaxScore - aMaxScore;
                        });
                    // Remove or modify the length check to account for no limit mode
                    if (!form.noLimitMode && sortedCards.length < 5) {
                        throw new Error(`Not enough valid cards (${sortedCards.length}) under ${form.maxStars} stars. Try increasing the star limit.`);
                    } else if (sortedCards.length < 5) {
                        throw new Error(`Not enough valid cards (${sortedCards.length}) available.`);
                    }


                    // Try to build the number of decks specified in this priority
                    for (let i = 0; i < form.numDecks; i++) {
                        // Keep track of used cards within this priority
                        const usedCardCounts = new Map<string, number>();
                        const timePerDeck = form.timeLimit * 1000;
                        
                        // Create a filtered list of available cards for this deck
                        const availableCardsForThisDeck = sortedCards.filter((card: Card) => {
                            const cardRarity = getRarityText(parseRarity(card.hero_rarity_index));
                            const key = `${card.name}_${cardRarity}`;
                            const currentUsage = card.count || 0;
                            return currentUsage > 0;
                        });
                        // If we don't have enough cards for a full deck, stop generating more decks
                        if (availableCardsForThisDeck.length < 5) {
                            console.log(`Not enough cards left for deck ${i + 1} (only ${availableCardsForThisDeck.length} available)`);
                            break;
                        }

                        const deck = buildDeck(availableCardsForThisDeck, usedCardCounts, {
                            ...form,
                            totalRequestedCards: 5,
                            canUseCard: (name: string, rarity: string, count: number) => {
                                const key = `${name}_${rarity}`;
                                const currentUsage = usedCardCounts.get(key) || 0;
                                return currentUsage < count;
                            },
                            markCardUsed: (name: string, rarity: string) => {
                                const key = `${name}_${rarity}`;
                                const currentUsage = usedCardCounts.get(key) || 0;
                                usedCardCounts.set(key, currentUsage + 1);
                            },
                            reverseMode: form.reverseMode,
                            priceLimit: form.priceLimit,
                            timeLimit: timePerDeck
                        });

                        if (deck) {
                            // Update counts in sortedCards for used cards
                            deck.forEach((usedCard) => {
                                const cardIndex = sortedCards.findIndex(card => 
                                    card.name === usedCard.name && 
                                    card.rarity === usedCard.rarity
                                );
                                if (cardIndex !== -1) {
                                    // Decrease the count
                                    sortedCards[cardIndex] = {
                                        ...sortedCards[cardIndex],
                                        count: (sortedCards[cardIndex].count || 1) - 1
                                    };
                                }
                                console.log('Decrease count for ' + usedCard.name + ' to ' + sortedCards[cardIndex].count);
                            });

                            bestDecks.push({
                                cards: deck,
                                priority: priorityIndex + 1
                            });
                        } else {
                            break;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching all cards:', error);
                    throw new Error('Failed to fetch card stats. Please try again.');
                }
            }

            if (bestDecks.length === 0) {
                throw new Error('Could not build any valid decks with the given parameters');
            }

            // Sort decks by total score (respecting reverse mode)
            bestDecks.sort((a, b) => {
                const scoreA = a.cards.reduce((sum, card) => sum + (card.adjustedScore || 0), 0);
                const scoreB = b.cards.reduce((sum, card) => sum + (card.adjustedScore || 0), 0);
                // Sort in reverse if any form has reverse mode enabled
                const shouldReverse = params.deckForms.some(form => form.reverseMode);
                return shouldReverse ? scoreA - scoreB : scoreB - scoreA;
            });

            setDeckData(bestDecks[0]?.cards || []);
            setAllDecks(bestDecks);
        } catch (error) {
            console.error('Error:', error);
            setError(error instanceof Error ? error.message : 'Failed to build deck');
            setDeckData([]);
            setAllDecks([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Update buildDeck function to handle reverse mode minimum stars
    const buildDeck = (
        cardsList: Card[],
        usedCardCounts: Map<string, number>,
        params: {
            numEpics: number;
            numRares: number;
            numLegendaries: number;
            maxStars: number;
            noLimitMode: boolean;
            reverseMode: boolean;
            totalRequestedCards: number;
            canUseCard: (cardName: string, rarity: string, count: number) => boolean;
            markCardUsed: (cardName: string, rarity: string) => void;
            priceLimit: number | null;
            timeLimit: number; // Add timeLimit parameter
        }
    ) => {
        console.log('Starting deck building with parameters:', {
            maxStars: params.maxStars,
            noLimitMode: params.noLimitMode,
            reverseMode: params.reverseMode,
            priceLimit: params.priceLimit,
            numEpics: params.numEpics,
            numRares: params.numRares,
            numLegendaries: params.numLegendaries,
            totalCards: cardsList.length,
            timeLimit: params.timeLimit
        });

        let selectedCards: Card[] = [];
        let bestDeck: Card[] | null = null;
        let bestScore = params.reverseMode ? Infinity : -Infinity;
        let totalStars = 0;
        let totalPrice = 0;
        let usedLegendary = 0;
        let usedEpic = 0;
        let usedRare = 0;
        let deckUsedCards = new Set<string>();
        let attemptedCombinations = 0;
        
        // First filter cards by price limit and sort by adjusted score
        const filteredCards = cardsList
            .filter(card => {
                if (params.priceLimit === null) return true;
                return (card.floorPrice || 0) <= params.priceLimit / params.totalRequestedCards;
            })
            .sort((a, b) => {
                const aRarityIndex = parseRarity(a.hero_rarity_index);
                const bRarityIndex = parseRarity(b.hero_rarity_index);
                const aMultiplier = aRarityIndex <= 1 ? 2.5 : 
                                  aRarityIndex <= 2 ? 2.0 :
                                  aRarityIndex <= 3 ? 1.5 : 1.0;
                const bMultiplier = bRarityIndex <= 1 ? 2.5 : 
                                  bRarityIndex <= 2 ? 2.0 :
                                  bRarityIndex <= 3 ? 1.5 : 1.0;
                const aScore = (a.averageLast2 || 0) * aMultiplier;
                const bScore = (b.averageLast2 || 0) * bMultiplier;
                return params.reverseMode ? aScore - bScore : bScore - aScore;
            });

        console.log('Filtered cards names and rarities:', filteredCards.map(card => ({
            name: card.name,
            rarity: getRarityText(parseRarity(card.hero_rarity_index)),
            count: card.count
        })));
        // Pre-calculate maximum possible score per position using filtered cards
        const maxPossibleScorePerPosition = filteredCards
            .slice(0, 20)
            .map(card => {
                const cardRarityIndex = parseRarity(card.hero_rarity_index);
                const maxMultiplier = cardRarityIndex <= 1 ? 2.5 : 
                                    cardRarityIndex <= 2 ? 2.0 :
                                    cardRarityIndex <= 3 ? 1.5 : 1.0;
                return (card.averageLast2 || 0) * maxMultiplier;
            });

        console.log('Maximum possible scores per position:', maxPossibleScorePerPosition);

        const getMaxPossibleRemainingScore = (position: number): number => {
            let remainingPositions = params.totalRequestedCards - position;
            return Array.from({length: remainingPositions}, (_, i) => maxPossibleScorePerPosition[i] || 0)
                .reduce((sum, score) => sum + score, 0);
        };

        const addCard = (position: number, timeStarted: number): boolean => {
            attemptedCombinations++;

            if (Date.now() - timeStarted > params.timeLimit) {
                console.log('Time limit reached. Stopping search with best score:', bestScore);
                return true;
            }

            if (position === params.totalRequestedCards) {
                // Log completion of a deck

                if (params.reverseMode && !params.noLimitMode && totalStars < params.maxStars) {
                    console.log('Rejecting deck: Not enough stars in reverse mode', { totalStars, required: params.maxStars });
                    return false;
                }
                if (params.priceLimit !== null && totalPrice > params.priceLimit) {
                    console.log('Rejecting deck: Exceeds price limit', { totalPrice, limit: params.priceLimit });
                    return false;
                }

                const currentScore = selectedCards.reduce((sum, card) => sum + (card.adjustedScore || 0), 0);
                
                if ((params.reverseMode && currentScore < bestScore) || 
                    (!params.reverseMode && currentScore > bestScore)) {
                    bestScore = currentScore;
                    bestDeck = [...selectedCards];
                }
                
                return false;
            }

            const currentScore = selectedCards.reduce((sum, card) => sum + (card.adjustedScore || 0), 0);
            
            if (!params.reverseMode && bestScore !== -Infinity) {
                const maxPossibleScore = currentScore + getMaxPossibleRemainingScore(position);
                if (maxPossibleScore <= bestScore) {
                    return false;
                }
            }
            console.log('Filtered cards:' + filteredCards.length);
            const availableCards = filteredCards
                .slice(0, 50)
                .filter(card => {
                    const cardRarity = getRarityText(parseRarity(card.hero_rarity_index));

                    // Check if card is already in selectedCards
                    const isCardAlreadySelected = selectedCards.some(
                        selectedCard => selectedCard.name === card.name && selectedCard.rarity === cardRarity
                    );
                    if (isCardAlreadySelected) {
                        console.log('Rejecting card: Already in deck', { card: card.name, rarity: cardRarity });
                        return false;
                    }

                    if (!params.canUseCard(card.name, cardRarity, card.count || 1)){
                        return false;
                    }
                    if (deckUsedCards.has(`${card.name}_${cardRarity}`)) {
                        console.log('Rejecting card: Already used', { card: card.name, rarity: cardRarity });
                        return false;
                    }

                    const potentialTotalStars = totalStars + (card.stars || 0);
                    const potentialTotalPrice = totalPrice + (card.floorPrice || 0);
                    
                    if (params.priceLimit !== null && potentialTotalPrice > params.priceLimit) {
                        console.log('Rejecting card: Exceeds price limit', { totalPrice, limit: params.priceLimit });
                        return false;
                    }

                    if (params.noLimitMode) {
                        console.log('Accepting card: No limit mode', { card: card.name, totalPrice, limit: params.priceLimit });
                        return true;
                    }

                    if (params.reverseMode) {
                        if (position === params.totalRequestedCards - 1) {
                            return potentialTotalStars >= params.maxStars;
                        }
                        const remainingCards = params.totalRequestedCards - position - 1;
                        const minPossibleRemainingStars = remainingCards * 1;
                        return potentialTotalStars + minPossibleRemainingStars <= params.maxStars * 2;
                    } else {
                        return potentialTotalStars <= params.maxStars;
                    }
                });
            console.log('Available cards for this deck:' + availableCards.length);
            if (availableCards.length === 0) {
                console.log('No valid cards available for position', position + 1);
            }

            for (const card of availableCards) {
                const cardStars = card.stars || 0;
                if (!params.noLimitMode && totalStars + cardStars > params.maxStars) {
                    console.log('Skipping card: Would exceed star limit', {
                        card: card.name,
                        currentStars: totalStars,
                        cardStars,
                        limit: params.maxStars
                    });
                    continue;
                }

                const cardRarityIndex = parseRarity(card.hero_rarity_index);
                const cardRarity = getRarityText(cardRarityIndex);
                const naturalMultiplier = getRarityMultiplier(cardRarity);

                let possibleRarities: [string, number][] = [];
                
                if (params.noLimitMode) {
                    if (cardRarityIndex <= 1) {
                        possibleRarities.push(['Legendary', 2.5]);
                    } else if (cardRarityIndex <= 2) {
                        possibleRarities.push(['Epic', 2.0]);
                    } else if (cardRarityIndex <= 3) {
                        possibleRarities.push(['Rare', 1.5]);
                    } else {
                        possibleRarities.push([cardRarity, naturalMultiplier]);
                    }
                } else {
                    if (usedLegendary < params.numLegendaries && cardRarityIndex <= 1) {
                        possibleRarities.push(['Legendary', 2.5]);
                    }
                    if (usedEpic < params.numEpics && cardRarityIndex <= 2) {
                        possibleRarities.push(['Epic', 2.0]);
                    }
                    if (usedRare < params.numRares && cardRarityIndex <= 3) {
                        possibleRarities.push(['Rare', 1.5]);
                    }
                    possibleRarities.push([cardRarity, naturalMultiplier]);
                }


                for (const [rarity, multiplier] of possibleRarities) {
                    if (!params.noLimitMode) {
                        if (rarity === 'Legendary' && usedLegendary >= params.numLegendaries) continue;
                        if (rarity === 'Epic' && usedEpic >= params.numEpics) continue;
                        if (rarity === 'Rare' && usedRare >= params.numRares) continue;
                    }

                    if (!params.noLimitMode) {
                        if (rarity === 'Legendary') usedLegendary++;
                        else if (rarity === 'Epic') usedEpic++;
                        else if (rarity === 'Rare') usedRare++;
                    }

                    const effectiveMultiplier = Math.max(multiplier, naturalMultiplier);
                    const adjustedScore = (card.averageLast2 || 0) * effectiveMultiplier;


                    selectedCards.push({
                        ...card,
                        rarity: rarity as 'Legendary' | 'Epic' | 'Rare' | 'Common',
                        naturalRarity: cardRarity,
                        adjustedScore
                    });
                    totalStars += cardStars;
                    totalPrice += card.floorPrice || 0;
                    deckUsedCards.add(`${card.name}_${rarity}`);
                    params.markCardUsed(card.name, rarity);


                    if (addCard(position + 1, timeStarted)) {
                        return true;
                    }


                    selectedCards.pop();
                    totalStars -= cardStars;
                    totalPrice -= card.floorPrice || 0;
                    deckUsedCards.delete(`${card.name}_${rarity}`);
                    
                    if (!params.noLimitMode) {
                        if (rarity === 'Legendary') usedLegendary--;
                        else if (rarity === 'Epic') usedEpic--;
                        else if (rarity === 'Rare') usedRare--;
                    }
                }
            }
            return false;
        };

        const timeStarted = Date.now();
        addCard(0, timeStarted);
        
        console.log('Deck building completed:', {
            totalAttempts: attemptedCombinations,
            timeSpent: Date.now() - timeStarted,
            foundValidDeck: bestDeck !== null,
            finalBestScore: bestScore
        });

        return bestDeck;
    };

    // Update the render deck function to show priority
    const renderDeck = (deckWithPriority: DeckWithPriority | null, index: number) => {
        if (!deckWithPriority || !deckWithPriority.cards) {
            return null;
        }

        return (
            <Paper mt="xl" p="md" radius="md" style={{ backgroundColor: '#2a2a2a' }}>
                <Group justify="space-between" mb="md">
                    <Title order={2} size="h3" style={{ color: 'white' }}>
                        {index === 0 ? 'Best Deck' : `Deck ${index + 1}`}
                    </Title>
                    <Badge size="lg" variant="filled" color="blue">
                        Priority {deckWithPriority.priority}
                    </Badge>
                </Group>
                <Table 
                    striped 
                    highlightOnHover
                    style={{ backgroundColor: '#2a2a2a', color: 'white' }}
                >
                    <thead>
                        <tr>
                            <th style={{ color: 'white' }}>Name</th>
                            <th style={{ color: 'white' }}>Base Score</th>
                            <th style={{ color: 'white' }}>Stars</th>
                            <th style={{ color: 'white' }}>Rarity</th>
                            <th style={{ color: 'white' }}>Adjusted Score</th>
                            <th style={{ color: 'white' }}>Floor Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deckWithPriority.cards.map((card: Card, cardIndex: number) => (
                            <tr key={cardIndex}>
                                <td style={{ color: 'white' }}>{card.name}</td>
                                <td style={{ color: 'white' }}>{card.averageLast2?.toFixed(2) || 0}</td>
                                <td style={{ color: 'white' }}>{card.stars || 0}</td>
                                <td>
                                    <Badge 
                                        color={
                                            card.rarity === 'Legendary' ? 'yellow' :
                                            card.rarity === 'Epic' ? 'purple' :
                                            card.rarity === 'Rare' ? 'blue' : 'gray'
                                        }
                                    >
                                        {card.rarity}
                                    </Badge>
                                </td>
                                <td style={{ color: 'white', fontWeight: 'bold' }}>
                                    {card.adjustedScore?.toFixed(2)}
                                </td>
                                <td style={{ color: 'white' }}>
                                    {card.floorPrice ? `${card.floorPrice.toFixed(2)} ETH` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
                <Paper mt="md" p="md" radius="md" style={{ backgroundColor: '#3a3a3a' }}>
                    <Group justify="space-between">
                        <Text size="lg" fw={500} style={{ color: 'white' }}>
                            Total Stars: {deckWithPriority.cards.reduce((sum, card) => sum + (card.stars || 0), 0)}
                        </Text>
                        <Text size="lg" fw={500} style={{ color: 'white' }}>
                            Total Score: {deckWithPriority.cards.reduce((sum, card) => sum + (card.adjustedScore || 0), 0).toFixed(2)}
                        </Text>
                        <Text size="lg" fw={500} style={{ color: 'white' }}>
                            Total Price: {deckWithPriority.cards.some(card => card.floorPrice) 
                                ? `${deckWithPriority.cards.reduce((sum, card) => sum + (card.floorPrice || 0), 0).toFixed(4)} ETH`
                                : '-'
                            }
                        </Text>
                    </Group>
                </Paper>
            </Paper>
        );
    };

    return (
        <MantineProvider theme={{ primaryColor: 'blue' }}>
            <div style={{ 
                minHeight: '100vh',
                backgroundColor: '#2a2a2a',
                padding: '2rem',
            }}>
                <Container size="xl">
                    <Title 
                        order={1} 
                        mb="xl"
                        c="white"
                        style={{ textAlign: 'center' }}
                    >
                        Fantasy Deck Builder
                    </Title>
                    <Group justify="center" mb="xl">
                        <Button 
                            variant={currentPage === 'All Cards' ? 'filled' : 'outline'} 
                            onClick={() => setCurrentPage('All Cards')}
                            size="lg"
                            style={{ width: '150px' }}
                        >
                            All Cards
                        </Button>
                        <Button 
                            variant={currentPage === 'Deck Picker' ? 'filled' : 'outline'} 
                            onClick={() => setCurrentPage('Deck Picker')}
                            size="lg"
                            style={{ width: '150px' }}
                        >
                            Deck Picker
                        </Button>
                        <Button 
                            variant={currentPage === 'Player Cards' ? 'filled' : 'outline'} 
                            onClick={() => setCurrentPage('Player Cards')}
                            size="lg"
                            style={{ width: '150px' }}
                        >
                            Player Cards
                        </Button>
                        <Button 
                            variant={currentPage === 'Card Analytics' ? 'filled' : 'outline'} 
                            onClick={() => setCurrentPage('Card Analytics')}
                            size="lg"
                            style={{ width: '150px' }}
                        >
                            Card Analytics
                        </Button>
                        <Button 
                            variant={currentPage === 'Import Data' ? 'filled' : 'outline'} 
                            onClick={() => setCurrentPage('Import Data')}
                            size="lg"
                            style={{ width: '150px' }}
                        >
                            Import Data
                        </Button>
                    </Group>
                    <Paper 
                        shadow="xl" 
                        p="xl" 
                        radius="md"
                        style={{ 
                            backgroundColor: '#3a3a3a',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {apiAvailable ? (
                            currentPage === 'All Cards' ? (
                                <FantasyTable />
                            ) : currentPage === 'Deck Picker' ? (
                                <>
                                    {playerCards.length > 0 ? (
                                        <DeckPicker onSubmit={handleDeckPickerSubmit} />
                                    ) : (
                                        <Text c="yellow" size="lg" ta="center">
                                            Please load your player cards first from the Player Cards tab
                                        </Text>
                                    )}
                                    {isLoading && (
                                        <Text c="blue" size="lg" fw={500} ta="center" mt="md">
                                            Loading deck data...
                                        </Text>
                                    )}
                                    {error && (
                                        <Text c="red" size="lg" fw={500} ta="center" mt="md">
                                            {error}
                                        </Text>
                                    )}
                                    {allDecks.length > 0 && (
                                        <div>
                                            {allDecks.filter(deck => deck && deck.cards).map((deck, index) => (
                                                <div key={`deck-${index}-${deck.cards.reduce((sum, card) => sum + card.name, '')}`}>
                                                    {renderDeck(deck, index)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : currentPage === 'Player Cards' ? (
                                <PlayerCards 
                                    cards={playerCards} 
                                    setCards={setPlayerCards}
                                />
                            ) : currentPage === 'Card Analytics' ? (
                                <CardAnalytics cards={allCards} />
                            ) : currentPage === 'Import Data' ? (
                                <Paper p="xl" radius="md" style={{ backgroundColor: '#2a2a2a' }}>
                                    <Title order={2} c="white" ta="center" mb="xl" size="h1">
                                        Import Data
                                    </Title>
                                    
                                    <Paper p="xl" radius="md" style={{ backgroundColor: '#3a3a3a' }} mb="xl">
                                        <Title order={3} c="white" ta="center" mb="md" size="h2">
                                            Upload
                                        </Title>
                                        <Text c="white" size="lg" ta="center" mb="xl" maw={800} mx="auto" fw={500}>
                                            Select a fantasy sheets Excel file to import your data.
                                        </Text>
                                        <ImportSheet onImportSuccess={fetchAllCards} />
                                    </Paper>

                                    <Paper p="xl" radius="md" style={{ backgroundColor: '#3a3a3a' }} mb="xl">
                                        <Title order={3} c="white" ta="center" mb="md" size="h2">
                                            Upload
                                        </Title>
                                        <Text c="white" size="lg" ta="center" mb="xl" maw={800} mx="auto" fw={500}>
                                            Select a HAR file to import your player data.
                                        </Text>
                                        <Paper p="xl" radius="md" style={{ backgroundColor: '#2a2a2a' }} mb="lg">
                                            <HarUploader onImportSuccess={fetchPlayerCards} />
                                        </Paper>
                                    </Paper>
                                </Paper>
                            ) : null
                        ) : (
                            <div className="status-container">
                                <Text c="yellow" size="xl" fw={500} ta="center">
                                    The API is currently unavailable. Please try again later.
                                </Text>
                            </div>
                        )}
                    </Paper>
                </Container>
            </div>
        </MantineProvider>
    );
}

export default App;
