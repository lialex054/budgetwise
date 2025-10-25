// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import apiClient from './api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MonthSelector } from '@/components/MonthSelector';
import { MetricCard } from '@/components/MetricCard';
import { SpendingBreakdownChart } from '@/components/SpendingBreakdownChart';
import { RecentTransactions } from '@/components/RecentTransactions';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, ShoppingCart } from 'lucide-react';

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const fetchDashboardData = async (month) => {
    try {
      const params = month ? { month: month } : {};
      const response = await apiClient.get('/dashboard-data/', { params });
      setDashboardData(response.data);
      setSelectedMonth(response.data.selectedMonth);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStatus(''); // Clear previous status
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadStatus('Uploading...');
      const response = await apiClient.post('/upload/', formData, { // Ensure trailing slash
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadStatus(`Success! Imported: ${response.data.imported_count}. Skipped: ${response.data.skipped_rows.length}.`);
      setFile(null); // Clear the selected file
      // If you plan to re-add the transaction table, fetch transactions here too:
      // fetchTransactions();
      // Refresh the dashboard data with the latest month's info
      fetchDashboardData(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('Upload failed. Check console for details.');
    }
  };

  useEffect(() => {
    fetchDashboardData(null);
  }, []);

  if (!dashboardData) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // --- CORRECTED: Prepare Data Variables ---
  // Safely extract data with defaults, matching backend's camelCase JSON keys
  const totalSpend = dashboardData?.totalSpend ?? 0;
  const monthlyBudget = dashboardData?.monthlyBudget ?? 0;
  const avgDailySpend = dashboardData?.avgDailySpend ?? 0;
  const targetDailySpend = dashboardData?.targetDailySpend ?? 0;
  const topCategoryName = dashboardData?.topCategory?.category ?? "N/A";
  const topCategoryTotal = dashboardData?.topCategory?.total ?? 0;
  // Use the correct 'spendingBreakdown' key from the backend JSON
  const spendingBreakdown = dashboardData?.spendingBreakdown ?? [];

  // Calculate percentages safely (These calculations remain the same)
  const budgetIsSet = monthlyBudget > 0;
  const targetIsSet = targetDailySpend > 0; // Check if target > 0

  const spendPercentageOfBudget = budgetIsSet
    ? Math.min((totalSpend / monthlyBudget) * 100, 100)
    : 0;

  const dailySpendDiffPercentage = budgetIsSet && targetIsSet
    // Prevent division by zero if targetDailySpend is 0
    ? Math.abs(((avgDailySpend / (targetDailySpend || 1)) - 1) * 100)
    : 0;
  const dailySpendStatus = avgDailySpend > targetDailySpend ? 'over' : 'under';
  const recentTransactions = dashboardData?.recentTransactions ?? [];
  // --- END: Prepare Data Variables ---

  console.log("Data being passed to cards:", { totalSpend, monthlyBudget, avgDailySpend, targetDailySpend, topCategoryName, topCategoryTotal });
  console.log("Data being passed to chart:", spendingBreakdown);

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardLayout>
        <MonthSelector selectedMonth={selectedMonth} />

        {/* --- REVISED: Use Prepared Variables --- */}

        {/* Card 1: Total Spending */}
        <MetricCard
          title="Total Spending"
          // Use the clean variable
          value={`£${totalSpend.toFixed(2)}`}
          icon={Wallet}
          footer={
            budgetIsSet ? (
              <>
                <Progress
                  // Use the calculated percentage
                  value={spendPercentageOfBudget}
                  className="h-2 mt-2"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  {/* Use calculated percentage and clean variables */}
                  {spendPercentageOfBudget.toFixed(0)}%
                  of £{monthlyBudget.toFixed(0)} budget used
                </span>
              </>
            ) : (
              "Budget not set"
            )
          }
          className="md:col-span-2 lg:col-span-1"
        />

        {/* Card 2: Spend per day */}
        <MetricCard
          title="Spend per day"
          // Use the clean variable
          value={`£${avgDailySpend.toFixed(2)}`}
          icon={TrendingUp}
          footer={
            budgetIsSet && targetIsSet ? (
              // Use calculated percentage, status, and clean variable
              `${dailySpendDiffPercentage.toFixed(0)}% ${dailySpendStatus} target (£${targetDailySpend.toFixed(2)}/day)`
            ) : (
              "Target N/A"
            )
          }
        />

        {/* Card 3: Top Spending Category */}
        <MetricCard
          title="Top Spending Category"
          // Use clean variables
          value={topCategoryName}
          icon={ShoppingCart}
          footer={`£${topCategoryTotal.toFixed(2)} spent`}
        />
        {/* --- END: REVISED --- */}


        {/* Placeholders for Part 4 */}
        <SpendingBreakdownChart data={spendingBreakdown} />

        <RecentTransactions transactions={recentTransactions} />

      </DashboardLayout>

      <div className="p-4 md:p-8"> {/* Add padding */}
        <Card> {/* Wrap in a shadcn Card for consistent styling */}
          <CardHeader>
            <CardTitle>Upload Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <input
                 type="file"
                 onChange={handleFileChange}
                 accept=".csv"
                 className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-400 file:border-0 file:bg-transparent file:text-gray-600 file:text-sm file:font-medium" // Basic Tailwind styling for input
              />
              <Button onClick={handleUpload} disabled={!file || uploadStatus === 'Uploading...'}>
                {uploadStatus === 'Uploading...' ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            {uploadStatus && <p className={`mt-2 text-sm ${uploadStatus.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>{uploadStatus}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Other components (Budget, Chat, Upload, Table) can go here */}
    </div>
  );
}

export default App;