// frontend/src/components/BudgetTargetChart.jsx
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Helper to format currency for YAxis/Tooltip
const formatCurrency = (value) => `£${value.toFixed(0)}`;

export function BudgetTargetChart({ data }) {
  // Ensure data exists and has items
  if (!data || data.length === 0) {
    return (
      <Card className="md:col-span-2 lg:col-span-2 flex flex-col items-center justify-center h-80"> {/* Changed height */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 w-full min-h-[68px]">
          <CardTitle className="text-center text-slate-500 text-base font-medium">
            Spending Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">Not enough data to display trend.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="md:col-span-2 lg:col-span-2 h-96 flex flex-col"> {/* Define grid span */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-h-[68px]">
        <CardTitle>Spending Trend vs Target</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-4"> {/* Match height and add padding */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data} // Use the spendingTrendData array passed as prop
            margin={{
              top: 5, right: 30, left: 0, bottom: 5, // Adjusted left margin
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            {/* X Axis represents the day of the month */}
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            {/* Y Axis represents the cumulative amount */}
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
            {/* Tooltip shows values on hover */}
            <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
            {/* Legend labels the lines */}
            <Legend />
            {/* Line for Actual Cumulative Spend */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Spend" // Label for Legend/Tooltip
              stroke="#DC2626" // Example: Red color (Tailwind red-600)
              strokeWidth={2}
              dot={false} // Hide dots on the line
              activeDot={{ r: 6 }} // Show slightly larger dot on hover
            />
            {/* Line for Target Cumulative Spend */}
            <Line
              type="monotone"
              dataKey="target"
              name="Target Spend" // Label for Legend/Tooltip
              stroke="#6B7280" // Example: Gray color (Tailwind gray-500)
              strokeWidth={2}
              strokeDasharray="5 5" // Make the target line dashed
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}