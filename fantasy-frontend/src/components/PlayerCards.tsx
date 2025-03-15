import React, { useState, useEffect } from 'react';
import { Text, Paper, Badge, Group, Loader, Image, Card, SimpleGrid } from '@mantine/core';
import HarUploader from './HarUploader';

interface PlayerCard {
    _id: string;
    hero_id: string;
    hero_rarity_index: number;
    count: number;
    picture: string;
    handle: string;
    name: string;
    stars: number;
    medianLast4?: number;
    lastTournament1?: number;
    lastTournament2?: number;
    averageLast2?: number;
}

interface FantasySheet {
    hero_id: string;
    medianLast4?: number;
    lastTournament1?: number;
    lastTournament2?: number;
    averageLast2?: number;
}

const parseRarity = (heroRarityIndex: string | number): number => {
    if (typeof heroRarityIndex === 'number') {
        return heroRarityIndex;
    }
    
    const parts = heroRarityIndex.toString().split('_');
    if (parts.length >= 2) {
        const rarityToken = parseInt(parts[1], 10);
        if (!isNaN(rarityToken) && rarityToken >= 1 && rarityToken <= 4) {
            return rarityToken;
        }
    }
    return 1; // default to common
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

const getRarityColor = (rarity: number): string => {
    switch (rarity) {
        case 1:
            return 'yellow';
        case 2:
            return 'purple';
        case 3:
            return 'blue';
        case 4:
            return 'gray';
        default:
            return 'gray';
    }
};

const getRarityMultiplier = (rarity: number): number => {
    switch (rarity) {
        case 1: // Legendary
            return 2.5;
        case 2: // Epic
            return 2.0;
        case 3: // Rare
            return 1.5;
        case 4: // Common
            return 1.0;
        default:
            return 1.0;
    }
};

const calculatePotentialScore = (card: PlayerCard): number => {
    const rarity = parseRarity(card.hero_rarity_index);
    const multiplier = getRarityMultiplier(rarity);
    return (card.averageLast2 || 0) * multiplier;
};

interface PlayerCardsProps {
    cards: PlayerCard[];
    setCards: (cards: PlayerCard[]) => void;
}

export const PlayerCards: React.FC<PlayerCardsProps> = ({ cards, setCards }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [playerCardsResponse, allCardsResponse] = await Promise.all([
                    fetch('http://localhost:8000/player_cards'),
                    fetch('http://localhost:8000/all_cards')
                ]);

                if (!playerCardsResponse.ok || !allCardsResponse.ok) {
                    throw new Error('Failed to fetch data');
                }

                const playerCardsData = await playerCardsResponse.json();
                const allCardsData: FantasySheet[] = await allCardsResponse.json();

                const fantasyDataMap = new Map(
                    allCardsData.map(card => [card.hero_id, card])
                );

                const mergedCards = playerCardsData.map((playerCard: PlayerCard) => {
                    const fantasyData = fantasyDataMap.get(playerCard.hero_id);
                    if (fantasyData) {
                        return {
                            ...playerCard,
                            medianLast4: fantasyData.medianLast4,
                            lastTournament1: fantasyData.lastTournament1,
                            lastTournament2: fantasyData.lastTournament2,
                            averageLast2: fantasyData.averageLast2
                        };
                    }
                    return playerCard;
                });

                // Sort cards by potential score
                const sortedCards = mergedCards.sort((a: PlayerCard, b: PlayerCard) => {
                    const scoreA = calculatePotentialScore(a);
                    const scoreB = calculatePotentialScore(b);
                    return scoreB - scoreA; // Sort in descending order
                });

                console.log('Merged and sorted card data:', sortedCards[0]);
                setCards(sortedCards);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError(error instanceof Error ? error.message : 'Failed to fetch data');
                setLoading(false);
            }
        };

        fetchAllData();
    }, []); // Run once on mount

    if (loading) {
        return (
            <Group justify="center" py="xl">
                <Loader size="lg" variant="dots" color="blue" />
            </Group>
        );
    }

    if (error) {
        return <Text c="red" size="lg" ta="center">{error}</Text>;
    }

    return (
        <Paper p="md" radius="md" style={{ backgroundColor: '#2a2a2a' }}>
            <Text size="xl" fw={700} c="white" ta="center" mb="lg">
                My Player Cards
            </Text>
            
            <SimpleGrid 
                cols={4} 
                spacing="lg" 
                breakpoints={{
                    md: { cols: 3, spacing: 'md' },
                    sm: { cols: 2, spacing: 'sm' },
                    xs: { cols: 1, spacing: 'sm' }
                }}
            >
                {cards.map((card) => {
                    const rarity = parseRarity(card.hero_rarity_index);
                    const potentialScore = calculatePotentialScore(card);
                    return (
                        <Card 
                            key={card._id}
                            shadow="sm"
                            padding="lg"
                            radius="md"
                            withBorder
                            style={{
                                backgroundColor: '#2C2E33',
                                transition: 'transform 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-5px)',
                                }
                            }}
                        >
                            <Card.Section>
                                <Image
                                    src={card.picture}
                                    height={200}
                                    alt={card.name}
                                    style={{ 
                                        objectFit: 'cover',
                                        backgroundColor: '#2a2a2a' 
                                    }}
                                    fallbackSrc={`https://placehold.co/200x200?text=${encodeURIComponent(card.name || card.handle || 'Unknown')}`}
                                />
                            </Card.Section>

                            <Group justify="apart" mt="md" mb="xs">
                                <Text fw={500} size="lg" color="white" style={{ flex: 1 }}>
                                    {card.name || card.handle || 'Unknown Hero'}
                                </Text>
                                <Badge 
                                    color={getRarityColor(rarity)}
                                    variant="light"
                                    size="lg"
                                >
                                    {getRarityText(rarity)}
                                </Badge>
                            </Group>

                            <Text size="sm" color="gray.4" mb="md">
                                {card.handle}
                            </Text>

                            <Group justify="apart" mb="md">
                                <div>
                                    <Text size="sm" color="gray.4">Potential Score:</Text>
                                    <Text size="lg" fw={500} color="gray.1">
                                        {potentialScore.toFixed(1)}
                                    </Text>
                                </div>
                            </Group>

                            <Group justify="right">
                                <Badge 
                                    size="xl" 
                                    variant="filled" 
                                    color="blue"
                                >
                                    ×{card.count}
                                </Badge>
                            </Group>
                        </Card>
                    )
                })}
            </SimpleGrid>
            
            <Paper mt="xl" p="md" radius="md" style={{ backgroundColor: '#3a3a3a' }}>
                <HarUploader />
            </Paper>
        </Paper>
    );
};

export default PlayerCards; 