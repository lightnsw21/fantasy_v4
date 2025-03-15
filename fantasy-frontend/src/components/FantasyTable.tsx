import React, { useEffect, useState, useMemo } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
} from '@tanstack/react-table';
import { FantasySheet } from '../types/fantasy';
import { getFantasySheets } from '../services/api';
import { Table, Checkbox, Loader, Text, Group, useMantineTheme, TextInput, Paper, Card, Badge, Button } from '@mantine/core';

const useStyles = (theme: any) => ({
    header: {
        backgroundColor: theme.colors.dark[7],
        color: theme.colors.blue[3],
    },
    row: {
        '&:hover': {
            backgroundColor: `${theme.colors.dark[6]} !important`,
            transition: 'background-color 150ms ease',
        },
    },
    cell: {
        padding: '12px 8px',
        color: theme.colors.gray[0],
    },
    dimmedText: {
        color: theme.colors.gray[5],
    },
    tableContainer: {
        width: '100%',
        overflowX: 'auto',
    }
});

const columnHelper = createColumnHelper<FantasySheet>();

const CheckboxCell = ({ checked, color }: { checked?: boolean; color: string }) => (
    <Checkbox 
        checked={checked} 
        readOnly 
        color={color}
        size="xs"
        styles={{
            input: {
                cursor: 'default',
                width: '16px',
                height: '16px',
                borderColor: 'white',
            },
            icon: {
                width: '12px',
                height: '12px',
            }
        }}
    />
);

const columns = [
    columnHelper.accessor('name', {
        header: 'Name',
        cell: info => (
            <Text weight={500} size="sm" style={{ color: '#fff' }}>
                {info.getValue()}
            </Text>
        ),
    }),
    columnHelper.accessor('averageLast2', {
        header: 'Average (Last 2)',
        cell: info => (
            <Text size="sm" color="gray.0">
                {info.getValue()}
            </Text>
        ),
    }),
    columnHelper.accessor('floorCommon', {
        header: 'Floor Common',
        cell: info => (
            <Text size="sm" color="gray.0">
                {info.getValue()}
            </Text>
        ),
    }),
    columnHelper.accessor('floorRare', {
        header: 'Floor Rare',
        cell: info => (
            <Text size="sm" color="gray.0">
                {info.getValue()}
            </Text>
        ),
    }),
    columnHelper.accessor('floorEpic', {
        header: 'Floor Epic',
        cell: info => (
            <Text size="sm" color="gray.0">
                {info.getValue()}
            </Text>
        ),
    }),
    columnHelper.accessor('floorLegendary', {
        header: 'Floor Legendary',
        cell: info => (
            <Text size="sm" color="gray.0">
                {info.getValue()}
            </Text>
        ),
    }),
    columnHelper.accessor('stars', {
        header: 'Stars',
        cell: info => (
            <Badge 
                color="blue" 
                variant="light"
                size="lg"
            >
                {info.getValue()}
            </Badge>
        ),
    }),
];

// Add interface for range filter
interface RangeFilter {
    min: number;
    max: number;
}

const FantasyTable = ({ withBorder }: { withBorder?: boolean }) => {
    const [data, setData] = useState<FantasySheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [filters, setFilters] = useState({
        name: '',
        averageLast2: '',
        floorCommon: '',
        floorRare: '',
        floorEpic: '',
        floorLegendary: '',
        stars: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage, setEntriesPerPage] = useState(50);
    const [sorting, setSorting] = useState([]);
    const [error, setError] = useState<string | null>(null);
    const [averageRange, setAverageRange] = useState<RangeFilter>({ min: 0, max: 999 });
    const theme = useMantineTheme();
    const styles = useStyles(theme);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:8000/all_cards');
                if (!response.ok) {
                    throw new Error('Failed to fetch cards');
                }
                const data = await response.json();
                setData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch cards');
                console.error('Error fetching cards:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const parseCondition = (condition: string) => {
        const match = condition.match(/(<=|>=|<|>)(\d+)/);
        if (match) {
            return { operator: match[1], value: parseInt(match[2], 10) };
        }
        return null;
    };

    // Add range filter input component
    const RangeFilterInput = () => (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem' 
        }}>
            <Text size="sm" style={{ color: '#CED4DA' }}>Average Last 2 Range:</Text>
            <TextInput
                placeholder="Min"
                type="number"
                value={averageRange.min}
                onChange={(e) => setAverageRange(prev => ({ 
                    ...prev, 
                    min: Number(e.target.value) || 0 
                }))}
                styles={{
                    input: {
                        backgroundColor: '#1A1B1E',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        width: '80px'
                    }
                }}
            />
            <Text size="sm" style={{ color: '#CED4DA' }}>to</Text>
            <TextInput
                placeholder="Max"
                type="number"
                value={averageRange.max}
                onChange={(e) => setAverageRange(prev => ({ 
                    ...prev, 
                    max: Number(e.target.value) || 999 
                }))}
                styles={{
                    input: {
                        backgroundColor: '#1A1B1E',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        width: '80px'
                    }
                }}
            />
        </div>
    );

    // Update the filteredData function to include range filtering
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const averageLast2Value = parseFloat(item.averageLast2?.toString() || '0');
            const withinRange = averageLast2Value >= averageRange.min && 
                              averageLast2Value <= averageRange.max;

            const matchesFilters = Object.keys(filters).every(key => {
                const filterValue = filters[key as keyof typeof filters].toLowerCase();

                // Skip filtering if the filter value is empty
                if (!filterValue) return true;

                const itemValue = parseFloat(item[key as keyof FantasySheet]?.toString() || '');

                if (['averageLast2', 'floorCommon', 'floorRare', 'floorEpic', 'floorLegendary'].includes(key)) {
                    const condition = parseCondition(filterValue);
                    if (condition) {
                        switch (condition.operator) {
                            case '>':
                                return itemValue > condition.value;
                            case '<':
                                return itemValue < condition.value;
                            case '>=':
                                return itemValue >= condition.value;
                            case '<=':
                                return itemValue <= condition.value;
                            default:
                                return true;
                        }
                    }
                }

                return item[key as keyof FantasySheet]?.toString().toLowerCase().includes(filterValue);
            });

            const matchesGlobalFilter = Object.values(item).some(value => 
                value?.toString().toLowerCase().includes(globalFilter.toLowerCase())
            );

            return matchesFilters && matchesGlobalFilter && withinRange;
        });
    }, [data, filters, globalFilter, averageRange]);

    const sortedData = useMemo(() => {
        if (sorting.length === 0) return filteredData;

        const [sort] = sorting;
        const { id, desc } = sort;

        return [...filteredData].sort((a, b) => {
            if (a[id] < b[id]) return desc ? 1 : -1;
            if (a[id] > b[id]) return desc ? -1 : 1;
            return 0;
        });
    }, [filteredData, sorting]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * entriesPerPage;
        const endIndex = startIndex + entriesPerPage;
        return sortedData.slice(startIndex, endIndex);
    }, [sortedData, currentPage, entriesPerPage]);

    const totalPages = Math.ceil(filteredData.length / entriesPerPage);

    const table = useReactTable({
        data: paginatedData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
            sorting,
        },
    });

    const tableStyle = withBorder ? { border: '1px solid black' } : {};

    if (error) {
        return <Text color="red">{error}</Text>;
    }

    if (loading) {
        return (
            <Group position="center" py="xl">
                <Loader size="lg" variant="dots" color="blue" />
            </Group>
        );
    }

    return (
        <Paper 
            shadow="lg" 
            p="xl" 
            style={{ 
                backgroundColor: '#2C2E33',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
        >
            <Text 
                size="xl" 
                fw={700}
                mb="lg" 
                style={{ 
                    color: '#fff',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}
            >
                All Cards
            </Text>

            <Card 
                p="md"
                style={{
                    backgroundColor: '#25262B',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '1rem',
                    width: '100%'
                }}
            >
                <Group justify="space-between" mb="md">
                    <TextInput
                        placeholder="Search..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.currentTarget.value)}
                        styles={{
                            input: {
                                backgroundColor: '#1A1B1E',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                width: '200px'
                            }
                        }}
                    />
                    
                    <Group>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Text style={{ color: '#CED4DA' }}>Entries per page:</Text>
                            <select 
                                value={entriesPerPage} 
                                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                                style={{
                                    backgroundColor: '#1A1B1E',
                                    color: '#fff',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '0.5rem',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        <Group>
                            <Button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                disabled={currentPage === 1}
                                variant="outline"
                                color="blue"
                                size="sm"
                            >
                                Previous
                            </Button>
                            <Text style={{ color: '#fff' }}>
                                Page {currentPage} of {totalPages}
                            </Text>
                            <Button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={currentPage === totalPages}
                                variant="outline"
                                color="blue"
                                size="sm"
                            >
                                Next
                            </Button>
                        </Group>
                    </Group>
                </Group>

                <div style={{ 
                    backgroundColor: '#1A1B1E', 
                    padding: '1rem', 
                    borderRadius: '4px',
                    marginBottom: '1rem'
                }}>
                    <RangeFilterInput />
                </div>

                <Table 
                    striped 
                    highlightOnHover
                    verticalSpacing="xs"
                    horizontalSpacing="xs"
                    style={{
                        backgroundColor: '#1A1B1E',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        width: '100%'
                    }}
                >
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th 
                                        key={header.id} 
                                        onClick={header.column.getToggleSortingHandler()}
                                        style={{ 
                                            color: '#4DABF7', 
                                            backgroundColor: '#25262B',
                                            padding: '12px 8px',
                                            fontSize: '13px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr 
                                key={row.id}
                                style={{ 
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td 
                                        key={cell.id}
                                        style={{ 
                                            padding: '12px 8px',
                                            color: '#fff',
                                            textAlign: 'left'
                                        }}
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>
        </Paper>
    );
}

export default FantasyTable;
