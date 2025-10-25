import React from 'react';
import { cn } from '@/lib/utils'; // Import the utility function

export function DashboardLayout({ children, className }) {
  // Use cn to allow passing additional classes
  return (
    <div className={cn(
      "p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6",
      className // Merge in any extra classes passed via props
    )}>
      {children}
    </div>
  );
}