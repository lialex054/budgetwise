// frontend/src/Budget.jsx

import React, { useEffect, useState } from 'react';
import apiClient from './api';

// pass in a function called 'onBudgetSet' as a property
// allows us to tell main App to refresh data
// after we successfully save a budget

function Budget({ onBudgetSet }) {
    const [budgetInput, setBudgetInput] = useState("");

    const handleSubmit = async (e) => {
        e. preventDefault(); // prevents form from reloading page
        const amount = parseFloat(budgetInput);

        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid, positive number for your budget.");
            return;
        }

        try {
            // call endpoint created for posting budget
            await apiClient.post('/budget/', { amount: amount });

            // clear the input field
            setBudgetInput("");

            // call function from parent App.jsx to refresh
            onBudgetSet();
        } catch (error) {
            console.error("Error setting budget:", error);
            alert("Failed to set budget. Please try again.");
        }
    };

    return (
        <div className = "budget-container" >
            <h2>Set Your Monthly Budget</h2>
            <form onSubmit = {handleSubmit} className = "budget">
                <input
                type = "number"
                step = "0.01" // allows for pounds and pence
                placeholder = "e.g., 1500"
                value = {budgetInput}
                onChange = {(e) => setBudgetInput(e.target.value)}
                />
                <button type = "submit">Save Budget</button>
            </form>
        </div>
    );
}

export default Budget;