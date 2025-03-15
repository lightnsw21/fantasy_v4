import { useEffect, useState } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { FantasySheet } from '../types/fantasy';
import { getFantasySheets } from '../services/api';
import { Table, Checkbox } from '@mantine/core';

const columnHelper = createColumnHelper<FantasySheet>();

const columns = [
    columnHelper.accessor('name', {
        header: 'Name',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('hero_id', {
        header: 'Hero ID',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('handle', {
        header: 'Handle',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('flags', {
        header: 'Flags',
        cell: info => info.getValue(),
    }),
];

export function FantasyTable() {
    const [data, setData] = useState<FantasySheet[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const sheets = await getFantasySheets();
                setData(sheets);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Table striped highlightOnHover>
            <thead>
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th key={header.id}>
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
                    <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
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
    );
} 