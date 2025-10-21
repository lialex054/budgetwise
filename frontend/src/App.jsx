// frontend/src/App.jsx

import React, {useState, useEffect} from 'react';
import apiClient from './api'; // API helper
import Chat from './Chat';

// Category List
const CATEGORY_OPTIONS = [
  "Uncategorized",
  "Groceries",
  "Transport",
  "Utilities",
  "Rent",
  "Entertainment",
  "Dining Out",
  "Shopping",
  "Health",
]

function App() {
  const [transactions, setTransactions] = useState([]); // Holds transactions list
  const [file, setFile] = useState(null); // Holds selected file
  const [uploadStatus, setUploadStatus] = useState(''); // Upload status message

  // Fetch transactions from backend
  const fetchTransactions = async () => {
    try {
      const response = await apiClient.get('/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // useEffect runs this code once component first loads
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(event.target.files[0]);
    setUploadStatus(''); // Clear previous status on new file selection
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first!')
      return;
    }

    const formData = new FormData();
      formData.append('file', file);

      try {
        setUploadStatus('Uploading...');
        const response = await apiClient.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setUploadStatus(`Success! File imported: ${response.data.imported_count}. Skipped ${response.data.skipped_rows.length}.`);
        fetchTransactions(); // Refresh transactions list
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadStatus('Upload failed. Check console for details.');
      }
    };

  const handleCategoryChange = async (transactionId, newCategory) => {
    // Optimistic UI Update: Update the state immediately 
    setTransactions(currentTransactions => 
      currentTransactions.map(t =>
        t.id === transactionId ? {...t, category: newCategory} : t
      )
    );

    try {
      await apiClient.patch(`/transactions/${transactionId}/`, {
        category: newCategory,
      });
      // If API call succeeds, our state is correct
    } catch(error) {
      console.error('Error updating category:', error);
      // Revert the optimistic update on failure
      // fetchTransactions();
    }
  }
    
    

  return (
    <div className = "container">
      <h1>BudgetWise</h1>

      <Chat />

      {/* File Upload Section */}
      <div className="upload-section">
        <h2>Upload Transactions</h2>
        <input type = "file" onChange={handleFileChange} accept=" .csv" />
        <button onClick = {handleUpload}>Upload</button>
        {uploadStatus && <p>{uploadStatus}</p>}
      </div>

      
      {/* Transaction List Section */}
      <div className = "transaction-list">
        <h2>Transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.merchant_name}</td>
                <td>{t.amount.toFixed(2)}</td>
                <td>
                  <select
                   value = {t.category}
                   onChange = {(e) => handleCategoryChange(t.id, e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
