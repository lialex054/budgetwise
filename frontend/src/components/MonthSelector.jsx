import React from 'react';
import { Calendar } from 'lucide-react'; // Import the icon

export function MonthSelector({ selectedMonth }) {
  // Format 'YYYY-MM' (e.g., '2025-10') into 'Month YYYY' (e.g., 'October 2025')
  // We add '-02' to ensure it parses correctly as a date regardless of timezone issues
  const formattedDate = selectedMonth
    ? new Date(`${selectedMonth}-02`).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      })
    : 'Loading...'; // Show loading if month isn't available yet

  return (
    // Make this span the full width of the grid on all screen sizes
    <div className="col-span-1 md:col-span-2 lg:col-span-4 flex items-center mb-4 md:mb-6">
      <Calendar className="w-5 h-5 mr-2 text-slate-500" />
      <h2 className="text-xl font-semibold text-slate-700">
        {formattedDate} Dashboard
      </h2>
      {/* We can add dropdown/buttons here later to change the month */}
    </div>
  );
}