// frontend/src/components/SpendingBreakdownChart.jsx
import React, { useState } from 'react'; // <-- Import useState
// Import necessary components from recharts
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, CartesianGrid, XAxis, YAxis, Bar // <-- Import BarChart components
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // <-- Import Tabs components
import { cn } from '@/lib/utils';
import { getCategoryMetadata } from '@/lib/categoryMetadata';

// Custom Legend Component (No changes needed)
const CustomLegend = ({ payload }) => {
  console.log("Legend Payload:", payload); // Debug: Check what payload receives
  if (!payload || payload.length === 0) {
    return null;
  }
  return (
    // Make list scrollable if needed, adjust padding
    <ul className="flex flex-col space-y-1 text-sm text-slate-700 ml-4"> {/* Removed max-h and overflow */}
      {payload.map((entry, index) => {
        const categoryName = entry.value;
        const { icon: Icon, color: textColorClass } = getCategoryMetadata(categoryName);
        const fill = entry.color; // Get color assigned by Recharts/Cell

        // Defensive check for payload value needed by amount span (removed, but good practice)
        // const amount = entry.payload?.payload?.value ?? 0;

        return (
          <li key={`legend-${index}`} className="flex items-center space-x-2">
            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: fill }}></span>
            {Icon && <Icon className={cn("w-4 h-4 flex-shrink-0", textColorClass)} />}
            <span className="flex-1 truncate">{categoryName}</span>
             {/* Amount removed as requested */}
          </li>
        );
      })}
    </ul>
  );
};

export function SpendingBreakdownChart({ data }) {
  // --- ADD STATE FOR ACTIVE TAB ---
  const [activeTab, setActiveTab] = useState('pie'); // Default to pie chart
  // --------------------------------

  // Empty state card remains the same
  if (!data || data.length === 0) {
    return (
      <Card className="md:col-span-2 lg:col-span-2 flex flex-col items-center justify-center h-96"> {/* Adjusted overall height slightly if needed */}
        {/* Consistent header padding and min-height */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 w-full min-h-[68px]">
          <CardTitle className="text-center text-slate-500 text-base font-medium flex-1"> {/* Centered title */}
            Spending Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">No spending data for this month.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data (remains the same)
  const chartData = data.map(item => ({
    name: item.category,
    value: parseFloat(item.total.toFixed(2)),
  }));

  // Helper to format currency for YAxis/Tooltip
  const formatCurrency = (value) => `£${value.toFixed(0)}`;

  return (
    <Card className="md:col-span-2 lg:col-span-2 h-96 flex flex-col"> {/* Added flex flex-col and consistent height */}
      {/* --- CHANGE 1: Standardize Header Height & Padding --- */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-h-[68px]"> {/* Added min-h */}
        <CardTitle>Spending Breakdown</CardTitle>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="ml-auto">
          <TabsList>
            <TabsTrigger value="pie">Pie</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      {/* ------------------------------------------- */}
      {/* Use Tabs component as the main wrapper inside CardContent */}
      {/* Adjust height slightly to accommodate TabsList */}
      <CardContent className="flex-1 pt-4"> {/* Example: Increased height slightly */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Pie Chart Content */}
          <TabsContent value="pie" className="flex-1"> {/* flex-1 makes content fill space */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90} // Slightly smaller radius to fit legend better maybe
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => {
                    const metadata = getCategoryMetadata(entry.name);
                    return (
                      <Cell key={`cell-${index}`} fill={metadata.colorHex} />
                    );
                  })}
                </Pie>
                <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                {/* --- CHANGE 2: Simplified Legend wrapperStyle --- */}
                {/* Rely more on align/verticalAlign, less manual offset */}
                <Legend
                  content={<CustomLegend />}
                  layout="vertical"
                  verticalAlign="middle" // Try middle alignment again
                  align="right"
                   // Simpler wrapperStyle focusing on width/positioning area
                  wrapperStyle={{
                     right: 0, // Align to right edge
                     paddingLeft: '10px' // Space between pie and legend
                   }}
                />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Bar Chart Content */}
          <TabsContent value="bar" className="flex-1"> {/* flex-1 makes content fill space */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical" // Vertical bars look good for categories
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} /> {/* Vertical grid lines */}
                {/* XAxis is numerical (Amount) */}
                <XAxis type="number" tickFormatter={formatCurrency} />
                {/* YAxis is categorical (Category Name) */}
                {/* dataKey="name" links axis labels to category names */}
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                {/* Define the bars */}
                <Bar dataKey="value" name="Amount" barSize={20}>
                  {/* Apply color to each bar based on metadata */}
                  {chartData.map((entry, index) => {
                     const metadata = getCategoryMetadata(entry.name);
                     return <Cell key={`cell-${index}`} fill={metadata.colorHex} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}