// frontend/src/components/SpendingBreakdownChart.jsx
import React from 'react';
// Import necessary components from recharts
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define some colors for the chart segments
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

export function SpendingBreakdownChart({ data }) {
  // Ensure data exists and has items
  if (!data || data.length === 0) {
    return (
      <Card className="md:col-span-2 lg:col-span-2 flex items-center justify-center h-60">
        <CardHeader>
          <CardTitle className="text-center text-slate-500">Spending Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">No spending data for this month.</p>
        </CardContent>
      </Card>
    );
  }

  // Format data for the Pie chart (needs 'name' and 'value' keys)
  const chartData = data.map(item => ({
    name: item.category,
    value: item.total,
  }));

  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle>Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-60"> {/* Give content area a fixed height */}
        {/* ResponsiveContainer makes the chart adapt to the Card's size */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* The Pie component defines the data and appearance */}
            <Pie
              data={chartData}
              cx="50%" // Center X
              cy="50%" // Center Y
              labelLine={false} // Hide lines connecting labels to slices
              outerRadius={80} // Size of the pie
              fill="#8884d8" // Default fill color
              dataKey="value" // Use the 'total' amount for slice size
              nameKey="name"  // Use the 'category' for labels/tooltips
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} // Simple label inside slice
            >
              {/* Assign colors to each slice */}
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {/* Tooltip shows details on hover */}
            <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
            {/* Legend lists the categories */}
            <Legend layout="vertical" verticalAlign="middle" align="right" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}