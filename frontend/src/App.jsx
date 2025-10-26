// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import apiClient from './api';
import { Layout } from '@/components/Layout';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MonthSelector } from '@/components/MonthSelector';
import { MetricCard } from '@/components/MetricCard';
import { SpendingBreakdownChart } from '@/components/SpendingBreakdownChart';
import { RecentTransactions } from '@/components/RecentTransactions';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, ShoppingCart, Settings, Upload } from 'lucide-react';
import { BudgetModal } from '@/components/BudgetModal';
import Chat from './Chat';

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [activeView, setActiveView] = useState('Dashboard');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  // --- Data Fetching ---
  const fetchDashboardData = async (month) => {
    try {
      const params = month ? { month: month } : {};
      console.log("Fetching dashboard data with params:", params); // Keep logs for now
      const response = await apiClient.get('/dashboard-data/', { params });
      console.log("API Response received:", response);
      console.log("API Response data:", response.data);

      if (response.data) {
        setDashboardData(response.data);
        setSelectedMonth(response.data.selectedMonth);
        console.log("State updated with dashboard data.");
      } else {
        console.error("Dashboard data received from API was null or undefined.");
      }

    } catch (error) {
      console.error("Error inside fetchDashboardData function:", error);
    }
  };

  // --- File Upload Handlers ---
  const handleFileChange = (e) => {
    // Ensure files exist and select the first one
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      handleUpload(e.target.files[0]);
    } else {
      setFile(null); // Clear if no file selected
    }
    setUploadStatus('');
    // Clear the input value so the same file can be selected again
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    };
  }

  // Modified handleUpload to accept the file directly
  const handleUpload = async (selectedFile) => {
    // Check the passed file argument first, then the state as fallback
    const fileToUpload = selectedFile || file;
    if (!fileToUpload) {
      // This alert shouldn't trigger if called from handleFileChange
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
      setFile(null); // Clear the file state
      fetchDashboardData(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('Upload failed. Check console for details.');
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click(); // Safely trigger click if ref exists
  };

  // --- Effects ---
  useEffect(() => {
    // Fetch data for the most recent month when the component mounts
    fetchDashboardData(null);
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Loading State ---
  if (!dashboardData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          Loading...
        </div>
      </Layout>
    );
  }

  // --- Prepare Data Variables (Only needed for Dashboard view) ---
  let totalSpend, monthlyBudget, avgDailySpend, targetDailySpend, topCategoryName, topCategoryTotal, spendingBreakdown, recentTransactions, budgetIsSet, targetIsSet, spendPercentageOfBudget, dailySpendDiffPercentage, dailySpendStatus;
  if (activeView === 'Dashboard' && dashboardData) {
      totalSpend = dashboardData?.totalSpend ?? 0;
      monthlyBudget = dashboardData?.monthlyBudget ?? 0;
      avgDailySpend = dashboardData?.avgDailySpend ?? 0;
      targetDailySpend = dashboardData?.targetDailySpend ?? 0;
      topCategoryName = dashboardData?.topCategory?.category ?? "N/A";
      topCategoryTotal = dashboardData?.topCategory?.total ?? 0;
      spendingBreakdown = dashboardData?.spendingBreakdown ?? [];
      recentTransactions = dashboardData?.recentTransactions ?? [];
      budgetIsSet = monthlyBudget > 0;
      targetIsSet = targetDailySpend > 0;
      spendPercentageOfBudget = budgetIsSet ? Math.min((totalSpend / monthlyBudget) * 100, 100) : 0;
      dailySpendDiffPercentage = budgetIsSet && targetIsSet ? Math.abs(((avgDailySpend / (targetDailySpend || 1)) - 1) * 100) : 0;
      dailySpendStatus = avgDailySpend > targetDailySpend ? 'over' : 'under';
  }
  // --- END: Prepare Data Variables ---

  // --- Render ---
  return (
    // Pass navigation state down to Layout
    <Layout activeView={activeView} setActiveView={setActiveView}>

      {/* --- Main Content Header Area (Buttons) --- */}
      <div className="flex justify-between items-center p-4 md:p-8 border-b">
        {/* We can refine the title display later */}
        <h2 className="text-xl font-semibold">
           {activeView === 'Dashboard' ? 'Dashboard Overview' :
            activeView === 'Chat' ? 'Chat Assistant' :
            activeView === 'Settings' ? 'Settings' : ''}
        </h2>
        <div className="flex space-x-2">
           {/* --- ADD SET BUDGET BUTTON --- */}
           <Button variant="outline" size="sm" onClick={() => setIsBudgetModalOpen(true)}>
             <Settings className="mr-2 h-4 w-4" /> Set Budget
           </Button>
            {/* --- ADD UPLOAD BUTTON --- */}
           <Button variant="outline" size="sm" onClick={handleUploadButtonClick}>
             <Upload className="mr-2 h-4 w-4" /> Upload Transactions
           </Button>
           <input
             type="file"
             ref={fileInputRef}
             onChange={handleFileChange}
             accept=".csv"
             className="hidden" // Hide the default input element
           />
           {/* Upload button will go here next */}
        </div>
      </div>
      {/* Display Upload Status below header */}
      {uploadStatus && (
         <div className="px-4 md:px-8 pt-2">
            <p className={`text-sm ${uploadStatus.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>{uploadStatus}</p>
         </div>
       )}
      {/* --- END Header Area --- */}

      {/* --- CONDITIONAL RENDERING --- */}
      {activeView === 'Dashboard' && dashboardData && (
        <>
          {/* Dashboard Grid */}
          <DashboardLayout>
            <MonthSelector selectedMonth={selectedMonth} />
            <MetricCard /* Total Spending */
              title="Total Spending" value={`£${totalSpend.toFixed(2)}`} icon={Wallet}
              footer={ budgetIsSet ? (<> <Progress value={spendPercentageOfBudget} className="h-2 mt-2" /> <span className="text-xs text-slate-500 mt-1 block"> {spendPercentageOfBudget.toFixed(0)}% of £{monthlyBudget.toFixed(0)} budget used </span> </>) : ("Budget not set") }
              className="md:col-span-2 lg:col-span-1"
            />
            <MetricCard /* Spend per day */
              title="Spend per day" value={`£${avgDailySpend.toFixed(2)}`} icon={TrendingUp}
              footer={ budgetIsSet && targetIsSet ? (`${dailySpendDiffPercentage.toFixed(0)}% ${dailySpendStatus} target (£${targetDailySpend.toFixed(2)}/day)`) : ("Target N/A") }
            />
            <MetricCard /* Top Category */
              title="Top Spending Category" value={topCategoryName} icon={ShoppingCart}
              footer={`£${topCategoryTotal.toFixed(2)} spent`}
            />
            <SpendingBreakdownChart data={spendingBreakdown} />
            <RecentTransactions transactions={recentTransactions} />
          </DashboardLayout>
        </>
      )}

      {/* Render Chat component when activeView is 'Chat' */}
      {/* {activeView === 'Chat' && <Chat />} */}
       {activeView === 'Chat' && (
        // Remove the old placeholder div
        // <div className="p-4 md:p-8"> ... </div>

        // Add the Chat component, wrapped in padding if needed
        <div className="p-4 md:p-8">
           <Chat />
        </div>
      )}


      {/* Render Settings placeholder when activeView is 'Settings' */}
      {activeView === 'Settings' && (
        <div className="p-4 md:p-8"> {/* Example placeholder */}
          <h2 className="text-xl font-semibold mb-4">Settings View</h2>
          <p>Settings component will go here.</p>
        </div>
      )}
      {/* ------------------------------- */}

      {/* --- RENDER THE MODAL (controlled by state) --- */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)} // Function to close the modal
        onBudgetSet={() => {
          fetchDashboardData(selectedMonth); // Refresh data after setting budget
          setIsBudgetModalOpen(false); // Close modal on success
        }}
      />
      {/* ----------------------------------------------- */}
    </Layout>
  );
}

export default App;