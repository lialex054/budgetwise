// frontend/src/components/Layout.jsx
import React from 'react';
import { Sidebar } from '@/components/Sidebar';

// Accept navigation state props from App.jsx
export function Layout({ children, activeView, setActiveView, userName }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Pass navigation state down to Sidebar */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} userName={userName}/>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}