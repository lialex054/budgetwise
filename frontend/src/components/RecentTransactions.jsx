import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Helper function to format the date string (YYYY-MM-DD)
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00'); // Ensure it parses as local date
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }); // e.g., "Oct 25"
}

export function RecentTransactions({ transactions }) {
  // Ensure transactions is an array, even if null or undefined is passed
  const transactionList = transactions || [];

  return (
    <Card className="md:col-span-1 lg:col-span-2"> {/* Spans 1 column on medium, 2 on large+ */}
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      {/* --- CHANGE 1: Adjusted Padding --- */}
      {/* Use p-6 for standard card padding, keep scroll */}
      <CardContent className="h-60 overflow-y-auto p-6">
        {transactionList.length === 0 ? (
          <p className="text-sm text-slate-500 pt-4 text-center">No transactions for this month.</p>
        ) : (
          <div>
            {transactionList.map((transaction) => (
              // --- CHANGE 3: Add padding and border here ---
              <div
                key={transaction.id || transaction.transaction_id}
                // Add vertical padding, border-b, and remove border on the last item
                className="flex items-center justify-between py-3 border-b last:border-b-0"
              >
                {/* Left side: Merchant and Category */}
                <div>
                  <p className="text-sm font-medium leading-none">{transaction.merchant_name}</p>
                  <p className="text-xs text-muted-foreground">{transaction.category}</p>
                </div>
                {/* Right side: Amount and Date */}
                <div className="text-right">
                   <p className={`text-sm font-medium ${transaction.amount > 0 ? 'text-green-600' : ''}`}>
                     {transaction.amount > 0 ? '+' : ''}£{Math.abs(transaction.amount).toFixed(2)}
                   </p>
                  <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}