// frontend/src/components/Sidebar.jsx
import React from 'react'; // Removed useState import
import { SidebarItem } from '@/components/SidebarItem';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircleDollarSign, LayoutDashboard, MessageCircle } from 'lucide-react';

// Accept navigation state props from Layout.jsx
export function Sidebar({ activeView, setActiveView, userName }) {
  // REMOVED local state: const [activeItem, setActiveItem] = React.useState('Dashboard');

  const userInitial = userName?.charAt(0)?.toUpperCase() || '?';

  return (
    <aside className="sticky top-0 flex flex-col w-64 h-screen p-6 bg-slate-50 border-r border-slate-200">
      {/* 1. Logo/Brand Section (No change) */}
      <div className="flex items-center gap-3 mb-8">
        <CircleDollarSign className="w-7 h-7 text-blue-600" />
        <span className="text-lg font-semibold text-slate-800">
          BudgetWise
        </span>
      </div>

      {/* 2. Navigation Section (Use passed props) */}
      <nav className="flex flex-col items-start gap-2 flex-1">
        <SidebarItem
          text="Dashboard"
          icon={LayoutDashboard}
          // Use activeView prop to determine active state
          active={activeView === 'Dashboard'}
          // Use setActiveView prop to change the state in App.jsx
          onClick={() => setActiveView('Dashboard')}
        />
        <SidebarItem
          text="Chat with Felix"
          icon={MessageCircle}
          active={activeView === 'Chat'}
          onClick={() => setActiveView('Chat')}
        />
      </nav>

      {/* 3. User Profile Section (No change) */}
      <div className="flex items-center gap-3 mt-auto">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-slate-800">
            {userName || "User Name"} {/* Fallback if name is empty */}
          </span>
          {/* Display Beta Tester */}
          <span className="text-xs text-slate-500">
            Beta Tester
          </span>
        </div>
      </div>
    </aside>
  );
}