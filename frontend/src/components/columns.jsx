// frontend/src/components/columns.jsx
"use client" // Required directive for TanStack Table v8

import React from 'react'
import { createColumnHelper } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal } from "lucide-react" // Icons for sorting/actions
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge" // For category display

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // e.g., "25 Oct 2024"
};

// Create a column helper instance (specify the data type, which is our transaction object)
const columnHelper = createColumnHelper()

// Define the columns
export const columns = [
  // Column 1: Merchant Name
  columnHelper.accessor("merchant_name", {
    header: ({ column }) => {
      // Basic sorting example
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Merchant
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="pl-4 font-medium">{row.getValue("merchant_name")}</div>,
  }),

  // Column 2: Category (with Badge)
  columnHelper.accessor("category", {
    header: "Category",
    cell: ({ row }) => {
        const category = row.getValue("category");
        // Basic styling for the badge (can be expanded with metadata colors)
        return <Badge variant="outline">{category}</Badge>;
    },
  }),

  // Column 3: Amount (formatted)
  columnHelper.accessor("amount", {
    header: ({ column }) => {
       return (
        // Remove text-right from wrapper div
        <div>
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                // Remove text-right from button class
                // className="text-right"
            >
                Amount (£)
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        </div>
       )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(amount)
      // Remove text-right, keep color logic
      return <div className={`pl-4 font-medium ${amount < 0 ? 'text-red-600' : ''}`}>{formatted}</div>
    },
  }),

  // Column 4: Date (formatted)
   columnHelper.accessor("date", {
    header: "Date",
    cell: ({ row }) => <div>{formatDate(row.getValue("date"))}</div>,
  }),

  // Column 5: Actions (Edit Category)
  columnHelper.display({
    id: "actions",
    cell: ({ row, table }) => { // <-- Destructure 'table' prop here
      const transaction = row.original // Get the full transaction object

      // Function to call when "Edit Category" is clicked
      const handleEditClick = () => {
        table.options.meta?.openEditDialog(transaction);
      };

      const handleDeleteClick = () => {
        table.options.meta?.promptDeleteTransaction(transaction);
        console.log("Delete clicked for transaction:", transaction); // Keep log for now
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={handleEditClick} // Call the function that triggers the dialog
            >
              Edit Category
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDeleteClick}
              // Add Tailwind classes for red text (and on focus/hover)
              className="text-red-600 focus:text-red-700 focus:bg-red-50"
            >
              Delete Transaction
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }),
]