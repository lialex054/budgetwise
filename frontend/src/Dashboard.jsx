// frontend/src/Dashboard.jsx

import React from 'react';

// this component receives data from App.jsx

function Dashboard({ data }) {
    // if data hasn't loaded, show nothing
    if (!data) {
        return null;
    }

    const { monthly_budget, total_spend_current_month, category_spend_current_month} = data;

    const spendPercentage =
    monthly_budget > 0
      ? Math.min((total_spend_current_month / monthly_budget) * 100, 100)
      : 0;
      
    return (
        <div className = "dashboard-section" >
            <h2>Your Monthly Dashboard</h2>

            <div className="budget-overview">
                {/* We can also add a message if the budget isn't set */}
                {monthly_budget === 0 ? (
                <p>Please set a monthly budget to see your progress.</p>
                ) : (
                <>
                    <h3>Total Monthly Spend</h3>
                    <div className="progress-bar-container">
                    <div 
                        className="progress-bar-fill" 
                        style={{ width: `${spendPercentage}%` }}
                    ></div>
                    </div>
                    <div className="progress-bar-label">
                    <strong>£{total_spend_current_month.toFixed(2)}</strong>
                    <span> spent of </span>
                    <span>£{monthly_budget.toFixed(2)}</span>
                    </div>
                </>
                )}
            </div>

            <div className="category-overview">

        <h3>Spend by Category (This Month)</h3>
        {/* --- FIX 3: Handle no spending --- */}
        {category_spend_current_month.length === 0 ? (
          <p>No spending recorded for this month yet.</p>
        ) : (
          <ul>
            {category_spend_current_month.map((item) => {
              // --- FIX 2: Handle zero total spend ---
              const categoryPercentage =
                total_spend_current_month > 0
                  ? (item.total / total_spend_current_month) * 100
                  : 0;
              
              return (
                <li key={item.category}>
                  <div className="category-label">
                    <span>{item.category}</span>
                    <span><strong>£{item.total.toFixed(2)}</strong></span>
                  </div>
                  <div className="category-percentage">
                    ({categoryPercentage.toFixed(1)}%)
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;