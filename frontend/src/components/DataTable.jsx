// frontend/src/components/DataTable.jsx
"use client" // Required directive for TanStack Table v8

import React, { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel, // Import for sorting
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import shadcn table components

// Props:
// - columns: The column definition array (from columns.jsx)
// - data: The array of transaction objects
// - onRowAction: (Optional) Function to pass down for actions like opening edit dialog
export function DataTable({ columns, data, onRowAction }) {

  console.log("DataTable received data:", data);

  const [sorting, setSorting] = useState([]); // State to manage sorting

  // Initialize the table instance using TanStack Table hooks
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting, // Connect sorting state
    getSortedRowModel: getSortedRowModel(), // Enable sorting model
    state: {
      sorting,
    },
    // Pass down the onRowAction function via meta for the columns to access
    meta: {
        openEditDialog: (rowData) => {
            if (onRowAction) {
                onRowAction(rowData); // Call the function passed from App.jsx
            } else {
                console.warn("onRowAction prop not provided to DataTable");
            }
        },
    },
  });
  console.log("Table rows calculated:", table.getRowModel().rows);
  return (
    <div className="rounded-md border bg-card text-card-foreground shadow"> {/* Added bg/text/shadow */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Add Pagination controls here later if needed */}
    </div>
  );
}