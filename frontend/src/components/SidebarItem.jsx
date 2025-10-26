import React from 'react';
import { cn } from '@/lib/utils';
// Keep icon imports commented out here, they will be passed as props

export function SidebarItem({ text, active, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
        "text-slate-700 hover:bg-slate-200 hover:text-slate-900", // Default/hover
        active && "bg-slate-200 text-slate-900 font-semibold" // Active
      )}
    >
      {Icon && <Icon className="w-5 h-5 mr-3" />} {/* Added mr-3 for spacing */}

      <span className="flex-1 text-left">{text}</span>

      {/* Optional Active Indicator (keep commented) */}
      {/* {active && <div className="w-2 h-2 rounded-full bg-blue-600 ml-auto" />} */}
    </button>
  );
}