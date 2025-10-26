// frontend/src/components/Sidebar.jsx
import React from 'react'; // Removed useState import
import { SidebarItem } from '@/components/SidebarItem';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircleDollarSign } from 'lucide-react';

// Accept navigation state props from Layout.jsx
export function Sidebar({ activeView, setActiveView }) {
  // REMOVED local state: const [activeItem, setActiveItem] = React.useState('Dashboard');

  return (
    <aside className="flex flex-col w-64 h-screen p-6 bg-slate-50 border-r border-slate-200">
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
          // Use activeView prop to determine active state
          active={activeView === 'Dashboard'}
          // Use setActiveView prop to change the state in App.jsx
          onClick={() => setActiveView('Dashboard')}
        />
        <SidebarItem
          text="Chat: Felix" // You might want to rename this later
          active={activeView === 'Chat'}
          onClick={() => setActiveView('Chat')}
        />
        <SidebarItem
          text="Settings"
          active={activeView === 'Settings'}
          onClick={() => setActiveView('Settings')}
        />
      </nav>

      {/* 3. User Profile Section (No change) */}
      <div className="flex items-center gap-3 mt-auto">
        <Avatar className="h-10 w-10">
          <AvatarImage src="https://github.com/shadcn.png" alt="User Avatar" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-slate-800">User Name</span>
          <span className="text-xs text-slate-500">user@email.com</span>
        </div>
      </div>
    </aside>
  );
}