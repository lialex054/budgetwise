import React, { useState, useEffect } from 'react';
import apiClient from '../api'; // Use relative path
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import shadcn Select components
import { Label } from "@/components/ui/label";

// Define CATEGORY_OPTIONS here or import them from a shared location
const CATEGORY_OPTIONS = [
  'Uncategorized', 'Groceries', 'Transport', 'Utilities', 'Rent',
  'Entertainment', 'Dining Out', 'Shopping', 'Health'
];

// Props:
// isOpen: boolean
// onClose: function
// transaction: object (the transaction being edited, e.g., { id: 1, category: 'Groceries', ... })
// onCategoryUpdated: function (callback to refresh data in App.jsx)
export function EditCategoryDialog({ isOpen, onClose, transaction, onCategoryUpdated }) {
  // State to hold the newly selected category in the dropdown
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // When the dialog opens or the transaction prop changes,
  // set the dropdown's initial value to the transaction's current category.
  useEffect(() => {
    if (transaction) {
      setSelectedCategory(transaction.category);
    } else {
      setSelectedCategory(''); // Reset if no transaction
    }
    // Reset saving state when dialog opens/transaction changes
    setIsSaving(false);
  }, [transaction, isOpen]); // Rerun effect if transaction or isOpen changes

  const handleSave = async () => {
    if (!transaction || !selectedCategory) {
      alert("Error: No transaction or category selected.");
      return;
    }

    // Prevent saving if category hasn't changed
    if (selectedCategory === transaction.category) {
      onClose(); // Just close the dialog
      return;
    }

    setIsSaving(true);
    try {
      // Call the PATCH endpoint
      await apiClient.patch(`/transactions/${transaction.id}/`, {
        category: selectedCategory,
      });
      onCategoryUpdated(); // Trigger data refresh in App.jsx
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Failed to update category. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render anything if the dialog isn't open or no transaction is provided
  if (!isOpen || !transaction) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Select a new category for the transaction with '{transaction.merchant_name}'.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="categorySelect" className="text-right">
              Category
            </Label>
            {/* shadcn Select component */}
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory} // Update state when dropdown changes
            >
              <SelectTrigger id="categorySelect" className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}