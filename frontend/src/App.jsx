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
import { Wallet, TrendingUp, ShoppingCart, Settings, Upload, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { BudgetModal } from '@/components/BudgetModal';
import Chat from './Chat'; // Assuming Chat.jsx is in src/
import { DataTable } from '@/components/DataTable'; // Import DataTable
import { columns } from '@/components/columns'; // Import column definitions
import { EditCategoryDialog } from '@/components/EditCategoryDialog'; // Import the edit dialog
import { BudgetTargetChart } from '@/components/BudgetTargetChart';
import { cn } from './lib/utils';
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner";
import { LandingStep } from '@/components/LandingStep';
import { UploadStep } from '@/components/UploadStep';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // We aren't using Trigger directly here
} from "@/components/ui/alert-dialog";

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
  const initialOnboardingStatus = localStorage.getItem('budgetwise_onboarding_complete') === 'true' ? 'complete' : 'landing';
  const [onboardingStep, setOnboardingStep] = useState(initialOnboardingStatus); // 'landing', 'upload', 'complete'
  const [userName, setUserName] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [file, setFile] = useState(null);
  const [activeView, setActiveView] = useState('Dashboard');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [hasPreviousMonth, setHasPreviousMonth] = useState(false);
  const [hasNextMonth, setHasNextMonth] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // --- Data Fetching ---
  const fetchDashboardData = async (monthString) => {
    try {
      const params = monthString ? { month: monthString } : {};
      console.log("Fetching dashboard data with params:", params);
      const response = await apiClient.get('/dashboard-data/', { params });
      console.log("API Response data:", response.data);

      if (response.data) {
        setDashboardData(response.data); // Update dashboard data always

        console.log("setDashboardData has been called.");

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
      setHasNextMonth(false);     // Reset on error
    } finally {
             // setIsLoadingDashboard(false);
    }
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

  const promptDeleteTransaction = (transaction) => {
    console.log("Prompting delete for transaction:", transaction);
    setTransactionToDelete(transaction); // Store the transaction to be deleted
    setIsAlertOpen(true);                // Open the alert dialog
  };

  // Function to execute the deletion
  const executeDeleteTransaction = async () => {
    if (!transactionToDelete) return; // Safety check

    const deleteToastId = toast.loading("Deleting transaction...");
    try {
      // Call the DELETE endpoint using the transaction ID
      await apiClient.delete(`/transactions/${transactionToDelete.id}/`);

      toast.success("Transaction deleted successfully.", { id: deleteToastId });
      fetchDashboardData(formatDateToYYYYMM(selectedDate)); // Refresh data

    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error(`Failed to delete transaction. ${error?.response?.data?.detail || 'Please try again.'}`, { id: deleteToastId });
    } finally {
      setIsAlertOpen(false);         // Close the alert dialog
      setTransactionToDelete(null); // Clear the stored transaction
    }
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

    const handleNameSubmit = (name) => {
    if (name.trim()) {
      const trimmedName = name.trim(); // Store the trimmed name
      console.log("handleNameSubmit called. Setting userName to:", trimmedName); // <-- ADD LOG
      setUserName(trimmedName);
      setOnboardingStep('upload');
    } else {
      alert("Please enter your name.");
    }
  };

  const handleUploadComplete = () => {
    setOnboardingStep('complete'); // Move to main app
    localStorage.setItem('budgetwise_onboarding_complete', 'true'); // Remember completion
    fetchDashboardData(null); // Fetch initial data for dashboard
  };

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

  // --- Loading State & Onboarding Logic ---
  // Determine what to render based on onboarding step

  if (onboardingStep === 'landing') {
    // We will create LandingStep component next
    // return <LandingStep onNameSubmit={handleNameSubmit} />;
    return <LandingStep onNameSubmit={handleNameSubmit} />;
  }

  if (onboardingStep === 'upload') {
     // Render the actual UploadStep component, passing props
     return <UploadStep userName={userName} onUploadComplete={handleUploadComplete} />;
  }

  // --- Regular Loading State (if onboarding is complete) ---
  if (!dashboardData && activeView === 'Dashboard') {
    return (
      <Layout activeView={activeView} setActiveView={setActiveView} userName={userName}>
        <div className="flex items-center justify-center h-full">Loading...</div>
      </Layout>
    );
  }

  // --- Prepare Data Variables ---
  let totalSpend, monthlyBudget, avgDailySpend, targetDailySpend, topCategoryName, topCategoryTotal, spendingBreakdown, transactions, budgetIsSet, targetIsSet, spendPercentageOfBudget, dailySpendDiffPercentage, dailySpendStatus, spendingTrendData;

  console.log("App.jsx re-rendering. dashboardData state is:", dashboardData);

  // Ensure data preparation only happens if dashboardData exists and view is Dashboard
  if (activeView === 'Dashboard' && dashboardData) {
      totalSpend = dashboardData?.totalSpend ?? 0;
      monthlyBudget = dashboardData?.monthlyBudget ?? 0;
      avgDailySpend = dashboardData?.avgDailySpend ?? 0;
      targetDailySpend = dashboardData?.targetDailySpendPerDay ?? 0;
      topCategoryName = dashboardData?.topCategory?.category ?? "N/A";
      topCategoryTotal = dashboardData?.topCategory?.total ?? 0;
      spendingBreakdown = dashboardData?.spendingBreakdown ?? [];
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


  console.log("App.jsx rendering. Passing userName to Layout:", userName);

  // --- Render ---
  return (
    <Layout activeView={activeView} setActiveView={setActiveView} userName={userName}>

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
           <Button variant = "outline" size="sm" onClick={() => setIsBudgetModalOpen(true)}>
             <Settings className="mr-2 h-4 w-4" /> Set Budget
           </Button>
           <Button size="sm" onClick={() => setIsAddTransactionModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
        </div>
      </div>
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
                <DataTable
                     columns={columns}
                     data={transactions}
                     // Pass an object containing both handlers
                     rowActions={{
                        openEditDialog: openEditDialog,
                        promptDelete: promptDeleteTransaction // Use a key like 'promptDelete'
                     }}
                 />
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
        onBudgetSet={(newAmount) => { // <-- Accept the new amount from BudgetModal
        console.log(`BudgetModal onBudgetSet triggered with amount: ${newAmount}`);

        // --- Manually update the dashboardData state ---
        setDashboardData(prevData => {
            // If previous data exists, update only the budget
            if (prevData) {
                return { ...prevData, monthlyBudget: newAmount };
            }
            // If no previous data (unlikely here but safe), return minimal object
            return { monthlyBudget: newAmount };
        });
        // --- End manual update ---

        // Optional: Trigger a full background refetch anyway, just to ensure consistency later
        // fetchDashboardData(formatDateToYYYYMM(selectedDate));

        setIsBudgetModalOpen(false); // Close modal
        console.log("Dashboard state updated manually with new budget.");
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
      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={() => setIsAddTransactionModalOpen(false)}
        onSave={() => {
            // Refresh dashboard after manual add or CSV upload via modal
            fetchDashboardData(formatDateToYYYYMM(selectedDate));
            setIsAddTransactionModalOpen(false); // Close modal
        }}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction
              {/* Safely display merchant name if available */}
              {transactionToDelete?.merchant_name && ` for ${transactionToDelete.merchant_name}`}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Cancel button simply closes the dialog */}
            <AlertDialogCancel onClick={() => setIsAlertOpen(false)}>Cancel</AlertDialogCancel>
            {/* Action button calls the delete execution function */}
            <AlertDialogAction
              onClick={executeDeleteTransaction}
              // Optional: Add destructive variant styling if available/configured
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster richColors position="top-center" />

    </Layout>
  );
}

export default App;