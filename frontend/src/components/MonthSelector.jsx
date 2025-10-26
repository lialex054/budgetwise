// frontend/src/components/MonthSelector.jsx
import React from 'react';
import { Button } from '@/components/ui/button'; // Import Button
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Import Icons

// Receive Date object and navigation functions
export function MonthSelector({ selectedDate, goToPreviousMonth, goToNextMonth, hasPreviousMonth, hasNextMonth }) {

  // Format the Date object prop (e.g., 'October 2025')
  const formattedDate = selectedDate instanceof Date && !isNaN(selectedDate)
    ? selectedDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      })
    : 'Loading...';

  return (
    <div className="flex items-center gap-2">
      {/* Previous Month Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={goToPreviousMonth}
        className="h-8 w-8"
        // --- ADD disabled attribute ---
        disabled={!hasPreviousMonth}
        // -----------------------------
      >
         <ChevronLeft className="h-4 w-4" />
         <span className="sr-only">Previous Month</span>
      </Button>

      {/* Month Display */}
      <h2 className="text-xl font-semibold text-slate-700 text-center w-48">
        {formattedDate}
      </h2>

      {/* Next Month Button */}
       <Button
        variant="outline"
        size="icon"
        onClick={goToNextMonth}
        className="h-8 w-8"
        // --- ADD disabled attribute ---
        disabled={!hasNextMonth}
        // -----------------------------
       >
         <ChevronRight className="h-4 w-4" />
         <span className="sr-only">Next Month</span>
       </Button>
    </div>
  );
}