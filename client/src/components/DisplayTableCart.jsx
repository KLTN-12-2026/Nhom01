import React from 'react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import NoData from './NoData';

const DisplayTableCart = ({ data, column }) => {
    const table = useReactTable({
        data: data || [],
        columns: column,
        getCoreRowModel: getCoreRowModel(),
    });

    if (!data || data.length === 0) {
        return <NoData />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead className="bg-muted/70 text-foreground">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    className={`px-3 py-3 border-b border-border/80 text-center font-semibold sm:text-sm text-xs ${
                                        header.column.columnDef.meta
                                            ?.className || ''
                                    }`}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                          )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/40 transition-colors border-b border-border/50">
                            {row.getVisibleCells().map((cell) => (
                                <td
                                    key={cell.id}
                                    className={`px-3 py-3 text-sm text-foreground ${
                                        cell.column.columnDef.meta?.className ||
                                        ''
                                    }`}
                                    style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
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
            </table>
        </div>
    );
};

export default DisplayTableCart;
