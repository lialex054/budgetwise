// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import apiClient from './api';
import { Layout } from '@/components/Layout';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MonthSelector } from '@/components/MonthSelector';
import { MetricCard } from '@/components/MetricCard';
import { SpendingBreakdownChart } from '@/components/SpendingBreakdownChart';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, ShoppingCart, Settings, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { BudgetModal } from '@/components/BudgetModal';
import Chat from './Chat'; // Assuming Chat.jsx is in src/
import { DataTable } from '@/components/DataTable'; // Import DataTable
import { columns } from '@/components/columns'; // Import column definitions
import { EditCategoryDialog } from '@/components/EditCategoryDialog'; // Import the edit dialog
import { BudgetTargetChart } from '@/components/BudgetTargetChart';
import { cn } from './lib/utils';
import { Toaster } from "@/components/ui/sonner"

// Helper function to format Date object to "YYYY-MM" string
const formatDateToYYYYMM = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // +1 because months are 0-indexed
    return `${year}-${month}`;
};

// Helper function to parse "YYYY-MM" string to Date object (first day of month)
const parseYYYYMMToDate = (yyyymm) => {
    if (!yyyymm || typeof yyyymm !== 'string' || !yyyymm.includes('-')) return new Date(); // Default to today if invalid
    // Add '-02' to avoid timezone issues when parsing month only
    return new Date(`${yyyymm}-02T00:00:00`);
};

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [activeView, setActiveView] = useState('Dashboard');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [hasPreviousMonth, setHasPreviousMonth] = useState(false);
  const [hasNextMonth, setHasNextMonth] = useState(false);

  // --- Data Fetching ---
  const fetchDashboardData = async (monthString) => {
    try {
      const params = monthString ? { month: monthString } : {};
      console.log("Fetching dashboard data with params:", params);
      const response = await apiClient.get('/dashboard-data/', { params });
      console.log("API Response data:", response.data);

      if (response.data) {
        setDashboardData(response.data); // Update dashboard data always

        setHasPreviousMonth(response.data.hasPreviousMonthData ?? false);
        setHasNextMonth(response.data.hasNextMonthData ?? false);

        const newMonthString = response.data.selectedMonth;
        const currentMonthString = formatDateToYYYYMM(selectedDate); // Format current state date

        // --- CHANGE: Only update Date state if the month actually changed ---
        // Also update if selectedDate is currently null (initial load case within this effect)
        if (newMonthString !== currentMonthString || selectedDate === null) {
            console.log(`Month changed from ${currentMonthString} to ${newMonthString}. Updating selectedDate state.`);
            setSelectedDate(parseYYYYMMToDate(newMonthString));
        } else {
             console.log(`Month ${newMonthString} hasn't changed. Not updating selectedDate state.`);
        }
        // -----------------------------------------------------------------

        console.log("State updated with dashboard data.");
      } else {
        console.error("Dashboard data received from API was null or undefined.");
        setDashboardData({}); // Set to empty object? or handle error differently
        setHasPreviousMonth(false); // Reset on error
         setHasNextMonth(false);     // Reset on error
      }
    } catch (error) {
      console.error("Error inside fetchDashboardData function:", error);
      setHasPreviousMonth(false); // Reset on error
       etHasNextMonth(false);     // Reset on error
    } finally {
             // setIsLoadingDashboard(false);
    }
  };

  // --- File Upload Handlers ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile); // Set file state first
      handleUpload(selectedFile); // Pass file directly to upload handler
    } else {
      setFile(null);
    }
    setUploadStatus('');
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear input visually
    }
  };

  const handleUpload = async (selectedFile) => {
    const fileToUpload = selectedFile || file;
    if (!fileToUpload) {
      alert('No file selected!');
      return;
    }
    const formData = new FormData();
    formData.append('file', fileToUpload);
    try {
      setUploadStatus('Uploading...');
      const response = await apiClient.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus(`Success! Imported: ${response.data.imported_count}. Skipped: ${response.data.skipped_rows.length}.`);
      setFile(null); // Clear file state
      fetchDashboardData(null); // Refresh dashboard
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('Upload failed. Check console for details.');
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  // --- Dialog Handlers ---
  // Function passed to DataTable to open the dialog
  const openEditDialog = (transaction) => {
    console.log("Opening edit dialog for:", transaction); // Debug log
    setEditingTransaction(transaction); // Set the transaction data
    setIsEditDialogOpen(true);         // Open the modal
  };

  // Callback function for when the dialog successfully updates a category
  const handleCategoryUpdate = () => {
    console.log("Category updated, refreshing data..."); // Debug log
    fetchDashboardData(formatDateToYYYYMM(selectedDate)); // Refresh current month
    setIsEditDialogOpen(false);         // Close the modal
    setEditingTransaction(null);     // Clear the editing transaction state
  };

  // --- Navigation Handlers ---
    const goToPreviousMonth = () => {
        setSelectedDate(currentDate => {
            if (!currentDate) return null; // Should not happen if data loaded
            const prevMonth = new Date(currentDate);
            prevMonth.setMonth(prevMonth.getMonth() - 1);
            return prevMonth;
        });
    };

    const goToNextMonth = () => {
        setSelectedDate(currentDate => {
            if (!currentDate) return null;
            const nextMonth = new Date(currentDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            // Optional: Prevent going into the future?
            // const today = new Date();
            // if (nextMonth > today) return currentDate; // Don't change if next month is future
            return nextMonth;
        });
    };
    // --- END Navigation Handlers ---

  // --- Effects ---
  useEffect(() => {
    fetchDashboardData(null);
  }, []);

  useEffect(() => {
        // Don't run on initial mount (selectedDate starts null)
        // Only run if selectedDate is a valid Date object
        if (selectedDate instanceof Date && !isNaN(selectedDate)) {
            const monthString = formatDateToYYYYMM(selectedDate);
            console.log(`selectedDate changed to ${selectedDate}, fetching data for month: ${monthString}`);
            setDashboardData(null); // Show loading while fetching new month
            fetchDashboardData(monthString);
        }
    }, [selectedDate]);

  // --- Loading State ---
  if (!dashboardData && activeView === 'Dashboard') {
    return (
      <Layout activeView={activeView} setActiveView={setActiveView}>
        <div className="flex items-center justify-center h-full">Loading...</div>
      </Layout>
    );
  }

  // --- Prepare Data Variables ---
  let totalSpend, monthlyBudget, avgDailySpend, targetDailySpend, topCategoryName, topCategoryTotal, spendingBreakdown, transactions, budgetIsSet, targetIsSet, spendPercentageOfBudget, dailySpendDiffPercentage, dailySpendStatus, spendingTrendData;

  // Ensure data preparation only happens if dashboardData exists and view is Dashboard
  if (activeView === 'Dashboard' && dashboardData) {
      totalSpend = dashboardData?.totalSpend ?? 0;
      monthlyBudget = dashboardData?.monthlyBudget ?? 0;
      avgDailySpend = dashboardData?.avgDailySpend ?? 0;
      targetDailySpend = dashboardData?.targetDailySpendPerDay ?? 0;
      topCategoryName = dashboardData?.topCategory?.category ?? "N/A";
      topCategoryTotal = dashboardData?.topCategory?.total ?? 0;
      spendingBreakdown = dashboardData?.spendingBreakdown ?? [];
      // Use the 'transactions' key from the backend response
      transactions = dashboardData?.transactions ?? [];
      spendingTrendData = dashboardData?.spendingTrendData ?? [];
      budgetIsSet = monthlyBudget > 0;
      targetIsSet = targetDailySpend > 0;
      spendPercentageOfBudget = budgetIsSet ? Math.min((totalSpend / monthlyBudget) * 100, 100) : 0;
      dailySpendDiffPercentage = budgetIsSet && targetIsSet ? Math.abs(((avgDailySpend / (targetDailySpend || 1)) - 1) * 100) : 0;
      dailySpendStatus = avgDailySpend > targetDailySpend ? 'over' : 'under';
  } else {
      // Provide default empty array if not on dashboard view or data is missing
      transactions = [];
      spendingBreakdown = [];
      spendingTrendData = [];
  }
  // --- END: Prepare Data Variables ---

  // --- Render ---
  return (
    <Layout activeView={activeView} setActiveView={setActiveView}>

      {/* --- Main Content Header Area --- */}
      <div className="flex justify-between items-center p-4 md:p-8 border-b">
        {/* Left Side: Title or Month Selector */}
        <div>
            {/* Show MonthSelector only on Dashboard view */}
            {activeView === 'Dashboard' && selectedDate instanceof Date && !isNaN(selectedDate) ? (
                <MonthSelector
                    selectedDate={selectedDate}
                    goToPreviousMonth={goToPreviousMonth}
                    goToNextMonth={goToNextMonth}
                    hasPreviousMonth={hasPreviousMonth}
                    hasNextMonth={hasNextMonth}
                />
            ) : (
                // Show generic title for other views or if date is loading
                <h2 className="text-xl font-semibold">
                    {activeView === 'Dashboard' ? 'Loading Month...' :
                     activeView === 'Chat' ? 'Chat Assistant' : ''
                    }
                </h2>
            )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex space-x-2">
           <Button variant="outline" size="sm" onClick={() => setIsBudgetModalOpen(true)}>
             <Settings className="mr-2 h-4 w-4" /> Set Budget
           </Button>
           <Button variant="outline" size="sm" onClick={handleUploadButtonClick}>
             <Upload className="mr-2 h-4 w-4" /> Upload Transactions
           </Button>
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden"/>
        </div>
      </div>
      {/* Upload Status */}
      {uploadStatus && (
         <div className="px-4 md:px-8 pt-2">
            <p className={`text-sm ${uploadStatus.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>{uploadStatus}</p>
         </div>
       )}
      {/* --- END Header Area --- */}

      {/* --- CONDITIONAL RENDERING --- */}
      {activeView === 'Dashboard' && dashboardData && (
        <>
          <DashboardLayout>
            {/* --- Metric Cards --- */}

            {/* Card 1: Total Spending */}
            <MetricCard
              title="Total Spending"
              value={`£${totalSpend.toFixed(2)}`}
              icon={Wallet}
              footer={
                budgetIsSet ? ( // Check if budget is set
                  <>
                    <Progress
                      value={spendPercentageOfBudget}
                      className={cn(
                        "h-2 mt-2", // Base classes for the outer Progress component
                        // Conditionally apply style to the direct child div
                        spendPercentageOfBudget >= 100 && "[&>div]:bg-red-600"
                      )}
                    />
                    <span className="text-xs text-slate-500 mt-1 block">
                      {spendPercentageOfBudget.toFixed(0)}% {/* Display percentage */}
                      of £{monthlyBudget.toFixed(0)} budget used {/* Display budget */}
                    </span>
                  </>
                ) : (
                  "Budget not set" // Fallback message
                )
              }
              className="md:col-span-2 lg:col-span-2" // Layout classes
            />

            {/* Card 2: Spend per day */}
            <MetricCard
              title="Spend per day"
              value={`£${avgDailySpend.toFixed(2)}`} // Display average daily spend
              icon={TrendingUp}
              footer={
                budgetIsSet && targetIsSet ? ( // Check if budget and target are set
                  // Display percentage over/under target
                  `${dailySpendDiffPercentage.toFixed(0)}% ${dailySpendStatus} target (£${targetDailySpend.toFixed(2)}/day)`
                ) : (
                  "Target N/A" // Fallback message
                )
              }
            />

            {/* Card 3: Top Spending Category */}
            <MetricCard
              title="Top Spending Category"
              value={topCategoryName} // Display category name
              icon={ShoppingCart}
              footer={`£${topCategoryTotal.toFixed(2)} spent`} // Display amount spent
            />

            {/* --- End Metric Cards --- */}

            {/* --- Chart Area --- */}
            {/* Spending Breakdown Chart spans 2 columns on large */}
            <div className="md:col-span-2 lg:col-span-2">
                 <SpendingBreakdownChart data={spendingBreakdown} />
            </div>

            {/* --- Budget Target Chart Area --- */}
            {/* Budget Target Chart spans 2 columns on large */}
            <div className="md:col-span-2 lg:col-span-2">
                 <BudgetTargetChart data={spendingTrendData} /> {/* <-- ADD THIS COMPONENT */}
            </div>

            {/* --- Data Table Area --- */}
            {/* Table spans full width (4 columns on large) below charts */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-6">
                 <DataTable columns={columns} data={transactions} onRowAction={openEditDialog} />
            </div>
            
          </DashboardLayout>
        </>
      )}

      {activeView === 'Chat' && (
        <div className="p-4 md:p-8"> <Chat /> </div>
      )}

      {/* --- END CONDITIONAL RENDERING --- */}

      {/* --- MODALS --- */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onBudgetSet={() => {
          // Format the current selectedDate state into "YYYY-MM" string
          fetchDashboardData(formatDateToYYYYMM(selectedDate));
          setIsBudgetModalOpen(false);
        }}
      />
      {/* Render Edit Dialog, passing state and handlers */}
       <EditCategoryDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingTransaction(null); // Clear transaction on close
          }}
          transaction={editingTransaction} // Pass the transaction being edited
          onCategoryUpdated={handleCategoryUpdate} // Pass the refresh callback
       />
      {/* --- END MODALS --- */}

      <Toaster richColors position="top-center" />

    </Layout>
  );
}

export default App;