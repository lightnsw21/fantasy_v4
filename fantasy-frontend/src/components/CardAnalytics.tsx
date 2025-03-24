import React, { useState, useEffect } from 'react';
import { Paper, Title, Text, Group, Select, Badge, Grid, NumberInput, Button, Card, Loader, Table } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FantasySheet } from '../types/fantasy';
import { getInvestmentSuggestions } from '../services/api';

interface CardAnalyticsProps {
    cards: FantasySheet[];
}

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

const CardAnalytics: React.FC<CardAnalyticsProps> = ({ cards }) => {
    const [selectedCard, setSelectedCard] = useState<string | null>(null);
    const [cardData, setCardData] = useState<FantasySheet | null>(null);
    const [historicalData, setHistoricalData] = useState<any[]>([]);
    const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
    const [minHistoricalGames, setMinHistoricalGames] = useState<number>(3);
    const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<InvestmentSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [sortColumn, setSortColumn] = useState<string>('investment_score');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedSuggestion, setSelectedSuggestion] = useState<InvestmentSuggestion | null>(null);

    useEffect(() => {
        if (selectedCard && cards) {
            const card = cards.find(c => c.name === selectedCard);
            if (card) {
                console.log('Selected card data:', card);
                setCardData(card);
                
                let scoreData: { date: string; score: number }[] = [];

                // First try to get scores from historical_scores
                if (card.historical_scores && typeof card.historical_scores === 'object' && Object.keys(card.historical_scores).length > 0) {
                    console.log('Processing historical_scores object:', card.historical_scores);
                    
                    scoreData = Object.entries(card.historical_scores)
                        .map(([date, score]) => {
                            const numericScore = typeof score === 'number' ? score : parseFloat(score as string);
                            console.log(`Processing historical score - Date: ${date}, Value: ${score}, Parsed Score: ${numericScore}`);
                            return {
                                date,
                                score: numericScore
                            };
                        })
                        .filter(item => !isNaN(item.score));
                } else {
                    console.log('No historical_scores found, using tournament scores as fallback');
                    
                    // Use tournament scores as fallback
                    const today = new Date();
                    if (card.lastTournament1) {
                        scoreData.push({
                            date: today.toISOString().split('T')[0], // Today's date for lastTournament1
                            score: card.lastTournament1
                        });
                    }
                    if (card.lastTournament2) {
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        scoreData.push({
                            date: yesterday.toISOString().split('T')[0], // Yesterday's date for lastTournament2
                            score: card.lastTournament2
                        });
                    }
                }

                // Sort the data by date
                scoreData.sort((a, b) => a.date.localeCompare(b.date));
                
                console.log('Final historical data:', scoreData);
                setHistoricalData(scoreData);
            }
        }
    }, [selectedCard, cards]);

    const fetchInvestmentSuggestions = async () => {
        try {
            setLoadingSuggestions(true);
            console.log('Fetching suggestions with params:', {
                maxPrice,
                minHistoricalGames,
                rarity: selectedRarity || undefined
            });
            const results = await getInvestmentSuggestions(
                maxPrice,
                minHistoricalGames,
                selectedRarity || undefined
            );
            console.log('Received suggestions:', results);
            setSuggestions(results);
        } catch (error) {
            console.error('Error fetching investment suggestions:', error);
            // Show error in UI
            setSuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    // Add sorting function
    const sortData = (data: InvestmentSuggestion[], column: string, direction: 'asc' | 'desc') => {
        return [...data].sort((a, b) => {
            let aValue = a[column as keyof InvestmentSuggestion];
            let bValue = b[column as keyof InvestmentSuggestion];
            
            // Handle special cases for numeric values
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return direction === 'asc' ? aValue - bValue : bValue - aValue;
            }
            
            // Convert to strings for string comparison
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
            
            return direction === 'asc' 
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        });
    };

    // Handle column header click
    const handleColumnClick = (column: string) => {
        const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortColumn(column);
        setSortDirection(newDirection);
        setSuggestions(sortData(suggestions, column, newDirection));
    };

    // Handle row click
    const handleRowClick = (suggestion: InvestmentSuggestion) => {
        setSelectedSuggestion(suggestion);
        // Find the card in the cards array
        const card = cards.find(c => c.name === suggestion.name);
        if (card) {
            setSelectedCard(card.name);
        }
    };

    if (!cards || cards.length === 0) {
        return (
            <Text c="yellow" size="lg" ta="center">
                No card data available. Please import data first.
            </Text>
        );
    }

    return (
        <Paper p="xl" radius="md" style={{ backgroundColor: '#2a2a2a' }}>
            <Title order={2} c="white" ta="center" mb="xl">
                Card Analytics
            </Title>

            <Grid mb="xl">
                <Grid.Col span={12}>
                    <Paper p="md" radius="md" style={{ backgroundColor: '#3a3a3a' }}>
                        <Title order={3} c="white" mb="md">Investment Parameters</Title>
                        <Grid>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <NumberInput
                                    label="Max Price (ETH)"
                                    value={maxPrice}
                                    onChange={(value: string | number) => setMaxPrice(typeof value === 'number' ? value : undefined)}
                                    decimalScale={4}
                                    min={0}
                                    step={0.001}
                                    styles={{
                                        label: { color: 'white' },
                                        input: { backgroundColor: '#1A1B1E', color: 'white' }
                                    }}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <NumberInput
                                    label="Min Historical Games"
                                    value={minHistoricalGames}
                                    onChange={(value: string | number) => setMinHistoricalGames(typeof value === 'number' ? value : 3)}
                                    min={1}
                                    styles={{
                                        label: { color: 'white' },
                                        input: { backgroundColor: '#1A1B1E', color: 'white' }
                                    }}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <Select
                                    label="Rarity"
                                    placeholder="Select rarity"
                                    value={selectedRarity}
                                    onChange={setSelectedRarity}
                                    data={[
                                        { value: 'Legendary', label: 'Legendary' },
                                        { value: 'Epic', label: 'Epic' },
                                        { value: 'Rare', label: 'Rare' },
                                        { value: 'Common', label: 'Common' }
                                    ]}
                                    styles={{
                                        label: { color: 'white' },
                                        input: { backgroundColor: '#1A1B1E', color: 'white' }
                                    }}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <Button
                                    mt={29}
                                    onClick={fetchInvestmentSuggestions}
                                    loading={loadingSuggestions}
                                    fullWidth
                                >
                                    Get Investment Suggestions
                                </Button>
                            </Grid.Col>
                        </Grid>
                    </Paper>
                </Grid.Col>
            </Grid>

            <Paper p="md" radius="md" style={{ backgroundColor: '#3a3a3a' }} mt="xl">
                <Title order={3} c="white" mb="md">Investment Suggestions</Title>
                {loadingSuggestions ? (
                    <Group justify="center" p="xl">
                        <Loader color="blue" />
                    </Group>
                ) : suggestions.length > 0 ? (
                    <Table 
                        highlightOnHover 
                        withTableBorder 
                        withColumnBorders
                        styles={(theme) => ({
                            table: {
                                backgroundColor: '#1A1B1E'
                            },
                            thead: { 
                                backgroundColor: '#1A1B1E'
                            },
                            th: { 
                                color: '#ffffff',
                                backgroundColor: '#1A1B1E',
                                cursor: 'pointer'
                            },
                            td: { 
                                color: '#ffffff',
                                backgroundColor: '#1A1B1E'
                            },
                            tr: {
                                cursor: 'pointer',
                                backgroundColor: '#1A1B1E'
                            },
                            'tr:hover': {
                                backgroundColor: '#373A40'
                            }
                        })}
                    >
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th onClick={() => handleColumnClick('name')}>
                                    Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </Table.Th>
                                <Table.Th onClick={() => handleColumnClick('rarity')}>
                                    Rarity {sortColumn === 'rarity' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </Table.Th>
                                <Table.Th style={{ textAlign: 'right' }} onClick={() => handleColumnClick('floor_price')}>
                                    Floor Price (ETH) {sortColumn === 'floor_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </Table.Th>
                                <Table.Th style={{ textAlign: 'right' }} onClick={() => handleColumnClick('investment_score')}>
                                    Investment Score {sortColumn === 'investment_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </Table.Th>
                                <Table.Th style={{ textAlign: 'right' }} onClick={() => handleColumnClick('score_efficiency')}>
                                    Score Efficiency {sortColumn === 'score_efficiency' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </Table.Th>
                                <Table.Th style={{ textAlign: 'right' }} onClick={() => handleColumnClick('historical_games')}>
                                    Historical Games {sortColumn === 'historical_games' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </Table.Th>
                                <Table.Th style={{ textAlign: 'right' }} onClick={() => handleColumnClick('stars')}>
                                    Stars {sortColumn === 'stars' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </Table.Th>
                                <Table.Th style={{ textAlign: 'right' }} onClick={() => handleColumnClick('average_last_2')}>
                                    Avg Last 2 {sortColumn === 'average_last_2' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {suggestions.map((suggestion) => (
                                <Table.Tr 
                                    key={suggestion.hero_id}
                                    onClick={() => handleRowClick(suggestion)}
                                    style={{ 
                                        backgroundColor: selectedSuggestion?.hero_id === suggestion.hero_id 
                                            ? '#2C2E33' 
                                            : undefined 
                                    }}
                                >
                                    <Table.Td>{suggestion.name}</Table.Td>
                                    <Table.Td>
                                        <Badge color={
                                            suggestion.rarity === 'Legendary' ? 'yellow' :
                                            suggestion.rarity === 'Epic' ? 'purple' :
                                            suggestion.rarity === 'Rare' ? 'blue' : 'gray'
                                        }>
                                            {suggestion.rarity}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{suggestion.floor_price.toFixed(4)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{suggestion.investment_score.toFixed(2)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{suggestion.score_efficiency.toFixed(2)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{suggestion.historical_games}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{suggestion.stars}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{suggestion.average_last_2.toFixed(2)}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                ) : (
                    <Text c="yellow" ta="center" p="xl">
                        No investment suggestions available. Try adjusting your parameters.
                    </Text>
                )}
            </Paper>

            {/* Show card details when a row is selected */}
            {selectedSuggestion && cardData && (
                <Paper p="md" radius="md" style={{ backgroundColor: '#3a3a3a' }} mt="xl">
                    <Title order={3} c="white" mb="md">Selected Card Details</Title>
                    <Grid>
                        <Grid.Col span={6}>
                            <Paper p="md" radius="md" style={{ backgroundColor: '#2a2a2a' }}>
                                <Group gap="md">
                                    <Text c="white">Name: {selectedSuggestion.name}</Text>
                                    <Text c="white">Stars: {selectedSuggestion.stars}</Text>
                                    <Text c="white">Historical Games: {selectedSuggestion.historical_games}</Text>
                                </Group>
                            </Paper>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Paper p="md" radius="md" style={{ backgroundColor: '#2a2a2a' }}>
                                <Group gap="md">
                                    <Text c="white">Investment Score: {selectedSuggestion.investment_score.toFixed(2)}</Text>
                                    <Text c="white">Score Efficiency: {selectedSuggestion.score_efficiency.toFixed(2)}</Text>
                                    <Text c="white">Average Last 2: {selectedSuggestion.average_last_2.toFixed(2)}</Text>
                                </Group>
                            </Paper>
                        </Grid.Col>
                    </Grid>

                    <Paper p="md" radius="md" style={{ backgroundColor: '#2a2a2a' }} mt="xl">
                        <Title order={4} c="white" mb="md">Historical Performance</Title>
                        {historicalData.length > 0 ? (
                            <div style={{ height: '400px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={historicalData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#fff"
                                            tick={{ fill: '#fff' }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis 
                                            stroke="#fff"
                                            tick={{ fill: '#fff' }}
                                            domain={[0, 'auto']}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#2a2a2a',
                                                border: '1px solid #444',
                                                color: '#fff'
                                            }}
                                            formatter={(value: number) => [value.toFixed(2), 'Score']}
                                            labelFormatter={(label) => `Date: ${label}`}
                                        />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="score" 
                                            stroke="#4DABF7" 
                                            name="Score"
                                            dot={{ fill: '#4DABF7', r: 4 }}
                                            activeDot={{ r: 8 }}
                                            connectNulls
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <Text c="yellow" ta="center">No historical scores available for this card.</Text>
                        )}
                    </Paper>
                </Paper>
            )}
        </Paper>
    );
};

export default CardAnalytics; 