import React from 'react';
// Import necessary Card components from the shadcn ui directory
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils'; // Utility for merging classes

// Accept title, value, an Icon component, footer content, and optional className
export function MetricCard({ title, value, icon: IconComponent, footer, className }) {
  return (
    // Apply base styling and merge any additional classes passed in
    <Card className={cn("col-span-1", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        {/* Display the title */}
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        {/* Display the icon if provided */}
        {IconComponent && <IconComponent className="h-4 w-4 text-slate-400" />}
      </CardHeader>
      <CardContent>
        {/* Display the main value */}
        <div className="text-2xl font-bold">{value}</div>
        {/* Display the footer content if provided */}
        {footer && <div className="text-xs text-slate-500 mt-1">{footer}</div>}
      </CardContent>
    </Card>
  );
}