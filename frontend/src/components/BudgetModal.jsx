import React, { useState, useEffect } from 'react';
import apiClient from '../api'; // Use relative path for api helper
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose, // To close the dialog
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // shadcn Input
import { Label } from "@/components/ui/label"; // shadcn Label

// Props:
// isOpen: boolean - Controls if the modal is open
// onClose: function - Called to close the modal
// onBudgetSet: function - Called after successfully setting the budget to refresh data
export function BudgetModal({ isOpen, onClose, onBudgetSet }) {
  const [budgetInput, setBudgetInput] = useState('');
  const [isSaving, setIsSaving] = useState(false); // To disable button while saving

  // Clear input when modal opens/closes if needed (optional)
  useEffect(() => {
    if (!isOpen) {
      setBudgetInput('');
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(budgetInput);

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid, positive number for your budget.");
      return;
    }

    setIsSaving(true); // Disable button
    try {
      await apiClient.post('/budget/', { amount: amount });
      onBudgetSet(); // Trigger data refresh in App.jsx
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error setting budget:", error);
      alert("Failed to set budget. Please try again.");
    } finally {
      setIsSaving(false); // Re-enable button
    }
  };

  return (
    // Control open state via the 'open' prop, trigger close via 'onOpenChange'
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}> {/* Wrap content in a form */}
          <DialogHeader>
            <DialogTitle>Set Your Monthly Budget</DialogTitle>
            <DialogDescription>
              Enter the total amount you plan to spend this month.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="budgetAmount" className="text-right">
                Amount (£)
              </Label>
              <Input
                id="budgetAmount"
                type="number"
                step="0.01"
                placeholder="Type your amount here"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="col-span-3"
                required // HTML5 validation
              />
            </div>
          </div>
          <DialogFooter>
            {/* DialogClose can be used for a cancel button if needed */}
            {/* <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose> */}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}