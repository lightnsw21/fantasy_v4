import React, { useState, useEffect } from 'react';
import { MantineProvider, Container, Title, Paper, Group, Button, Text, Table, Badge } from '@mantine/core';
import FantasyTable from './components/FantasyTable';
import DeckPicker from './components/DeckPicker';
import PlayerCards from './components/PlayerCards';
import '@mantine/core/styles.css';
import './App.css';
import { Card, PlayerCard } from './types/fantasy';
import { DeckForm } from './components/DeckPicker';

// Add a constant for the API base URL at the top of the file
const API_BASE_URL = 'http://localhost:8000';

function logWithTimestamp(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

const parseRarity = (heroRarityIndex: string | number | undefined): number => {
    // If undefined or invalid, return default rarity (Common)
    if (heroRarityIndex === undefined) {
        return 4; // Common
    }

    if (typeof heroRarityIndex === 'number') {
        // Validate number is in valid range
        if (heroRarityIndex >= 1 && heroRarityIndex <= 4) {
            return heroRarityIndex;
        }
        return 4; // Default to Common if invalid
    }
    
    try {
        const parts = heroRarityIndex.toString().split('_');
        if (parts.length >= 2) {
            const rarityToken = parseInt(parts[1], 10);
            if (!isNaN(rarityToken) && rarityToken >= 1 && rarityToken <= 4) {
                return rarityToken;
            }
        }
    } catch (error) {
        console.warn('Error parsing rarity:', error);
    }
    return 4; // Default to Common if parsing fails
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

// First, modify how we store decks to include priority information
interface DeckWithPriority {
    cards: Card[];
    priority: number;
}

// Add type guard for card stats
interface CardStats {
    stars: number;
    averageLast2: number;
}

function App() {
    const [apiAvailable, setApiAvailable] = useState(true);
    const [currentPage, setCurrentPage] = useState<'All Cards' | 'Deck Picker' | 'Player Cards'>('All Cards');
    const [deckData, setDeckData] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [playerCards, setPlayerCards] = useState<PlayerCard[]>([]);
    const [allDecks, setAllDecks] = useState<DeckWithPriority[]>([]);
    const [cardUsageCount] = useState(new Map<string, number>());

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
            const response = await fetch(`${API_BASE_URL}/player_cards`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch player cards: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Fetched player cards:', data);
            setPlayerCards(data);
            setError('');
        } catch (error) {
            console.error('Error fetching player cards:', error);
            setError('Failed to fetch player cards. Please try again.');
            setPlayerCards([]);
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

    // Helper functions for card usage tracking
    const canUseCard = (cardName: string, count: number = 1) => {
        const currentUsage = cardUsageCount.get(cardName) || 0;
        return currentUsage < count;
    };

    const markCardUsed = (cardName: string) => {
        const currentUsage = cardUsageCount.get(cardName) || 0;
        cardUsageCount.set(cardName, currentUsage + 1);
    };

    const handleDeckPickerSubmit = async (params: {
        deckForms: DeckForm[];
    }) => {
        try {
            setIsLoading(true);
            cardUsageCount.clear();
            
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

                    const enrichedPlayerCards = playerCards
                        .map(card => {
                            const stats = cardStatsMap.get(card.name);
                            if (!stats) return null;

                            const cardRarityIndex = parseRarity(card.hero_rarity_index);
                            const cardRarity = getRarityText(cardRarityIndex);
                            const naturalMultiplier = getRarityMultiplier(cardRarity);

                            return {
                                ...card,
                                stars: stats.stars,
                                averageLast2: stats.averageLast2,
                                hero_rarity_index: card.hero_rarity_index,
                                rarity: cardRarity as 'Legendary' | 'Epic' | 'Rare' | 'Common',
                                potentialScores: {
                                    legendary: stats.averageLast2 * 2.5,
                                    epic: stats.averageLast2 * 2.0,
                                    rare: stats.averageLast2 * 1.5,
                                    natural: stats.averageLast2 * naturalMultiplier
                                }
                            } as Card;
                        })
                        .filter((card): card is Card => card !== null);

                    // Sort cards by their highest potential score
                    const sortedCards = enrichedPlayerCards
                        // Keep the same star limit check regardless of reverse mode
                        .filter((card): card is Card => {
                            return form.noLimitMode ? true : (card.stars <= form.maxStars);
                        })
                        .sort((a, b) => {
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

                    if (sortedCards.length < 5) {
                        throw new Error(`Not enough valid cards (${sortedCards.length}) under ${form.maxStars} stars. Try increasing the star limit.`);
                    }

                    // Try to build the number of decks specified in this priority
                    for (let i = 0; i < form.numDecks; i++) {
                        const deck = buildDeck(sortedCards, cardUsageCount, {
                            ...form,
                            totalRequestedCards: 5,
                            canUseCard: (name: string, count: number) => canUseCard(name, count),
                            markCardUsed: (name: string) => markCardUsed(name),
                            reverseMode: form.reverseMode
                        });

                        if (deck) {
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
        cardUsageCount: Map<string, number>,
        params: {
            numEpics: number;
            numRares: number;
            numLegendaries: number;
            maxStars: number;
            noLimitMode: boolean;
            reverseMode: boolean;  // Add reverseMode to params
            totalRequestedCards: number;
            canUseCard: (cardName: string, count: number) => boolean;
            markCardUsed: (cardName: string) => void;
        }
    ) => {
        let selectedCards: Card[] = [];
        let totalStars = 0;
        let usedLegendary = 0;
        let usedEpic = 0;
        let usedRare = 0;
        let deckUsedCards = new Set<string>();

        const addCard = (position: number): boolean => {
            if (position === params.totalRequestedCards) {
                // In reverse mode, check if we meet the minimum stars requirement
                if (params.reverseMode && !params.noLimitMode && totalStars < params.maxStars) {
                    return false;
                }
                return true;
            }

            const availableCards = cardsList
                .filter(card => {
                    if (!params.canUseCard(card.name, card.count || 1) || deckUsedCards.has(card.name)) {
                        return false;
                    }

                    const potentialTotalStars = totalStars + (card.stars || 0);
                    
                    if (params.noLimitMode) {
                        return true;
                    }

                    if (params.reverseMode) {
                        // In reverse mode:
                        // 1. For the last card, ensure we'll meet the minimum stars
                        // 2. For other cards, ensure we won't exceed the maximum possible stars
                        if (position === params.totalRequestedCards - 1) {
                            return potentialTotalStars >= params.maxStars;
                        }
                        // Make sure we don't exceed maximum possible stars that would still allow minimum
                        const remainingCards = params.totalRequestedCards - position - 1;
                        const minPossibleRemainingStars = remainingCards * 1; // Minimum 1 star per remaining card
                        return potentialTotalStars + minPossibleRemainingStars <= params.maxStars * 2;
                    } else {
                        // Normal mode - just check maximum stars
                        return potentialTotalStars <= params.maxStars;
                    }
                });

            for (const card of availableCards) {
                const cardStars = card.stars || 0;
                if (!params.noLimitMode && totalStars + cardStars > params.maxStars) continue;

                const cardRarityIndex = parseRarity(card.hero_rarity_index);
                const cardRarity = getRarityText(cardRarityIndex);
                const naturalMultiplier = getRarityMultiplier(cardRarity);

                let possibleRarities: [string, number][] = [];
                
                if (params.noLimitMode) {
                    // In No Limit Mode, use the highest possible rarity based on card's natural rarity
                    if (cardRarityIndex <= 1) possibleRarities.push(['Legendary', 2.5]);
                    else if (cardRarityIndex <= 2) possibleRarities.push(['Epic', 2.0]);
                    else if (cardRarityIndex <= 3) possibleRarities.push(['Rare', 1.5]);
                    // Always include natural rarity
                    possibleRarities.push([cardRarity, naturalMultiplier]);
                } else {
                    // Check if we can still use each rarity type
                    if (usedLegendary < params.numLegendaries && cardRarityIndex <= 1) {
                        possibleRarities.push(['Legendary', 2.5]);
                    }
                    if (usedEpic < params.numEpics && cardRarityIndex <= 2) {
                        possibleRarities.push(['Epic', 2.0]);
                    }
                    if (usedRare < params.numRares && cardRarityIndex <= 3) {
                        possibleRarities.push(['Rare', 1.5]);
                    }
                    // Always allow using card's natural rarity
                    possibleRarities.push([cardRarity, naturalMultiplier]);
                }

                // Sort possible rarities by multiplier (highest first)
                possibleRarities.sort((a, b) => b[1] - a[1]);

                // Try each possible rarity for this card, starting with the highest multiplier
                for (const [rarity, multiplier] of possibleRarities) {
                    if (!params.noLimitMode) {
                        if (rarity === 'Legendary' && usedLegendary >= params.numLegendaries) continue;
                        if (rarity === 'Epic' && usedEpic >= params.numEpics) continue;
                        if (rarity === 'Rare' && usedRare >= params.numRares) continue;
                    }

                    // Track used slots (only in normal mode)
                    if (!params.noLimitMode) {
                        if (rarity === 'Legendary') usedLegendary++;
                        else if (rarity === 'Epic') usedEpic++;
                        else if (rarity === 'Rare') usedRare++;
                    }

                    const effectiveMultiplier = Math.max(multiplier, naturalMultiplier);

                    selectedCards.push({
                        ...card,
                        rarity: rarity as 'Legendary' | 'Epic' | 'Rare' | 'Common',
                        naturalRarity: cardRarity,
                        adjustedScore: (card.averageLast2 || 0) * effectiveMultiplier
                    });
                    totalStars += cardStars;
                    deckUsedCards.add(card.name);
                    params.markCardUsed(card.name);

                    if (addCard(position + 1)) {
                        return true;
                    }

                    selectedCards.pop();
                    totalStars -= cardStars;
                    deckUsedCards.delete(card.name);
                    cardUsageCount.set(card.name, (cardUsageCount.get(card.name) || 0) - 1);
                    
                    // Restore used slots counts (only in normal mode)
                    if (!params.noLimitMode) {
                        if (rarity === 'Legendary') usedLegendary--;
                        else if (rarity === 'Epic') usedEpic--;
                        else if (rarity === 'Rare') usedRare--;
                    }
                }
            }
            return false;
        };

        return addCard(0) ? selectedCards : null;
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
